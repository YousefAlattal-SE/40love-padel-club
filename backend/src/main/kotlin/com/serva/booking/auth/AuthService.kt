package com.serva.booking.auth

import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service

@Service
class AuthService(
    private val users: UserRepository,
    private val encoder: PasswordEncoder,
    private val jwt: JwtService,
) {

    // Hash of a value nobody can submit as "the" password; compared against when there is no usable
    // stored hash, so every login attempt costs one adaptive hash comparison (item 5.1).
    private val timingEqualiserHash: String by lazy {
        checkNotNull(encoder.encode("timing-equaliser-${java.util.UUID.randomUUID()}"))
    }

    fun login(req: LoginRequest): AuthResponse {
        val user = users.findByEmail(req.email.trim().lowercase())
        val storedHash = user?.passwordHash

        // Same error and the same hashing work for "no such email", inactive, Clerk-only and
        // "wrong password", so neither the message nor the response time reveals which emails exist.
        val passwordMatches = encoder.matches(req.password, storedHash ?: timingEqualiserHash)
        if (user == null || !user.isActive || storedHash == null || !passwordMatches) {
            throw InvalidCredentialsException()
        }
        return AuthResponse(jwt.generate(user), user.toResponse())
    }

    fun me(userId: Long): UserResponse =
        users.findById(userId).orElseThrow { InvalidCredentialsException() }.toResponse()
}
