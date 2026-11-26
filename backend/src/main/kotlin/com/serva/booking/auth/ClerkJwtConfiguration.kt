
package com.serva.booking.auth

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.core.env.Environment
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator
import org.springframework.security.oauth2.core.OAuth2Error
import org.springframework.security.oauth2.core.OAuth2TokenValidator
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.security.oauth2.jwt.JwtDecoder
import org.springframework.security.oauth2.jwt.JwtValidators
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder
import java.net.URI

@ConfigurationProperties(prefix = "app.clerk")
class ClerkJwtProperties {
    var issuer: String = ""
    var audience: String = ""
    var allowAudienceless: Boolean = false
    var authorizedParties: List<String> = emptyList()
    /** Bound from app.clerk.secret-key only so production start-up can require it; never logged. */
    var secretKey: String = ""
}

@Configuration
@ConditionalOnProperty(
    prefix = "app.clerk",
    name = ["enabled"],
    havingValue = "true"
)
@EnableConfigurationProperties(ClerkJwtProperties::class)
class ClerkJwtConfiguration {

    @Bean
    fun clerkJwtDecoder(properties: ClerkJwtProperties, environment: Environment): JwtDecoder {
        requireProductionSafe(properties, environment.activeProfiles)
        val issuer = frontendApiIssuer(properties.issuer)
        val jwksUri = jwksUriForIssuer(issuer)

        val decoder = NimbusJwtDecoder
            .withJwkSetUri(jwksUri)
            .jwsAlgorithm(SignatureAlgorithm.RS256)
            .build()

        decoder.setJwtValidator(tokenValidators(properties))

        return decoder
    }

    internal fun tokenValidators(
        properties: ClerkJwtProperties
    ): OAuth2TokenValidator<Jwt> {

        val issuer = frontendApiIssuer(properties.issuer)

        val audience = properties.audience.trim()

        val authorizedParties = properties.authorizedParties
            .map(String::trim)
            .filter(String::isNotEmpty)
            .toSet()

        require(issuer.isNotEmpty()) {
            "CLERK_ISSUER must be configured"
        }

        require(authorizedParties.isNotEmpty()) {
            "CLERK_AUTHORIZED_PARTIES must contain at least one exact app origin"
        }

        val developmentInstance = URI(issuer).host.endsWith(".clerk.accounts.dev")
        require(audience.isNotEmpty() || properties.allowAudienceless || developmentInstance) {
            "Configure the Clerk API audience or explicitly approve audience-less sessions for a dedicated issuer"
        }
        val audienceValidator = OAuth2TokenValidator<Jwt> { jwt ->
            if (
                if (audience.isEmpty()) !jwt.hasClaim("aud") else audience in jwt.audience.orEmpty()
            ) {
                validToken()
            } else {
                invalidToken(
                    "clerk_audience_mismatch",
                    "Token audience is not allowed"
                )
            }
        }

        // Require the exact frontend origin.
        val authorizedPartyValidator = OAuth2TokenValidator<Jwt> { jwt ->
            val authorizedParty = jwt.getClaimAsString("azp")

            if (
                authorizedParty != null &&
                authorizedParty in authorizedParties
            ) {
                validToken()
            } else {
                invalidToken(
                    "clerk_authorized_party_mismatch",
                    "Token authorized party is missing or not allowed"
                )
            }
        }

        val requiredClaimsValidator = OAuth2TokenValidator<Jwt> { jwt ->
            if (
                !jwt.subject.isNullOrBlank() &&
                jwt.expiresAt != null &&
                jwt.notBefore != null
            ) {
                validToken()
            } else {
                invalidToken(
                    "clerk_required_claim_missing",
                    "Token is missing a required session claim"
                )
            }
        }

        return DelegatingOAuth2TokenValidator(
            JwtValidators.createDefaultWithIssuer(issuer),
            audienceValidator,
            authorizedPartyValidator,
            requiredClaimsValidator
        )
    }

    /**
     * Under a production profile the backend must not start with development-grade Clerk
     * settings: a development instance issuer, a missing audience, audience-less sessions, or
     * authorized parties that are not exact public HTTPS origins. Other profiles are unchanged.
     */
    internal fun requireProductionSafe(properties: ClerkJwtProperties, activeProfiles: Array<String>) {
        val production = activeProfiles.any { it.equals("prod", ignoreCase = true) || it.equals("production", ignoreCase = true) }
        if (!production) return

        val issuerHost = URI(frontendApiIssuer(properties.issuer)).host.lowercase()
        require(!issuerHost.endsWith(".clerk.accounts.dev")) {
            "Production must use a production Clerk instance, not a development issuer"
        }
        require(properties.audience.isNotBlank()) { "Production requires CLERK_API_AUDIENCE" }
        require(!properties.allowAudienceless) { "Production must not accept audience-less Clerk sessions" }
        // Without it every first sign-in (bootstrap) would fail with 503 after a "successful" start.
        require(properties.secretKey.isNotBlank()) { "Production requires CLERK_SECRET_KEY" }

        val parties = properties.authorizedParties.map(String::trim).filter(String::isNotEmpty)
        require(parties.isNotEmpty()) { "Production requires CLERK_AUTHORIZED_PARTIES" }
        for (party in parties) {
            val uri = runCatching { URI(party) }.getOrNull()
            val host = uri?.host?.lowercase()
            require(
                uri != null &&
                    uri.scheme.equals("https", ignoreCase = true) &&
                    !host.isNullOrBlank() &&
                    host !in LOCAL_HOSTS &&
                    uri.userInfo == null &&
                    uri.rawPath.isNullOrEmpty() &&
                    uri.rawQuery == null &&
                    uri.rawFragment == null
            ) {
                "Production CLERK_AUTHORIZED_PARTIES must be exact public HTTPS origins: $party"
            }
        }
    }

    private companion object {
        val LOCAL_HOSTS = setOf("localhost", "127.0.0.1", "[::1]", "::1")
    }

    private fun validToken() =
        OAuth2TokenValidatorResult.success()

    internal fun jwksUriForIssuer(configuredIssuer: String): String =
        "${frontendApiIssuer(configuredIssuer)}/.well-known/jwks.json"

    private fun frontendApiIssuer(configuredIssuer: String): String {
        val issuer = configuredIssuer.trim()

        val uri = runCatching {
            URI(issuer)
        }.getOrNull()

        require(
            issuer.isNotEmpty() &&
                    uri != null &&
                    uri.scheme.equals("https", ignoreCase = true) &&
                    !uri.host.isNullOrBlank() &&
                    uri.userInfo == null &&
                    uri.rawPath.isNullOrEmpty() &&
                    uri.rawQuery == null &&
                    uri.rawFragment == null
        ) {
            "CLERK_ISSUER must be the HTTPS Frontend API URL from Clerk Dashboard → Domains, with no path or trailing slash"
        }

        return issuer
    }

    private fun invalidToken(
        code: String,
        description: String
    ) = OAuth2TokenValidatorResult.failure(
        OAuth2Error(code, description, null)
    )
}
