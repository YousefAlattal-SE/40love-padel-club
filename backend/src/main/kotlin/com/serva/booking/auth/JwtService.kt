package com.serva.booking.auth

import io.jsonwebtoken.Jwts
import io.jsonwebtoken.security.Keys
import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.beans.factory.annotation.Value
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Service
import org.springframework.web.filter.OncePerRequestFilter
import java.time.Instant
import java.time.temporal.ChronoUnit
import java.util.Date
import java.nio.file.Path
import javax.crypto.SecretKey

@Service
class JwtService(
    @Value($$"${app.jwt.secret}") secret: String,
    @Value($$"${app.jwt.expiration-minutes}") private val expirationMinutes: Long,
    @Value($$"${spring.profiles.active:}") activeProfiles: String = "local",
    @Value($$"${user.home}") userHome: String = System.getProperty("user.home"),
    // Kotlin default stays true so existing direct constructions (tests) keep legacy behaviour;
    // Spring always injects the property, whose default is false.
    @Value($$"${app.auth.legacy-jwt-enabled:false}") private val legacyEnabled: Boolean = true,
) {
    // The secret must be at least 32 characters for HS256. When legacy authentication is
    // disabled no JWT_SECRET is required: a random in-memory key is used and never issued.
    private val key: SecretKey = if (legacyEnabled) {
        Keys.hmacShaKeyFor(
            JwtSecretResolver.resolve(secret, activeProfiles, Path.of(userHome)).toByteArray(Charsets.UTF_8),
        )
    } else {
        Jwts.SIG.HS256.key().build()
    }

    init {
        require(expirationMinutes in 1..60) { "Legacy token lifetime must be between 1 and 60 minutes" }
    }

    fun generate(user: User): String {
        check(legacyEnabled) { "Legacy JWT authentication is disabled" }
        val now = Instant.now()
        return Jwts.builder()
            .issuer("fortylove-legacy")
            .audience().add("fortylove-api").and()
            .subject(user.id.toString())
            .claim("email", user.email)
            .claim("role", user.role.name)
            .issuedAt(Date.from(now))
            .expiration(Date.from(now.plus(expirationMinutes, ChronoUnit.MINUTES)))
            .signWith(key)
            .compact()
    }

    /** Returns the user inside a valid token, or null if the token is invalid or expired. */
    fun parse(token: String): AuthUser? = if (!legacyEnabled) null else try {
        val claims = Jwts.parser().verifyWith(key)
            .requireIssuer("fortylove-legacy").requireAudience("fortylove-api")
            .build().parseSignedClaims(token).payload
        val issued = requireNotNull(claims.issuedAt).toInstant()
        val expires = requireNotNull(claims.expiration).toInstant()
        require(!issued.isAfter(Instant.now()) && expires.isAfter(issued) &&
            !expires.isAfter(issued.plus(expirationMinutes, ChronoUnit.MINUTES)))
        AuthUser(
            id = claims.subject.toLong(),
            email = claims["email"] as String,
            role = Role.valueOf(claims["role"] as String),
        )
    } catch (_: Exception) {
        null
    }
}

/**
 * Runs on every request: if there is a valid "Authorization: Bearer <token>" header,
 * mark the request as logged in. Otherwise, leave it anonymous (Spring Security then blocks it).
 */
class JwtAuthFilter(
    private val jwtService: JwtService,
    private val users: UserRepository,
) : OncePerRequestFilter() {

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain,
    ) {
        val header = request.getHeader("Authorization")
        if (header != null && header.startsWith("Bearer ")) {
            jwtService.parse(header.substring(7))?.let { tokenUser ->
                // Keep the legacy token verifier during rollout, but never authorize
                // using the role embedded in that token. PostgreSQL is the role source.
                val user = users.findById(tokenUser.id).orElse(null)
                if (user != null && user.isActive) {
                    val principal = AuthUser(user.id, user.email, user.role)
                    val authority = SimpleGrantedAuthority("ROLE_${user.role.name.uppercase()}")
                    SecurityContextHolder.getContext().authentication =
                        UsernamePasswordAuthenticationToken(principal, null, listOf(authority))
                }
            }
        }
        filterChain.doFilter(request, response)
    }
}
