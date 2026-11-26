package com.serva.booking.auth

import org.junit.jupiter.api.Assertions.assertDoesNotThrow
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.nio.file.Files
import java.nio.file.Path
import java.util.UUID

/** Legacy JWT on/off behaviour of [JwtService]; pure unit test, no Spring context or database. */
class JwtServiceLegacyModeTest {

    @TempDir
    lateinit var home: Path

    private val user = User(id = 1, email = "fixture@example.test")
    private val secret = "test-only-${UUID.randomUUID()}-signing-key"

    @Test
    fun `disabled legacy needs no JWT_SECRET in any profile and writes no local key`() {
        for (profile in listOf("", "prod", "production", "test", "local")) {
            assertDoesNotThrow { JwtService("", 30, profile, home.toString(), legacyEnabled = false) }
        }
        assertFalse(Files.exists(home.resolve(".fortylove")))
    }

    @Test
    fun `disabled legacy never issues tokens`() {
        val service = JwtService(secret, 30, "", home.toString(), legacyEnabled = false)
        assertThrows(IllegalStateException::class.java) { service.generate(user) }
    }

    @Test
    fun `disabled legacy rejects tokens signed with the configured secret`() {
        val token = JwtService(secret, 30, "", home.toString(), legacyEnabled = true).generate(user)
        assertNull(JwtService(secret, 30, "", home.toString(), legacyEnabled = false).parse(token))
    }

    @Test
    fun `enabled legacy keeps requiring a secret outside the local profile`() {
        assertThrows(IllegalStateException::class.java) { JwtService("", 30, "", home.toString(), legacyEnabled = true) }
        assertThrows(IllegalStateException::class.java) { JwtService("", 30, "prod", home.toString(), legacyEnabled = true) }
    }

    @Test
    fun `enabled legacy still issues and accepts its own tokens`() {
        val service = JwtService(secret, 30, "", home.toString(), legacyEnabled = true)
        assertNotNull(service.parse(service.generate(user)))
    }
}
