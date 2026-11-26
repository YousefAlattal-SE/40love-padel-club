package com.serva.booking.matchmaking

import jakarta.validation.Validation
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.math.BigDecimal

class MatchEditValidationTest {
    @Test
    fun `partial edit accepts omitted fields and valid boundaries`() {
        Validation.buildDefaultValidatorFactory().use { factory ->
            for (request in listOf(
                UpdateMatchRequest(),
                UpdateMatchRequest(maxPlayers = 2, pricePerPlayer = BigDecimal.ZERO),
                UpdateMatchRequest(maxPlayers = 20, pricePerPlayer = BigDecimal("10000"), description = "a".repeat(2000)),
            )) {
                assertTrue(factory.validator.validate(request).isEmpty())
            }
        }
    }

    @Test
    fun `partial edit rejects out of bounds fields`() {
        Validation.buildDefaultValidatorFactory().use { factory ->
            val cases = listOf(
                "maxPlayers" to UpdateMatchRequest(maxPlayers = 1),
                "maxPlayers" to UpdateMatchRequest(maxPlayers = 21),
                "pricePerPlayer" to UpdateMatchRequest(pricePerPlayer = BigDecimal("-0.001")),
                "pricePerPlayer" to UpdateMatchRequest(pricePerPlayer = BigDecimal("10000.001")),
                "description" to UpdateMatchRequest(description = "a".repeat(2001)),
            )
            for ((field, request) in cases) {
                assertEquals(setOf(field), factory.validator.validate(request).map { it.propertyPath.toString() }.toSet())
            }
        }
    }
}
