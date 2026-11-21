package com.serva.booking.auth

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Test
import org.mockito.Mockito.mock
import org.mockito.Mockito.`when`
import org.springframework.security.authentication.DisabledException
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.security.oauth2.jwt.JwtDecoder
import org.springframework.security.oauth2.server.resource.authentication.BearerTokenAuthenticationToken
import java.time.Instant
import java.util.Optional
import java.util.UUID

class ClerkOrLegacyJwtAuthenticationManagerTest {
    private val users = mock(UserRepository::class.java)
    private val decoder = mock(JwtDecoder::class.java)
    private val legacyJwtService = JwtService("test-only-${UUID.randomUUID()}-signing-key", 10)
    private val manager = ClerkOrLegacyJwtAuthenticationManager(decoder, legacyJwtService, users)

    @Test
    fun `uses current database role for legacy tokens instead of the token role`() {
        val token = legacyJwtService.generate(User(id = 15L, email = "member@example.test", role = Role.admin))
        val databaseUser = User(id = 15L, email = "member@example.test", role = Role.member)
        `when`(users.findById(15L)).thenReturn(Optional.of(databaseUser))

        val authentication = manager.authenticate(BearerTokenAuthenticationToken(token))

        assertEquals(AuthUser(15L, "member@example.test", Role.member), authentication.principal)
        assertEquals(listOf(SimpleGrantedAuthority("ROLE_MEMBER")), authentication.authorities)
    }

    @Test
    fun `loads Clerk user role from PostgreSQL on every authentication`() {
        val clerkToken = "verified-clerk-token"
        `when`(decoder.decode(clerkToken)).thenReturn(clerkJwt("user_clerk_1"))
        `when`(users.findByClerkUserId("user_clerk_1"))
            .thenReturn(User(id = 22L, email = "admin@example.test", clerkUserId = "user_clerk_1", role = Role.admin))

        val authentication = manager.authenticate(BearerTokenAuthenticationToken(clerkToken))

        assertEquals(AuthUser(22L, "admin@example.test", Role.admin), authentication.principal)
        assertEquals(listOf(SimpleGrantedAuthority("ROLE_ADMIN")), authentication.authorities)
    }

    @Test
    fun `unprovisioned Clerk subject receives no application authority`() {
        val clerkToken = "verified-clerk-token"
        `when`(decoder.decode(clerkToken)).thenReturn(clerkJwt("user_new"))
        `when`(users.findByClerkUserId("user_new")).thenReturn(null)

        val authentication = manager.authenticate(BearerTokenAuthenticationToken(clerkToken))

        assertEquals(ClerkIdentityPrincipal("user_new"), authentication.principal)
        assertEquals(emptyList<SimpleGrantedAuthority>(), authentication.authorities)
    }

    @Test
    fun `inactive database user is rejected`() {
        val clerkToken = "verified-clerk-token"
        `when`(decoder.decode(clerkToken)).thenReturn(clerkJwt("user_inactive"))
        `when`(users.findByClerkUserId("user_inactive"))
            .thenReturn(User(id = 23L, email = "inactive@example.test", clerkUserId = "user_inactive", isActive = false))

        assertThrows(DisabledException::class.java) {
            manager.authenticate(BearerTokenAuthenticationToken(clerkToken))
        }
    }

    private fun clerkJwt(userId: String): Jwt = Jwt.withTokenValue("verified-clerk-token")
        .header("alg", "RS256")
        .issuer("https://example.clerk.accounts.dev")
        .subject(userId)
        .issuedAt(Instant.now().minusSeconds(1))
        .expiresAt(Instant.now().plusSeconds(60))
        .claim("aud", "fortylove-api")
        .claim("azp", "https://40love.example")
        .build()
}
