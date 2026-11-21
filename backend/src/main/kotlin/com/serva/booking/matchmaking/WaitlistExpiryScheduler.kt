package com.serva.booking.matchmaking

import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component

/**
 * Periodically expires waiting-list offers that have passed their acceptance window.
 * When an offer expires, the spot is automatically offered to the next eligible participant.
 */
@Component
class WaitlistExpiryScheduler(private val matchService: MatchService) {

    /** Run every 2 minutes to expire overdue offers (offer window is 10 minutes). */
    @Scheduled(fixedDelay = 120_000)
    fun expireOffers() {
        matchService.expireStaleOffers()
    }
}
