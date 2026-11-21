package com.serva.booking

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.LocalDate
import java.time.LocalTime
import java.time.ZoneId

class PricingCalculatorTest {
    private val zone = ZoneId.of("Asia/Amman")
    private val calculator = PricingCalculator(zone)
    private val rate = SportRate(
        daytimeHourlyPrice = BigDecimal("25.00"),
        daytimeTwoHourPrice = BigDecimal("45.00"),
        eveningHourlyPrice = BigDecimal("35.00"),
        eveningTwoHourPrice = BigDecimal("60.00"),
    )
    private val daytime = listOf(OffPeakWindow(7, 18))

    private fun instant(hour: Int, dayOffset: Long = 2) =
        LocalDate.now(zone).plusDays(dayOffset).atTime(LocalTime.of(hour, 0)).atZone(zone).toInstant()

    @Test
    fun `applies daytime one and two hour prices`() {
        assertEquals(BigDecimal("25.00"), calculator.quote(instant(7), instant(7).plusSeconds(3600), rate, daytime).total)
        assertEquals(BigDecimal("45.00"), calculator.quote(instant(7), instant(7).plusSeconds(7200), rate, daytime).total)
    }

    @Test
    fun `applies evening bundle and bundle plus extra hour`() {
        assertEquals(BigDecimal("60.00"), calculator.quote(instant(18), instant(18).plusSeconds(7200), rate, daytime).total)
        assertEquals(BigDecimal("95.00"), calculator.quote(instant(18), instant(18).plusSeconds(10800), rate, daytime).total)
    }

    @Test
    fun `crossing six pm uses the period at booking start`() {
        val quote = calculator.quote(instant(17), instant(17).plusSeconds(7200), rate, daytime)
        assertEquals(BigDecimal("45.00"), quote.total)
        assertEquals(listOf(BigDecimal("25.00"), BigDecimal("25.00")), quote.lines.map { it.price })
    }

    @Test
    fun `allows the final two am hour through three am but rejects three am and six am starts`() {
        assertEquals(BigDecimal("35.00"), calculator.quote(instant(2), instant(2).plusSeconds(3600), rate, daytime).total)
        assertThrows(BookingRuleException::class.java) {
            calculator.quote(instant(3), instant(3).plusSeconds(3600), rate, daytime)
        }
        assertThrows(BookingRuleException::class.java) {
            calculator.quote(instant(6), instant(6).plusSeconds(3600), rate, daytime)
        }
    }
}
