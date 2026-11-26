package com.serva.booking.auth

import org.junit.jupiter.api.Assertions.assertDoesNotThrow
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Test

/** Production-only Clerk configuration rules (item 1.1). Pure unit test: no network, no Spring context. */
class ClerkProductionGuardTest {
    private val config = ClerkJwtConfiguration()
    private val prod = arrayOf("prod")

    private fun properties(
        issuer: String = "https://clerk.40love.example",
        audience: String = "fortylove-api",
        allowAudienceless: Boolean = false,
        parties: List<String> = listOf("https://40love.example"),
        secretKey: String = "unit-test-placeholder",
    ) = ClerkJwtProperties().apply {
        this.issuer = issuer
        this.audience = audience
        this.allowAudienceless = allowAudienceless
        this.authorizedParties = parties
        this.secretKey = secretKey
    }

    @Test
    fun `production accepts a production instance with audience and HTTPS origins`() {
        assertDoesNotThrow { config.requireProductionSafe(properties(), prod) }
        assertDoesNotThrow { config.requireProductionSafe(properties(), arrayOf("production")) }
    }

    @Test
    fun `production rejects unsafe Clerk settings`() {
        val unsafe = listOf(
            properties(issuer = "https://example.clerk.accounts.dev"),
            properties(issuer = "https://EXAMPLE.CLERK.ACCOUNTS.DEV"),
            properties(audience = ""),
            properties(audience = "   "),
            properties(allowAudienceless = true),
            properties(parties = emptyList()),
            properties(parties = listOf("http://40love.example")),
            properties(parties = listOf("https://40love.example", "http://localhost:5173")),
            properties(parties = listOf("https://localhost:5173")),
            properties(parties = listOf("https://127.0.0.1")),
            properties(parties = listOf("https://[::1]")),
            properties(parties = listOf("https://40love.example/path")),
            properties(parties = listOf("https://user@40love.example")),
            properties(parties = listOf("https://40love.example?x=1")),
            properties(parties = listOf("not a url")),
            properties(secretKey = ""),
            properties(secretKey = "   "),
        )
        for (candidate in unsafe) {
            for (profile in listOf("prod", "PROD", "production")) {
                assertThrows(IllegalArgumentException::class.java, {
                    config.requireProductionSafe(candidate, arrayOf("default", profile))
                }, "${candidate.issuer} ${candidate.audience} ${candidate.authorizedParties} $profile")
            }
        }
    }

    @Test
    fun `development and test profiles keep their existing behaviour`() {
        val developmentSetup = properties(
            issuer = "https://example.clerk.accounts.dev",
            audience = "",
            parties = listOf("http://localhost:5173"),
            secretKey = "",
        )
        for (profiles in listOf(arrayOf<String>(), arrayOf("local"), arrayOf("test"), arrayOf("staging"))) {
            assertDoesNotThrow { config.requireProductionSafe(developmentSetup, profiles) }
        }
    }
}
