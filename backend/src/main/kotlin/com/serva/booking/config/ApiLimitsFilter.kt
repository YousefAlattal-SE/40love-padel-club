package com.serva.booking.config

import jakarta.servlet.FilterChain
import jakarta.servlet.ReadListener
import jakarta.servlet.ServletInputStream
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletRequestWrapper
import jakarta.servlet.http.HttpServletResponse
import org.springframework.web.filter.OncePerRequestFilter
import java.io.BufferedReader
import java.time.Clock

/**
 * A per-process backstop (suitable for the single production instance). The ingress must also
 * enforce shared quotas and read deadlines; several instances need a shared limiter.
 *
 * Buckets per client and minute: sensitive POSTs (login, contact, bootstrap), member writes
 * (POST/DELETE on bookings and matches, item 12.3) and everything else under /api. The client is
 * the TCP peer unless TRUSTED_PROXIES says the peer is our proxy (item 12.1).
 */
class ApiLimitsFilter(
    private val clock: Clock = Clock.systemUTC(),
    private val sensitivePerMinute: Int = 20,
    private val generalPerMinute: Int = 240,
    private val writePerMinute: Int = 30,
    private val trustedProxies: TrustedProxies = TrustedProxies.NONE,
    private val maxTrackedClients: Int = 16384,
) : OncePerRequestFilter() {
    init {
        require(sensitivePerMinute > 0 && generalPerMinute > 0 && writePerMinute > 0 && maxTrackedClients > 0) {
            "API quotas must be positive"
        }
    }
    private val counts = mutableMapOf<Pair<String, String>, Int>()
    private var window = -1L

    @Synchronized
    private fun allow(peer: String, bucket: String, limit: Int, minute: Long): Boolean {
        if (minute > window) {
            counts.clear()
            window = minute
        }
        var key = peer to bucket
        var effectiveLimit = limit
        if (key !in counts && counts.size >= maxTrackedClients) {
            // Item 12.2: a full table used to reject every new client, letting an attacker with many
            // addresses lock everyone out. New clients now share one bounded overflow budget instead.
            key = OVERFLOW_CLIENT to bucket
            effectiveLimit = limit * OVERFLOW_FACTOR
        }
        val used = counts[key] ?: 0
        if (used >= effectiveLimit) return false
        counts[key] = used + 1
        return true
    }

    private fun isMemberWrite(method: String, path: String): Boolean =
        method in setOf("POST", "DELETE") &&
            (path == "/api/bookings" || path.startsWith("/api/bookings/") || path.startsWith("/api/matches/"))

    override fun doFilterInternal(req: HttpServletRequest, res: HttpServletResponse, chain: FilterChain) {
        val path = req.servletPath.ifEmpty { req.requestURI.removePrefix(req.contextPath) }
        if (!path.startsWith("/api/")) {
            chain.doFilter(req, res)
            return
        }
        val seconds = clock.instant().epochSecond
        val sensitive = req.method == "POST" && path in setOf("/api/auth/login", "/api/contact-messages", "/api/auth/bootstrap")
        val (bucket, quota) = when {
            sensitive -> path to sensitivePerMinute
            isMemberWrite(req.method, path) -> "member_write" to writePerMinute
            else -> "api" to generalPerMinute
        }
        if (!allow(trustedProxies.clientAddress(req), bucket, quota, seconds / 60)) {
            SecurityEvents.limitExceeded(req, "rate_limit_exceeded", seconds / 60)
            res.setHeader("Retry-After", (60 - seconds % 60).toString())
            res.sendError(429, "Request limit exceeded")
            return
        }

        if (req.method !in setOf("POST", "PATCH", "PUT", "DELETE")) {
            chain.doFilter(req, res)
            return
        }
        val limit = 32 * 1024
        if (req.contentLengthLong > limit) {
            SecurityEvents.limitExceeded(req, "request_body_too_large", seconds / 60)
            res.sendError(413, "Request body too large")
            return
        }
        val bytes = req.inputStream.readNBytes(limit + 1)
        if (bytes.size > limit) {
            SecurityEvents.limitExceeded(req, "request_body_too_large", seconds / 60)
            res.sendError(413, "Request body too large")
            return
        }
        val bounded = object : HttpServletRequestWrapper(req) {
            override fun getInputStream(): ServletInputStream {
                val input = bytes.inputStream()
                return object : ServletInputStream() {
                    override fun read() = input.read()
                    override fun read(b: ByteArray, off: Int, len: Int) = input.read(b, off, len)
                    override fun isFinished() = input.available() == 0
                    override fun isReady() = true
                    override fun setReadListener(listener: ReadListener) {
                        throw UnsupportedOperationException("Only synchronous API body reads are supported")
                    }
                }
            }
            override fun getReader(): BufferedReader = inputStream.bufferedReader(Charsets.UTF_8)
        }
        chain.doFilter(bounded, res)
    }

    private companion object {
        const val OVERFLOW_CLIENT = "__overflow__"
        const val OVERFLOW_FACTOR = 20
    }
}
