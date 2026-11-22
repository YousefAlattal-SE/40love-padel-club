package com.serva.booking.auth

import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service

@Service
class AuthService(
    private val users: UserRepository,
    private val encoder: PasswordEncoder,
    private val jwt: JwtService,
) {

    fun login(req: LoginRequest): AuthResponse {
        val user = users.findByEmail(req.email.trim().lowercase())

        // Same error for "no such email" and "wrong password" so attackers can't probe which emails exist
        if (user == null || !user.isActive || user.passwordHash?.let { encoder.matches(req.password, it) } != true) {
            throw InvalidCredentialsException()
        }
        return AuthResponse(jwt.generate(user), user.toResponse())
    }

    fun me(userId: Long): UserResponse =
        users.findById(userId).orElseThrow { InvalidCredentialsException() }.toResponse()
}
