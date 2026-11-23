package com.serva.booking.matchmaking

import com.serva.booking.config.ApiPage
import com.serva.booking.BookingRuleException
import com.serva.booking.booking.SlotTakenException
import com.serva.booking.booking.BookingRepository
import com.serva.booking.booking.BookingStatus
import com.serva.booking.court.CourtRepository
import com.serva.booking.court.Sport
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.time.Instant
import java.time.LocalTime
import java.time.ZoneId
import java.time.temporal.ChronoUnit

@Service
class MatchService(
    private val matchRepo: MatchRepository,
    private val reservationRepo: MatchReservationRepository,
    private val waitlistRepo: MatchWaitlistRepository,
    private val courtRepo: CourtRepository,
    private val bookingRepo: BookingRepository,
    private val jdbc: JdbcTemplate,
) {
    private val zone = ZoneId.of("Asia/Amman")

    companion object {
        const val CANCEL_CUTOFF_HOURS = 12L   // members cannot cancel within 12 h of start
        const val OFFER_WINDOW_MINUTES = 10L  // waitlist offer expires after 10 min
    }

    // ─── Public / Member: list and view matches ────────────────────────────────

    @Transactional(readOnly = true)
    fun listMatches(page: ApiPage, status: MatchStatus?, skill: SkillLevel?, upcomingOnly: Boolean): List<MatchResponse> =
        jdbc.query(
            """
            SELECT m.*,
                (SELECT COUNT(*) FROM match_reservations r WHERE r.match_id=m.id AND r.status='confirmed') AS confirmed,
                (SELECT COUNT(*) FROM match_waitlist w WHERE w.match_id=m.id AND w.status IN ('waiting','offered')) AS queued
            FROM (
                SELECT src.*, c.name AS court_name FROM matches src
                JOIN courts c ON c.id=src.court_id AND c.legacy_sport IS NULL AND c.sport='padel'
                WHERE src.sport='padel' AND src.legacy_sport IS NULL
                  AND (? = '' OR status::text = ?) AND (? = '' OR skill_level::text = ?)
                  AND (NOT ? OR starts_at > CURRENT_TIMESTAMP)
                ORDER BY src.starts_at, src.id LIMIT ? OFFSET ?
            ) m
            ORDER BY m.starts_at, m.id
            """.trimIndent(),
            { rs, _ ->
                fun time(column: String) = rs.getTimestamp(column).toInstant().atZone(zone).toOffsetDateTime().toString()
                val confirmed = rs.getInt("confirmed")
                val capacity = rs.getInt("max_players")
                MatchResponse(
                    id = rs.getLong("id"), sport = rs.getString("sport"), courtId = rs.getLong("court_id"),
                    courtName = rs.getString("court_name"), startsAt = time("starts_at"), endsAt = time("ends_at"),
                    maxPlayers = capacity, pricePerPlayer = rs.getBigDecimal("price_per_player"),
                    skillLevel = SkillLevel.valueOf(rs.getString("skill_level")), description = rs.getString("description"),
                    status = MatchStatus.valueOf(rs.getString("status")), confirmedCount = confirmed,
                    availableSpots = (capacity - confirmed).coerceAtLeast(0), waitlistCount = rs.getInt("queued"),
                    createdAt = time("created_at"),
                )
            },
            status?.name.orEmpty(), status?.name.orEmpty(), skill?.name.orEmpty(), skill?.name.orEmpty(),
            upcomingOnly, page.size, page.offset,
        )

    @Transactional(readOnly = true)
    fun getPublicMatch(matchId: Long): MatchResponse {
        val match = requirePadelMatch(matchId)
        if (match.status != MatchStatus.published) throw MatchNotFoundException()
        return toMatchResponse(match)
    }

    // ─── Admin: create a match ─────────────────────────────────────────────────

    @Transactional
    fun createMatch(adminId: Long, req: CreateMatchRequest): MatchResponse {
        val court = courtRepo.findById(req.courtId).orElseThrow { BookingRuleException("Court not found") }
        if (req.sport != Sport.padel || court.sport != Sport.padel.name || court.legacySport != null) {
            throw BookingRuleException("Only Padel matches on Padel courts are supported")
        }
        val start = req.startsAt.toInstant()
        val end = req.endsAt.toInstant()

        validateMatchTimes(start, end)

        // A newly created match should be visible to members unless the admin
        // deliberately selects Draft. Validate the court slot before publishing.
        if (req.status != MatchStatus.draft && req.status != MatchStatus.published) {
            throw BookingRuleException("A new match can only be created as draft or published")
        }
        if (req.status == MatchStatus.published) {
            checkCourtConflicts(court.id, start, end, excludeMatchId = null)
        }

        val match = matchRepo.saveAndFlush(
            Match(
                sport = Sport.padel.name,
                courtId = court.id,
                startsAt = start,
                endsAt = end,
                maxPlayers = req.maxPlayers,
                pricePerPlayer = req.pricePerPlayer,
                skillLevel = req.skillLevel,
                description = req.description,
                status = req.status,
                createdBy = adminId,
            )
        )
        return toMatchResponse(match)
    }

    // ─── Admin: update a match ─────────────────────────────────────────────────

    @Transactional
    fun updateMatch(matchId: Long, req: UpdateMatchRequest): MatchResponse {
        val match = matchRepo.findByIdForUpdate(matchId) ?: throw MatchNotFoundException()

        // Cannot edit a cancelled or completed match
        if (match.status == MatchStatus.cancelled || match.status == MatchStatus.completed) {
            throw BookingRuleException("Cannot edit a ${match.status.name} match")
        }

        val newCourtId = req.courtId ?: match.courtId
        val court = courtRepo.findById(newCourtId).orElseThrow { BookingRuleException("Court not found") }
        if (court.sport != Sport.padel.name || court.legacySport != null || (req.sport != null && req.sport != Sport.padel)) {
            throw BookingRuleException("Only Padel matches on Padel courts are supported")
        }

        val newStart = req.startsAt?.toInstant() ?: match.startsAt
        val newEnd = req.endsAt?.toInstant() ?: match.endsAt

        val newStatus = req.status ?: match.status
        if (newStart != match.startsAt || newEnd != match.endsAt || newCourtId != match.courtId || newStatus == MatchStatus.published) {
            validateMatchTimes(newStart, newEnd)
        }

        // Validate new status transitions
        validateStatusTransition(match.status, newStatus)

        if (newStatus == MatchStatus.completed &&
            (newCourtId != match.courtId || newStart != match.startsAt || newEnd != match.endsAt)
        ) {
            throw BookingRuleException("Complete the match without changing its scheduled court or time")
        }

        // If publishing, check for conflicts with bookings and other matches
        if (newStatus == MatchStatus.published) {
            checkCourtConflicts(newCourtId, newStart, newEnd, excludeMatchId = matchId)
        }

        // Check capacity: cannot reduce maxPlayers below current confirmed count
        val confirmedCount = reservationRepo.countConfirmedByMatchId(matchId, MatchReservationStatus.confirmed).toInt()
        val newMaxPlayers = req.maxPlayers ?: match.maxPlayers
        if (newMaxPlayers < confirmedCount) {
            throw BookingRuleException("Cannot reduce capacity below current number of confirmed players ($confirmedCount)")
        }

        // Build new match by creating a new entity (entities are immutable except for mutable vars)
        val updated = Match(
            id = match.id,
            sport = Sport.padel.name,
            courtId = newCourtId,
            startsAt = newStart,
            endsAt = newEnd,
            maxPlayers = newMaxPlayers,
            pricePerPlayer = req.pricePerPlayer ?: match.pricePerPlayer,
            skillLevel = req.skillLevel ?: match.skillLevel,
            description = req.description ?: match.description,
            status = newStatus,
            createdBy = match.createdBy,
            createdAt = match.createdAt,
            updatedAt = Instant.now(),
        )

        if (newStatus in setOf(MatchStatus.completed, MatchStatus.cancelled)) closeParticipants(matchId, newStatus)
        val capacityIncreased = newMaxPlayers > match.maxPlayers
        val saved = matchRepo.saveAndFlush(updated)
        if (capacityIncreased && saved.status == MatchStatus.published) offerSpotToNextOnWaitlist(matchId)
        return toMatchResponse(saved)
    }

    // ─── Admin: publish a match ────────────────────────────────────────────────

    @Transactional
    fun publishMatch(matchId: Long): MatchResponse {
        val match = matchRepo.findByIdForUpdate(matchId) ?: throw MatchNotFoundException()
        if (match.status != MatchStatus.draft) {
            throw BookingRuleException("Only draft matches can be published")
        }
        validateMatchTimes(match.startsAt, match.endsAt)
        checkCourtConflicts(match.courtId, match.startsAt, match.endsAt, excludeMatchId = matchId)

        match.status = MatchStatus.published
        match.updatedAt = Instant.now()
        return toMatchResponse(matchRepo.saveAndFlush(match))
    }

    // ─── Admin: cancel a match ─────────────────────────────────────────────────

    @Transactional
    fun cancelMatch(matchId: Long): MatchResponse {
        val match = matchRepo.findByIdForUpdate(matchId) ?: throw MatchNotFoundException()
        if (match.status == MatchStatus.cancelled) {
            throw BookingRuleException("Match is already cancelled")
        }

        validateStatusTransition(match.status, MatchStatus.cancelled)
        closeParticipants(matchId, MatchStatus.cancelled)
        match.status = MatchStatus.cancelled
        match.updatedAt = Instant.now()
        return toMatchResponse(matchRepo.saveAndFlush(match))
    }

    // ─── Member: join a match ──────────────────────────────────────────────────

    @Transactional
    fun joinMatch(userId: Long, matchId: Long): MatchReservationResponse {
        // Lock the match row to prevent concurrent reservations from overbooking
        val match = matchRepo.findByIdForUpdate(matchId) ?: throw MatchNotFoundException()

        if (match.status != MatchStatus.published) {
            throw BookingRuleException("This match is not open for reservations")
        }
        if (!match.startsAt.isAfter(Instant.now())) {
            throw BookingRuleException("This match has already started")
        }

        // Check for duplicate reservation
        val existing = reservationRepo.findByMatchIdAndUserId(matchId, userId)
        if (existing != null && existing.status == MatchReservationStatus.confirmed) {
            throw AlreadyReservedException()
        }

        // Count confirmed spots
        val confirmedCount = reservationRepo.countConfirmedByMatchId(matchId, MatchReservationStatus.confirmed)
        if (confirmedCount >= match.maxPlayers) {
            throw MatchFullException()
        }

        val reservation = try {
            if (existing != null) {
                // Re-joining after cancellation: update existing record
                existing.status = MatchReservationStatus.confirmed
                existing.lifecycleId = java.util.UUID.randomUUID()
                existing.updatedAt = Instant.now()
                reservationRepo.saveAndFlush(existing)
            } else {
                reservationRepo.saveAndFlush(
                    MatchReservation(
                        matchId = matchId,
                        userId = userId,
                        priceSnapshot = match.pricePerPlayer,
                    )
                )
            }
        } catch (_: DataIntegrityViolationException) {
            throw AlreadyReservedException()
        }

        waitlistRepo.findByMatchIdAndUserId(matchId, userId)?.let { entry ->
            if (entry.status in setOf(WaitlistStatus.waiting, WaitlistStatus.offered)) {
                entry.status = WaitlistStatus.accepted
                entry.updatedAt = Instant.now()
                waitlistRepo.saveAndFlush(entry)
                offerSpotToNextOnWaitlist(matchId)
            }
        }
        val court = courtRepo.findById(match.courtId).orElseThrow()
        return toReservationResponse(reservation, match, court.name)
    }

    // ─── Member: get my reservations ──────────────────────────────────────────

    @Transactional(readOnly = true)
    fun myReservations(userId: Long): List<MatchReservationResponse> {
        val reservations = reservationRepo.findByUserId(userId)
        return reservations.mapNotNull { res ->
            val match = matchRepo.findById(res.matchId).orElse(null) ?: return@mapNotNull null
            if (match.legacySport != null) return@mapNotNull null
            val court = courtRepo.findById(match.courtId).orElse(null) ?: return@mapNotNull null
            toReservationResponse(res, match, court.name)
        }.sortedByDescending { it.startsAt }
    }

    // ─── Member: cancel own reservation ───────────────────────────────────────

    @Transactional
    fun cancelReservation(userId: Long, reservationId: Long, lifecycleId: java.util.UUID): MatchReservationResponse {
        val match = lockMatch(reservationRepo.matchIdForReservation(reservationId) ?: throw MatchReservationNotFoundException())
        val reservation = reservationRepo.findById(reservationId).orElseThrow { MatchReservationNotFoundException() }

        // Members can only cancel their own reservations
        if (reservation.userId != userId) throw MatchReservationNotFoundException()
        requireLifecycle(reservation.lifecycleId, lifecycleId)
        if (reservation.status != MatchReservationStatus.confirmed) {
            throw BookingRuleException("This reservation is already ${reservation.status.name}")
        }

        if (match.status != MatchStatus.published) {
            throw BookingRuleException("This match is not open for cancellation")
        }

        // Enforce 12-hour cancellation cutoff
        val deadline = match.startsAt.minus(CANCEL_CUTOFF_HOURS, ChronoUnit.HOURS)
        if (Instant.now().isAfter(deadline)) {
            throw CancellationTooLateException()
        }

        reservation.status = MatchReservationStatus.cancelled
        reservation.updatedAt = Instant.now()
        reservationRepo.saveAndFlush(reservation)

        // Offer freed spot to first waiting-list participant
        offerSpotToNextOnWaitlist(match.id)

        val court = courtRepo.findById(match.courtId).orElseThrow()
        return toReservationResponse(reservation, match, court.name)
    }

    // ─── Member: join waiting list ─────────────────────────────────────────────

    @Transactional
    fun joinWaitlist(userId: Long, matchId: Long): WaitlistEntryResponse {
        val match = lockMatch(matchId)
        if (match.status != MatchStatus.published) {
            throw BookingRuleException("This match is not open for reservations")
        }
        if (!match.startsAt.isAfter(Instant.now())) {
            throw BookingRuleException("This match has already started")
        }

        // Cannot join waitlist if already confirmed
        val existingReservation = reservationRepo.findByMatchIdAndUserId(matchId, userId)
        if (existingReservation?.status == MatchReservationStatus.confirmed) {
            throw BookingRuleException("You already have a confirmed reservation for this match")
        }

        val existing = waitlistRepo.findByMatchIdAndUserId(matchId, userId)
        if (existing != null && existing.status in listOf(WaitlistStatus.waiting, WaitlistStatus.offered)) {
            throw AlreadyOnWaitlistException()
        }

        val entry = try {
            if (existing != null && existing.status in listOf(WaitlistStatus.declined, WaitlistStatus.expired, WaitlistStatus.removed, WaitlistStatus.accepted)) {
                // Re-join after decline/expiry
                existing.lifecycleId = java.util.UUID.randomUUID()
                existing.status = WaitlistStatus.waiting
                existing.offeredAt = null
                existing.offerExpiresAt = null
                existing.updatedAt = Instant.now()
                waitlistRepo.saveAndFlush(existing)
            } else if (existing == null) {
                waitlistRepo.saveAndFlush(
                    MatchWaitlistEntry(matchId = matchId, userId = userId)
                )
            } else {
                throw AlreadyOnWaitlistException()
            }
        } catch (_: DataIntegrityViolationException) {
            throw AlreadyOnWaitlistException()
        }

        val position = waitlistRepo.findFirstWaiting(matchId, WaitlistStatus.waiting).indexOfFirst { it.id == entry.id } + 1
        return toWaitlistResponse(entry, position)
    }

    // ─── Member: leave waiting list ────────────────────────────────────────────

    @Transactional
    fun leaveWaitlist(userId: Long, matchId: Long, lifecycleId: java.util.UUID): WaitlistEntryResponse {
        lockMatch(matchId)
        val entry = waitlistRepo.findByMatchIdAndUserId(matchId, userId)
            ?: throw BookingRuleException("You are not on the waiting list for this match")

        requireLifecycle(entry.lifecycleId, lifecycleId)
        if (entry.status == WaitlistStatus.offered) {
            throw org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.CONFLICT, "A spot was offered. Refresh to accept or decline the current offer.")
        }
        if (entry.status != WaitlistStatus.waiting) {
            throw BookingRuleException("You are not actively on the waiting list")
        }

        entry.status = WaitlistStatus.removed
        entry.updatedAt = Instant.now()
        waitlistRepo.saveAndFlush(entry)

        return toWaitlistResponse(entry, 0)
    }

    // ─── Member: accept waiting-list offer ────────────────────────────────────

    @Transactional
    fun acceptWaitlistOffer(userId: Long, matchId: Long, offerId: java.util.UUID): Result<MatchReservationResponse> {
        val match = lockMatch(matchId)
        val entry = currentOffer(matchId, userId, offerId)
        if (match.status != MatchStatus.published || !match.startsAt.isAfter(Instant.now()) || entry.offerExpiresAt?.isAfter(Instant.now()) != true) {
            entry.status = WaitlistStatus.expired
            entry.updatedAt = Instant.now()
            waitlistRepo.saveAndFlush(entry)
            offerSpotToNextOnWaitlist(matchId)
            return Result.failure(BookingRuleException("The offer has expired. Please join the waiting list again."))
        }

        // The match lock is held through confirmation.
        val confirmedCount = reservationRepo.countConfirmedByMatchId(matchId, MatchReservationStatus.confirmed)
        if (confirmedCount >= match.maxPlayers) {
            entry.status = WaitlistStatus.expired
            entry.updatedAt = Instant.now()
            waitlistRepo.saveAndFlush(entry)
            return Result.failure(BookingRuleException("The spot was taken by someone else. Please rejoin the waiting list."))
        }

        // Create reservation
        val existingReservation = reservationRepo.findByMatchIdAndUserId(matchId, userId)
        if (existingReservation?.status == MatchReservationStatus.confirmed) throw AlreadyReservedException()
        val reservation = if (existingReservation != null) {
            existingReservation.status = MatchReservationStatus.confirmed
            existingReservation.lifecycleId = java.util.UUID.randomUUID()
            existingReservation.updatedAt = Instant.now()
            reservationRepo.saveAndFlush(existingReservation)
        } else {
            reservationRepo.saveAndFlush(
                MatchReservation(
                    matchId = matchId,
                    userId = userId,
                    priceSnapshot = match.pricePerPlayer,
                )
            )
        }

        entry.status = WaitlistStatus.accepted
        entry.updatedAt = Instant.now()
        waitlistRepo.saveAndFlush(entry)

        val court = courtRepo.findById(match.courtId).orElseThrow()
        offerSpotToNextOnWaitlist(matchId)
        return Result.success(toReservationResponse(reservation, match, court.name))
    }

    // ─── Member: decline waiting-list offer ───────────────────────────────────

    @Transactional
    fun declineWaitlistOffer(userId: Long, matchId: Long, offerId: java.util.UUID): WaitlistEntryResponse {
        lockMatch(matchId)
        val entry = currentOffer(matchId, userId, offerId)

        if (entry.offerExpiresAt?.isAfter(Instant.now()) != true) {
            throw org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.CONFLICT, "Offer expired. Refresh your current offer.")
        }
        entry.status = WaitlistStatus.declined
        entry.updatedAt = Instant.now()
        waitlistRepo.saveAndFlush(entry)

        offerSpotToNextOnWaitlist(matchId)
        return toWaitlistResponse(entry, 0)
    }

    // ─── Member: get my waitlist entries ──────────────────────────────────────

    @Transactional(readOnly = true)
    fun myWaitlistEntries(userId: Long): List<WaitlistEntryResponse> {
        val entries = waitlistRepo.findByUserId(userId)
        return entries.mapNotNull { entry ->
            val match = matchRepo.findById(entry.matchId).orElse(null) ?: return@mapNotNull null
            if (match.legacySport != null) return@mapNotNull null
            val waitingList = waitlistRepo.findFirstWaiting(match.id, WaitlistStatus.waiting)
            val position = if (entry.status == WaitlistStatus.waiting)
                waitingList.indexOfFirst { it.id == entry.id } + 1 else 0
            toWaitlistResponse(entry, position)
        }
    }

    // ─── Admin: get match details with participants ────────────────────────────

    @Transactional(readOnly = true)
    fun getAdminMatchDetail(matchId: Long): MatchResponse {
        val match = requirePadelMatch(matchId)
        return toMatchResponse(match)
    }

    @Transactional(readOnly = true)
    fun getMatchReservations(matchId: Long): List<AdminReservationResponse> {
        requirePadelMatch(matchId)
        return jdbc.query(
            """
            SELECT mr.lifecycle_id, mr.id, mr.match_id, mr.user_id, u.full_name, u.email, u.phone,
                   mr.price_snapshot, mr.status::text AS res_status,
                   mr.payment_status::text AS pay_status,
                   mr.paid_at, mr.created_at
            FROM match_reservations mr
            JOIN users u ON u.id = mr.user_id
            WHERE mr.match_id = ?
            ORDER BY mr.created_at ASC
            """.trimIndent(),
            { rs, _ ->
                AdminReservationResponse(
                    lifecycleId = rs.getObject("lifecycle_id", java.util.UUID::class.java),
                    id = rs.getLong("id"),
                    matchId = rs.getLong("match_id"),
                    userId = rs.getLong("user_id"),
                    fullName = rs.getString("full_name"),
                    email = rs.getString("email"),
                    phone = rs.getString("phone"),
                    priceSnapshot = rs.getBigDecimal("price_snapshot"),
                    status = MatchReservationStatus.valueOf(rs.getString("res_status")),
                    paymentStatus = MatchPaymentStatus.valueOf(rs.getString("pay_status")),
                    paidAt = rs.getObject("paid_at", java.time.OffsetDateTime::class.java)?.toString(),
                    createdAt = rs.getObject("created_at", java.time.OffsetDateTime::class.java)?.toString() ?: "",
                )
            },
            matchId,
        )
    }

    @Transactional(readOnly = true)
    fun getMatchWaitlist(matchId: Long): List<AdminWaitlistEntryResponse> {
        requirePadelMatch(matchId)
        val waitingList = waitlistRepo.findFirstWaiting(matchId, WaitlistStatus.waiting)

        return jdbc.query(
            """
            SELECT mw.id, mw.match_id, mw.user_id, u.full_name, u.email, u.phone,
                   mw.status::text AS wl_status, mw.offer_expires_at, mw.joined_at
            FROM match_waitlist mw
            JOIN users u ON u.id = mw.user_id
            WHERE mw.match_id = ?
            ORDER BY mw.joined_at ASC, mw.id ASC
            """.trimIndent(),
            { rs, _ ->
                val entryId = rs.getLong("id")
                val status = WaitlistStatus.valueOf(rs.getString("wl_status"))
                val position = if (status == WaitlistStatus.waiting)
                    waitingList.indexOfFirst { it.id == entryId } + 1 else 0
                AdminWaitlistEntryResponse(
                    id = entryId,
                    matchId = rs.getLong("match_id"),
                    userId = rs.getLong("user_id"),
                    fullName = rs.getString("full_name"),
                    email = rs.getString("email"),
                    phone = rs.getString("phone"),
                    status = status,
                    position = position,
                    offerExpiresAt = rs.getObject("offer_expires_at", java.time.OffsetDateTime::class.java)?.toString(),
                    joinedAt = rs.getObject("joined_at", java.time.OffsetDateTime::class.java)?.toString() ?: "",
                )
            },
            matchId,
        )
    }

    // ─── Admin: mark reservation as paid ──────────────────────────────────────

    @Transactional
    fun markReservationPaid(adminId: Long, reservationId: Long, paid: Boolean, lifecycleId: java.util.UUID): AdminReservationResponse {
        lockMatch(reservationRepo.matchIdForReservation(reservationId) ?: throw MatchReservationNotFoundException())
        val reservation = reservationRepo.findById(reservationId).orElseThrow { MatchReservationNotFoundException() }

        requireLifecycle(reservation.lifecycleId, lifecycleId)
        if (paid) {
            reservation.paymentStatus = MatchPaymentStatus.paid
            reservation.paidAt = Instant.now()
            reservation.paidBy = adminId
        } else {
            reservation.paymentStatus = MatchPaymentStatus.unpaid
            reservation.paidAt = null
            reservation.paidBy = null
        }
        reservation.updatedAt = Instant.now()
        reservationRepo.saveAndFlush(reservation)

        // Fetch user info for the response
        val (fullName, email, phone) = jdbc.query(
            "SELECT full_name, email, phone FROM users WHERE id = ?",
            { rs, _ -> Triple(rs.getString("full_name"), rs.getString("email"), rs.getString("phone")) },
            reservation.userId,
        ).firstOrNull() ?: Triple("", "", null)

        return AdminReservationResponse(
            lifecycleId = reservation.lifecycleId,
            id = reservation.id,
            matchId = reservation.matchId,
            userId = reservation.userId,
            fullName = fullName,
            email = email,
            phone = phone,
            priceSnapshot = reservation.priceSnapshot,
            status = reservation.status,
            paymentStatus = reservation.paymentStatus,
            paidAt = reservation.paidAt?.atZone(zone)?.toOffsetDateTime()?.toString(),
            createdAt = reservation.createdAt.atZone(zone).toOffsetDateTime().toString(),
        )
    }

    // ─── Admin: payment totals for a match ────────────────────────────────────

    @Transactional(readOnly = true)
    fun getMatchTotals(matchId: Long): MatchTotalsResponse {
        requirePadelMatch(matchId)
        val row = jdbc.queryForMap(
            """
            SELECT
              COUNT(*) FILTER (WHERE status = 'confirmed') AS confirmed_count,
              COUNT(*) FILTER (WHERE status = 'confirmed' AND payment_status = 'paid') AS paid_count,
              COALESCE(SUM(price_snapshot) FILTER (WHERE status = 'confirmed'), 0) AS expected,
              COALESCE(SUM(price_snapshot) FILTER (WHERE status = 'confirmed' AND payment_status = 'paid'), 0) AS collected
            FROM match_reservations WHERE match_id = ?
            """.trimIndent(),
            matchId,
        )
        return MatchTotalsResponse(
            matchId = matchId,
            expectedTotal = (row["expected"] as? BigDecimal) ?: BigDecimal.ZERO,
            collectedTotal = (row["collected"] as? BigDecimal) ?: BigDecimal.ZERO,
            confirmedCount = (row["confirmed_count"] as? Long)?.toInt() ?: 0,
            paidCount = (row["paid_count"] as? Long)?.toInt() ?: 0,
        )
    }

    // ─── Admin: expire stale waitlist offers (called by scheduler) ────────────

    @Transactional
    fun expireStaleOffers() {
        for (matchId in waitlistRepo.expiredMatchIds(Instant.now(), WaitlistStatus.offered).sorted()) {
            lockMatch(matchId)
            val now = Instant.now()
            for (entry in waitlistRepo.findByMatchIdAndStatus(matchId, WaitlistStatus.offered)) {
                if (entry.offerExpiresAt?.isAfter(now) == true) continue
                entry.status = WaitlistStatus.expired
                entry.updatedAt = now
            }
            offerSpotToNextOnWaitlist(matchId)
        }
    }

    // ─── Internal helpers ──────────────────────────────────────────────────────

    private fun closeParticipants(matchId: Long, status: MatchStatus) {
        if (status == MatchStatus.cancelled) {
            // Cancel all active reservations (preserve records for history)
            val reservations = reservationRepo.findByMatchIdAndStatus(matchId, MatchReservationStatus.confirmed)
            reservations.forEach {
                it.status = MatchReservationStatus.cancelled
                it.updatedAt = Instant.now()
            }
            reservationRepo.saveAll(reservations)
        }
        // Remove all waitlist entries
        val waitlist = waitlistRepo.findByMatchId(matchId)
        waitlist.forEach {
            if (it.status == WaitlistStatus.waiting || it.status == WaitlistStatus.offered) {
                it.status = WaitlistStatus.removed
                it.updatedAt = Instant.now()
            }
        }
        waitlistRepo.saveAll(waitlist)
    }

    /** Called under the parent match lock, before any participant or queue mutation. */
    private fun currentOffer(matchId: Long, userId: Long, expected: java.util.UUID): MatchWaitlistEntry {
        val entry = waitlistRepo.findByMatchIdAndUserId(matchId, userId)
        if (entry == null || entry.status != WaitlistStatus.offered || entry.offerId != expected) {
            throw org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.CONFLICT, "Offer changed. Refresh your current offer.")
        }
        return entry
    }

    private fun requireLifecycle(current: java.util.UUID, expected: java.util.UUID) {
        if (current != expected) throw org.springframework.web.server.ResponseStatusException(
            org.springframework.http.HttpStatus.CONFLICT, "Membership or reservation changed. Refresh before trying again.")
    }

    private fun lockMatch(matchId: Long) =
        matchRepo.findByIdForUpdate(matchId) ?: throw MatchNotFoundException()

    private fun requirePadelMatch(matchId: Long): Match {
        val match = matchRepo.findById(matchId).orElseThrow { MatchNotFoundException() }
        if (match.sport != Sport.padel.name || match.legacySport != null) throw MatchNotFoundException()
        return match
    }

    private fun offerSpotToNextOnWaitlist(matchId: Long) {
        val match = matchRepo.findById(matchId).orElse(null) ?: return
        if (match.sport != Sport.padel.name || match.legacySport != null || match.status != MatchStatus.published || !match.startsAt.isAfter(Instant.now())) return

        // Only offer if there is actually a free spot
        val confirmedCount = reservationRepo.countConfirmedByMatchId(matchId, MatchReservationStatus.confirmed)
        if (confirmedCount >= match.maxPlayers) return

        // Check if anyone is already being offered
        val alreadyOffered = waitlistRepo.findByMatchIdAndStatus(matchId, WaitlistStatus.offered)
        if (alreadyOffered.isNotEmpty()) return

        val next = waitlistRepo.findFirstWaiting(matchId, WaitlistStatus.waiting).firstOrNull() ?: return
        next.status = WaitlistStatus.offered
        next.offerId = java.util.UUID.randomUUID()
        next.offeredAt = Instant.now()
        next.offerExpiresAt = Instant.now().plus(OFFER_WINDOW_MINUTES, ChronoUnit.MINUTES)
        next.updatedAt = Instant.now()
        waitlistRepo.save(next)
    }

    private fun validateMatchTimes(start: Instant, end: Instant) {
        if (!start.isAfter(Instant.now())) {
            throw BookingRuleException("Match start time must be in the future")
        }
        if (!end.isAfter(start)) {
            throw BookingRuleException("End time must be after start time")
        }

        val localStart = start.atZone(zone)
        val localEnd = end.atZone(zone)
        val clubDayStart = when (localStart.hour) {
            in 0..2 -> localStart.toLocalDate().minusDays(1).atTime(LocalTime.of(7, 0)).atZone(zone)
            in 7..23 -> localStart.toLocalDate().atTime(LocalTime.of(7, 0)).atZone(zone)
            else -> throw BookingRuleException("Matches must take place between 7:00 AM and 3:00 AM")
        }
        val clubDayEnd = clubDayStart.plusHours(20)
        if (localStart.isBefore(clubDayStart) || !localStart.isBefore(clubDayEnd) || localEnd.isAfter(clubDayEnd)) {
            throw BookingRuleException("Matches must take place between 7:00 AM and 3:00 AM")
        }
    }

    private fun validateStatusTransition(from: MatchStatus, to: MatchStatus) {
        val allowed = mapOf(
            MatchStatus.draft to setOf(MatchStatus.draft, MatchStatus.published, MatchStatus.cancelled),
            MatchStatus.published to setOf(MatchStatus.published, MatchStatus.cancelled, MatchStatus.completed),
            MatchStatus.cancelled to setOf(MatchStatus.cancelled),
            MatchStatus.completed to setOf(MatchStatus.completed),
        )
        if (to !in (allowed[from] ?: emptySet())) {
            throw BookingRuleException("Cannot change match status from $from to $to")
        }
    }

    private fun checkCourtConflicts(courtId: Long, start: Instant, end: Instant, excludeMatchId: Long?) {
        // Check conflicts with regular bookings
        val bookingConflicts = bookingRepo.countOverlapping(courtId, start, end, BookingStatus.cancelled)
        if (bookingConflicts > 0) {
            throw SlotTakenException()
        }

        // Check conflicts with other published matches
        val matchConflicts = matchRepo.countConflictingPublished(courtId, start, end, excludeMatchId, MatchStatus.published)
        if (matchConflicts > 0) {
            throw SlotTakenException()
        }
    }

    // ─── Mapping helpers ───────────────────────────────────────────────────────

    private fun toMatchResponse(match: Match): MatchResponse {
        val court = courtRepo.findById(match.courtId).orElseThrow()
        if (match.sport != Sport.padel.name || match.legacySport != null || court.sport != Sport.padel.name || court.legacySport != null) throw MatchNotFoundException()
        val confirmedCount = reservationRepo.countConfirmedByMatchId(match.id, MatchReservationStatus.confirmed).toInt()
        val waitlistCount = waitlistRepo.countByMatchIdAndStatusIn(match.id, listOf(WaitlistStatus.waiting, WaitlistStatus.offered))
        return MatchResponse(
            id = match.id,
            sport = match.sport,
            courtId = match.courtId,
            courtName = court.name,
            startsAt = match.startsAt.atZone(zone).toOffsetDateTime().toString(),
            endsAt = match.endsAt.atZone(zone).toOffsetDateTime().toString(),
            maxPlayers = match.maxPlayers,
            pricePerPlayer = match.pricePerPlayer,
            skillLevel = match.skillLevel,
            description = match.description,
            status = match.status,
            confirmedCount = confirmedCount,
            availableSpots = (match.maxPlayers - confirmedCount).coerceAtLeast(0),
            waitlistCount = waitlistCount,
            createdAt = match.createdAt.atZone(zone).toOffsetDateTime().toString(),
        )
    }

    private fun toReservationResponse(
        res: MatchReservation,
        match: Match,
        courtName: String,
    ): MatchReservationResponse {
        val cancellable = res.status == MatchReservationStatus.confirmed &&
                match.status == MatchStatus.published &&
                Instant.now().isBefore(match.startsAt.minus(CANCEL_CUTOFF_HOURS, ChronoUnit.HOURS))
        return MatchReservationResponse(
            lifecycleId = res.lifecycleId,
            id = res.id,
            matchId = match.id,
            sport = match.sport,
            courtName = courtName,
            startsAt = match.startsAt.atZone(zone).toOffsetDateTime().toString(),
            endsAt = match.endsAt.atZone(zone).toOffsetDateTime().toString(),
            pricePerPlayer = res.priceSnapshot,
            skillLevel = match.skillLevel,
            status = res.status,
            paymentStatus = res.paymentStatus,
            cancellable = cancellable,
            createdAt = res.createdAt.atZone(zone).toOffsetDateTime().toString(),
        )
    }

    private fun toWaitlistResponse(entry: MatchWaitlistEntry, position: Int): WaitlistEntryResponse {
        return WaitlistEntryResponse(
            lifecycleId = entry.lifecycleId,
            id = entry.id,
            matchId = entry.matchId,
            status = entry.status,
            position = position,
            offerId = entry.offerId.takeIf { entry.status == WaitlistStatus.offered },
            offerExpiresAt = entry.offerExpiresAt?.atZone(zone)?.toOffsetDateTime()?.toString(),
            joinedAt = entry.joinedAt.atZone(zone).toOffsetDateTime().toString(),
        )
    }
}
