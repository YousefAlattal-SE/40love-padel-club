
package com.serva.booking.config

import com.serva.booking.auth.JwtAuthFilter
import com.serva.booking.auth.JwtService
import com.serva.booking.auth.ClerkOrLegacyJwtAuthenticationManager
import com.serva.booking.auth.ClerkTokenAuthenticationException
import com.serva.booking.auth.UserRepository
import org.springframework.beans.factory.ObjectProvider
import org.springframework.security.authentication.DisabledException
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.http.HttpStatus
import org.springframework.security.oauth2.server.resource.web.BearerTokenAuthenticationEntryPoint
import org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.http.SessionCreationPolicy
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.security.web.SecurityFilterChain
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter
import org.springframework.beans.factory.annotation.Value
import org.slf4j.LoggerFactory

@Configuration
class SecurityConfig(
    private val jwtService: JwtService,
    private val users: UserRepository,
    private val clerkAuthenticationManager: ObjectProvider<ClerkOrLegacyJwtAuthenticationManager>,
    @Value($$"${app.clerk.enabled:false}") private val clerkAuthenticationEnabled: Boolean,
) {

    @Value($$"${app.api.sensitive-per-minute:20}")
    private var sensitivePerMinute = 20
    @Value($$"${app.api.general-per-minute:240}")
    private var generalPerMinute = 240

    @Value($$"${app.public-origin:}")
    private var publicOrigin = ""

    private fun apiCors(): org.springframework.web.cors.CorsConfiguration {
        val config = org.springframework.web.cors.CorsConfiguration()
        if (publicOrigin.isBlank()) return config
        val uri = java.net.URI(publicOrigin)
        require(uri.scheme == "https" && uri.host != null && uri.userInfo == null &&
            uri.rawPath.isNullOrEmpty() && uri.rawQuery == null && uri.rawFragment == null) {
            "APP_PUBLIC_ORIGIN must be one exact HTTPS origin without a path"
        }
        config.allowedOrigins = listOf(publicOrigin)
        config.allowedMethods = listOf("GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS")
        config.allowedHeaders = listOf("Authorization", "Content-Type", "Accept")
        return config
    }

    private val logger = LoggerFactory.getLogger(SecurityConfig::class.java)

    @Bean
    fun passwordEncoder(): PasswordEncoder = BCryptPasswordEncoder()

    @Bean
    fun filterChain(http: HttpSecurity): SecurityFilterChain {

        http
            .addFilterBefore(ApiLimitsFilter(sensitivePerMinute = sensitivePerMinute, generalPerMinute = generalPerMinute), org.springframework.security.web.authentication.logout.LogoutFilter::class.java)
            .cors { cors ->
                val source = org.springframework.web.cors.UrlBasedCorsConfigurationSource()
                // Allow an exact external UI origin when the proxy terminates TLS.
                source.registerCorsConfiguration("/api/**", apiCors())
                cors.configurationSource(source)
            }
            .headers { headers ->
                headers.contentSecurityPolicy { it.policyDirectives("object-src 'none'; base-uri 'self'; frame-ancestors 'self'") }
                headers.referrerPolicy { it.policy(org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter.ReferrerPolicy.SAME_ORIGIN) }
            }
            .csrf {
                it.disable()
            }
            .sessionManagement {
                it.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            }
            .exceptionHandling {
                it.authenticationEntryPoint { request, response, _ ->

                    if (request.requestURI.endsWith("/api/auth/bootstrap")) {

                        val authorization = request.getHeader("Authorization")

                        val reason = when {
                            authorization.isNullOrBlank() ->
                                "missing_bearer_token"

                            !authorization.startsWith("Bearer ", ignoreCase = true) ->
                                "malformed_authorization_header"

                            !clerkAuthenticationEnabled ->
                                "clerk_authentication_disabled"

                            else ->
                                "authentication_not_established"
                        }

                        // Diagnostic logging only. Never log the actual token.
                        logger.warn(
                            "Bootstrap rejected: method={}, uri={}, authorizationPresent={}, bearerPrefix={}, reason={}",
                            request.method,
                            request.requestURI,
                            !authorization.isNullOrBlank(),
                            authorization?.startsWith("Bearer ", ignoreCase = true) == true,
                            reason
                        )
                    }

                    response.sendError(HttpStatus.UNAUTHORIZED.value())
                }
            }
            .authorizeHttpRequests {
                it
                    .requestMatchers(
                        "/api/auth/login"
                    ).permitAll()

                    .requestMatchers(
                        org.springframework.http.HttpMethod.POST,
                        "/api/auth/bootstrap"
                    ).authenticated()

                    .requestMatchers(
                        org.springframework.http.HttpMethod.POST,
                        "/api/contact-messages"
                    ).permitAll()

                    .requestMatchers(
                        "/error",
                        "/api/pricing"
                    ).permitAll()

                    // Public matchmaking routes.
                    .requestMatchers(
                        org.springframework.http.HttpMethod.GET,
                        "/api/matches",
                        "/api/matches/{id:[0-9]+}"
                    ).permitAll()

                    // Public courts list.
                    .requestMatchers(
                        org.springframework.http.HttpMethod.GET,
                        "/api/courts"
                    ).permitAll()

                    .requestMatchers("/api/admin/**").hasRole("ADMIN")

                    // Remaining API routes require an authenticated app role.
                    .requestMatchers("/api/**").hasAnyRole("MEMBER", "ADMIN")

                    .anyRequest().permitAll()
            }

        if (clerkAuthenticationEnabled) {

            val manager = clerkAuthenticationManager.ifAvailable
                ?: error(
                    "Clerk authentication is enabled, but its authentication manager is unavailable"
                )

            logger.info(
                "Authentication mode enabled: Clerk session JWT and legacy JWT"
            )

            val bearerFilter = BearerTokenAuthenticationFilter(manager)
            val bearerEntryPoint = BearerTokenAuthenticationEntryPoint()

            bearerFilter.setAuthenticationEntryPoint { request, response, exception ->

                if (request.requestURI.endsWith("/api/auth/bootstrap")) {

                    val reason = when (exception) {
                        is ClerkTokenAuthenticationException ->
                            exception.diagnosticReason

                        is DisabledException ->
                            "database_account_inactive"

                        else ->
                            "bearer_authentication_failed"
                    }

                    logger.warn(
                        "Clerk bootstrap bearer rejected: {}",
                        reason
                    )
                }

                bearerEntryPoint.commence(request, response, exception)
            }

            http.addFilterBefore(
                bearerFilter,
                UsernamePasswordAuthenticationFilter::class.java
            )

        } else {

            logger.info(
                "Authentication mode enabled: legacy JWT only (Clerk authentication is disabled)"
            )

            http.addFilterBefore(
                JwtAuthFilter(jwtService, users),
                UsernamePasswordAuthenticationFilter::class.java
            )
        }

        return http.build()
    }
}
