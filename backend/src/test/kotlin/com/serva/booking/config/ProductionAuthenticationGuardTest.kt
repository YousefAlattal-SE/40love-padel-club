
package com.serva.booking.config

import com.serva.booking.auth.ClerkOrLegacyJwtAuthenticationManager
import com.serva.booking.auth.JwtService
import com.serva.booking.auth.UserRepository
import org.junit.jupiter.api.Assertions.assertDoesNotThrow
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Test
import org.mockito.Mockito.mock
import org.springframework.beans.factory.ObjectProvider
import org.springframework.mock.env.MockEnvironment

class ProductionAuthenticationGuardTest {

    private fun securityConfig(
        profile: String,
        clerkEnabled: Boolean,
        legacyEnabled: Boolean
    ): SecurityConfig {
        val environment = MockEnvironment()
        if (profile.isNotEmpty()) {
            environment.withProperty("spring.profiles.active", profile)
            environment.setActiveProfiles(profile)
        }

        @Suppress("UNCHECKED_CAST")
        val managerProvider = mock(
            ObjectProvider::class.java
        ) as ObjectProvider<ClerkOrLegacyJwtAuthenticationManager>

        return SecurityConfig(
            mock(JwtService::class.java),
            mock(UserRepository::class.java),
            managerProvider,
            environment,
            clerkEnabled,
            legacyEnabled
        )
    }

    @Test
    fun `production rejects enabled legacy JWT`() {
        val config = securityConfig("prod", true, true)

        assertThrows(IllegalArgumentException::class.java) {
            config.validateAuthenticationMode()
        }
    }

    @Test
    fun `production rejects disabled Clerk`() {
        val config = securityConfig("prod", false, false)

        assertThrows(IllegalArgumentException::class.java) {
            config.validateAuthenticationMode()
        }
    }

    @Test
    fun `production accepts Clerk only`() {
        val config = securityConfig("prod", true, false)

        assertDoesNotThrow {
            config.validateAuthenticationMode()
        }
    }

    @Test
    fun `local permits legacy authentication`() {
        val config = securityConfig("local", false, true)

        assertDoesNotThrow {
            config.validateAuthenticationMode()
        }
    }

    @Test
    fun `production alias also rejects enabled legacy JWT`() {
        val config = securityConfig("production", true, true)

        assertThrows(IllegalArgumentException::class.java) {
            config.validateAuthenticationMode()
        }
    }

    @Test
    fun `no profile with the default Clerk-only configuration is accepted`() {
        val config = securityConfig("", true, false)

        assertDoesNotThrow {
            config.validateAuthenticationMode()
        }
    }

    @Test
    fun `all authentication providers disabled is rejected`() {
        val config = securityConfig("local", false, false)

        assertThrows(IllegalArgumentException::class.java) {
            config.validateAuthenticationMode()
        }
    }
}
