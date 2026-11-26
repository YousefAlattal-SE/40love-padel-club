package com.serva.booking.config

import com.serva.booking.auth.AuthUser
import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.slf4j.LoggerFactory
import org.springframework.security.core.Authentication
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.web.filter.OncePerRequestFilter
import java.util.concurrent.ConcurrentHashMap

/**
 * Security item 8.1: structured security events on the dedicated "SECURITY" logger, one
 * `key=value` line per event so they can be searched and alerted on.
 *
 * Privacy rules: only the numeric user id and role are recorded, never e-mail, name, phone,
 * tokens, passwords, query strings or request bodies. Every value is reduced to a safe
 * character set, so request data cannot forge extra lines or fields. The client IP is the
 * direct peer (`remoteAddr`); behind a proxy this needs the trusted-proxy setup of item 12.
 */
object SecurityEvents {
    const val LOGGER_NAME = "SECURITY"
    private val log = LoggerFactory.getLogger(LOGGER_NAME)

    private const val MAX_THROTTLE_KEYS = 10_000
    private val lastLoggedMinute = ConcurrentHashMap<String, Long>()
    private val unsafe = Regex("[^A-Za-z0-9._:/+=@-]")

    /** Set once at start-up from TRUSTED_PROXIES (item 12.1); nothing is trusted by default. */
    @Volatile
    private var proxies: TrustedProxies = TrustedProxies.NONE

    fun useTrustedProxies(trusted: TrustedProxies) {
        proxies = trusted
    }

    private fun clientOf(request: HttpServletRequest): String = proxies.clientAddress(request)

    fun authenticationFailed(request: HttpServletRequest, reason: String) {
        log.warn(format("authentication_failed", request, "reason" to reason))
    }

    fun accessDenied(request: HttpServletRequest, authentication: Authentication?) {
        val user = authentication?.principal as? AuthUser
        log.warn(format(
            "access_denied", request,
            "userId" to user?.id,
            "role" to authentication?.authorities?.joinToString(",") { it.authority.orEmpty() }?.ifEmpty { null },
        ))
    }

    /** Logs at most one line per client, kind and minute, so an attack cannot flood the log. */
    fun limitExceeded(request: HttpServletRequest, kind: String, minute: Long = System.currentTimeMillis() / 60_000) {
        val key = "$kind|${clientOf(request)}"
        if (lastLoggedMinute[key] == minute) return
        if (lastLoggedMinute.size >= MAX_THROTTLE_KEYS) lastLoggedMinute.clear()
        lastLoggedMinute[key] = minute
        log.warn(format(kind, request))
    }

    fun adminChange(request: HttpServletRequest, adminId: Long?, status: Int) {
        log.info(format("admin_change", request, "adminId" to adminId, "status" to status))
    }

    internal fun resetThrottleForTests() = lastLoggedMinute.clear()

    private fun format(event: String, request: HttpServletRequest, vararg extra: Pair<String, Any?>): String {
        val fields = listOf(
            "event" to event,
            "method" to request.method,
            "path" to request.requestURI,
            "ip" to clientOf(request),
        ) + extra
        return fields.joinToString(" ") { (key, value) -> "$key=${clean(value)}" }
    }

    private fun clean(value: Any?): String =
        value?.toString()?.replace(unsafe, "_")?.take(200)?.ifEmpty { "-" } ?: "-"
}

/**
 * Records every successful state-changing request under the /api/admin/ path with the acting admin's
 * id (item 8.1). Runs after authorization, so only permitted requests reach it; failed or
 * rejected changes (non-2xx) are not reported as changes.
 */
class AdminChangeAuditFilter : OncePerRequestFilter() {
    private val mutating = setOf("POST", "PUT", "PATCH", "DELETE")

    /** Admin list endpoints that accept POST only to carry search criteria; they change nothing. */
    private val readOnlySearches = setOf("/api/admin/bookings", "/api/admin/customers", "/api/admin/contact-messages")

    override fun doFilterInternal(request: HttpServletRequest, response: HttpServletResponse, chain: FilterChain) {
        chain.doFilter(request, response)
        val path = request.requestURI
        val search = request.method == "POST" && path in readOnlySearches
        if (request.method in mutating && !search && path.startsWith("/api/admin/") && response.status in 200..299) {
            val admin = SecurityContextHolder.getContext().authentication?.principal as? AuthUser
            SecurityEvents.adminChange(request, admin?.id, response.status)
        }
    }
}
