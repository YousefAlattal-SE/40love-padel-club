package com.serva.booking.config

import com.serva.booking.booking.PhoneNumberRequiredException
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.springframework.http.HttpStatus

class ApiExceptionHandlerPhoneNumberTest {
    @Test
    fun `returns a conflict with a stable phone-required error code`() {
        val response = ApiExceptionHandler().handlePhoneNumberRequired(PhoneNumberRequiredException())

        assertEquals(HttpStatus.CONFLICT, response.statusCode)
        assertEquals("PHONE_NUMBER_REQUIRED", response.body?.get("code"))
        assertEquals("PHONE_NUMBER_REQUIRED", response.body?.get("error"))
    }
}
