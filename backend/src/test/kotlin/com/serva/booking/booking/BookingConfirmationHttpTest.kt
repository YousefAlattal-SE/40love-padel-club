package com.serva.booking.booking

import com.serva.booking.auth.AuthUser
import com.serva.booking.auth.Role
import com.serva.booking.auth.User
import com.serva.booking.auth.UserRepository
import com.serva.booking.config.ApiExceptionHandler
import com.serva.booking.availability.AvailabilityRepository
import com.serva.booking.court.CourtRepository
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.mockito.ArgumentMatchers.any
import org.mockito.Mockito.mock
import org.mockito.Mockito.never
import org.mockito.Mockito.verify
import org.mockito.Mockito.`when`
import org.springframework.http.MediaType
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.springframework.test.web.servlet.setup.MockMvcBuilders
import java.util.Optional

class BookingConfirmationHttpTest {
    private lateinit var bookings: BookingRepository
    private lateinit var mockMvc: MockMvc

    @BeforeEach
    fun setUp() {
        bookings = mock(BookingRepository::class.java)
        val users = mock(UserRepository::class.java)
        val courts = mock(CourtRepository::class.java)
        val pricing = mock(AvailabilityRepository::class.java)
        val authenticatedUser = AuthUser(73L, "member@example.test", Role.member)
        `when`(users.findById(authenticatedUser.id)).thenReturn(
            Optional.of(User(id = authenticatedUser.id, email = authenticatedUser.email, phone = null)),
        )

        val service = BookingService(bookings, courts, pricing, users)
        mockMvc = MockMvcBuilders.standaloneSetup(BookingController(service))
            .setControllerAdvice(ApiExceptionHandler())
            .setCustomArgumentResolvers(AuthenticationPrincipalArgumentResolver())
            .build()
        SecurityContextHolder.getContext().authentication =
            UsernamePasswordAuthenticationToken.authenticated(authenticatedUser, "test", emptyList())
    }

    @AfterEach
    fun clearSecurityContext() {
        SecurityContextHolder.clearContext()
    }

    @Test
    fun `direct booking API call rejects a null phone before writing a booking`() {
        mockMvc.perform(
            post("/api/bookings")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""{"courtId":5,"startsAt":"2030-06-10T12:00:00+03:00","hours":1}"""),
        )
            .andExpect(status().isConflict)
            .andExpect(jsonPath("$.code").value("PHONE_NUMBER_REQUIRED"))

        verify(bookings, never()).saveAndFlush(any(Booking::class.java))
    }
}
