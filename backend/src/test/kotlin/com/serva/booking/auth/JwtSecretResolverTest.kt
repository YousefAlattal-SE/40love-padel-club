package com.serva.booking.auth

import java.nio.file.Path
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue
import org.junit.jupiter.api.io.TempDir

class JwtSecretResolverTest {
    @TempDir
    lateinit var tempDir: Path

    @Test
    fun `creates a persistent strong local secret`() {
        val first = JwtSecretResolver.resolve("", "local", tempDir)
        val second = JwtSecretResolver.resolve("", "local", tempDir)

        assertEquals(first, second)
        assertTrue(first.length >= 64)
        assertTrue(java.nio.file.Files.exists(tempDir.resolve(".fortylove/local-jwt-secret")))
    }

    @Test
    fun `requires an explicit secret for production profiles`() {
        assertFailsWith<IllegalStateException> {
            JwtSecretResolver.resolve("", "production", tempDir)
        }
    }

    @Test
    fun `uses the configured secret in any profile`() {
        assertEquals("configured-secret", JwtSecretResolver.resolve("configured-secret", "prod", tempDir))
    }
}
