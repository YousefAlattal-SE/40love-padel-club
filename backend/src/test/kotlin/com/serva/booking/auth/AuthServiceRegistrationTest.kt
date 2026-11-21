package com.serva.booking.auth

import jakarta.validation.Validation
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.mockito.ArgumentMatchers.any
import org.mockito.Mockito.mock
import org.mockito.Mockito.`when`
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.springframework.test.web.servlet.setup.MockMvcBuilders
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean

class AuthServiceRegistrationTest {
    @Test
    fun `registers a member when the optional phone is omitted`() {
        val users = mock(UserRepository::class.java)
        val encoder = mock(org.springframework.security.crypto.password.PasswordEncoder::class.java)
        val jwt = JwtService("registration-test-secret-that-is-long-enough", 30, "test", System.getProperty("java.io.tmpdir"))
        `when`(users.existsByEmail("new@example.test")).thenReturn(false)
        `when`(encoder.encode("secure-password")).thenReturn("encoded-password")
        `when`(users.save(any(User::class.java))).thenAnswer { it.getArgument<User>(0) }

        val response = AuthService(users, encoder, jwt).register(
            RegisterRequest(
                email = "new@example.test",
                password = "secure-password",
                fullName = "New Member",
            ),
        )

        assertTrue(response.token.isNotBlank())
        assertEquals(Role.member, response.user.role)
        assertNull(response.user.phone)

        val validator = Validation.buildDefaultValidatorFactory().validator
        assertTrue(validator.validate(RegisterRequest("new@example.test", "secure-password", "New Member")).isEmpty())
    }

    @Test
    fun `registration endpoint accepts a request with no phone property`() {
        val users = mock(UserRepository::class.java)
        val encoder = mock(org.springframework.security.crypto.password.PasswordEncoder::class.java)
        val jwt = JwtService("registration-test-secret-that-is-long-enough", 30, "test", System.getProperty("java.io.tmpdir"))
        `when`(users.existsByEmail("new@example.test")).thenReturn(false)
        `when`(encoder.encode("secure-password")).thenReturn("encoded-password")
        `when`(users.save(any(User::class.java))).thenAnswer { it.getArgument<User>(0) }
        val controller = AuthController(
            AuthService(users, encoder, jwt),
            mock(ClerkUserProvisioningService::class.java),
        )
        val validator = LocalValidatorFactoryBean().apply { afterPropertiesSet() }
        val mockMvc = MockMvcBuilders.standaloneSetup(controller).setValidator(validator).build()

        mockMvc.perform(
            post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""{"email":"new@example.test","password":"secure-password","fullName":"New Member"}"""),
        ).andExpect(status().isCreated)

        val saved = org.mockito.ArgumentCaptor.forClass(User::class.java)
        org.mockito.Mockito.verify(users).save(saved.capture())
        assertNull(saved.value.phone)
    }
}
