
package com.serva.booking.admin

import com.serva.booking.config.StaffSearch
import jakarta.validation.Valid
import org.springframework.web.bind.annotation.RequestMethod
import com.serva.booking.config.ApiPage
import org.springframework.web.bind.annotation.RequestParam
import com.serva.booking.court.Sport
import com.serva.booking.booking.PhoneNumberRequiredException
import org.springframework.http.HttpStatus
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException
import java.math.BigDecimal
import java.time.Duration
import java.time.LocalDate
import java.time.OffsetDateTime
import java.time.ZoneId

data class AdminOverviewResponse(
    val totalCourts: Long,
    val availableCourts: Long,
    val totalCustomers: Long,
    val bookingsToday: Long,
    val upcomingBookings: Long,
    val unpaidBookings: Long,
    val revenueToday: BigDecimal,
    val revenueThisMonth: BigDecimal,
    val bookingsThisMonth: Long,
    val statusCounts: Map<String, Long>,
)

data class AdminBookingResponse(
    val id: Long,
    val customerName: String,
    val email: String,
    val phone: String?,
    val courtName: String,
    val sport: String,
    val startsAt: String,
    val endsAt: String,
    val hours: Long,
    val totalPrice: BigDecimal,
    val status: String,
    val paid: Boolean,
    val paymentMethod: String?,
    val createdAt: String,
)

data class AdminBookingStatusRequest(val status: String)
data class AdminPaymentRequest(val paid: Boolean, val paymentMethod: String = "cash")
data class AdminCourtResponse(val id: Long, val name: String, val sport: String, val available: Boolean)
data class AdminCourtAvailabilityRequest(val available: Boolean)

data class AdminPricingResponse(
    val sport: String,
    val daytimePrice: BigDecimal,
    val daytimeTwoHourPrice: BigDecimal,
    val eveningPrice: BigDecimal,
    val eveningTwoHourPrice: BigDecimal,
    val updatedAt: String?,
)

data class AdminPricingRequest(
    val daytimePrice: BigDecimal,
    val daytimeTwoHourPrice: BigDecimal,
    val eveningPrice: BigDecimal,
    val eveningTwoHourPrice: BigDecimal,
)

data class AdminCustomerResponse(
    val id: Long,
    val email: String,
    val fullName: String,
    val phone: String?,
    val active: Boolean,
    val createdAt: String,
    val bookingCount: Long,
    val bookingValue: BigDecimal,
)

// All routes under /api/admin are additionally restricted to ROLE_ADMIN in SecurityConfig.
@RestController
@RequestMapping("/api/admin")
class AdminController(private val jdbc: JdbcTemplate) {

    private val zone = ZoneId.of("Asia/Amman")

