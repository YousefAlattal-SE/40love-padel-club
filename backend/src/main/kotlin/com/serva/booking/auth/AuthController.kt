package com.serva.booking.auth

import jakarta.validation.Valid
import org.springframework.security.core.Authentication
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/auth")
class AuthController(
    private val auth: AuthService,
    private val clerkUsers: ClerkUserProvisioningService,
) {

    @PostMapping("/login")
    fun login(@Valid @RequestBody req: LoginRequest): AuthResponse = auth.login(req)

    /** Creates or loads the app profile for an already verified Clerk session. */
    @PostMapping("/bootstrap")
    fun bootstrap(
        authentication: Authentication,
        @Valid @RequestBody(required = false) request: ClerkBootstrapRequest?,
    ): UserResponse = when (val principal = authentication.principal) {
        is AuthUser -> auth.me(principal.id)
        is ClerkIdentityPrincipal -> clerkUsers.bootstrap(principal.clerkUserId, request?.phone)
        else -> throw InvalidCredentialsException()
    }

    // Returns the logged-in user; handy for the frontend to check a stored token is still valid
    @GetMapping("/me")
    fun me(@AuthenticationPrincipal user: AuthUser): UserResponse = auth.me(user.id)
}
