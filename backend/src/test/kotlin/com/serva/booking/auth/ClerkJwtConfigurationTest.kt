package com.serva.booking.auth

import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm
import org.springframework.security.oauth2.jwt.JwtException
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder
import io.jsonwebtoken.Jwts
import java.security.KeyPairGenerator
import java.security.interfaces.RSAPublicKey
import java.util.Date
import java.time.Instant

class ClerkJwtConfigurationTest {
    private val issuer = "https://example.clerk.accounts.dev"
    private val origin = "https://40love.example"
    private val config = ClerkJwtConfiguration()
    private val properties = ClerkJwtProperties().apply {
        this.issuer = this@ClerkJwtConfigurationTest.issuer
        audience = "fortylove-api"
        authorizedParties = listOf(origin, "http://localhost:5173")
    }

    @Test
    fun `derives the instance JWKS URL from the configured issuer`() {
        assertEquals(
            "https://example.clerk.accounts.dev/.well-known/jwks.json",
            config.jwksUriForIssuer(issuer),
        )
    }

    @Test
    fun `accepts Clerk claims only with configured issuer audience and authorized party`() {
        val result = config.tokenValidators(properties).validate(jwt())

        assertFalse(result.hasErrors())
    }

    @Test
    fun `rejects missing or unexpected audience and authorized party`() {
        val validators = config.tokenValidators(properties)

        assertTrue(validators.validate(jwt(audience = emptyList())).hasErrors())
        assertTrue(validators.validate(jwt(authorizedParty = null)).hasErrors())
        assertTrue(validators.validate(jwt(authorizedParty = "https://attacker.example")).hasErrors())
    }

    @Test
    fun `rejects wrong issuer expired tokens and missing time claims`() {
        val validators = config.tokenValidators(properties)

        assertTrue(validators.validate(jwt(issuerValue = "https://other.clerk.accounts.dev")).hasErrors())
        assertTrue(validators.validate(jwt(expiresAt = Instant.now().minusSeconds(120))).hasErrors())
        assertTrue(validators.validate(jwt(expiresAt = null)).hasErrors())
        assertTrue(validators.validate(jwt(notBefore = null)).hasErrors())
    }

    @Test
    fun `verifies an RS256 signature and rejects a tampered token`() {
        val keyPair = KeyPairGenerator.getInstance("RSA").apply { initialize(2048) }.generateKeyPair()
        val decoder = NimbusJwtDecoder.withPublicKey(keyPair.public as RSAPublicKey)
            .signatureAlgorithm(SignatureAlgorithm.RS256)
            .build()
        decoder.setJwtValidator(config.tokenValidators(properties))

        val now = Instant.now()
        val signedToken = Jwts.builder()
            .issuer(issuer)
            .subject("user_signed")
            .claim("aud", listOf("fortylove-api"))
            .claim("azp", origin)
            .issuedAt(Date.from(now.minusSeconds(30)))
            .notBefore(Date.from(now.minusSeconds(1)))
            .expiration(Date.from(now.plusSeconds(120)))
            .signWith(keyPair.private, Jwts.SIG.RS256)
            .compact()

        assertEquals("user_signed", decoder.decode(signedToken).subject)
        val parts = signedToken.split('.')
        val signature = parts[2]
        val changedFirstSignatureCharacter = if (signature.first() == 'A') 'B' else 'A'
        val tampered = "${parts[0]}.${parts[1]}.$changedFirstSignatureCharacter${signature.drop(1)}"
        assertThrows(JwtException::class.java) { decoder.decode(tampered) }
    }

    private fun jwt(
        issuerValue: String = issuer,
        audience: List<String> = listOf("fortylove-api"),
        authorizedParty: String? = origin,
        expiresAt: Instant? = Instant.now().plusSeconds(120),
        notBefore: Instant? = Instant.now().minusSeconds(1),
    ): Jwt {
        val builder = Jwt.withTokenValue("test-token")
            .header("alg", "RS256")
            .issuer(issuerValue)
            .subject("user_test")
            .audience(audience)
            .issuedAt(Instant.now().minusSeconds(300))
        expiresAt?.let(builder::expiresAt)
        notBefore?.let(builder::notBefore)
        authorizedParty?.let { builder.claim("azp", it) }
        return builder.build()
    }
}
