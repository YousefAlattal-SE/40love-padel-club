package com.serva.booking

import java.math.BigDecimal
import java.time.Instant
import java.time.ZoneId
import java.time.ZonedDateTime

/** Daytime window in local whole hours: startHour inclusive, endHour exclusive. */
data class OffPeakWindow(val startHour: Int, val endHour: Int)

data class SportRate(
    val daytimeHourlyPrice: BigDecimal,
    val daytimeTwoHourPrice: BigDecimal,
    val eveningHourlyPrice: BigDecimal,
    val eveningTwoHourPrice: BigDecimal,
)

data class PriceLine(
    val hourStart: ZonedDateTime,
    val isPeak: Boolean,
    val price: BigDecimal,
    val twoHourPrice: BigDecimal,
)

data class PriceQuote(val lines: List<PriceLine>, val total: BigDecimal)

class BookingRuleException(message: String) : RuntimeException(message)

/**
 * Club is open 07:00 to 03:00 (next day), so a booking is valid only if every
 * hour it covers starts at 07..23 or 00..02 local time. Pricing follows the
 * period at the booking start: 07:00-18:00 is daytime; 18:00-07:00 is evening.
 * Two-hour bundles apply to each full pair of hours; an odd extra hour uses
 * the one-hour rate for the start period.
 */
class PricingCalculator(
    private val zone: ZoneId = ZoneId.of("Asia/Amman"),
    private val openHour: Int = 7,
    private val closeHour: Int = 3,
) {

    fun isOpenAt(hour: Int): Boolean =
        hour in openHour..23 || hour in 0 until closeHour

    fun quote(
        startsAt: Instant,
        endsAt: Instant,
        rate: SportRate,
        offPeakWindows: List<OffPeakWindow>,
    ): PriceQuote {
        val start = startsAt.atZone(zone)
        val end = endsAt.atZone(zone)

        if (!end.isAfter(start)) throw BookingRuleException("End must be after start")
        if (start.minute != 0 || start.second != 0 || end.minute != 0 || end.second != 0) {
            throw BookingRuleException("Bookings must start and end on the hour")
        }

        val daytime = offPeakWindows.any { start.hour in it.startHour until it.endHour }
        val hourlyPrice = if (daytime) rate.daytimeHourlyPrice else rate.eveningHourlyPrice
        val twoHourPrice = if (daytime) rate.daytimeTwoHourPrice else rate.eveningTwoHourPrice

        val lines = mutableListOf<PriceLine>()
        var cursor = start
        while (cursor.isBefore(end)) {
            val hour = cursor.hour
            if (!isOpenAt(hour)) {
                throw BookingRuleException("Club is closed at %02d:00".format(hour))
            }
            lines += PriceLine(
                hourStart = cursor,
                isPeak = !daytime,
                price = hourlyPrice,
                twoHourPrice = twoHourPrice,
            )
            cursor = cursor.plusHours(1)
        }

        val hours = lines.size
        val total = twoHourPrice.multiply(BigDecimal.valueOf((hours / 2).toLong())) +
            hourlyPrice.multiply(BigDecimal.valueOf((hours % 2).toLong()))
        return PriceQuote(lines, total)
    }
}
