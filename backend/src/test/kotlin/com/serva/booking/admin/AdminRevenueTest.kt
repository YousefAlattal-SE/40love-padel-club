package com.serva.booking.admin

import com.jayway.jsonpath.JsonPath
import com.serva.booking.testsupport.DatabaseIntegrationTest
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.jdbc.core.JdbcTemplate
import com.serva.booking.testsupport.AdminPrincipal
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.springframework.test.web.servlet.setup.DefaultMockMvcBuilder
import org.springframework.test.web.servlet.setup.MockMvcBuilders
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.context.WebApplicationContext
import java.math.BigDecimal
import java.time.LocalDate
import java.time.ZoneOffset

/**
 * Item 19.3: bookings settled with payment method "waived" are not revenue. Runs in a rolled-back
 * transaction; the fixture slots (14:00, far in the future) avoid every other test's fixtures.
 */
@DatabaseIntegrationTest
@SpringBootTest
@Transactional
class AdminRevenueTest(@Autowired context: WebApplicationContext, @Autowired private val jdbc: JdbcTemplate) {
    private val mvc = MockMvcBuilders.webAppContextSetup(context)
        .apply<DefaultMockMvcBuilder>(springSecurity()).build()
    private val staff by lazy { AdminPrincipal.of(AdminPrincipal.insertAdmin(jdbc, "revenue-staff")) }

    private fun revenueToday(): BigDecimal {
        val body = mvc.perform(get("/api/admin/overview").with(staff)).andExpect(status().isOk).andReturn().response.contentAsString
        return BigDecimal(JsonPath.read<Any>(body, "$.revenueToday").toString())
    }

    private fun booking(daysAhead: Long, price: String): Long {
        val court = jdbc.queryForObject("select min(id) from courts where is_available and legacy_sport is null", Long::class.java)!!
        val member = jdbc.queryForObject(
            "insert into users(full_name,email) values ('Revenue fixture', ?) returning id",
            Long::class.java, "revenue-${System.nanoTime()}@example.test",
        )!!
        val start = LocalDate.now(ZoneOffset.UTC).plusDays(daysAhead).atTime(14, 0).atOffset(ZoneOffset.UTC)
        return jdbc.queryForObject(
            "insert into bookings(user_id,court_id,starts_at,ends_at,total_price) values (?,?,?,?,?::numeric) returning id",
            Long::class.java, member, court, start, start.plusHours(1), price,
        )!!
    }

    private fun settle(id: Long, method: String) {
        mvc.perform(patch("/api/admin/bookings/$id/payment").with(staff)
            .contentType("application/json").content("""{"paid":true,"paymentMethod":"$method"}"""))
            .andExpect(status().isOk)
    }

    @Test
    fun `waived bookings are not counted as revenue but paid ones are`() {
        val before = revenueToday()

        settle(booking(daysAhead = 5000, price = "25"), "waived")
        assertEquals(0, before.compareTo(revenueToday()), "A waived booking must not add revenue")

        settle(booking(daysAhead = 5001, price = "40"), "cash")
        assertEquals(0, before.add(BigDecimal("40")).compareTo(revenueToday()), "A cash booking must add its price")
    }
}
