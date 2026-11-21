package com.serva.booking.availability

import com.serva.booking.OffPeakWindow
import com.serva.booking.SportRate
import com.serva.booking.court.Court
import com.serva.booking.court.CourtRepository
import com.serva.booking.court.Sport
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.mockito.Mockito.mock
import org.mockito.Mockito.`when`
import java.math.BigDecimal
import java.time.LocalDate
import java.time.ZoneId

class AvailabilityServiceTest {
    private val zone = ZoneId.of("Asia/Amman")
    private lateinit var courts: CourtRepository
    private lateinit var repository: AvailabilityRepository
    private lateinit var service: AvailabilityService

    @BeforeEach
    fun setUp() {
        courts = mock(CourtRepository::class.java)
        repository = mock(AvailabilityRepository::class.java)
        service = AvailabilityService(courts, repository)

        `when`(courts.findPadelCourts()).thenReturn((1L..3L).map { id ->
            Court(id, "Padel Court $id", Sport.padel.name, null, true)
        })
        `when`(repository.rates()).thenReturn(mapOf(Sport.padel to SportRate(
            daytimeHourlyPrice = BigDecimal("25.00"),
            daytimeTwoHourPrice = BigDecimal("45.00"),
            eveningHourlyPrice = BigDecimal("35.00"),
            eveningTwoHourPrice = BigDecimal("60.00"),
        )))
        `when`(repository.offPeakWindows()).thenReturn(listOf(OffPeakWindow(7, 18)))
    }

    @Test
    fun `returns three courts and twenty chronological slots from seven until three`() {
        val date = LocalDate.now(zone).plusDays(2)
        val start = date.atTime(7, 0).atZone(zone)
        val end = start.plusHours(20)
        `when`(repository.bookedRanges(start.toInstant(), end.toInstant())).thenReturn(emptyList())

        val response = service.forDay(date, Sport.padel)

        assertEquals(3, response.courts.size)
        response.courts.forEach { court ->
            assertEquals(20, court.slots.size)
            assertEquals("07:00", court.slots.first().label)
            assertEquals("02:00", court.slots.last().label)
            assertEquals(date.plusDays(1).atTime(3, 0).atZone(zone).toOffsetDateTime().toString(), court.slots.last().endsAt)
            assertTrue(court.slots.zipWithNext().all { (first, second) -> first.startsAt < second.startsAt })
        }
        assertEquals(BigDecimal("25.00"), response.courts.first().slots.first().price)
        assertEquals(BigDecimal("45.00"), response.courts.first().slots.first().twoHourPrice)
        assertEquals(BigDecimal("35.00"), response.courts.first().slots[11].price)
        assertEquals(BigDecimal("60.00"), response.courts.first().slots[11].twoHourPrice)
    }
}
