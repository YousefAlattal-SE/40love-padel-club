package com.serva.booking.auth

import io.jsonwebtoken.Jwts
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import java.time.Instant
import java.util.Date

class LegacyTrustTest {
    @Test
    fun `only signed bounded API tokens from the legacy issuer are accepted`() {
        val key = Jwts.SIG.HS256.key().build()
        val secret = java.util.Base64.getEncoder().encodeToString(key.encoded)
        val signingKey = io.jsonwebtoken.security.Keys.hmacShaKeyFor(secret.toByteArray())
        val service = JwtService(secret, 30)
        val now = Instant.now()
        fun token(issuer: String = "fortylove-legacy", aud: String = "fortylove-api",
                  issued: Instant = now, expiry: Instant? = now.plusSeconds(120)): String {
            val builder = Jwts.builder().issuer(issuer).audience().add(aud).and().subject("1")
                .issuedAt(Date.from(issued)).claim("email", "fixture@example.test").claim("role", "member")
            expiry?.let { builder.expiration(Date.from(it)) }
            return builder.signWith(signingKey).compact()
        }
        assertNotNull(service.parse(token()))
        for (invalid in listOf(token("other"), token(aud = "other"), token(expiry = null),
            token(issued = now.minusSeconds(300), expiry = now.minusSeconds(120)), token(expiry = now.plusSeconds(1900)))) {
            assertNull(service.parse(invalid))
        }
        assertNull(JwtService(secret.reversed(), 30).parse(token()))
    }
}
