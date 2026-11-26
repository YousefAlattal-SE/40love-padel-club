package com.serva.booking.auth

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.type.SqlTypes
import org.springframework.data.jpa.repository.JpaRepository
import java.time.Instant
import java.time.LocalDate

// Lowercase names match the user_role enum in PostgreSQL
@Suppress("EnumEntryName", "unused")
enum class Role { member, admin }

@Entity
@Table(name = "users")
class User(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    val email: String = "",

    @Column(name = "clerk_user_id", unique = true)
    val clerkUserId: String? = null,

    @Column(name = "password_hash")
    val passwordHash: String? = null,

    @Column(name = "full_name")
    var fullName: String = "",

    var phone: String? = null,

    @Column(name = "date_of_birth")
    var dateOfBirth: LocalDate? = null,

    var gender: String? = null,

    @Column(name = "skill_level")
    var skillLevel: String? = null,

    // Role and active state are written on insert only. The application never changes them
    // (administrators do so directly in PostgreSQL), so a future save of a modified entity
    // cannot escalate privileges or reactivate an account (security item 3.1a).
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "role", updatable = false)
    val role: Role = Role.member,

    @Column(name = "is_active", updatable = false)
    val isActive: Boolean = true,

    @Column(name = "created_at", updatable = false)
    val createdAt: Instant = Instant.now(),
)

interface UserRepository : JpaRepository<User, Long> {
    fun findByEmail(email: String): User?
    fun existsByEmail(email: String): Boolean
    fun findByClerkUserId(clerkUserId: String): User?
}
