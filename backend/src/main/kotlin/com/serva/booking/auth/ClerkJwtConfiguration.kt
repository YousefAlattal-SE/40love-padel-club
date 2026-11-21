
package com.serva.booking.auth

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
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
    var authorizedParties: List<String> = emptyList()
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
    fun clerkJwtDecoder(properties: ClerkJwtProperties): JwtDecoder {
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

        // Audience is optional because the current Clerk session token
        // does not contain an aud claim.
        val audienceValidator = OAuth2TokenValidator<Jwt> { jwt ->
            if (
                audience.isEmpty() ||
                audience in jwt.audience.orEmpty()
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
