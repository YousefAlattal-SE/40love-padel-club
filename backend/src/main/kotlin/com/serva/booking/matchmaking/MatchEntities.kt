package com.serva.booking.matchmaking

import com.serva.booking.court.Sport
import jakarta.persistence.*
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.type.SqlTypes
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Lock
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.math.BigDecimal
import java.time.Instant

// ─── Enums ───────────────────────────────────────────────────────────────────
// Match status and workflow enums retain their existing database values.
@Suppress("EnumEntryName")
enum class MatchStatus { draft, published, cancelled, completed }
@Suppress("EnumEntryName")
enum class SkillLevel  { beginner, intermediate, advanced, open }
@Suppress("EnumEntryName")
enum class MatchReservationStatus { confirmed, cancelled }
@Suppress("EnumEntryName")
enum class MatchPaymentStatus     { unpaid, paid }
@Suppress("EnumEntryName")
enum class WaitlistStatus         { waiting, offered, accepted, declined, expired, removed }

// ─── Match entity ─────────────────────────────────────────────────────────────

@Entity
@Table(name = "matches")
class Match(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    val sport: String = Sport.padel.name,

    @Column(name = "court_id")
    val courtId: Long = 0,

    @Column(name = "legacy_sport")
    val legacySport: String? = null,

    @Column(name = "starts_at")
    val startsAt: Instant = Instant.EPOCH,

    @Column(name = "ends_at")
    val endsAt: Instant = Instant.EPOCH,

    @Column(name = "max_players")
    val maxPlayers: Int = 4,

    @Column(name = "price_per_player")
    val pricePerPlayer: BigDecimal = BigDecimal.ZERO,

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    val skillLevel: SkillLevel = SkillLevel.open,

    val description: String? = null,

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    var status: MatchStatus = MatchStatus.draft,

    @Column(name = "created_by")
    val createdBy: Long = 0,

    @Column(name = "created_at")
    val createdAt: Instant = Instant.now(),

    @Column(name = "updated_at")
    var updatedAt: Instant = Instant.now(),
)

// ─── Match Reservation entity ─────────────────────────────────────────────────

@Entity
@Table(name = "match_reservations")
class MatchReservation(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @Column(name = "match_id")
    val matchId: Long = 0,

    @Column(name = "user_id")
    val userId: Long = 0,

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    var status: MatchReservationStatus = MatchReservationStatus.confirmed,

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    var paymentStatus: MatchPaymentStatus = MatchPaymentStatus.unpaid,

    @Column(name = "price_snapshot")
    val priceSnapshot: BigDecimal = BigDecimal.ZERO,

    @Column(name = "paid_at")
    var paidAt: Instant? = null,

    @Column(name = "paid_by")
    var paidBy: Long? = null,

    @Column(name = "created_at")
    val createdAt: Instant = Instant.now(),

    @Column(name = "updated_at")
    var updatedAt: Instant = Instant.now(),
    @Column(name = "lifecycle_id", nullable = false)
    var lifecycleId: java.util.UUID = java.util.UUID.randomUUID(),

)

// ─── Waitlist entry entity ─────────────────────────────────────────────────────

@Entity
@Table(name = "match_waitlist")
class MatchWaitlistEntry(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @Column(name = "match_id")
    val matchId: Long = 0,

    @Column(name = "user_id")
    val userId: Long = 0,

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    var status: WaitlistStatus = WaitlistStatus.waiting,

    @Column(name = "offered_at")
    var offeredAt: Instant? = null,

    @Column(name = "offer_id")
    var offerId: java.util.UUID? = null,

    @Column(name = "offer_expires_at")
    var offerExpiresAt: Instant? = null,

    @Column(name = "joined_at")
    val joinedAt: Instant = Instant.now(),

    @Column(name = "updated_at")
    var updatedAt: Instant = Instant.now(),
    @Column(name = "lifecycle_id", nullable = false)
    var lifecycleId: java.util.UUID = java.util.UUID.randomUUID(),

)

// ─── Repositories ──────────────────────────────────────────────────────────────

interface MatchRepository : JpaRepository<Match, Long> {
    /** Count published matches that overlap the given time range on the given court. */
    @Query("""
        SELECT COUNT(m) FROM Match m
        WHERE m.sport = 'padel'
          AND m.legacySport IS NULL
          AND m.courtId = :courtId
          AND m.status = :status
          AND m.startsAt < :end
          AND m.endsAt > :start
          AND (:excludeId IS NULL OR m.id <> :excludeId)
    """)
    fun countConflictingPublished(
        @Param("courtId") courtId: Long,
        @Param("start") start: Instant,
        @Param("end") end: Instant,
        @Param("excludeId") excludeId: Long?,
        @Param("status") status: MatchStatus,
    ): Long

    /** Lock this match row for update — used during reservation to prevent race conditions. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT m FROM Match m WHERE m.id = :id AND m.sport = 'padel' AND m.legacySport IS NULL")
    fun findByIdForUpdate(@Param("id") id: Long): Match?
}

interface MatchReservationRepository : JpaRepository<MatchReservation, Long> {
    @Query("select r.matchId from MatchReservation r where r.id = :id")
    fun matchIdForReservation(@Param("id") id: Long): Long?

    fun findByUserId(userId: Long): List<MatchReservation>
    fun findByMatchIdAndUserId(matchId: Long, userId: Long): MatchReservation?

    @Query("SELECT COUNT(r) FROM MatchReservation r WHERE r.matchId = :matchId AND r.status = :status")
    fun countConfirmedByMatchId(
        @Param("matchId") matchId: Long,
        @Param("status") status: MatchReservationStatus,
    ): Long

    fun findByMatchIdAndStatus(matchId: Long, status: MatchReservationStatus): List<MatchReservation>
}

interface MatchWaitlistRepository : JpaRepository<MatchWaitlistEntry, Long> {
    fun findByMatchId(matchId: Long): List<MatchWaitlistEntry>
    fun countByMatchIdAndStatusIn(matchId: Long, statuses: List<WaitlistStatus>): Int
    fun findByUserId(userId: Long): List<MatchWaitlistEntry>
    fun findByMatchIdAndUserId(matchId: Long, userId: Long): MatchWaitlistEntry?

    @Query("""
        SELECT w FROM MatchWaitlistEntry w
        WHERE w.matchId = :matchId AND w.status = :status
        ORDER BY w.joinedAt ASC, w.id ASC
    """)
    fun findFirstWaiting(
        @Param("matchId") matchId: Long,
        @Param("status") status: WaitlistStatus,
    ): List<MatchWaitlistEntry>

    @Query("""
        SELECT DISTINCT w.matchId FROM MatchWaitlistEntry w
        WHERE w.status = :status AND (w.offerExpiresAt IS NULL OR w.offerExpiresAt <= :now)
          AND EXISTS (SELECT m.id FROM Match m WHERE m.id = w.matchId AND m.sport = 'padel' AND m.legacySport IS NULL)
    """)
    fun expiredMatchIds(
        @Param("now") now: Instant,
        @Param("status") status: WaitlistStatus,
    ): List<Long>

    fun findByMatchIdAndStatus(matchId: Long, status: WaitlistStatus): List<MatchWaitlistEntry>
}
