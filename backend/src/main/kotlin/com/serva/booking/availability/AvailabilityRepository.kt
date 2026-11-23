package com.serva.booking.availability

import com.serva.booking.OffPeakWindow
import com.serva.booking.SportRate
import com.serva.booking.court.Sport
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Repository
import java.time.Instant
import java.time.OffsetDateTime
import java.time.ZoneOffset

data class BookedRange(val courtId: Long, val startsAt: Instant, val endsAt: Instant)

/**
 * Plain SQL reads used to build the availability calendar.
 */
@Repository
class AvailabilityRepository(private val jdbc: JdbcTemplate) {

    fun rates(): Map<Sport, SportRate> =
        jdbc.query(
            "SELECT sport::text AS sport, peak_price, off_peak_price, daytime_two_hour_price, evening_two_hour_price FROM pricing WHERE sport = 'padel'"
        ) { rs, _ ->
            Sport.valueOf(rs.getString("sport")) to SportRate(
                daytimeHourlyPrice = rs.getBigDecimal("off_peak_price"),
                daytimeTwoHourPrice = rs.getBigDecimal("daytime_two_hour_price"),
                eveningHourlyPrice = rs.getBigDecimal("peak_price"),
                eveningTwoHourPrice = rs.getBigDecimal("evening_two_hour_price"),
            )}.toMap()

    fun offPeakWindows(): List<OffPeakWindow> =
        jdbc.query(
            "SELECT start_hour, end_hour FROM off_peak_windows"
        ) { rs, _ ->
            OffPeakWindow(
                rs.getInt("start_hour"),
                rs.getInt("end_hour"),
            )
        }
    /** Court claims that overlap the window [from, to). */
    fun bookedRanges(from: Instant, to: Instant): List<BookedRange> =
        jdbc.query(
            """
            SELECT court_id, starts_at, ends_at
            FROM court_occupancy
            WHERE tstzrange(starts_at, ends_at, '[)') && tstzrange(?, ?, '[)')
            """.trimIndent(),
            { rs, _ ->
                BookedRange(
                    rs.getLong("court_id"),
                    rs.getObject("starts_at", OffsetDateTime::class.java).toInstant(),
                    rs.getObject("ends_at", OffsetDateTime::class.java).toInstant(),
                )
            },
            from.atOffset(ZoneOffset.UTC),
            to.atOffset(ZoneOffset.UTC),
        )
}
