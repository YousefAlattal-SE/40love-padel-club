package com.serva.booking.config

import jakarta.servlet.FilterChain
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.springframework.mock.web.MockHttpServletRequest
import org.springframework.mock.web.MockHttpServletResponse
import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset

/** Items 12.1–12.3: per-client limits with a fixed clock. Pure unit test, no network or database. */
class ApiLimitsFilterTest {
    private val clock = Clock.fixed(Instant.parse("2026-11-26T12:00:10Z"), ZoneOffset.UTC)
    private val passing = FilterChain { _, _ -> }

    private fun filter(
        proxies: TrustedProxies = TrustedProxies.NONE,
        maxTrackedClients: Int = 16384,
        writePerMinute: Int = 30,
    ) = ApiLimitsFilter(
        clock = clock,
        sensitivePerMinute = 20,
        generalPerMinute = 240,
        writePerMinute = writePerMinute,
        trustedProxies = proxies,
        maxTrackedClients = maxTrackedClients,
    )

    private fun status(f: ApiLimitsFilter, method: String, path: String, peer: String, forwarded: String? = null): Int {
        val request = MockHttpServletRequest(method, path).apply {
            remoteAddr = peer
            servletPath = path
            forwarded?.let { addHeader("X-Forwarded-For", it) }
        }
        val response = MockHttpServletResponse()
        f.doFilter(request, response, passing)
        return response.status
    }

    @Test
    fun `without trusted proxies a forged forwarded header does not create a new client`() {
        val f = filter()
        val results = (1..21).map { status(f, "POST", "/api/auth/login", "203.0.113.9", forwarded = "198.51.100.$it") }
        assertEquals(List(20) { 200 } + 429, results)
    }

    @Test
    fun `behind a trusted proxy each real client gets its own limit`() {
        val f = filter(proxies = TrustedProxies.parse("10.0.0.0/8"))
        repeat(20) { assertEquals(200, status(f, "POST", "/api/auth/login", "10.0.0.2", "198.51.100.1")) }
        assertEquals(429, status(f, "POST", "/api/auth/login", "10.0.0.2", "198.51.100.1"))
        // A different user behind the same proxy is not affected.
        assertEquals(200, status(f, "POST", "/api/auth/login", "10.0.0.2", "198.51.100.2"))
        // Prepending a fake address does not escape the limit.
        assertEquals(429, status(f, "POST", "/api/auth/login", "10.0.0.2", "9.9.9.9, 198.51.100.1"))
    }

    @Test
    fun `a full client table no longer locks out new legitimate clients`() {
        val f = filter(maxTrackedClients = 3)
        for (i in 1..3) assertEquals(200, status(f, "GET", "/api/pricing", "198.51.100.$i"))
        // Previously every new client was rejected here; now it shares a bounded overflow budget.
        assertEquals(200, status(f, "GET", "/api/pricing", "203.0.113.50"))
        assertEquals(200, status(f, "GET", "/api/pricing", "203.0.113.51"))
    }

    @Test
    fun `the shared overflow budget is still limited`() {
        val f = filter(maxTrackedClients = 1, writePerMinute = 2)
        assertEquals(200, status(f, "POST", "/api/bookings", "198.51.100.1"))
        // Overflow clients share one budget of 20 times the per-client limit.
        val overflow = (1..41).map { status(f, "POST", "/api/bookings", "203.0.113.$it") }
        assertEquals(List(40) { 200 } + 429, overflow)
    }

    @Test
    fun `member write actions have their own tighter limit`() {
        val f = filter()
        val writes = (1..31).map { status(f, "POST", "/api/bookings", "198.51.100.1") }
        assertEquals(List(30) { 200 } + 429, writes)
        // Reads keep the general limit, and other write routes share the write budget.
        assertEquals(200, status(f, "GET", "/api/bookings", "198.51.100.1"))
        assertEquals(429, status(f, "POST", "/api/matches/5/join", "198.51.100.1"))
        assertEquals(429, status(f, "DELETE", "/api/bookings/7", "198.51.100.1"))
        // Another member is unaffected.
        assertEquals(200, status(f, "POST", "/api/matches/5/join", "198.51.100.2"))
    }

    @Test
    fun `admin and read routes are not counted as member writes`() {
        val f = filter(writePerMinute = 1)
        assertEquals(200, status(f, "POST", "/api/bookings", "198.51.100.1"))
        assertEquals(200, status(f, "GET", "/api/matches/5", "198.51.100.1"))
        assertEquals(200, status(f, "PATCH", "/api/admin/bookings/5/status", "198.51.100.1"))
    }
}
