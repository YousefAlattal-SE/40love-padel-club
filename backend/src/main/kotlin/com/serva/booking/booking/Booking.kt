package com.serva.booking.booking

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.type.SqlTypes
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.math.BigDecimal
import java.time.Instant

// Lowercase names match the booking_status enum in PostgreSQL
@Suppress("EnumEntryName", "unused")
enum class BookingStatus { confirmed, cancelled, no_show }

@Entity
@Table(name = "bookings")
class Booking(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @Column(name = "user_id")
    val userId: Long = 0,

    @Column(name = "court_id")
    val courtId: Long = 0,

    @Column(name = "starts_at")
    val startsAt: Instant = Instant.EPOCH,

    @Column(name = "ends_at")
    val endsAt: Instant = Instant.EPOCH,

    @Column(name = "total_price")
    val totalPrice: BigDecimal = BigDecimal.ZERO,

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    var status: BookingStatus = BookingStatus.confirmed,

    // Set by the front desk when the member pays at the club
    @Column(name = "paid_at")
    val paidAt: Instant? = null,
)

interface BookingRepository : JpaRepository<Booking, Long> {

    fun findByUserIdOrderByStartsAtDesc(userId: Long): List<Booking>

    /**
     * Serialises a member's booking creation (club decision B-3): concurrent requests for the same
     * member wait here, so the upcoming-count and overlap checks cannot both pass in a race.
     * NO KEY UPDATE still lets other rows reference the member.
     */
    @Query(value = "SELECT id FROM users WHERE id = :userId FOR NO KEY UPDATE", nativeQuery = true)
    fun lockMember(@Param("userId") userId: Long): List<Long>

    /** The member's bookings with [status] that have not ended yet. */
    @Query(
        """
        select count(b) from Booking b
        where b.userId = :userId
          and b.status = :status
          and b.endsAt > :now
        """
    )
    fun countUpcomingForMember(
        @Param("userId") userId: Long,
        @Param("status") status: BookingStatus,
        @Param("now") now: Instant,
    ): Long

    /** The member's bookings with [status] that overlap [start, end) on any court. */
    @Query(
        """
        select count(b) from Booking b
        where b.userId = :userId
          and b.status = :status
          and b.startsAt < :end
          and b.endsAt > :start
        """
    )
    fun countMemberOverlapping(
        @Param("userId") userId: Long,
        @Param("start") start: Instant,
        @Param("end") end: Instant,
        @Param("status") status: BookingStatus,
    ): Long

    /**
     * How many bookings overlap [start, end) on this court, ignoring those with status [excluded]
     * (pass BookingStatus. Canceled). The status is a parameter, not a literal in the query,
     * because Hibernate would cast a literal to the wrong PostgreSQL enum type name.
     */
    @Query(
        """
        select count(b) from Booking b
        where b.courtId = :courtId
          and b.status <> :excluded
          and b.startsAt < :end
          and b.endsAt > :start
        """
    )
    fun countOverlapping(
        @Param("courtId") courtId: Long,
        @Param("start") start: Instant,
        @Param("end") end: Instant,
        @Param("excluded") excluded: BookingStatus,
    ): Long

    /**
     * Count published matches that overlap [start, end) on this court.
     * Used by BookingService to prevent regular bookings from clashing with matches.
     */
    @Query(
        """
        select count(m) from com.serva.booking.matchmaking.Match m
        where m.courtId = :courtId
          and m.status = :status
          and m.startsAt < :end
          and m.endsAt > :start
        """
    )
    fun countOverlappingMatches(
        @Param("courtId") courtId: Long,
        @Param("start") start: Instant,
        @Param("end") end: Instant,
        @Param("status") status: com.serva.booking.matchmaking.MatchStatus,
    ): Long
}