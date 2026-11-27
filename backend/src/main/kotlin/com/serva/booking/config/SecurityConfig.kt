
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
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.web.access.AccessDeniedHandlerImpl
import org.springframework.security.web.access.intercept.AuthorizationFilter
import org.springframework.security.web.header.HeaderWriter
import org.springframework.security.web.header.writers.HstsHeaderWriter
import org.springframework.security.web.header.writers.StaticHeadersWriter
import org.springframework.security.web.util.matcher.AnyRequestMatcher
import org.springframework.beans.factory.annotation.Value
import org.slf4j.LoggerFactory
import org.springframework.core.env.Environment

@Configuration
@EnableMethodSecurity // enables the @PreAuthorize second layer on admin routes (item 9.1)
class SecurityConfig(
    private val jwtService: JwtService,
    private val users: UserRepository,
    private val clerkAuthenticationManager: ObjectProvider<ClerkOrLegacyJwtAuthenticationManager>,
    private val environment: Environment,
    @Value($$"${app.clerk.enabled:false}") private val clerkAuthenticationEnabled: Boolean,
    @Value($$"${app.auth.legacy-jwt-enabled:false}") private val legacyJwtEnabled: Boolean,
) {

    @Value($$"${app.api.sensitive-per-minute:20}")
    private var sensitivePerMinute = 20
    @Value($$"${app.api.general-per-minute:240}")
    private var generalPerMinute = 240
    @Value($$"${app.api.write-per-minute:30}")
    private var writePerMinute = 30

    /** Item 12.1: proxies allowed to report the client address; empty means trust nobody. */
    @Value($$"${app.security.trusted-proxies:}")
    private var trustedProxiesSpec = ""

    @Value($$"${app.public-origin:}")
    private var publicOrigin = ""

    @Value($$"${app.clerk.issuer:}")
    private var clerkIssuer = ""

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

    internal fun isProductionProfile(): Boolean =
        environment.activeProfiles.any {
            it.equals("prod", ignoreCase = true) ||
                    it.equals("production", ignoreCase = true)
        }

    /**
     * Item 4.1: a TLS-terminating proxy forwards plain HTTP and forwarded headers are not trusted
     * (forward-headers-strategy=none), so the default secure-request-only HSTS writer never fires.
     * Production therefore writes HSTS on every response; browsers ignore it over HTTP.
     * Subdomains and preload are not opted in, so unknown subdomains are not forced to HTTPS.
     */
    internal fun productionHstsWriter(): HstsHeaderWriter =
        HstsHeaderWriter().apply {
            setRequestMatcher(AnyRequestMatcher.INSTANCE)
            setMaxAgeInSeconds(31_536_000)
            setIncludeSubDomains(false)
            setPreload(false)
        }

    /**
     * Item 7.2: full production policy for the React + Clerk front end. It is sent as
     * Content-Security-Policy-Report-Only first, so a gap is reported by the browser instead of
     * breaking sign-in; enforce it only after staging shows no violations. Clerk's documented
     * needs: its Frontend API for scripts and XHR, img.clerk.com, the Cloudflare bot challenge
     * (script + frame), blob workers and runtime-injected styles. Clerk's abuse and fraud protection
     * runs on *.protect.clerk.com (script, frame, and XHR on ports other than 443, hence `:*`);
     * a local browser check showed its script and connections blocked without these entries.
     */
    internal fun productionCspReportOnly(issuer: String): String {
        val clerk = issuer.trim().takeIf { it.isNotEmpty() }
        fun sources(vararg values: String?) = values.filterNotNull().joinToString(" ")
        val clerkProtect = "https://*.protect.clerk.com"
        return listOf(
            "default-src 'self'",
            "script-src " + sources("'self'", clerk, "https://challenges.cloudflare.com", clerkProtect),
            "style-src 'self' 'unsafe-inline'",
            "img-src " + sources("'self'", "data:", "https://img.clerk.com", "https://images.unsplash.com"),
            "font-src 'self' data:",
            "connect-src " + sources("'self'", clerk, "$clerkProtect:*"),
            // Clerk's bot challenge and fraud protection, and the Google Maps embed on the home page (item 14.3).
            "frame-src https://challenges.cloudflare.com $clerkProtect https://www.google.com",
            "worker-src 'self' blob:",
            "object-src 'none'",
            "base-uri 'self'",
            "frame-ancestors 'self'",
            "form-action 'self'",
        ).joinToString("; ")
    }

    internal companion object {
        /**
         * Features the site never uses. Not restricted on purpose: fullscreen (the map embed uses
         * allowFullScreen) and publickey-credentials-* (Clerk passkeys, if enabled).
         */
        const val PERMISSIONS_POLICY =
            "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), " +
                "bluetooth=(), magnetometer=(), gyroscope=(), accelerometer=()"
    }

    internal fun productionCspWriter(): HeaderWriter =
        StaticHeadersWriter("Content-Security-Policy-Report-Only", productionCspReportOnly(clerkIssuer))

    internal fun validateAuthenticationMode() {
        val productionMode = isProductionProfile()

        if (productionMode) {
            require(clerkAuthenticationEnabled) {
                "Production requires Clerk authentication to be enabled"
            }

            require(!legacyJwtEnabled) {
                "Production must not accept legacy JWT authentication"
            }
        }

        require(clerkAuthenticationEnabled || legacyJwtEnabled) {
            "At least one authentication provider must be enabled"
        }
    }

    @Bean
    fun passwordEncoder(): PasswordEncoder = BCryptPasswordEncoder()

    @Bean
    fun filterChain(http: HttpSecurity): SecurityFilterChain {
        validateAuthenticationMode()
        // Invalid TRUSTED_PROXIES entries fail start-up instead of being silently ignored.
        val trustedProxies = TrustedProxies.parse(trustedProxiesSpec)
        SecurityEvents.useTrustedProxies(trustedProxies)
        logger.info("Trusted proxies configured: {}", if (trustedProxies.enabled) "yes" else "none (direct client address)")

        http
            .addFilterBefore(
                ApiLimitsFilter(
                    sensitivePerMinute = sensitivePerMinute,
                    generalPerMinute = generalPerMinute,
                    writePerMinute = writePerMinute,
                    trustedProxies = trustedProxies,
                ),
                org.springframework.security.web.authentication.logout.LogoutFilter::class.java,
            )
            .cors { cors ->
                val source = org.springframework.web.cors.UrlBasedCorsConfigurationSource()
                // Allow an exact external UI origin when the proxy terminates TLS.
                source.registerCorsConfiguration("/api/**", apiCors())
                cors.configurationSource(source)
            }
            .headers { headers ->
                headers.contentSecurityPolicy { it.policyDirectives("object-src 'none'; base-uri 'self'; frame-ancestors 'self'") }
                headers.referrerPolicy { it.policy(org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter.ReferrerPolicy.SAME_ORIGIN) }
                // Item 14.2: match the CSP frame-ancestors 'self' for browsers that only read this header.
                headers.frameOptions { it.sameOrigin() }
                // Item 14.1: switch off browser features the site never uses.
                headers.addHeaderWriter(StaticHeadersWriter("Permissions-Policy", PERMISSIONS_POLICY))
                if (isProductionProfile()) {
                    headers.httpStrictTransportSecurity { it.disable() }
                    headers.addHeaderWriter(productionHstsWriter())
                    headers.addHeaderWriter(productionCspWriter())
                }
            }
            .csrf {
                it.disable()
            }
            .sessionManagement {
                it.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            }
            .exceptionHandling {
                // Item 8.1: record rejected authorization (403) without personal data.
                it.accessDeniedHandler { request, response, exception ->
                    SecurityEvents.accessDenied(request, SecurityContextHolder.getContext().authentication)
                    AccessDeniedHandlerImpl().handle(request, response, exception)
                }
                it.authenticationEntryPoint { request, response, _ ->

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
                    SecurityEvents.authenticationFailed(request, reason)

                    if (request.requestURI.endsWith("/api/auth/bootstrap")) {

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
                "Authentication mode enabled: Clerk session JWT; legacy JWT enabled={}",
                legacyJwtEnabled
            )

            val bearerFilter = BearerTokenAuthenticationFilter(manager)
            val bearerEntryPoint = BearerTokenAuthenticationEntryPoint()

            bearerFilter.setAuthenticationEntryPoint { request, response, exception ->

                val reason = when (exception) {
                    is ClerkTokenAuthenticationException ->
                        exception.diagnosticReason

                    is DisabledException ->
                        "database_account_inactive"

                    else ->
                        "bearer_authentication_failed"
                }
                SecurityEvents.authenticationFailed(request, reason)

                if (request.requestURI.endsWith("/api/auth/bootstrap")) {

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

        // Item 8.1: audit successful admin changes once authorization has passed.
        http.addFilterAfter(AdminChangeAuditFilter(), AuthorizationFilter::class.java)

        return http.build()
    }
}