    @GetMapping("/overview")
    fun overview(): AdminOverviewResponse {
        val today = LocalDate.now(zone)
        val startToday = today.atStartOfDay(zone).toOffsetDateTime()
        val startTomorrow = today.plusDays(1).atStartOfDay(zone).toOffsetDateTime()
        val startMonth = today.withDayOfMonth(1).atStartOfDay(zone).toOffsetDateTime()
        val startNextMonth = today.withDayOfMonth(1).plusMonths(1).atStartOfDay(zone).toOffsetDateTime()

        return AdminOverviewResponse(
            totalCourts = count("SELECT COUNT(*) FROM courts WHERE sport = 'padel' AND legacy_sport IS NULL"),
            availableCourts = count("SELECT COUNT(*) FROM courts WHERE sport = 'padel' AND legacy_sport IS NULL AND is_available = true"),
            totalCustomers = count("SELECT COUNT(*) FROM users WHERE role = 'member'"),
            bookingsToday = jdbc.queryForObject(
                "SELECT COUNT(*) FROM bookings b JOIN courts c ON c.id = b.court_id WHERE c.sport = 'padel' AND c.legacy_sport IS NULL AND b.starts_at >= ? AND b.starts_at < ? AND b.status <> 'cancelled'",
                Long::class.java,
                startToday,
                startTomorrow,
            ) ?: 0L,
            upcomingBookings = jdbc.queryForObject(
                "SELECT COUNT(*) FROM bookings b JOIN courts c ON c.id = b.court_id WHERE c.sport = 'padel' AND c.legacy_sport IS NULL AND b.starts_at >= now() AND b.status = 'confirmed'",
                Long::class.java,
            ) ?: 0L,
            unpaidBookings = count("SELECT COUNT(*) FROM bookings b JOIN courts c ON c.id = b.court_id WHERE c.sport = 'padel' AND c.legacy_sport IS NULL AND b.status = 'confirmed' AND b.paid_at IS NULL"),
            revenueToday = money(startToday, startTomorrow),
            revenueThisMonth = money(startMonth, startNextMonth),
            statusCounts = jdbc.query(
                """SELECT b.status::text, count(*) FROM bookings b JOIN courts c ON c.id=b.court_id
                   WHERE c.sport='padel' AND c.legacy_sport IS NULL GROUP BY b.status"""
            ) { rs, _ -> rs.getString(1) to rs.getLong(2) }.toMap(),
            bookingsThisMonth = jdbc.queryForObject(
                "SELECT COUNT(*) FROM bookings b JOIN courts c ON c.id = b.court_id WHERE c.sport = 'padel' AND c.legacy_sport IS NULL AND b.starts_at >= ? AND b.starts_at < ? AND b.status <> 'cancelled'",
                Long::class.java,
                startMonth,
                startNextMonth,
            ) ?: 0L,
        )
    }

    @RequestMapping("/bookings", method = [RequestMethod.GET, RequestMethod.POST])
    fun bookings(page: ApiPage, @Valid @RequestBody(required = false) criteria: StaffSearch?, @RequestParam(defaultValue = "all") filter: String): List<AdminBookingResponse> = jdbc.query(
        """
        SELECT b.id, u.full_name, u.email, u.phone, c.name AS court_name,
               c.sport::text AS sport, b.starts_at, b.ends_at, b.total_price,
               b.status::text AS status, b.paid_at, b.payment_method::text AS payment_method, b.created_at
        FROM bookings b
        JOIN users u ON u.id = b.user_id
        JOIN courts c ON c.id = b.court_id
        WHERE c.sport = 'padel' AND c.legacy_sport IS NULL
          AND strpos(lower(concat_ws(' ',u.full_name,u.email,u.phone,c.name,c.sport,b.id::text)), lower(?)) > 0
          AND (? = 'all' OR b.status::text = ? OR (? = 'unpaid' AND b.paid_at IS NULL AND b.status='confirmed'))
        ORDER BY b.starts_at DESC, b.id DESC
        LIMIT ? OFFSET ?
        """.trimIndent(),
        { rs, _ ->
            val start = rs.getObject("starts_at", OffsetDateTime::class.java)
            val end = rs.getObject("ends_at", OffsetDateTime::class.java)

            AdminBookingResponse(
                id = rs.getLong("id"),
                customerName = rs.getString("full_name"),
                email = rs.getString("email"),
                phone = rs.getString("phone"),
                courtName = rs.getString("court_name"),
                sport = rs.getString("sport"),
                startsAt = start.toString(),
                endsAt = end.toString(),
                hours = Duration.between(start.toInstant(), end.toInstant()).toHours(),
                totalPrice = rs.getBigDecimal("total_price"),
                status = rs.getString("status"),
                paid = rs.getTimestamp("paid_at") != null,
                paymentMethod = rs.getString("payment_method"),
                createdAt = rs.getObject("created_at", OffsetDateTime::class.java)?.toString() ?: "",
            )
        }, criteria?.search.orEmpty().trim(), filter, filter, filter, page.size, page.offset,
    )

    @PatchMapping("/bookings/{id}/status")
    @org.springframework.transaction.annotation.Transactional
    fun updateBookingStatus(
        @PathVariable id: Long,
        @RequestBody request: AdminBookingStatusRequest,
    ): Map<String, Any> {
        val status = request.status.trim().lowercase()

        if (status !in setOf("confirmed", "cancelled", "no_show")) {
            throw ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Status must be confirmed, cancelled, or no_show",
            )
        }

