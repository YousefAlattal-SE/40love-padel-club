package com.serva.booking.contact

import com.serva.booking.config.StaffSearch
import jakarta.validation.Valid
import org.springframework.web.bind.annotation.RequestMethod
import com.serva.booking.config.ApiPage
import org.springframework.web.bind.annotation.RequestParam
import com.serva.booking.auth.ContactPhone
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.jdbc.core.RowMapper
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException

data class CreateContactMessageRequest(
    val name: String,
    val phone: String? = null,
    val sport: String,
    val preferredTime: String? = null,
    val message: String,
)

data class UpdateContactMessageStatusRequest(val status: String)

data class ContactMessageResponse(
    val id: Long,
    val name: String,
    val phone: String,
    val sport: String,
    val preferredTime: String?,
    val message: String,
    val status: String,
    val createdAt: String,
)

@RestController
@RequestMapping("/api")
class ContactMessageController(private val jdbc: JdbcTemplate) {
    private val mapper: RowMapper<ContactMessageResponse> = { rs, _ ->
        ContactMessageResponse(
            id = rs.getLong("id"),
            name = rs.getString("name"),
            phone = rs.getString("phone"),
            sport = if (rs.getString("legacy_sport") == null) "padel" else "archived",
            preferredTime = rs.getString("preferred_time"),
            message = rs.getString("message"),
            status = rs.getString("status"),
            createdAt = rs.getTimestamp("created_at").toInstant().toString(),
        )
    }

    @PostMapping("/contact-messages")
    fun create(@RequestBody request: CreateContactMessageRequest): ContactMessageResponse {
        val name = request.name.trim()
        val sport = request.sport.trim().lowercase()
        val preferredTime = request.preferredTime?.trim()?.takeIf { it.isNotEmpty() }
        val message = request.message.trim()

        if (name.length !in 2..120) throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Name must be between 2 and 120 characters")
        val phone = ContactPhone.normalizeRequired(request.phone)
        if (sport != "padel") throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Only Padel is supported")
        if (preferredTime != null && preferredTime.length > 120) throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Preferred time is too long")
        if (message.length !in 5..3000) throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Message must be between 5 and 3000 characters")

        return jdbc.queryForObject(
            """
            INSERT INTO contact_messages (name, phone, sport, preferred_time, message)
            VALUES (?, ?, ?, ?, ?)
            RETURNING id, name, phone, sport, legacy_sport, preferred_time, message, status, created_at
            """.trimIndent(),
            mapper, name, phone, sport, preferredTime, message,
        )
    }

    @ExceptionHandler(ResponseStatusException::class)
    fun requestError(error: ResponseStatusException) = ResponseEntity.status(error.statusCode).body(error.body)

    // SecurityConfig requires ROLE_ADMIN for /api/admin/**.
    @RequestMapping("/admin/contact-messages", method = [RequestMethod.GET, RequestMethod.POST])
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN')") // security item 9.1
    fun listForAdmin(page: ApiPage, @Valid @RequestBody(required = false) criteria: StaffSearch?, @RequestParam(defaultValue = "all") filter: String): List<ContactMessageResponse> = jdbc.query(
        """
        SELECT id, name, phone, sport, legacy_sport, preferred_time, message, status, created_at
        FROM contact_messages
        WHERE strpos(lower(concat_ws(' ',name,phone,sport,preferred_time,message)), lower(?)) > 0
          AND (? = 'all' OR status = ?)
        ORDER BY CASE WHEN status = 'new' THEN 0 ELSE 1 END, created_at DESC, id DESC
        LIMIT ? OFFSET ?
        """.trimIndent(),
        mapper, criteria?.search.orEmpty().trim(), filter, filter, page.size, page.offset,
    )

    @PatchMapping("/admin/contact-messages/{id}")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN')") // security item 9.1
    fun updateStatus(
        @PathVariable id: Long,
        @RequestBody request: UpdateContactMessageStatusRequest,
    ): ContactMessageResponse {
        val status = request.status.trim().lowercase()
        if (status !in setOf("new", "read", "replied", "archived")) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported message status")
        }
        return jdbc.query(
            """
            UPDATE contact_messages SET status = ? WHERE id = ?
            RETURNING id, name, phone, sport, legacy_sport, preferred_time, message, status, created_at
            """.trimIndent(),
            mapper, status, id,
        ).firstOrNull() ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Contact message not found")
    }
}
