package com.serva.booking.admin

import com.serva.booking.auth.AuthUser
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Propagation
import org.springframework.transaction.annotation.Transactional
import tools.jackson.databind.json.JsonMapper

/**
 * Persistent, append-only trail of admin changes (security item 8.2).
 *
 * [record] must run inside the transaction that makes the change (`MANDATORY`), so a change and
 * its audit row commit or roll back together: a failed audit write undoes the change.
 * Details carry only changed values (statuses, flags, prices, field names), never names,
 * e-mail addresses, phone numbers, free text or tokens.
 */
@Service
class AdminAuditService(private val jdbc: JdbcTemplate) {

    @Transactional(propagation = Propagation.MANDATORY)
    fun record(action: String, entityType: String, entityId: Long?, details: Map<String, Any?> = emptyMap()) {
        val admin = SecurityContextHolder.getContext().authentication?.principal as? AuthUser
            ?: throw IllegalStateException("Admin change without an authenticated admin")
        jdbc.update(
            "INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?::jsonb)",
            admin.id, action, entityType, entityId, json.writeValueAsString(details),
        )
    }

    private companion object {
        val json: JsonMapper = JsonMapper.builder().build()
    }
}
