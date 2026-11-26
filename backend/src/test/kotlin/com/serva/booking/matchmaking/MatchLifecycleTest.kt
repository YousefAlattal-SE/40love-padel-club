package com.serva.booking.matchmaking

import com.serva.booking.BookingRuleException
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.jdbc.core.JdbcTemplate
import com.serva.booking.auth.AuthUser
import com.serva.booking.auth.Role
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.springframework.test.web.servlet.setup.DefaultMockMvcBuilder
import org.springframework.test.web.servlet.setup.MockMvcBuilders
import org.springframework.web.context.WebApplicationContext
import com.serva.booking.testsupport.DatabaseIntegrationTest
import java.util.UUID
import java.util.concurrent.Callable
import java.util.concurrent.CyclicBarrier
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

/** These tests require committed fixtures and independent transactions on disposable PostgreSQL. */
@DatabaseIntegrationTest
@SpringBootTest
class MatchLifecycleTest(@Autowired val service: MatchService, @Autowired val db: JdbcTemplate,
                         @Autowired context: WebApplicationContext) {
    private val mvc = MockMvcBuilders.webAppContextSetup(context)
        .apply<DefaultMockMvcBuilder>(springSecurity()).build()
    private fun asMember(i: Int) = authentication(UsernamePasswordAuthenticationToken(
        AuthUser(users[i], "fixture@example.test", Role.member), null, listOf(SimpleGrantedAuthority("ROLE_MEMBER"))))

    private lateinit var users: List<Long>
    private var match = 0L
    private fun id(sql: String, vararg args: Any) = db.queryForObject(sql, Long::class.java, *args)!!

    @BeforeEach
    fun fixture() {
        val key = UUID.randomUUID()
        users = (1..5).map { id("insert into users(full_name,email) values ('Fixture',?) returning id", "$key-$it@example.test") }
        val court = id("select min(id) from courts where is_available and legacy_sport is null")
        match = id("""insert into matches(sport,court_id,starts_at,ends_at,max_players,price_per_player,status,created_by)
            values ('padel',?,current_date+?::int+interval '10 hours',current_date+?::int+interval '11 hours',2,5,'published',?) returning id""", court, users.first()+100, users.first()+100, users.first())
    }

    private fun race(vararg actions: () -> Unit) {
        val pool = Executors.newFixedThreadPool(actions.size)
        val barrier = CyclicBarrier(actions.size)
        try {
            val tasks = actions.map { action -> pool.submit(Callable {
                barrier.await(10, TimeUnit.SECONDS)
                action()
            }) }
            tasks.forEach { it.get(20, TimeUnit.SECONDS) }
        } finally { pool.shutdownNow() }
    }

    private fun queue(i: Int) = service.joinWaitlist(users[i], match)
    private fun join(i: Int) = service.joinMatch(users[i], match)
    private fun confirmed() = id("select count(*) from match_reservations where match_id=? and status='confirmed'", match)
    private fun state(i: Int) = db.queryForObject("select status::text from match_waitlist where match_id=? and user_id=?", String::class.java, match, users[i])
    private fun offerId(i: Int): UUID = db.queryForObject(
        "select offer_id from match_waitlist where user_id=? and match_id=?", UUID::class.java, users[i], match)!!
    private fun action(name: String, member: Int, expected: UUID) =
        post("/api/matches/$match/waitlist/$name").with(asMember(member))
            .contentType("application/json").content("""{"offerId":"$expected"}""")
    private fun offer() {
        val first = join(0)
        join(1)
        queue(2)
        queue(3)
        service.cancelReservation(users[0], first.id, first.lifecycleId)
        assertEquals("offered", state(2))
    }

    private fun withdrawal(i: Int, expected: UUID = db.queryForObject("select lifecycle_id from match_waitlist where match_id=? and user_id=?", UUID::class.java, match, users[i])!!) = delete("/api/matches/$match/waitlist").with(asMember(i)).contentType("application/json").content("""{"lifecycleId":"$expected"}""")

    @Test fun delayedWithdrawalCannotDeclineAnOffer() {
        val seat = join(0)
        join(1)
        queue(2)
        queue(3)
        val delayed = withdrawal(2)
        service.cancelReservation(users[0], seat.id, seat.lifecycleId)
        val current = offerId(2)
        fun snapshot() = listOf(
            db.queryForList("select * from match_waitlist where match_id=? order by joined_at,id", match),
            db.queryForList("select * from match_reservations where match_id=? order by id", match),
            db.queryForList("select max_players from matches where id=?", match))
        val before = snapshot()
        mvc.perform(delayed).andExpect(status().isConflict)
        assertEquals(before, snapshot())
        assertEquals(current, offerId(2))
        mvc.perform(action("decline", 2, current)).andExpect(status().isOk)
        assertEquals("offered", state(3))
    }

    @Test fun withdrawalAndPromotionSerialize() {
        val seat = join(0)
        join(1)
        queue(2)
        queue(3)
        var result = 0
        race({ service.cancelReservation(users[0], seat.id, seat.lifecycleId) },
            { result = mvc.perform(withdrawal(2)).andReturn().response.status })
        when (result) {
            200 -> { assertEquals("removed", state(2)); assertEquals("offered", state(3)) }
            409 -> { assertEquals("offered", state(2)); assertEquals("waiting", state(3)) }
            else -> error("Unexpected withdrawal response $result")
        }
        assertEquals(1L, confirmed())
    }

    @Test fun duplicateWithdrawalAndWithdrawalAfterMatchCancellation() {
        queue(2)
        mvc.perform(withdrawal(2)).andExpect(status().isOk)
        mvc.perform(withdrawal(2)).andExpect(status().isBadRequest)
        assertEquals("removed", state(2))
        queue(3)
        val delayed = withdrawal(3)
        service.cancelMatch(match)
        mvc.perform(delayed).andExpect(status().isBadRequest)
        assertEquals("removed", state(3))
        assertEquals(0L, confirmed())
    }

    @Test fun oldWithdrawalCannotRemoveRejoinedMembership() {
        offer()
        val first = queue(4)
        mvc.perform(withdrawal(4, first.lifecycleId)).andExpect(status().isOk)
        val second = queue(4)
        assertEquals(first.id, second.id)
        assertNotEquals(first.lifecycleId, second.lifecycleId)
        fun snapshot() = listOf(
            db.queryForList("select * from match_waitlist where match_id=? order by joined_at,id", match),
            db.queryForList("select * from match_reservations where match_id=? order by id", match),
            db.queryForList("select max_players from matches where id=?", match))
        val before = snapshot()
        val stale = { mvc.perform(withdrawal(4, first.lifecycleId)).andExpect(status().isConflict); Unit }
        race(stale, stale)
        for (body in listOf("{}", """{"lifecycleId":"invalid"}""")) {
            mvc.perform(delete("/api/matches/$match/waitlist").with(asMember(4))
                .contentType("application/json").content(body)).andExpect(status().isBadRequest)
        }
        assertEquals(before, snapshot())
        mvc.perform(withdrawal(4, second.lifecycleId)).andExpect(status().isOk)
    }

    @Test fun staleCancellationAndPaymentCannotChangeReconfirmedSeat() {
        val first = join(0)
        val staff = authentication(UsernamePasswordAuthenticationToken(
            AuthUser(users[1], "staff@example.test", Role.admin), null, listOf(SimpleGrantedAuthority("ROLE_ADMIN"))))
        fun payment(key: UUID, paid: Boolean) = org.springframework.test.web.servlet.request.MockMvcRequestBuilders
            .patch("/api/admin/matchmaking/reservations/${first.id}/payment")
            .contentType("application/json").content("""{"paid":$paid,"lifecycleId":"$key"}""")
        fun cancel(key: UUID) = post("/api/matches/reservations/${first.id}/cancel")
            .contentType("application/json").content("""{"lifecycleId":"$key"}""")
        mvc.perform(payment(first.lifecycleId, true).with(staff)).andExpect(status().isOk)
        fun money() = db.queryForMap("select payment_status,paid_at,paid_by,price_snapshot from match_reservations where id=?", first.id)
        val paid = money()
        mvc.perform(cancel(first.lifecycleId).with(asMember(0))).andExpect(status().isOk)
        val second = join(0)
        assertEquals(first.id, second.id)
        assertNotEquals(first.lifecycleId, second.lifecycleId)
        assertEquals(paid, money())
        fun row() = db.queryForMap("select * from match_reservations where id=?", first.id)
        val before = row()
        race({ mvc.perform(cancel(first.lifecycleId).with(asMember(0))).andExpect(status().isConflict) },
            { mvc.perform(payment(first.lifecycleId, false).with(staff)).andExpect(status().isConflict) })
        mvc.perform(payment(second.lifecycleId, false).with(asMember(0))).andExpect(status().isForbidden)
        mvc.perform(cancel(second.lifecycleId).with(asMember(3))).andExpect(status().isNotFound)
        for (body in listOf("{}", """{"paid":false,"lifecycleId":"invalid"}""")) {
            mvc.perform(cancel(second.lifecycleId).with(asMember(0)).content(body)).andExpect(status().isBadRequest)
            mvc.perform(payment(second.lifecycleId, false).with(staff).content(body)).andExpect(status().isBadRequest)
        }
        assertEquals(before, row())
        mvc.perform(payment(second.lifecycleId, false).with(staff)).andExpect(status().isOk)
        mvc.perform(cancel(second.lifecycleId).with(asMember(0))).andExpect(status().isOk)
    }

    @Test fun acceptingOfferForPreviouslyCancelledSeatRotatesItsIdentity() {
        val first = join(0)
        service.markReservationPaid(users[1], first.id, true, first.lifecycleId)
        service.cancelReservation(users[0], first.id, first.lifecycleId)
        val seat = join(1)
        join(2)
        queue(0)
        service.cancelReservation(users[1], seat.id, seat.lifecycleId)
        val second = service.acceptWaitlistOffer(users[0], match, offerId(0)).getOrThrow()
        assertEquals(first.id, second.id)
        assertNotEquals(first.lifecycleId, second.lifecycleId)
        assertEquals(MatchPaymentStatus.paid, second.paymentStatus)
        assertEquals(second.lifecycleId, service.getMatchReservations(match).single { it.id == first.id }.lifecycleId)
    }

    @Test fun concurrentJoinsAndCancellations() {
        join(0)
        race({ try { join(1) } catch (_: MatchFullException) {} }, { try { join(2) } catch (_: MatchFullException) {} })
        assertEquals(2L, confirmed())
        queue(3)
        queue(4)
        val seats = db.queryForList("select id from match_reservations where match_id=? order by id", Long::class.java, match)
        race(*seats.filterNotNull().map { seat -> {
            val owner = id("select user_id from match_reservations where id=?", seat)
            service.cancelReservation(owner, seat, db.queryForObject("select lifecycle_id from match_reservations where id=?", UUID::class.java, seat)!!)
            Unit
        } }.toTypedArray())
        assertEquals(0L, confirmed())
        assertEquals("offered", state(3))
        assertEquals("waiting", state(4))
    }

    @Test fun concurrentDuplicateAcceptance() {
        offer()
        val accept = { try { service.acceptWaitlistOffer(users[2], match, offerId(2)).getOrThrow() } catch (_: org.springframework.web.server.ResponseStatusException) {}; Unit }
        race(accept, accept)
        assertEquals(2L, confirmed())
        assertEquals("accepted", state(2))
    }

    @Test fun expiryCommitsAndPromotionIsIdempotent() {
        offer()
        db.update("update match_waitlist set offer_expires_at=now()-interval '1 second' where match_id=? and status='offered'", match)
        mvc.perform(action("accept", 2, offerId(2))).andExpect(status().isBadRequest)
        race({service.expireStaleOffers()}, {service.expireStaleOffers()})
        assertEquals("expired", state(2))
        assertEquals("offered", state(3))
    }

    @Test fun fullOfferRejectionCommits() {
        offer()
        // Item 19.1: a direct join can no longer take the spot that is being offered to member 2.
        assertThrows(MatchFullException::class.java) { join(4) }
        assertEquals("offered", state(2))
        // The full-offer rejection path still commits when the spot is filled by other means.
        db.update("insert into match_reservations(match_id,user_id,price_snapshot) values (?,?,5)", match, users[4])
        mvc.perform(action("accept", 2, offerId(2))).andExpect(status().isBadRequest)
        assertEquals("expired", state(2))
        assertEquals("waiting", state(3))
    }

    @Test fun schedulerAndAcceptanceRace() {
        offer()
        db.update("update match_waitlist set offer_expires_at=now() where match_id=? and status='offered'", match)
        race({ service.expireStaleOffers() }, {
            mvc.perform(action("accept", 2, offerId(2))).andExpect { assertTrue(it.response.status in setOf(400, 409)) }
        })
        assertEquals("expired", state(2))
        assertEquals("offered", state(3))
        assertEquals(1L, confirmed())
    }

    @Test fun unauthorizedRequestsLeaveOffersIntact() {
        offer()
        mvc.perform(post("/api/matches/$match/waitlist/accept")).andExpect(status().isUnauthorized)
        mvc.perform(post("/api/admin/matchmaking/$match/cancel").with(asMember(2))).andExpect(status().isForbidden)
        mvc.perform(action("accept", 4, offerId(2))).andExpect(status().isConflict)
        assertEquals("offered", state(2))
        service.cancelMatch(match)
        assertEquals("removed", state(2))
        assertEquals(0L, confirmed())
    }

    @Test fun declineAndCompletion() {
        offer()
        service.declineWaitlistOffer(users[2], match, offerId(2))
        assertThrows(org.springframework.web.server.ResponseStatusException::class.java) { service.declineWaitlistOffer(users[2], match, offerId(2)) }
        assertEquals("declined", state(2))
        assertEquals("offered", state(3))
        // Completion is only allowed once the match has started (security item 6.1).
        assertThrows(BookingRuleException::class.java) {
            service.updateMatch(match, UpdateMatchRequest(status = MatchStatus.completed))
        }
        moveToStartedSlot()
        service.updateMatch(match, UpdateMatchRequest(status = MatchStatus.completed))
        assertEquals("removed", state(3))
        assertEquals(1L, confirmed())
        assertThrows(BookingRuleException::class.java) { join(4) }
    }

    @Test fun capacityEditDuringJoin() {
        service.updateMatch(match, UpdateMatchRequest(maxPlayers = 3))
        join(0)
        join(1)
        race({ try { service.updateMatch(match, UpdateMatchRequest(maxPlayers = 2)) } catch (_: BookingRuleException) {} },
            { try { join(2) } catch (_: MatchFullException) {} })
        assertEquals(confirmed(), id("select max_players from matches where id=?", match))
    }

    /**
     * Moves the fixture match into an already-started slot that no other fixture can occupy.
     *
     * This class commits its fixtures, so a slot relative to now() stays published on the same
     * court and blocks the next run (exclusion constraint) for up to an hour. The slot is instead
     * derived from the fixture's unique user id on a fixed past anchor: whole hours, 2-hour stride,
     * 1-hour length. Ids are never reused, so it cannot overlap a slot from this or any earlier run
     * (future fixtures use current_date + id + 100 days and never reach the past).
     */
    private fun moveToStartedSlot() {
        val slot = users.first().toInt()
        assertEquals(1, db.update("""update matches
            set starts_at = timestamptz '2000-01-01 10:00:00+00' + make_interval(hours => 2 * ?),
                ends_at   = timestamptz '2000-01-01 11:00:00+00' + make_interval(hours => 2 * ?)
            where id=?""", slot, slot, match))
        assertEquals(1L, id("select count(*) from matches where id=? and starts_at < now()", match),
            "The derived started slot must lie in the past")
    }

    @Test fun startedMatchCannotPromoteOrAccept() {
        offer()
        moveToStartedSlot()
        mvc.perform(action("accept", 2, offerId(2))).andExpect(status().isBadRequest)
        assertEquals("expired", state(2))
        assertEquals("waiting", state(3))
        assertEquals(1L, confirmed())
    }

    @Test fun failedEditRollsBackCancellationCleanup() {
        offer()
        // PostgreSQL rejects a negative price after the participant cleanup has run.
        assertThrows(org.springframework.dao.DataIntegrityViolationException::class.java) {
            service.updateMatch(match, UpdateMatchRequest(status = MatchStatus.cancelled,
                pricePerPlayer = java.math.BigDecimal("-1")))
        }
        assertEquals(1L, confirmed())
        assertEquals("offered", state(2))
    }

    @Test fun staleActionsCannotConsumeReissuedOffer() {
        offer()
        val first = offerId(2)
        service.declineWaitlistOffer(users[2], match, first)
        queue(2)
        service.declineWaitlistOffer(users[3], match, offerId(3))
        val second = offerId(2)
        assertNotEquals(first, second)
        queue(4)
        fun snapshot() = listOf(
            db.queryForList("select * from match_waitlist where match_id=? order by joined_at,id", match),
            db.queryForList("select * from match_reservations where match_id=? order by id", match),
            db.queryForList("select max_players from matches where id=?", match))
        val before = snapshot()
        race({ mvc.perform(action("accept", 2, first)).andExpect(status().isConflict) },
            { mvc.perform(action("decline", 2, first)).andExpect(status().isConflict) })
        for (body in listOf("{}", """{"offerId":"invalid"}""")) {
            mvc.perform(post("/api/matches/$match/waitlist/accept").with(asMember(2))
                .contentType("application/json").content(body)).andExpect(status().isBadRequest)
        }
        assertEquals(before, snapshot())
        mvc.perform(action("accept", 2, second)).andExpect(status().isOk)
        assertEquals(2L, confirmed())
        assertEquals("accepted", state(2))
    }

    @Test fun cancelDuringAcceptance() {
        offer()
        race({ service.updateMatch(match, UpdateMatchRequest(status = MatchStatus.cancelled)) },
            { try { service.acceptWaitlistOffer(users[2], match, offerId(2)).getOrThrow() } catch (_: org.springframework.web.server.ResponseStatusException) {} })
        assertEquals(0L, confirmed())
        assertEquals(0L, id("select count(*) from match_waitlist where match_id=? and status in ('waiting','offered')", match))
    }
}
