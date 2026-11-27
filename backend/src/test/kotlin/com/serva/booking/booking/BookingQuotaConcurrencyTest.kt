package com.serva.booking.booking

import com.serva.booking.BookingRuleException
import com.serva.booking.auth.AuthUser
import com.serva.booking.auth.Role
import com.serva.booking.testsupport.DatabaseIntegrationTest
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.jdbc.core.JdbcTemplate
import java.time.LocalDate
import java.time.ZoneId
import java.util.UUID
import java.util.concurrent.Callable
import java.util.concurrent.CyclicBarrier
import java.util.concurrent.ExecutionException
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

/**
 * Club decision B-3 under concurrency: a member holding two upcoming bookings sends two more at the
 * same moment; the member-row lock lets exactly one through. Not transactional on purpose (two real
 * transactions race); the fixture bookings are cancelled afterwards because the app cannot delete rows.
 */
@DatabaseIntegrationTest
@SpringBootTest
class BookingQuotaConcurrencyTest(@Autowired private val service: BookingService, @Autowired private val jdbc: JdbcTemplate) {
    private val zone = ZoneId.of("Asia/Amman")
    private var member = 0L

    @AfterEach
    fun cancelFixtures() {
        jdbc.update("update bookings set status = 'cancelled' where user_id = ? and status = 'confirmed'", member)
    }

    private fun courts(): List<Long> = jdbc.queryForList(
        "select id from courts where is_available and sport = 'padel' and legacy_sport is null order by id limit 2", Long::class.java,
    ).filterNotNull()

    @Test
    fun `two simultaneous bookings cannot both pass the three-booking limit`() {
        member = jdbc.queryForObject(
            "insert into users(full_name,email,phone) values ('Quota fixture', ?, '+962790000000') returning id",
            Long::class.java, "quota-${UUID.randomUUID()}@example.test",
        )!!
        val (courtA, courtB) = courts()
        val day = LocalDate.now(zone).plusDays(6)
        fun at(hour: Int) = day.atTime(hour, 0).atZone(zone).toOffsetDateTime()
        // Two upcoming bookings already held (inserted directly, as earlier successful bookings).
        listOf(10, 11).forEach { hour ->
            jdbc.update(
                "insert into bookings(user_id,court_id,starts_at,ends_at,total_price) values (?,?,?,?,25)",
                member, courtA, at(hour), at(hour + 1),
            )
        }
        val user = AuthUser(member, "quota@example.test", Role.member)

        val pool = Executors.newFixedThreadPool(2)
        val barrier = CyclicBarrier(2)
        val outcomes = try {
            listOf(courtA to 15, courtB to 17).map { (court, hour) ->
                pool.submit(Callable {
                    barrier.await(10, TimeUnit.SECONDS)
                    service.create(user, CreateBookingRequest(court, at(hour), 1))
                })
            }.map { future ->
                try { future.get(30, TimeUnit.SECONDS); "booked" } catch (e: ExecutionException) {
                    if (e.cause is BookingRuleException) "refused" else throw e
                }
            }
        } finally { pool.shutdownNow() }

        assertEquals(listOf("booked", "refused"), outcomes.sorted())
        assertEquals(3, jdbc.queryForObject(
            "select count(*) from bookings where user_id = ? and status = 'confirmed'", Int::class.java, member,
        ))
    }
}
