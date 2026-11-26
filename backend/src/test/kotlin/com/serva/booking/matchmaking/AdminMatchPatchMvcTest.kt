package com.serva.booking.matchmaking

import org.junit.jupiter.api.Test
import org.mockito.Mockito.verify
import org.mockito.Mockito.verifyNoInteractions
import org.mockito.Mockito.`when`
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest
import org.springframework.http.MediaType
import org.springframework.test.context.bean.override.mockito.MockitoBean
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

@WebMvcTest(AdminMatchController::class)
@AutoConfigureMockMvc(addFilters = false)
class AdminMatchPatchMvcTest(@Autowired private val mvc: MockMvc) {
    @MockitoBean
    private lateinit var service: MatchService

    private val missingId = 999999999L
    private fun edit(body: String) = patch("/api/admin/matchmaking/{id}", missingId)
        .contentType(MediaType.APPLICATION_JSON)
        .content(body)

    @Test
    fun `invalid fields fail before the match lookup`() {
        for ((body, field) in listOf(
            """{"maxPlayers":21}""" to "maxPlayers",
            """{"maxPlayers":1}""" to "maxPlayers",
            """{"pricePerPlayer":10001}""" to "pricePerPlayer",
            """{"description":"${"a".repeat(2001)}"}""" to "description",
        )) {
            mvc.perform(edit(body))
                .andExpect(status().isBadRequest)
                .andExpect(jsonPath("$.error").value("Validation failed"))
                .andExpect(jsonPath("$.fields.$field").isString)
        }
        verifyNoInteractions(service)
    }

    @Test
    fun `valid fields reach the service and a missing match returns 404`() {
        val request = UpdateMatchRequest(maxPlayers = 20)
        `when`(service.updateMatch(missingId, request)).thenThrow(MatchNotFoundException())
        mvc.perform(edit("""{"maxPlayers":20}"""))
            .andExpect(status().isNotFound)
            .andExpect(jsonPath("$.error").value("Match not found"))
        verify(service).updateMatch(missingId, request)
    }
}
