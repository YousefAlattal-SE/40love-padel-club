package com.serva.booking.auth

import jakarta.validation.Validation
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.mockito.ArgumentMatchers.anyString
import org.mockito.ArgumentMatchers.eq
import org.mockito.Mockito.mock
import org.mockito.Mockito.times
import org.mockito.Mockito.verify
import org.mockito.Mockito.`when`
import org.springframework.security.crypto.password.PasswordEncoder

/** Items 5.1 and 5.2: legacy login does equal work for every outcome and bounds password size. */
class AuthServiceLoginTest {
    private val users = mock(UserRepository::class.java)
    private val encoder = mock(PasswordEncoder::class.java)
    private val jwt = mock(JwtService::class.java)

    init {
        `when`(encoder.encode(anyString())).thenReturn("\$2a\$10\$dummy-hash-for-unit-test")
    }

    private val service = AuthService(users, encoder, jwt)
    private val request = LoginRequest("member@example.test", "attempted-password")
    private val validator = Validation.buildDefaultValidatorFactory().validator

    @Test
    fun `unknown email still performs a password hash comparison`() {
        `when`(users.findByEmail("member@example.test")).thenReturn(null)

        assertThrows(InvalidCredentialsException::class.java) { service.login(request) }
        verify(encoder, times(1)).matches(eq("attempted-password"), anyString())
    }

    @Test
    fun `inactive and password-less accounts also perform a comparison and fail identically`() {
        val cases = listOf(
            User(id = 1, email = "member@example.test", passwordHash = "\$2a\$10\$stored", isActive = false),
            User(id = 2, email = "member@example.test", passwordHash = null),
        )
        for (user in cases) {
            `when`(users.findByEmail("member@example.test")).thenReturn(user)
            `when`(encoder.matches(anyString(), anyString())).thenReturn(true)
            val error = assertThrows(InvalidCredentialsException::class.java) { service.login(request) }
            assertEquals("Invalid email or password", error.message)
        }
        verify(encoder, times(2)).matches(eq("attempted-password"), anyString())
    }

    @Test
    fun `wrong password is rejected with the same error`() {
        `when`(users.findByEmail("member@example.test"))
            .thenReturn(User(id = 3, email = "member@example.test", passwordHash = "\$2a\$10\$stored"))
        `when`(encoder.matches("attempted-password", "\$2a\$10\$stored")).thenReturn(false)

        val error = assertThrows(InvalidCredentialsException::class.java) { service.login(request) }
        assertEquals("Invalid email or password", error.message)
    }

    @Test
    fun `password length is bounded before any hashing`() {
        fun violations(password: String) =
            validator.validate(LoginRequest("member@example.test", password)).map { it.propertyPath.toString() }

        assertTrue(violations("x".repeat(128)).isEmpty())
        assertEquals(listOf("password"), violations("x".repeat(129)))
        assertEquals(listOf("password"), violations("x".repeat(100_000)))
    }
}