        // Admin status changes must not bypass the member booking phone requirement.
        if (status == "confirmed") {
            val bookingsMissingPhone = jdbc.queryForObject(
                """
                SELECT COUNT(*)
                FROM bookings b
                LEFT JOIN users u ON u.id = b.user_id
                JOIN courts c ON c.id = b.court_id
                WHERE b.id = ?
                  AND c.sport = 'padel'
                  AND c.legacy_sport IS NULL
                  AND (u.id IS NULL OR u.phone IS NULL OR regexp_replace(u.phone, '[[:space:]]', '', 'g') = '')
                """.trimIndent(),
                Int::class.java,
                id,
            ) ?: 0
            if (bookingsMissingPhone > 0) throw PhoneNumberRequiredException()
        }

        val changed = jdbc.update(
            "UPDATE bookings b SET status = ?::booking_status FROM courts c WHERE c.id = b.court_id AND c.sport = 'padel' AND c.legacy_sport IS NULL AND b.id = ?",
            status,
            id,
        )

        if (changed == 0) {
            throw ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found")
        }

        return mapOf("success" to true, "id" to id, "status" to status)
    }

    @PatchMapping("/bookings/{id}/payment")
    fun updateBookingPayment(
        @PathVariable id: Long,
        @RequestBody request: AdminPaymentRequest,
    ): Map<String, Any> {
        if (request.paid) {
            val method = request.paymentMethod.trim().lowercase()

            if (method !in setOf("cash", "card", "waived")) {
                throw ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Payment method must be cash, card, or waived",
                )
            }

            val changed = jdbc.update(
                "UPDATE bookings b SET paid_at = COALESCE(b.paid_at, now()), paid_amount = COALESCE(b.paid_amount, b.total_price), payment_method = ?::payment_method FROM courts c WHERE c.id = b.court_id AND c.sport = 'padel' AND c.legacy_sport IS NULL AND b.id = ?",
                method,
                id,
            )

            if (changed == 0) {
                throw ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found")
            }
        } else {
            val changed = jdbc.update(
                "UPDATE bookings b SET paid_at = NULL, paid_amount = NULL, payment_method = NULL FROM courts c WHERE c.id = b.court_id AND c.sport = 'padel' AND c.legacy_sport IS NULL AND b.id = ?",
                id,
            )

            if (changed == 0) {
                throw ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found")
            }
        }

        return mapOf("success" to true, "id" to id, "paid" to request.paid)
    }

    @GetMapping("/courts")
    fun courts(): List<AdminCourtResponse> = jdbc.query(
        "SELECT id, name, sport::text AS sport, is_available FROM courts WHERE sport = 'padel' AND legacy_sport IS NULL ORDER BY id"
    ) { rs, _ ->
        AdminCourtResponse(
            rs.getLong("id"),
            rs.getString("name"),
            rs.getString("sport"),
            rs.getBoolean("is_available"),
        )
    }

    @PatchMapping("/courts/{id}/availability")
    fun setCourtAvailability(
        @PathVariable id: Long,
        @RequestBody request: AdminCourtAvailabilityRequest,
    ): Map<String, Any> {
        val changed = jdbc.update(
            "UPDATE courts SET is_available = ? WHERE id = ? AND sport = 'padel' AND legacy_sport IS NULL",
            request.available,
            id,
        )

        if (changed == 0) {
            throw ResponseStatusException(HttpStatus.NOT_FOUND, "Court not found")
        }

        return mapOf("success" to true, "id" to id, "available" to request.available)
    }

    @GetMapping("/pricing")
    fun pricing(): List<AdminPricingResponse> = jdbc.query(
        "SELECT sport::text AS sport, off_peak_price AS daytime_price, daytime_two_hour_price, peak_price AS evening_price, evening_two_hour_price, updated_at FROM pricing WHERE sport = 'padel' ORDER BY sport"
    ) { rs, _ ->
        AdminPricingResponse(
            sport = rs.getString("sport"),
            daytimePrice = rs.getBigDecimal("daytime_price"),
            daytimeTwoHourPrice = rs.getBigDecimal("daytime_two_hour_price"),
            eveningPrice = rs.getBigDecimal("evening_price"),
            eveningTwoHourPrice = rs.getBigDecimal("evening_two_hour_price"),
            updatedAt = rs.getObject("updated_at", OffsetDateTime::class.java)?.toString(),
        )
    }

    @PutMapping("/pricing/{sport}")
    fun updatePricing(
        @PathVariable sport: String,
        @RequestBody request: AdminPricingRequest,
    ): AdminPricingResponse {
        val sportName = sport.trim().lowercase()

        if (sportName !in Sport.entries.map { it.name }) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown sport")
        }

        val prices = listOf(
            request.daytimePrice,
            request.daytimeTwoHourPrice,
            request.eveningPrice,
            request.eveningTwoHourPrice,
        )

        if (prices.any { it < BigDecimal.ZERO || it > BigDecimal("10000") }) {
            throw ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Prices must be between 0 and 10000 JD",
            )
        }

        val changed = jdbc.update(
            "UPDATE pricing SET off_peak_price = ?, daytime_two_hour_price = ?, peak_price = ?, evening_two_hour_price = ?, updated_at = now() WHERE sport = ?",
            request.daytimePrice,
            request.daytimeTwoHourPrice,
            request.eveningPrice,
            request.eveningTwoHourPrice,
            sportName,
        )

        if (changed == 0) {
            throw ResponseStatusException(HttpStatus.NOT_FOUND, "Pricing row not found")
        }

        return pricing().first { it.sport == sportName }
    }

    @RequestMapping("/customers", method = [RequestMethod.GET, RequestMethod.POST])
    fun customers(page: ApiPage, @Valid @RequestBody(required = false) criteria: StaffSearch?, @RequestParam(defaultValue = "all") filter: String): List<AdminCustomerResponse> = jdbc.query(
        """
        SELECT u.id, u.email, u.full_name, u.phone, u.is_active, u.created_at,
               COUNT(b.id) FILTER (WHERE b.status <> 'cancelled') AS booking_count,
               COALESCE(SUM(b.total_price) FILTER (WHERE b.status <> 'cancelled'), 0) AS booking_value
        FROM (
            SELECT id, email, full_name, phone, is_active, created_at FROM users
            WHERE role = 'member'
              AND strpos(lower(concat_ws(' ',full_name,email,phone,id::text)), lower(?)) > 0
              AND (? = 'all' OR (CASE WHEN is_active THEN 'active' ELSE 'inactive' END) = ?)
            ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?
        ) u LEFT JOIN bookings b ON b.user_id = u.id
          AND EXISTS (SELECT 1 FROM courts c WHERE c.id = b.court_id AND c.sport = 'padel' AND c.legacy_sport IS NULL)
        GROUP BY u.id, u.email, u.full_name, u.phone, u.is_active, u.created_at
        ORDER BY u.created_at DESC, u.id DESC
        """.trimIndent(),
        { rs, _ ->
            AdminCustomerResponse(
                id = rs.getLong("id"),
                email = rs.getString("email"),
                fullName = rs.getString("full_name"),
                phone = rs.getString("phone"),
                active = rs.getBoolean("is_active"),
                createdAt = rs.getObject("created_at", OffsetDateTime::class.java)?.toString() ?: "",
                bookingCount = rs.getLong("booking_count"),
                bookingValue = rs.getBigDecimal("booking_value") ?: BigDecimal.ZERO,
            )
        }, criteria?.search.orEmpty().trim(), filter, filter, page.size, page.offset,
    )

    private fun count(sql: String): Long =
        jdbc.queryForObject(sql, Long::class.java) ?: 0L

    private fun money(from: OffsetDateTime, until: OffsetDateTime): BigDecimal =
        jdbc.queryForObject(
            "SELECT COALESCE(SUM(COALESCE(b.paid_amount, b.total_price)), 0) FROM bookings b JOIN courts c ON c.id = b.court_id WHERE c.sport = 'padel' AND c.legacy_sport IS NULL AND b.paid_at >= ? AND b.paid_at < ?",
            BigDecimal::class.java,
            from,
            until,
        ) ?: BigDecimal.ZERO
}
