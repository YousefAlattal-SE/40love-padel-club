package com.serva.booking.admin

import com.serva.booking.contact.ContactMessageController
import com.serva.booking.testsupport.AdminPrincipal
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.mockito.Mockito.mock
import org.mockito.Mockito.verify
import org.mockito.Mockito.verifyNoInteractions
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.transaction.annotation.Propagation
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping

/** Security item 8.2: admin changes are written to audit_logs in the same transaction. */
class AdminAuditServiceTest {
    private val sql = "INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?::jsonb)"
    private val jdbc = mock(JdbcTemplate::class.java)
    private val audit = AdminAuditService(jdbc)

    @AfterEach
    fun clear() = SecurityContextHolder.clearContext()

    @Test
    fun `records the authenticated admin, the action and only the given details`() {
        SecurityContextHolder.getContext().authentication = AdminPrincipal.token(7L)

        audit.record("booking.status", "booking", 42L, mapOf("status" to "cancelled"))

        verify(jdbc).update(sql, 7L, "booking.status", "booking", 42L, """{"status":"cancelled"}""")
    }

    @Test
    fun `match updates record field names, not their values`() {
        SecurityContextHolder.getContext().authentication = AdminPrincipal.token(7L)

        audit.record("match.update", "match", 3L, mapOf("fields" to listOf("description"), "status" to "published"))

        verify(jdbc).update(sql, 7L, "match.update", "match", 3L, """{"fields":["description"],"status":"published"}""")
    }

    @Test
    fun `refuses to record without an authenticated admin, so the change rolls back`() {
        assertThrows(IllegalStateException::class.java) {
            audit.record("court.availability", "court", 1L, mapOf("available" to false))
        }
        verifyNoInteractions(jdbc)
    }

    @Test
    fun `audit writes must join the transaction that makes the change`() {
        val method = AdminAuditService::class.java.declaredMethods.single { it.name == "record" }
        assertEquals(Propagation.MANDATORY, method.getAnnotation(Transactional::class.java)?.propagation)
    }

    @Test
    fun `every admin change handler runs in a transaction`() {
        val notChanges = setOf("bookings", "customers", "listForAdmin", "create") // POST searches; public contact form
        val mappings = listOf(PatchMapping::class.java, PutMapping::class.java, PostMapping::class.java, DeleteMapping::class.java)
        val handlers = listOf(AdminController::class.java, ContactMessageController::class.java)
            .flatMap { it.declaredMethods.toList() }
            .filter { m -> mappings.any { m.isAnnotationPresent(it) } && m.name !in notChanges }
        assertEquals(5, handlers.size, "Admin change handlers: ${handlers.map { it.name }}")
        handlers.forEach { assertTrue(it.isAnnotationPresent(Transactional::class.java), "${it.name} must be @Transactional") }
    }
}
