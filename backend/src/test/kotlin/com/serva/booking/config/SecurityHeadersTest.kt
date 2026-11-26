package com.serva.booking.config

import com.serva.booking.testsupport.DatabaseIntegrationTest
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.setup.DefaultMockMvcBuilder
import org.springframework.test.web.servlet.setup.MockMvcBuilders
import org.springframework.web.context.WebApplicationContext

/**
 * Item 14.4: the headers actually sent after the full security filter chain. Uses a public,
 * read-only endpoint, so nothing is written to the database.
 */
@DatabaseIntegrationTest
@SpringBootTest
class SecurityHeadersTest(@Autowired context: WebApplicationContext) {
    private val mvc = MockMvcBuilders.webAppContextSetup(context)
        .apply<DefaultMockMvcBuilder>(springSecurity()).build()

    @Test
    fun `api responses carry the full set of security headers`() {
        val response = mvc.perform(get("/api/pricing").with { it.remoteAddr = "10.98.0.1"; it }).andReturn().response
        assertEquals(200, response.status)

        assertEquals("nosniff", response.getHeader("X-Content-Type-Options"))
        assertEquals("SAMEORIGIN", response.getHeader("X-Frame-Options"))
        assertTrue(response.getHeader("Cache-Control").orEmpty().contains("no-store"), response.getHeader("Cache-Control"))
        assertEquals("same-origin", response.getHeader("Referrer-Policy"))

        val csp = response.getHeader("Content-Security-Policy").orEmpty()
        assertTrue(csp.contains("object-src 'none'") && csp.contains("frame-ancestors 'self'"), csp)

        val permissions = response.getHeader("Permissions-Policy").orEmpty()
        for (feature in listOf("camera", "microphone", "geolocation", "payment", "usb")) {
            assertTrue(permissions.contains("$feature=()"), "$feature not disabled: $permissions")
        }
        // Kept available: the map embed needs fullscreen; Clerk may use passkeys.
        assertFalse(permissions.contains("fullscreen"), permissions)
        assertFalse(permissions.contains("publickey-credentials"), permissions)
    }
}
