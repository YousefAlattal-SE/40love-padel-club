package com.serva.booking.booking

import com.serva.booking.SportRate
import com.serva.booking.OffPeakWindow
import com.serva.booking.auth.AuthUser
import com.serva.booking.auth.Role
import com.serva.booking.auth.User
import com.serva.booking.auth.UserRepository
import com.serva.booking.availability.AvailabilityRepository
import com.serva.booking.court.Court
import com.serva.booking.court.CourtRepository
import com.serva.booking.court.Sport
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.mockito.ArgumentMatchers.any
import org.mockito.Mockito.mock
import org.mockito.Mockito.never
import org.mockito.Mockito.verify
import org.mockito.Mockito.`when`
import java.math.BigDecimal
import java.time.Instant
import java.time.OffsetDateTime
import java.time.ZoneId
import java.util.Optional

class BookingServiceTest {

    private lateinit var bookings: BookingRepository
    private lateinit var courts: CourtRepository
    private lateinit var pricing: AvailabilityRepository
    private lateinit var users: UserRepository
    private lateinit var service: BookingService

    private val courtId = 5L
    private val padelCourt = Court(courtId, "Padel Court 1", Sport.padel.name, null, true)
    private val zone = ZoneId.of("Asia/Amman")

    @BeforeEach
    fun setUp() {
        bookings = mock(BookingRepository::class.java)
        courts = mock(CourtRepository::class.java)
        pricing = mock(AvailabilityRepository::class.java)
        users = mock(UserRepository::class.java)
        service = BookingService(bookings, courts, pricing, users)
        `when`(users.findById(42L)).thenReturn(Optional.of(User(id = 42L, email = "member@example.test", phone = "+962791118877")))
        `when`(courts.findById(courtId)).thenReturn(Optional.of(padelCourt))
        `when`(pricing.rates()).thenReturn(mapOf(Sport.padel to SportRate(
            daytimeHourlyPrice = BigDecimal("25.00"),
            daytimeTwoHourPrice = BigDecimal("45.00"),
            eveningHourlyPrice = BigDecimal("35.00"),
            eveningTwoHourPrice = BigDecimal("60.00"),
        )))
        `when`(pricing.offPeakWindows()).thenReturn(listOf(OffPeakWindow(7, 18)))
    }

    @Test
    fun `creates a booking on an available Padel court`() {
        val startsAt = OffsetDateTime.now(zone).plusDays(1).withHour(12).withMinute(0).withSecond(0).withNano(0)
        val endsAt = startsAt.toInstant().plusSeconds(2 * 60 * 60)
        `when`(bookings.countOverlapping(courtId, startsAt.toInstant(), endsAt, BookingStatus.cancelled)).thenReturn(0L)
        `when`(
            bookings.countOverlappingMatches(
                courtId,
                startsAt.toInstant(),
                endsAt,
                com.serva.booking.matchmaking.MatchStatus.published,
            )
        ).thenReturn(0L)
        `when`(bookings.saveAndFlush(any(Booking::class.java))).thenAnswer { it.arguments[0] }

        val response = service.create(AuthUser(42L, "member@example.test", Role.member), CreateBookingRequest(courtId, startsAt, 2))

        assertEquals("padel", response.sport)
        assertEquals("Padel Court 1", response.courtName)
        assertEquals(BigDecimal("45.00"), response.totalPrice)
        assertEquals(BookingStatus.confirmed, response.status)
    }

    @Test
    fun `requires a saved customer phone before creating a booking`() {
        val startsAt = OffsetDateTime.now(zone).plusDays(1).withHour(12).withMinute(0).withSecond(0).withNano(0)
        listOf(null, "", " \t\r\n").forEach { missingPhone ->
            `when`(users.findById(42L)).thenReturn(
                Optional.of(User(id = 42L, email = "member@example.test", phone = missingPhone)),
            )

            assertThrows(PhoneNumberRequiredException::class.java) {
                service.create(AuthUser(42L, "member@example.test", Role.member), CreateBookingRequest(courtId, startsAt, 1))
            }
        }

        verify(bookings, never()).saveAndFlush(any(Booking::class.java))
    }

    @Test
    fun `rejects an overlapping booking on the same court`() {
        val startsAt = OffsetDateTime.now(zone).plusDays(1).withHour(18).withMinute(0).withSecond(0).withNano(0)
        val endsAt = startsAt.toInstant().plusSeconds(3600)
        `when`(bookings.countOverlapping(courtId, startsAt.toInstant(), endsAt, BookingStatus.cancelled)).thenReturn(1L)

        assertThrows(SlotTakenException::class.java) {
            service.create(AuthUser(42L, "member@example.test", Role.member), CreateBookingRequest(courtId, startsAt, 1))
        }
    }

    @Test
    fun `allows the same time to be booked on a different court`() {
        val otherCourtId = courtId + 1
        `when`(courts.findById(otherCourtId)).thenReturn(Optional.of(Court(otherCourtId, "Padel Court 2", "padel", null, true)))
        val startsAt = OffsetDateTime.now(zone).plusDays(1).withHour(12).withMinute(0).withSecond(0).withNano(0)
        val endsAt = startsAt.toInstant().plusSeconds(3600)
        `when`(bookings.countOverlapping(otherCourtId, startsAt.toInstant(), endsAt, BookingStatus.cancelled)).thenReturn(0L)
        `when`(
            bookings.countOverlappingMatches(
                otherCourtId,
                startsAt.toInstant(),
                endsAt,
                com.serva.booking.matchmaking.MatchStatus.published,
            )
        ).thenReturn(0L)
        `when`(bookings.saveAndFlush(any(Booking::class.java))).thenAnswer { it.arguments[0] }

        val response = service.create(AuthUser(42L, "member@example.test", Role.member), CreateBookingRequest(otherCourtId, startsAt, 1))

        assertEquals(otherCourtId, response.courtId)
        assertEquals(BigDecimal("25.00"), response.totalPrice)
    }

    @Test
    fun `rejects booking on an archived non-Padel court`() {
        `when`(courts.findById(courtId)).thenReturn(
            Optional.of(Court(courtId, "Archived court", Sport.padel.name, "legacy", false))
        )
        val startsAt = OffsetDateTime.now(zone).plusDays(1).withHour(12).withMinute(0).withSecond(0).withNano(0)

        assertThrows(com.serva.booking.BookingRuleException::class.java) {
            service.create(AuthUser(42L, "member@example.test", Role.member), CreateBookingRequest(courtId, startsAt, 1))
        }
    }

    @Test
    fun `member can cancel their own future booking`() {
        val startsAt = Instant.now().plusSeconds(48 * 3600)
        val booking = Booking(
            id = 7L,
            userId = 42L,
            courtId = courtId,
            startsAt = startsAt,
            endsAt = startsAt.plusSeconds(3600),
            totalPrice = BigDecimal("20.00"),
        )
        `when`(bookings.findById(booking.id)).thenReturn(Optional.of(booking))
        `when`(bookings.save(booking)).thenReturn(booking)

        val response = service.cancel(AuthUser(42L, "member@example.test", Role.member), booking.id)

        assertEquals(BookingStatus.cancelled, booking.status)
        assertEquals(BookingStatus.cancelled, response.status)
        assertEquals("Padel Court 1", response.courtName)
    }
}
