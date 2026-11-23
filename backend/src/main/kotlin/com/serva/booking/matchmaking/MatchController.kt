package com.serva.booking.matchmaking

import com.serva.booking.auth.AuthUser
import com.serva.booking.court.Sport
import com.serva.booking.config.ApiPage
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.web.server.ResponseStatusException
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*

private fun parseSportFilter(value: String?): Sport? = when (value?.trim()?.lowercase()) {
    null, "" -> null
    "padel" -> Sport.padel
    else -> throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Only Padel is supported")
}

/**
 * Public endpoints:
 *   GET  /api/matches                         — list published upcoming matches
 *   GET  /api/matches/{id}                    — public match details
 *
 * Member endpoints (any authenticated user):
 *   POST /api/matches/{id}/join               — join a match
 *   GET  /api/matches/my-reservations         — own reservations
 *   POST /api/matches/reservations/{id}/cancel — cancel own reservation
 *   POST /api/matches/{id}/waitlist           — join waiting list
 *   DELETE /api/matches/{id}/waitlist         — leave waiting list
 *   POST /api/matches/{id}/waitlist/accept    — accept offer
 *   POST /api/matches/{id}/waitlist/decline   — decline offer
 *   GET  /api/matches/my-waitlist             — own waitlist entries
 *
 * Admin endpoints (under /api/admin/matchmaking — restricted in SecurityConfig):
 *   GET    /api/admin/matchmaking             — list all matches
 *   POST   /api/admin/matchmaking             — create match
 *   GET    /api/admin/matchmaking/{id}        — match detail
 *   PATCH  /api/admin/matchmaking/{id}        — update match
 *   POST   /api/admin/matchmaking/{id}/publish — publish match
 *   POST   /api/admin/matchmaking/{id}/cancel  — cancel match
 *   GET    /api/admin/matchmaking/{id}/reservations — participants
 *   GET    /api/admin/matchmaking/{id}/waitlist     — waitlist
 *   GET    /api/admin/matchmaking/{id}/totals       — payment totals
 *   PATCH  /api/admin/matchmaking/reservations/{id}/payment — mark paid
 */

// ─── Public + Member controller ───────────────────────────────────────────────

@RestController
@RequestMapping("/api/matches")
class MatchController(private val matchService: MatchService) {

    /** Public: list upcoming published matches, optionally filtered. */
    @GetMapping
    fun list(
        @RequestParam(required = false) sport: String?,
        @RequestParam(required = false) skillLevel: String?,
        page: ApiPage,
    ): List<MatchResponse> {
        parseSportFilter(sport)
        val sk = skillLevel?.trim()?.let { runCatching { SkillLevel.valueOf(it.lowercase()) }.getOrNull() }
        return matchService.listMatches(page, MatchStatus.published, sk, upcomingOnly = true)
    }

    /** Public: single match detail. */
    @GetMapping("/{id}")
    fun get(@PathVariable id: Long): MatchResponse = matchService.getPublicMatch(id)

    /** Member: join a match (reserve a spot). */
    @PostMapping("/{id}/join")
    @ResponseStatus(HttpStatus.CREATED)
    fun joinMatch(
        @PathVariable id: Long,
        @AuthenticationPrincipal user: AuthUser,
    ): MatchReservationResponse = matchService.joinMatch(user.id, id)

    /** Member: own match reservations. */
    @GetMapping("/my-reservations")
    fun myReservations(@AuthenticationPrincipal user: AuthUser): List<MatchReservationResponse> =
        matchService.myReservations(user.id)

    /** Member: cancel own reservation. */
    @PostMapping("/reservations/{id}/cancel")
    fun cancelReservation(
        @PathVariable id: Long,
        @AuthenticationPrincipal user: AuthUser,
    ): MatchReservationResponse = matchService.cancelReservation(user.id, id)

    /** Member: join waiting list. */
    @PostMapping("/{id}/waitlist")
    @ResponseStatus(HttpStatus.CREATED)
    fun joinWaitlist(
        @PathVariable id: Long,
        @AuthenticationPrincipal user: AuthUser,
    ): WaitlistEntryResponse = matchService.joinWaitlist(user.id, id)

