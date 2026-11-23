package com.serva.booking.config

import org.springframework.http.HttpStatus
import org.springframework.web.server.ResponseStatusException

/** Bounded offset pagination. Reject invalid input before running a query. */
data class ApiPage(val page: Int = 0, val size: Int = 25) {
    init {
        if (page !in 0..10000 || size !in 1..100) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "page must be 0–10000 and size must be 1–100")
        }
    }
    val offset: Int get() = page * size
}


/** Keep staff queries (which may contain contact information) out of request URLs. */
data class StaffSearch(@field:jakarta.validation.constraints.Size(max = 256) val search: String = "")
