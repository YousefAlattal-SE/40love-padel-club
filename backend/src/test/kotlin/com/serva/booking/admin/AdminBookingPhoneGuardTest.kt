package com.serva.booking.admin

import com.serva.booking.booking.PhoneNumberRequiredException
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Test
import org.mockito.ArgumentMatchers.anyString
import org.mockito.ArgumentMatchers.eq
import org.mockito.Mockito.mock
import org.mockito.Mockito.verify
import org.mockito.Mockito.verifyNoMoreInteractions
import org.mockito.Mockito.`when`
import org.springframework.jdbc.core.JdbcTemplate

class AdminBookingPhoneGuardTest {
    @Test
    fun `admin cannot confirm a booking when its customer has a blank phone`() {
        val jdbc = mock(JdbcTemplate::class.java)
        `when`(jdbc.queryForObject(anyString(), eq(Int::class.java), eq(91L))).thenReturn(1)
        val audit = mock(AdminAuditService::class.java)
        val controller = AdminController(jdbc, audit)

        assertThrows(PhoneNumberRequiredException::class.java) {
            controller.updateBookingStatus(91L, AdminBookingStatusRequest("confirmed"))
        }

        verify(jdbc).queryForObject(anyString(), eq(Int::class.java), eq(91L))
        verifyNoMoreInteractions(jdbc)
        org.mockito.Mockito.verifyNoInteractions(audit)
    }
}
