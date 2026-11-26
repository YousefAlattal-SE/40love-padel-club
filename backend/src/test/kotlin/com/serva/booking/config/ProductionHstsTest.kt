package com.serva.booking.config

import com.serva.booking.auth.ClerkOrLegacyJwtAuthenticationManager
import com.serva.booking.auth.JwtService
import com.serva.booking.auth.UserRepository
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.mockito.Mockito.mock
import org.springframework.beans.factory.ObjectProvider
import org.springframework.mock.env.MockEnvironment
import org.springframework.mock.web.MockHttpServletRequest
import org.springframework.mock.web.MockHttpServletResponse

/**
 * Item 4.1: behind a TLS-terminating proxy the application sees plain HTTP requests, so the
 * default (secure-request-only) HSTS writer never fires. Production writes HSTS on every
 * response instead; browsers ignore the header on HTTP, so this is safe. Unit test only.
 */
class ProductionHstsTest {

    private fun securityConfig(vararg profiles: String): SecurityConfig {
        val environment = MockEnvironment()
        if (profiles.isNotEmpty()) environment.setActiveProfiles(*profiles)

        @Suppress("UNCHECKED_CAST")
        val managerProvider = mock(ObjectProvider::class.java) as ObjectProvider<ClerkOrLegacyJwtAuthenticationManager>
        return SecurityConfig(
            mock(JwtService::class.java),
            mock(UserRepository::class.java),
            managerProvider,
            environment,
            true,
            false,
        )
    }

    @Test
    fun `production is detected only for prod and production profiles`() {
        assertTrue(securityConfig("prod").isProductionProfile())
        assertTrue(securityConfig("PRODUCTION").isProductionProfile())
        assertTrue(securityConfig("default", "prod").isProductionProfile())
        assertFalse(securityConfig().isProductionProfile())
        assertFalse(securityConfig("local").isProductionProfile())
        assertFalse(securityConfig("test").isProductionProfile())
    }

    @Test
    fun `production HSTS is written even when the proxy forwarded plain HTTP`() {
        val request = MockHttpServletRequest("GET", "/api/pricing").apply {
            scheme = "http"
            isSecure = false
        }
        val response = MockHttpServletResponse()

        securityConfig("prod").productionHstsWriter().writeHeaders(request, response)

        assertEquals("max-age=31536000", response.getHeader("Strict-Transport-Security"))
    }

    @Test
    fun `production HSTS does not opt subdomains in or request preload`() {
        val response = MockHttpServletResponse()
        securityConfig("prod").productionHstsWriter().writeHeaders(MockHttpServletRequest(), response)

        val header = response.getHeader("Strict-Transport-Security").orEmpty()
        assertFalse(header.contains("includeSubDomains", ignoreCase = true))
        assertFalse(header.contains("preload", ignoreCase = true))
    }
}
