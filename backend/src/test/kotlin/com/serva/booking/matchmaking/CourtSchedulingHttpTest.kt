package com.serva.booking.matchmaking

import com.serva.booking.availability.AvailabilityRepository
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.springframework.test.web.servlet.setup.DefaultMockMvcBuilder
import org.springframework.test.web.servlet.setup.MockMvcBuilders
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.context.WebApplicationContext
import java.time.LocalDate
import java.time.ZoneOffset

@SpringBootTest
@Transactional
class CourtSchedulingHttpTest(
    @Autowired context: WebApplicationContext,
    @Autowired private val jdbc: JdbcTemplate,
    @Autowired private val availability: AvailabilityRepository,
) {
    private val mvc = MockMvcBuilders.webAppContextSetup(context)
        .apply<DefaultMockMvcBuilder>(springSecurity()).build()
    private val day = LocalDate.now(ZoneOffset.UTC).plusDays(2)
    private val start = day.atTime(10, 0).atOffset(ZoneOffset.UTC)
    private val end = start.plusHours(1)
    private var court = 0L
    private var staff = 0L

    @BeforeEach
    fun seed() {
        court = jdbc.queryForObject(
            "select min(id) from courts where is_available and legacy_sport is null",
            Long::class.java
        )!!
        staff = jdbc.queryForObject(
            """insert into users(email,full_name,role) values
               ('schedule@example.test','Scheduling fixture','admin') returning id""",
            Long::class.java
        )!!
    }

    private fun match(state: String): Long = jdbc.queryForObject(
        """insert into matches(court_id,sport,starts_at,ends_at,max_players,price_per_player,created_by,status)
           values (?,'padel',?,?,4,10,?,?::match_status) returning id""",
        Long::class.java, court, start, end, staff, state
    )!!

    @Test
    fun `only staff can move a match and completion keeps the moved interval`() {
        val id = match("published")
        val url = "/api/admin/matchmaking/$id"
        val body = """{"startsAt":"${end}","endsAt":"${end.plusHours(1)}"}"""
        fun request() = patch(url).contentType("application/json").content(body)
        mvc.perform(request()).andExpect(status().isUnauthorized)
        mvc.perform(request().with(user("member").roles("MEMBER"))).andExpect(status().isForbidden)
        mvc.perform(request().with(user("staff").roles("ADMIN"))).andExpect(status().isOk)
        mvc.perform(patch(url).with(user("staff").roles("ADMIN")).contentType("application/json")
            .content("""{"status":"completed"}""")).andExpect(status().isOk)
        val claims = availability.bookedRanges(start.toInstant(), end.plusHours(2).toInstant()).filter { it.courtId == court }
        assertEquals(listOf(end.toInstant()), claims.map { it.startsAt })
        assertEquals(listOf(end.plusHours(1).toInstant()), claims.map { it.endsAt })
    }

    @Test
    fun `availability reflects both booking and match release`() {
        fun checkSlot(expected: String) {
            mvc.perform(get("/api/availability").with(user("member").roles("MEMBER")).param("date", day.toString()).param("sport", "padel"))
                .andExpect(status().isOk)
                .andExpect(jsonPath("$.courts[?(@.courtId == $court)].slots[?(@.label == '13:00')].status")
                    .value(org.hamcrest.Matchers.contains(expected)))
        }

        val id = match("published")
        checkSlot("booked")
        mvc.perform(patch("/api/admin/matchmaking/$id").with(user("staff").roles("ADMIN"))
            .contentType("application/json").content("""{"status":"cancelled"}""")).andExpect(status().isOk)
        checkSlot("free")
        val booking = jdbc.queryForObject(
            """insert into bookings(user_id,court_id,starts_at,ends_at,total_price)
               values (?,?,?,?,25) returning id""", Long::class.java, staff, court, start, end
        )!!
        checkSlot("booked")
        mvc.perform(patch("/api/admin/bookings/$booking/status").with(user("staff").roles("ADMIN"))
            .contentType("application/json").content("""{"status":"cancelled"}""")).andExpect(status().isOk)
        checkSlot("free")
    }

    @Test
    fun `publishing against a completed match returns conflict`() {
        match("completed")
        val id = match("draft")
        mvc.perform(patch("/api/admin/matchmaking/$id").with(user("staff").roles("ADMIN"))
            .contentType("application/json").content("""{"status":"published"}""")).andExpect(status().isConflict)
    }
}
