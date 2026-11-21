package com.serva.booking.auth

import org.springframework.http.HttpStatus
import org.springframework.web.server.ResponseStatusException

/** Application-owned contact phone parsing. This does not perform ownership verification. */
object ContactPhone {
    private val acceptedCharacters = Regex("^\\+?[0-9][0-9\\s().-]*$")

    fun normalizeRequired(value: String?): String {
        val raw = value?.trim().orEmpty()
        val ascii = raw.map { character ->
            val digit = Character.digit(character, 10)
            if (digit >= 0) ('0'.code + digit).toChar() else character
        }.joinToString("")

        if (ascii.isEmpty() || ascii.length > 40 || !acceptedCharacters.matches(ascii)) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Enter a valid contact phone number")
        }

        val digits = ascii.filter(Char::isDigit)
        if (digits.length !in 8..15) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Phone number must contain 8 to 15 digits")
        }

        return (if (ascii.startsWith('+')) "+" else "") + digits
    }

    fun normalizeOptional(value: String?): String? =
        value?.trim()?.takeIf(String::isNotEmpty)?.let(::normalizeRequired)
}
