package com.serva.booking.matchmaking

import com.serva.booking.booking.BookingRepository
import com.serva.booking.court.Court
import com.serva.booking.court.CourtRepository
import com.serva.booking.court.Sport
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.mockito.ArgumentMatchers.any
import org.mockito.Mockito.mock
import org.mockito.Mockito.`when`
import org.springframework.jdbc.core.JdbcTemplate
import java.math.BigDecimal
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.ZoneOffset
import java.util.Optional

class MatchServiceTest {

    private lateinit var matchRepository: MatchRepository
    private lateinit var reservationRepository: MatchReservationRepository
    private lateinit var waitlistRepository: MatchWaitlistRepository
    private lateinit var courtRepository: CourtRepository
    private lateinit var bookingRepository: BookingRepository
    private lateinit var jdbcTemplate: JdbcTemplate
    private lateinit var matchService: MatchService

    private val courtId = 1L
    private val matchId = 100L
    private val userId = 99L
    private val testCourt = Court(courtId, "Test Court", Sport.padel.name, null, true)

    private val later = LocalDate.now(ZoneId.of("Asia/Amman")).plusDays(3).atTime(10, 0).atZone(ZoneId.of("Asia/Amman")).toInstant()
    private val end = later.plusSeconds(2 * 3600)

    @BeforeEach
    fun setUp() {
        matchRepository = mock(MatchRepository::class.java)
        reservationRepository = mock(MatchReservationRepository::class.java)
        waitlistRepository = mock(MatchWaitlistRepository::class.java)
        courtRepository = mock(CourtRepository::class.java)
        bookingRepository = mock(BookingRepository::class.java)
        jdbcTemplate = mock(JdbcTemplate::class.java)

        matchService = MatchService(
            matchRepository,
            reservationRepository,
            waitlistRepository,
            courtRepository,
            bookingRepository,
            jdbcTemplate
        )

        `when`(courtRepository.findById(courtId)).thenReturn(Optional.of(testCourt))
    }

    private fun mockMatch(
        status: MatchStatus = MatchStatus.published,
        startsAt: Instant = later
    ): Match {
        return Match(
            id = matchId,
            courtId = courtId,
            startsAt = startsAt,
            endsAt = startsAt.plusSeconds(7200),
            maxPlayers = 4,
            pricePerPlayer = BigDecimal("10.00"),
            skillLevel = SkillLevel.open,
            status = status
        )
    }

    @Test
    fun `admin creates valid match`() {
        val req = CreateMatchRequest(Sport.padel, courtId, later.atOffset(ZoneOffset.UTC), end.atOffset(ZoneOffset.UTC), 4, BigDecimal("10.00"), SkillLevel.open, null)
        `when`(matchRepository.saveAndFlush(any(Match::class.java))).thenAnswer { it.arguments[0] }
        val res = matchService.createMatch(1L, req)
        assertEquals(courtId, res.courtId)
        assertEquals(MatchStatus.published, res.status)
    }


    @Test
    fun `admin can explicitly save match as draft`() {
        val req = CreateMatchRequest(
            Sport.padel,
            courtId,
            later.atOffset(ZoneOffset.UTC),
            end.atOffset(ZoneOffset.UTC),
            4,
            BigDecimal("10.00"),
            SkillLevel.open,
            null,
            MatchStatus.draft,
        )
        `when`(matchRepository.saveAndFlush(any(Match::class.java))).thenAnswer { it.arguments[0] }

        val res = matchService.createMatch(1L, req)

        assertEquals(MatchStatus.draft, res.status)
    }

    @Test
    fun `admin cannot create a match on an archived court`() {
        val archivedCourt = Court(courtId, "Archived court", Sport.padel.name, "legacy", false)
        `when`(courtRepository.findById(courtId)).thenReturn(Optional.of(archivedCourt))
        val req = CreateMatchRequest(
            Sport.padel,
            courtId,
            later.atOffset(ZoneOffset.UTC),
            end.atOffset(ZoneOffset.UTC),
            4,
            BigDecimal("10.00"),
            SkillLevel.open,
            null,
        )

        assertThrows(com.serva.booking.BookingRuleException::class.java) {
            matchService.createMatch(1L, req)
        }
    }

    @Test
    fun `published match is not created when its court slot conflicts with a booking`() {
        `when`(bookingRepository.countOverlapping(courtId, later, end, com.serva.booking.booking.BookingStatus.cancelled)).thenReturn(1L)
        val req = CreateMatchRequest(
            Sport.padel,
            courtId,
            later.atOffset(ZoneOffset.UTC),
            end.atOffset(ZoneOffset.UTC),
            4,
            BigDecimal("10.00"),
            SkillLevel.open,
            null,
        )

        assertThrows(com.serva.booking.BookingRuleException::class.java) {
            matchService.createMatch(1L, req)
        }
    }

    @Test
    fun `admin cannot create match in the past`() {
        val past = Instant.now().minusSeconds(3600).atOffset(ZoneOffset.UTC)
        val req = CreateMatchRequest(Sport.padel, courtId, past, past.plusSeconds(3600), 4, BigDecimal("10.00"), SkillLevel.open, null)
        assertThrows(com.serva.booking.BookingRuleException::class.java) { matchService.createMatch(1L, req) }
    }

