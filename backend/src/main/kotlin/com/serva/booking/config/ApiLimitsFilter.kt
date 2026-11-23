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

/** A per-process backstop. The ingress must also enforce shared quotas and read deadlines. */
class ApiLimitsFilter(
    private val clock: Clock = Clock.systemUTC(),
    private val sensitivePerMinute: Int = 20,
    private val generalPerMinute: Int = 240,
) : OncePerRequestFilter() {
    init {
        require(sensitivePerMinute > 0 && generalPerMinute > 0) { "API quotas must be positive" }
    }
    private val counts = mutableMapOf<Pair<String, String>, Int>()
    private var window = -1L

    @Synchronized
    private fun allow(peer: String, bucket: String, limit: Int, minute: Long): Boolean {
        if (minute > window) {
            counts.clear()
            window = minute
        }
        val key = peer to bucket
        val used = counts[key] ?: 0
        if (used >= limit || (used == 0 && counts.size >= 16384)) return false
        counts[key] = used + 1
        return true
    }

    override fun doFilterInternal(req: HttpServletRequest, res: HttpServletResponse, chain: FilterChain) {
        val path = req.servletPath.ifEmpty { req.requestURI.removePrefix(req.contextPath) }
        if (!path.startsWith("/api/")) {
            chain.doFilter(req, res)
            return
        }
        val seconds = clock.instant().epochSecond
        val sensitive = req.method == "POST" && path in setOf("/api/auth/login", "/api/contact-messages", "/api/auth/bootstrap")
        val bucket = if (sensitive) path else "api"
        if (!allow(req.remoteAddr, bucket, if (sensitive) sensitivePerMinute else generalPerMinute, seconds / 60)) {
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
            res.sendError(413, "Request body too large")
            return
        }
        val bytes = req.inputStream.readNBytes(limit + 1)
        if (bytes.size > limit) {
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
}
