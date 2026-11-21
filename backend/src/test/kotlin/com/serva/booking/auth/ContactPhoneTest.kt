package com.serva.booking.auth

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Test
import org.springframework.http.HttpStatus
import org.springframework.web.server.ResponseStatusException

class ContactPhoneTest {
    @Test
    fun `normalizes a Jordanian international number`() {
        assertEquals("+962791118877", ContactPhone.normalizeRequired("+962 79 111 8877"))
    }

    @Test
    fun `accepts an international number and local Jordan format`() {
        assertEquals("+12025550182", ContactPhone.normalizeRequired("+1 (202) 555-0182"))
        assertEquals("0791118877", ContactPhone.normalizeRequired("079 111 8877"))
    }

    @Test
    fun `rejects an empty or malformed contact number`() {
        listOf("", "   ", "call me", "+962123").forEach { input ->
            val error = assertThrows(ResponseStatusException::class.java) {
                ContactPhone.normalizeRequired(input)
            }
            assertEquals(HttpStatus.BAD_REQUEST, error.statusCode)
        }
    }
}