    @Test
    fun `admin can create a match ending at 3 AM`() {
        val zone = ZoneId.of("Asia/Amman")
        val start = LocalDate.now(zone).plusDays(3).atTime(2, 0).atZone(zone)
        val req = CreateMatchRequest(Sport.padel, courtId, start.toOffsetDateTime(), start.plusHours(1).toOffsetDateTime(), 4, BigDecimal("10.00"), SkillLevel.open, null)
        `when`(matchRepository.saveAndFlush(any(Match::class.java))).thenAnswer { it.arguments[0] }

        val res = matchService.createMatch(1L, req)

        assertEquals(MatchStatus.published, res.status)
    }

    @Test
    fun `admin cannot create a match that extends past 3 AM`() {
        val zone = ZoneId.of("Asia/Amman")
        val start = LocalDate.now(zone).plusDays(3).atTime(2, 0).atZone(zone)
        val req = CreateMatchRequest(Sport.padel, courtId, start.toOffsetDateTime(), start.plusHours(2).toOffsetDateTime(), 4, BigDecimal("10.00"), SkillLevel.open, null)

        assertThrows(com.serva.booking.BookingRuleException::class.java) { matchService.createMatch(1L, req) }
    }

    @Test
    fun `admin cannot create a match during the 3 AM to 7 AM closure`() {
        val zone = ZoneId.of("Asia/Amman")
        val start = LocalDate.now(zone).plusDays(3).atTime(5, 0).atZone(zone)
        val req = CreateMatchRequest(Sport.padel, courtId, start.toOffsetDateTime(), start.plusHours(1).toOffsetDateTime(), 4, BigDecimal("10.00"), SkillLevel.open, null)

        assertThrows(com.serva.booking.BookingRuleException::class.java) { matchService.createMatch(1L, req) }
    }

    @Test
    fun `court conflict with existing booking blocks publish`() {
        val m = mockMatch(status = MatchStatus.draft)
        `when`(matchRepository.findById(matchId)).thenReturn(Optional.of(m))
        `when`(bookingRepository.countOverlapping(courtId, later, later.plusSeconds(7200), com.serva.booking.booking.BookingStatus.cancelled)).thenReturn(1L)

        assertThrows(com.serva.booking.BookingRuleException::class.java) {
            matchService.publishMatch(matchId)
        }
    }

    @Test
    fun `member reserves available spot`() {
        val m = mockMatch(status = MatchStatus.published)
        `when`(matchRepository.findByIdForUpdate(matchId)).thenReturn(m)
        `when`(reservationRepository.countConfirmedByMatchId(matchId, MatchReservationStatus.confirmed)).thenReturn(3L)
        `when`(reservationRepository.findByMatchIdAndUserId(matchId, userId)).thenReturn(null)
        `when`(reservationRepository.saveAndFlush(any(MatchReservation::class.java))).thenAnswer { it.arguments[0] }

        val res = matchService.joinMatch(userId, matchId)
        assertEquals(MatchReservationStatus.confirmed, res.status)
        assertEquals(MatchPaymentStatus.unpaid, res.paymentStatus)
    }

    @Test
    fun `full match allows waitlist join`() {
        val m = mockMatch(status = MatchStatus.published)
        `when`(matchRepository.findById(matchId)).thenReturn(Optional.of(m))
        `when`(reservationRepository.countConfirmedByMatchId(matchId, MatchReservationStatus.confirmed)).thenReturn(4L) // full
        `when`(waitlistRepository.findByMatchIdAndUserId(matchId, userId)).thenReturn(null)
        `when`(waitlistRepository.findFirstWaiting(matchId, WaitlistStatus.waiting)).thenReturn(emptyList())
        `when`(waitlistRepository.saveAndFlush(any(MatchWaitlistEntry::class.java))).thenAnswer { it.arguments[0] }

        val res = matchService.joinWaitlist(userId, matchId)
        assertEquals(WaitlistStatus.waiting, res.status)
    }

    @Test
    fun `valid cancellation releases capacity`() {
        val res = MatchReservation(id = 1L, matchId = matchId, userId = userId, status = MatchReservationStatus.confirmed, priceSnapshot = BigDecimal.TEN)
        `when`(reservationRepository.findById(1L)).thenReturn(Optional.of(res))
        val m = mockMatch(startsAt = Instant.now().plusSeconds(24 * 3600))
        `when`(matchRepository.findById(matchId)).thenReturn(Optional.of(m))

        matchService.cancelReservation(userId, 1L)
        assertEquals(MatchReservationStatus.cancelled, res.status)
    }

    @Test
    fun `cancellation rejected under 12h`() {
        val res = MatchReservation(id = 1L, matchId = matchId, userId = userId, status = MatchReservationStatus.confirmed, priceSnapshot = BigDecimal.TEN)
        `when`(reservationRepository.findById(1L)).thenReturn(Optional.of(res))
        val m = mockMatch(startsAt = Instant.now().plusSeconds(10 * 3600)) // < 12h
        `when`(matchRepository.findById(matchId)).thenReturn(Optional.of(m))

        assertThrows(CancellationTooLateException::class.java) {
            matchService.cancelReservation(userId, 1L)
        }
    }

    @Test
    fun `cannot join cancelled match`() {
        val m = mockMatch(status = MatchStatus.cancelled)
        `when`(matchRepository.findByIdForUpdate(matchId)).thenReturn(m)

        assertThrows(com.serva.booking.BookingRuleException::class.java) {
            matchService.joinMatch(userId, matchId)
        }
    }
}
