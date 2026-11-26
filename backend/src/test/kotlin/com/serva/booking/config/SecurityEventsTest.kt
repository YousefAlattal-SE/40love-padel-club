package com.serva.booking.config

import ch.qos.logback.classic.Logger
import ch.qos.logback.classic.spi.ILoggingEvent
import ch.qos.logback.core.read.ListAppender
import com.serva.booking.auth.AuthUser
import com.serva.booking.auth.Role
import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletResponse
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.slf4j.LoggerFactory
import org.springframework.mock.web.MockHttpServletRequest
import org.springframework.mock.web.MockHttpServletResponse
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.context.SecurityContextHolder

/** Item 8.1: structured, privacy-conscious security events. Captures log output; no network or database. */
class SecurityEventsTest {
    private val logger = LoggerFactory.getLogger(SecurityEvents.LOGGER_NAME) as Logger
    private val appender = ListAppender<ILoggingEvent>()

    @BeforeEach
    fun capture() {
        SecurityEvents.resetThrottleForTests()
        appender.start()
        logger.addAppender(appender)
    }

    @AfterEach
    fun release() {
        logger.detachAppender(appender)
        SecurityContextHolder.clearContext()
    }

    private fun lines() = appender.list.map { it.formattedMessage }

    private fun request(method: String, uri: String, ip: String = "203.0.113.7") =
        MockHttpServletRequest(method, uri).apply { remoteAddr = ip }

    private fun member(id: Long = 42, role: Role = Role.member) = UsernamePasswordAuthenticationToken(
        AuthUser(id, "private-person@example.test", role), null, listOf(SimpleGrantedAuthority("ROLE_${role.name.uppercase()}")))

    @Test
    fun `authentication failures record the reason but never the token`() {
        val req = request("GET", "/api/bookings/mine").apply {
            addHeader("Authorization", "Bearer eyJhbGciOi.secret-token-body.signature")
            queryString = "token=also-secret"
        }

        SecurityEvents.authenticationFailed(req, "expired_token")

        val line = lines().single()
        assertTrue(line.startsWith("event=authentication_failed "), line)
        assertTrue(line.contains("method=GET") && line.contains("path=/api/bookings/mine"), line)
        assertTrue(line.contains("reason=expired_token") && line.contains("ip=203.0.113.7"), line)
        assertFalse(line.contains("secret"), line)
        assertFalse(line.contains("eyJ"), line)
    }

    @Test
    fun `access denied records user id and role but no personal data`() {
        SecurityEvents.accessDenied(request("PUT", "/api/admin/pricing/padel"), member())

        val line = lines().single()
        assertTrue(line.startsWith("event=access_denied "), line)
        assertTrue(line.contains("userId=42") && line.contains("role=ROLE_MEMBER"), line)
        assertFalse(line.contains("private-person"), line)
        assertFalse(line.contains("@example"), line)
    }

    @Test
    fun `values cannot inject extra log lines or fields`() {
        SecurityEvents.authenticationFailed(request("GET", "/api/x\r\nevent=forged role=ROLE_ADMIN"), "bad reason\nx")

        val line = lines().single()
        assertFalse(line.contains('\n') || line.contains('\r'), line)
        assertEquals(1, Regex("""(^| )event=""").findAll(line).count(), line)
        assertFalse(line.contains(" role="), line)
    }

    @Test
    fun `limit events are throttled per client and kind within a minute`() {
        repeat(5) { SecurityEvents.limitExceeded(request("POST", "/api/auth/login"), "rate_limit_exceeded", minute = 100) }
        SecurityEvents.limitExceeded(request("POST", "/api/auth/login", ip = "198.51.100.9"), "rate_limit_exceeded", minute = 100)
        SecurityEvents.limitExceeded(request("POST", "/api/auth/login"), "request_body_too_large", minute = 100)
        SecurityEvents.limitExceeded(request("POST", "/api/auth/login"), "rate_limit_exceeded", minute = 101)

        assertEquals(4, lines().size, lines().toString())
        assertTrue(lines().all { it.contains("path=/api/auth/login") })
    }

    @Test
    fun `successful admin changes are audited with the acting admin id`() {
        val filter = AdminChangeAuditFilter()
        SecurityContextHolder.getContext().authentication = member(id = 7, role = Role.admin)
        fun run(method: String, uri: String, status: Int) {
            val chain = FilterChain { _, res -> (res as HttpServletResponse).status = status }
            filter.doFilter(request(method, uri), MockHttpServletResponse(), chain)
        }

        run("PUT", "/api/admin/pricing/padel", 200)
        run("GET", "/api/admin/pricing", 200)
        run("PATCH", "/api/admin/bookings/5/status", 400)
        run("PATCH", "/api/admin/bookings/5/status", 403)
        run("POST", "/api/bookings", 201)
        // POST-based admin searches change nothing and are not reported as changes.
        run("POST", "/api/admin/customers", 200)
        run("POST", "/api/admin/bookings", 200)
        run("POST", "/api/admin/contact-messages", 200)
        run("POST", "/api/admin/matchmaking/5/publish", 200)

        val changes = lines()
        assertEquals(2, changes.size, changes.toString())
        val line = changes.first()
        assertTrue(line.startsWith("event=admin_change "), line)
        assertTrue(line.contains("adminId=7") && line.contains("method=PUT"), line)
        assertTrue(line.contains("path=/api/admin/pricing/padel") && line.contains("status=200"), line)
        assertTrue(changes.last().contains("path=/api/admin/matchmaking/5/publish"), changes.last())
    }
}
