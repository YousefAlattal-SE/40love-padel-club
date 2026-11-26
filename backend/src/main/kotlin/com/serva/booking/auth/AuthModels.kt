package com.serva.booking.auth

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

/** Contact data sent by the app while creating a new Clerk-backed member profile. */
data class ClerkBootstrapRequest(
    @field:Size(max = 40)
    val phone: String? = null,
)

data class LoginRequest(
    @field:NotBlank val email: String,
    // BCrypt only uses the first 72 bytes; the bound also stops oversized inputs (item 5.2).
    @field:NotBlank @field:Size(max = 128) val password: String,
)

data class UserResponse(
    val id: Long,
    val email: String,
    val fullName: String,
    val phone: String?,
    val role: Role,
)

data class AuthResponse(val token: String, val user: UserResponse)

/** The logged-in user, rebuilt from the JWT on every request. */
data class AuthUser(val id: Long, val email: String, val role: Role)

fun User.toResponse() = UserResponse(id, email, fullName, phone, role)

class EmailAlreadyUsedException : RuntimeException("Email already registered")

class InvalidCredentialsException : RuntimeException("Invalid email or password")