    /** Member: leave waiting list. */
    @DeleteMapping("/{id}/waitlist")
    fun leaveWaitlist(
        @PathVariable id: Long,
        @AuthenticationPrincipal user: AuthUser,
    ): WaitlistEntryResponse = matchService.leaveWaitlist(user.id, id)

    /** Member: accept waiting-list offer. */
    @PostMapping("/{id}/waitlist/accept")
    fun acceptOffer(
        @PathVariable id: Long,
        @AuthenticationPrincipal user: AuthUser,
    ): MatchReservationResponse = matchService.acceptWaitlistOffer(user.id, id)

    /** Member: decline waiting-list offer. */
    @PostMapping("/{id}/waitlist/decline")
    fun declineOffer(
        @PathVariable id: Long,
        @AuthenticationPrincipal user: AuthUser,
    ): WaitlistEntryResponse = matchService.declineWaitlistOffer(user.id, id)

    /** Member: own waitlist entries. */
    @GetMapping("/my-waitlist")
    fun myWaitlist(@AuthenticationPrincipal user: AuthUser): List<WaitlistEntryResponse> =
        matchService.myWaitlistEntries(user.id)
}

// ─── Admin controller ─────────────────────────────────────────────────────────

@RestController
@RequestMapping("/api/admin/matchmaking")
class AdminMatchController(private val matchService: MatchService) {

    /** Admin: list all matches. */
    @GetMapping
    fun listAll(
        @RequestParam(required = false) sport: String?,
        @RequestParam(required = false) status: String?,
        @RequestParam(required = false) skillLevel: String?,
        page: ApiPage,
    ): List<MatchResponse> {
        parseSportFilter(sport)
        val st = status?.trim()?.let { runCatching { MatchStatus.valueOf(it.lowercase()) }.getOrNull() }
        val sk = skillLevel?.trim()?.let { runCatching { SkillLevel.valueOf(it.lowercase()) }.getOrNull() }
        return matchService.listMatches(page, st, sk, upcomingOnly = false)
    }

    /** Admin: create a match. */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun create(
        @Valid @RequestBody req: CreateMatchRequest,
        @AuthenticationPrincipal user: AuthUser,
    ): MatchResponse = matchService.createMatch(user.id, req)

    /** Admin: get match details. */
    @GetMapping("/{id}")
    fun get(@PathVariable id: Long): MatchResponse = matchService.getAdminMatchDetail(id)

    /** Admin: update match fields. */
    @PatchMapping("/{id}")
    fun update(
        @PathVariable id: Long,
        @Valid @RequestBody req: UpdateMatchRequest,
    ): MatchResponse = matchService.updateMatch(id, req)

    /** Admin: publish a draft match. */
    @PostMapping("/{id}/publish")
    fun publish(@PathVariable id: Long): MatchResponse = matchService.publishMatch(id)

    /** Admin: cancel a match. */
    @PostMapping("/{id}/cancel")
    fun cancel(@PathVariable id: Long): MatchResponse = matchService.cancelMatch(id)

    /** Admin: list participants (reservations) for a match. */
    @GetMapping("/{id}/reservations")
    fun reservations(@PathVariable id: Long): List<AdminReservationResponse> =
        matchService.getMatchReservations(id)

    /** Admin: list waiting list for a match. */
    @GetMapping("/{id}/waitlist")
    fun waitlist(@PathVariable id: Long): List<AdminWaitlistEntryResponse> =
        matchService.getMatchWaitlist(id)

    /** Admin: payment totals for a match. */
    @GetMapping("/{id}/totals")
    fun totals(@PathVariable id: Long): MatchTotalsResponse = matchService.getMatchTotals(id)

    /** Admin: mark reservation as paid or unpaid. */
    @PatchMapping("/reservations/{id}/payment")
    fun markPaid(
        @PathVariable id: Long,
        @RequestBody req: AdminMarkPaidRequest,
        @AuthenticationPrincipal user: AuthUser,
    ): AdminReservationResponse = matchService.markReservationPaid(user.id, id, req.paid)
}
