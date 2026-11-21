package com.serva.booking.pricing

import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.math.BigDecimal

data class PublicPriceResponse(
    val sport: String,
    val daytimePrice: BigDecimal,
    val daytimeTwoHourPrice: BigDecimal,
    val eveningPrice: BigDecimal,
    val eveningTwoHourPrice: BigDecimal,
)

/** Read-only public prices used by the marketing pages. Edits remain admin-only. */
@RestController
@RequestMapping("/api/pricing")
class PublicPricingController(private val jdbc: JdbcTemplate) {
    @GetMapping
    fun list(): List<PublicPriceResponse> = jdbc.query(
        """
        SELECT
            sport::text AS sport,
            off_peak_price AS daytime_price,
            daytime_two_hour_price,
            peak_price AS evening_price,
            evening_two_hour_price
        FROM pricing
        WHERE sport = 'padel'
        ORDER BY sport
        """.trimIndent()
    ) { rs, _ ->
        PublicPriceResponse(
            rs.getString("sport"),
            rs.getBigDecimal("daytime_price"),
            rs.getBigDecimal("daytime_two_hour_price"),
            rs.getBigDecimal("evening_price"),
            rs.getBigDecimal("evening_two_hour_price"),
        )
    }
}
