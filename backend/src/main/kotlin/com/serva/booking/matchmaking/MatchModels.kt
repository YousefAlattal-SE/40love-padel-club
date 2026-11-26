package com.serva.booking.matchmaking

import com.serva.booking.court.Sport
import jakarta.validation.constraints.*
import java.math.BigDecimal
import java.time.OffsetDateTime

// ─── Admin requests ────────────────────────────────────────────────────────────

private const val MIN_MATCH_PLAYERS = 2L
private const val MAX_MATCH_PLAYERS = 20L
private const val MAX_MATCH_PRICE = "10000"
private const val MAX_MATCH_DESCRIPTION = 2000

data class CreateMatchRequest(
    @field:NotNull
    val sport: Sport,

    @field:NotNull
    val courtId: Long,

    @field:NotNull
    val startsAt: OffsetDateTime,

    @field:NotNull
    val endsAt: OffsetDateTime,

    @field:Min(MIN_MATCH_PLAYERS, message = "must be at least 2 players")
    @field:Max(MAX_MATCH_PLAYERS, message = "must be at most 20 players")
    val maxPlayers: Int,

    @field:DecimalMin("0", message = "price cannot be negative")
    @field:DecimalMax(MAX_MATCH_PRICE, message = "price too large")
    val pricePerPlayer: BigDecimal,

    val skillLevel: SkillLevel = SkillLevel.open,

    @field:Size(max = MAX_MATCH_DESCRIPTION)
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
    @field:Min(MIN_MATCH_PLAYERS, message = "must be at least 2 players")
    @field:Max(MAX_MATCH_PLAYERS, message = "must be at most 20 players")
    val maxPlayers: Int? = null,
    @field:DecimalMin("0", message = "price cannot be negative")
    @field:DecimalMax(MAX_MATCH_PRICE, message = "price too large")
    val pricePerPlayer: BigDecimal? = null,
    val skillLevel: SkillLevel? = null,
    @field:Size(max = MAX_MATCH_DESCRIPTION)
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
    val lifecycleId: java.util.UUID,
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
    val lifecycleId: java.util.UUID,
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

data class OfferActionRequest(val offerId: java.util.UUID)

data class WaitlistEntryResponse(
    val lifecycleId: java.util.UUID,
    val offerId: java.util.UUID?,
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
data class LifecycleActionRequest(val lifecycleId: java.util.UUID)

data class AdminMarkPaidRequest(val paid: Boolean, val lifecycleId: java.util.UUID)

/** Member class exceptions */
class MatchNotFoundException : RuntimeException("Match not found")
class MatchFullException : RuntimeException("This match is full. You can join the waiting list.")
class MatchReservationNotFoundException : RuntimeException("Reservation not found")
class AlreadyReservedException : RuntimeException("You already have a reservation for this match.")
class AlreadyOnWaitlistException : RuntimeException("You are already on the waiting list for this match.")
class CancellationTooLateException : RuntimeException("Cancellations are only allowed up to 12 hours before the match starts.")
