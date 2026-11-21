package com.serva.booking.auth

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.security.authentication.AuthenticationManager
import org.springframework.security.authentication.BadCredentialsException
import org.springframework.security.authentication.DisabledException
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.Authentication
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.oauth2.jwt.JwtDecoder
import org.springframework.security.oauth2.jwt.JwtException
import org.springframework.security.oauth2.jwt.JwtValidationException
import org.springframework.security.oauth2.server.resource.authentication.BearerTokenAuthenticationToken
import org.springframework.stereotype.Component

data class ClerkIdentityPrincipal(val clerkUserId: String)

/** Accepts the existing app JWT or a verified Clerk session JWT during the transition. */
@Component
@ConditionalOnProperty(prefix = "app.clerk", name = ["enabled"], havingValue = "true")
class ClerkOrLegacyJwtAuthenticationManager(
    private val jwtDecoder: JwtDecoder,
    private val legacyJwtService: JwtService,
    private val users: UserRepository,
) : AuthenticationManager {

    override fun authenticate(authentication: Authentication): Authentication {
        val bearer = authentication as? BearerTokenAuthenticationToken
            ?: throw ClerkTokenAuthenticationException("unsupported_bearer_authentication")

        // Keep old issued tokens valid during rollout, but fetch their current role from PostgreSQL.
        val legacyUser = legacyJwtService.parse(bearer.token)
        if (legacyUser != null) {
            val user = users.findById(legacyUser.id).orElseThrow {
                BadCredentialsException("Account is unavailable")
            }
            return authenticateDatabaseUser(user)
        }

        val clerkJwt = try {
            jwtDecoder.decode(bearer.token)
        } catch (error: JwtException) {
            throw ClerkTokenAuthenticationException(ClerkTokenFailureClassifier.classify(error))
        }

        val clerkUserId = clerkJwt.subject?.takeIf { it.isNotBlank() }
            ?: throw ClerkTokenAuthenticationException("missing_subject")
        val user = users.findByClerkUserId(clerkUserId)
            ?: return UsernamePasswordAuthenticationToken(ClerkIdentityPrincipal(clerkUserId), null, emptyList())

        return authenticateDatabaseUser(user)
    }

    private fun authenticateDatabaseUser(user: User): Authentication {
        if (!user.isActive) throw DisabledException("Account is inactive")
        val principal = AuthUser(user.id, user.email, user.role)
        val authority = SimpleGrantedAuthority("ROLE_${user.role.name.uppercase()}")
        return UsernamePasswordAuthenticationToken(principal, null, listOf(authority))
    }
}

/** Carries a safe diagnostic category through Spring Security without retaining token text. */
class ClerkTokenAuthenticationException(val diagnosticReason: String) : BadCredentialsException("Invalid bearer token")

internal object ClerkTokenFailureClassifier {
    fun classify(error: JwtException): String {
        val validationErrors = (error as? JwtValidationException)?.errors.orEmpty()
        val errorCodes = validationErrors.map { it.errorCode }.toSet()
        if ("clerk_audience_mismatch" in errorCodes) return "audience_mismatch"
        if ("clerk_authorized_party_mismatch" in errorCodes) return "authorized_party_mismatch"
        if ("clerk_required_claim_missing" in errorCodes) return "required_claim_missing"

        val details = buildList {
            validationErrors.mapNotNullTo(this) { it.description }
            generateSequence(error as Throwable?) { it.cause }.mapNotNullTo(this) { it.message }
        }.joinToString(" ").lowercase()

        return when {
            "expired" in details -> "expired_token"
            "issuer" in details || "iss claim" in details -> "issuer_mismatch"
            "not before" in details || "not yet valid" in details -> "token_not_yet_valid"
            "signature" in details -> "invalid_signature"
            else -> "malformed_or_unverifiable_token"
        }
    }
}
