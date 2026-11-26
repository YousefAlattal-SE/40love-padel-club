
package com.serva.booking.auth

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Test
import org.mockito.Mockito.mock
import org.mockito.Mockito.verifyNoInteractions
import org.springframework.http.HttpStatus
import org.springframework.web.server.ResponseStatusException

class AuthControllerSecurityTest {

    @Test
    fun `legacy login is unavailable when disabled`() {
        val auth = mock(AuthService::class.java)
        val clerkUsers = mock(ClerkUserProvisioningService::class.java)

        val controller = AuthController(
            auth,
            clerkUsers,
            false
        )

        val request = LoginRequest(
            email = "member@example.test",
            password = "not-a-real-password"
        )

        val exception = assertThrows(ResponseStatusException::class.java) {
            controller.login(request)
        }

        assertEquals(HttpStatus.NOT_FOUND, exception.statusCode)
        verifyNoInteractions(auth)
    }
}
