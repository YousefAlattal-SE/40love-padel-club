package com.serva.booking.booking

import com.serva.booking.BookingRuleException
import com.serva.booking.OffPeakWindow
import com.serva.booking.SportRate
import com.serva.booking.auth.AuthUser
import com.serva.booking.auth.Role
import com.serva.booking.auth.User
import com.serva.booking.auth.UserRepository
import com.serva.booking.availability.AvailabilityRepository
import com.serva.booking.court.Court
import com.serva.booking.court.CourtRepository
import com.serva.booking.court.Sport
import jakarta.validation.Validation
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.mockito.Mockito.RETURNS_DEFAULTS
import org.mockito.Mockito.mock
import org.mockito.Mockito.verify
import org.mockito.Mockito.`when`
import java.math.BigDecimal
import java.time.OffsetDateTime
import java.time.ZoneId
import java.util.Optional

/** Club decision B-3: 3 hours per booking, 3 upcoming bookings per member, no overlapping bookings. */
class BookingQuotaTest {
    private var upcomingCount = 0L
    private var overlapCount = 0L
    private val calls = mutableListOf<String>()

    // Answers by method name: Mockito's eq() on enums returns null, which Kotlin rejects at the call.
    private val bookings = mock(BookingRepository::class.java) { invocation ->
        calls += invocation.method.name
        when (invocation.method.name) {
            "countUpcomingForMember" -> upcomingCount
            "countMemberOverlapping" -> overlapCount
            "countOverlapping", "countOverlappingMatches" -> 0L
            "lockMember" -> emptyList<Long>()
            "saveAndFlush" -> invocation.arguments[0]
            else -> RETURNS_DEFAULTS.answer(invocation)
        }
    }
    private val courts = mock(CourtRepository::class.java)
    private val pricing = mock(AvailabilityRepository::class.java)
    private val users = mock(UserRepository::class.java)
    private val service = BookingService(bookings, courts, pricing, users)
    private val member = AuthUser(42L, "member@example.test", Role.member)
    private val zone = ZoneId.of("Asia/Amman")
    private val startsAt = OffsetDateTime.now(zone).plusDays(1).withHour(12).withMinute(0).withSecond(0).withNano(0)

    @BeforeEach
    fun setUp() {
        `when`(users.findById(42L)).thenReturn(Optional.of(User(id = 42L, email = "member@example.test", phone = "+962791118877")))
        `when`(courts.findById(5L)).thenReturn(Optional.of(Court(5L, "Padel Court 1", Sport.padel.name, null, true)))
        `when`(pricing.rates()).thenReturn(mapOf(Sport.padel to SportRate(
            daytimeHourlyPrice = BigDecimal("25.00"),
            daytimeTwoHourPrice = BigDecimal("45.00"),
            eveningHourlyPrice = BigDecimal("35.00"),
            eveningTwoHourPrice = BigDecimal("60.00"),
        )))
        `when`(pricing.offPeakWindows()).thenReturn(listOf(OffPeakWindow(7, 18)))
    }

    private fun upcoming(count: Long) { upcomingCount = count }

    private fun overlapping(count: Long) { overlapCount = count }

    private fun saved() = calls.count { it == "saveAndFlush" }

    private fun book(hours: Int = 1) = service.create(member, CreateBookingRequest(5L, startsAt, hours))

    @Test
    fun `a member with fewer than three upcoming bookings can book`() {
        upcoming(2)
        overlapping(0)

        assertEquals(BookingStatus.confirmed, book().status)
    }

    @Test
    fun `a fourth upcoming booking is refused`() {
        upcoming(3)
        overlapping(0)

        val error = assertThrows(BookingRuleException::class.java) { book() }

        assertTrue(error.message!!.contains("at most 3 upcoming bookings"), error.message)
        assertEquals(0, saved())
    }

    @Test
    fun `a booking overlapping the member's own booking on any court is refused`() {
        upcoming(1)
        overlapping(1)

        val error = assertThrows(BookingRuleException::class.java) { book() }

        assertEquals("You already have a booking at this time", error.message)
        assertEquals(0, saved())
    }

    @Test
    fun `the member row is locked before the limits are counted`() {
        upcoming(0)
        overlapping(0)

        book()

        val order = listOf("lockMember", "countMemberOverlapping", "countUpcomingForMember", "saveAndFlush")
        assertEquals(order, calls.filter { it in order })
        verify(bookings).lockMember(42L)
    }

    @Test
    fun `a booking can last at most three hours`() {
        val validator = Validation.buildDefaultValidatorFactory().use { it.validator }
        assertTrue(validator.validate(CreateBookingRequest(5L, startsAt, 3)).isEmpty())
        val violations = validator.validate(CreateBookingRequest(5L, startsAt, 4))
        assertEquals(listOf("hours"), violations.map { it.propertyPath.toString() })
    }
}
