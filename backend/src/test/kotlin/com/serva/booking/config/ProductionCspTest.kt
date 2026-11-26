package com.serva.booking.config

import com.serva.booking.auth.ClerkOrLegacyJwtAuthenticationManager
import com.serva.booking.auth.JwtService
import com.serva.booking.auth.UserRepository
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.mockito.Mockito.mock
import org.springframework.beans.factory.ObjectProvider
import org.springframework.mock.env.MockEnvironment
import org.springframework.mock.web.MockHttpServletRequest
import org.springframework.mock.web.MockHttpServletResponse

/** Item 7.2: production Content-Security-Policy, shipped in Report-Only mode first. Unit test only. */
class ProductionCspTest {
    @Suppress("UNCHECKED_CAST")
    private val managerProvider =
        mock(ObjectProvider::class.java) as ObjectProvider<ClerkOrLegacyJwtAuthenticationManager>

    private val config = SecurityConfig(
        mock(JwtService::class.java),
        mock(UserRepository::class.java),
        managerProvider,
        MockEnvironment().apply { setActiveProfiles("prod") },
        true,
        false,
    )
    private val issuer = "https://clerk.40love.example"

    private fun directives(policy: String): Map<String, String> =
        policy.split(';').map { it.trim() }.filter { it.isNotEmpty() }
            .associate { it.substringBefore(' ') to it.substringAfter(' ', "") }

    @Test
    fun `scripts are limited to the site, the Clerk instance and its bot challenge`() {
        val policy = directives(config.productionCspReportOnly(issuer))
        assertEquals("'self' $issuer https://challenges.cloudflare.com", policy.getValue("script-src"))
        assertTrue(policy.getValue("connect-src").split(' ').containsAll(listOf("'self'", issuer)))
        // Clerk's bot challenge and the Google Maps embed on the home page (item 14.3).
        assertEquals("https://challenges.cloudflare.com https://www.google.com", policy.getValue("frame-src"))
        assertTrue(policy.getValue("img-src").split(' ')
            .containsAll(listOf("'self'", "https://img.clerk.com", "https://images.unsplash.com")))
        assertEquals("'self' blob:", policy.getValue("worker-src"))
    }

    @Test
    fun `policy never allows eval or inline scripts and keeps the existing protections`() {
        val raw = config.productionCspReportOnly(issuer)
        val policy = directives(raw)
        assertFalse(raw.contains("'unsafe-eval'"))
        assertFalse(policy.getValue("script-src").contains("'unsafe-inline'"))
        assertEquals("'none'", policy.getValue("object-src"))
        assertEquals("'self'", policy.getValue("base-uri"))
        assertEquals("'self'", policy.getValue("frame-ancestors"))
        assertEquals("'self'", policy.getValue("form-action"))
        assertEquals("'self'", policy.getValue("default-src"))
    }

    @Test
    fun `a missing issuer adds no empty or placeholder source`() {
        val raw = config.productionCspReportOnly("")
        assertFalse(raw.contains("  "))
        assertFalse(raw.contains("null"))
        assertEquals("'self' https://challenges.cloudflare.com", directives(raw).getValue("script-src"))
    }

    @Test
    fun `the policy is reported only and does not replace the enforced header`() {
        val response = MockHttpServletResponse()
        config.productionCspWriter().writeHeaders(MockHttpServletRequest(), response)

        assertNotNull(response.getHeader("Content-Security-Policy-Report-Only"))
        assertNull(response.getHeader("Content-Security-Policy"))
    }
}
