package com.serva.booking.matchmaking

import com.serva.booking.court.Sport
import jakarta.validation.constraints.*
import java.math.BigDecimal
import java.time.OffsetDateTime

// ─── Admin requests ────────────────────────────────────────────────────────────

data class CreateMatchRequest(
    @field:NotNull
    val sport: Sport,

    @field:NotNull
    val courtId: Long,

    @field:NotNull
    val startsAt: OffsetDateTime,

    @field:NotNull
    val endsAt: OffsetDateTime,

    @field:Min(2, message = "must be at least 2 players")
    @field:Max(20, message = "must be at most 20 players")
    val maxPlayers: Int,

    @field:DecimalMin("0", message = "price cannot be negative")
    @field:DecimalMax("10000", message = "price too large")
    val pricePerPlayer: BigDecimal,

    val skillLevel: SkillLevel = SkillLevel.open,

    @field:Size(max = 2000)
    val description: String? = null,

    // New matches are published by default so members can see them immediately.
    // Admins can explicitly save a draft when they are not ready to publish.
    val status: MatchStatus = MatchStatus.published,
)

data class UpdateMatchRequest(
    val sport: Sport? = null,
    val courtId: Long? = null,
    val startsAt: OffsetDateTime? = null,
    val endsAt: OffsetDateTime? = null,
    val maxPlayers: Int? = null,
    @field:DecimalMin("0", message = "price cannot be negative")
    val pricePerPlayer: BigDecimal? = null,
    val skillLevel: SkillLevel? = null,
    val description: String? = null,
    val status: MatchStatus? = null,
)

// ─── Responses ────────────────────────────────────────────────────────────────

data class MatchResponse(
    val id: Long,
    val sport: String,
    val courtId: Long,
    val courtName: String,
    val startsAt: String,
    val endsAt: String,
    val maxPlayers: Int,
    val pricePerPlayer: BigDecimal,
    val skillLevel: SkillLevel,
    val description: String?,
    val status: MatchStatus,
    val confirmedCount: Int,
    val availableSpots: Int,
    val waitlistCount: Int,
    val createdAt: String,
)

data class MatchReservationResponse(
    val id: Long,
    val matchId: Long,
    val sport: String,
    val courtName: String,
    val startsAt: String,
    val endsAt: String,
    val pricePerPlayer: BigDecimal,  // locked at reservation time
    val skillLevel: SkillLevel,
    val status: MatchReservationStatus,
    val paymentStatus: MatchPaymentStatus,
    val cancellable: Boolean,
    val createdAt: String,
)

/** Admin view of a reservation — includes user details. */
data class AdminReservationResponse(
    val id: Long,
    val matchId: Long,
    val userId: Long,
    val fullName: String,
    val email: String,
    val phone: String?,
    val priceSnapshot: BigDecimal,
    val status: MatchReservationStatus,
    val paymentStatus: MatchPaymentStatus,
    val paidAt: String?,
    val createdAt: String,
)

data class WaitlistEntryResponse(
    val id: Long,
    val matchId: Long,
    val status: WaitlistStatus,
    val position: Int,           // 1-based position in the waiting queue (for 'waiting' status)
    val offerExpiresAt: String?, // for 'offered' status
    val joinedAt: String,
)

data class AdminWaitlistEntryResponse(
    val id: Long,
    val matchId: Long,
    val userId: Long,
    val fullName: String,
    val email: String,
    val phone: String?,
    val status: WaitlistStatus,
    val position: Int,
    val offerExpiresAt: String?,
    val joinedAt: String,
)

data class MatchTotalsResponse(
    val matchId: Long,
    val expectedTotal: BigDecimal,   // all confirmed reservations × price
    val collectedTotal: BigDecimal,  // paid reservations × price
    val confirmedCount: Int,
    val paidCount: Int,
)

/** Admin update payment status */
data class AdminMarkPaidRequest(val paid: Boolean)

/** Member class exceptions */
class MatchNotFoundException : RuntimeException("Match not found")
class MatchFullException : RuntimeException("This match is full. You can join the waiting list.")
class MatchReservationNotFoundException : RuntimeException("Reservation not found")
class AlreadyReservedException : RuntimeException("You already have a reservation for this match.")
class AlreadyOnWaitlistException : RuntimeException("You are already on the waiting list for this match.")
class CancellationTooLateException : RuntimeException("Cancellations are only allowed up to 12 hours before the match starts.")
