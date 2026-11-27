package com.serva.booking.testsupport

import com.serva.booking.auth.AuthUser
import com.serva.booking.auth.Role
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication
import org.springframework.test.web.servlet.request.RequestPostProcessor

/**
 * Admin changes are audited against a real `users` row (security item 8.2), so tests
 * authenticate as an [AuthUser] admin, exactly as the production authentication manager does.
 */
object AdminPrincipal {
    fun token(adminId: Long) = UsernamePasswordAuthenticationToken(
        AuthUser(adminId, "staff@example.test", Role.admin), null, listOf(SimpleGrantedAuthority("ROLE_ADMIN")),
    )

    fun of(adminId: Long): RequestPostProcessor = authentication(token(adminId))

    /** Inserts an admin fixture user (inside the caller's transaction) and returns its id. */
    fun insertAdmin(jdbc: JdbcTemplate, label: String): Long = jdbc.queryForObject(
        "insert into users(email,full_name,role) values (?, 'Admin fixture', 'admin') returning id",
        Long::class.java, "$label-${System.nanoTime()}@example.test",
    )!!
}
