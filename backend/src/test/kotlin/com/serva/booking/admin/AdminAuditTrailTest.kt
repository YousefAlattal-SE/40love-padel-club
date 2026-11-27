package com.serva.booking.admin

import com.serva.booking.contact.ContactMessageController
import com.serva.booking.contact.UpdateContactMessageStatusRequest
import com.serva.booking.testsupport.AdminPrincipal
import com.serva.booking.testsupport.DatabaseIntegrationTest
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.springframework.test.web.servlet.setup.DefaultMockMvcBuilder
import org.springframework.test.web.servlet.setup.MockMvcBuilders
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.context.WebApplicationContext
import java.time.LocalDate
import java.time.ZoneOffset

/** Security item 8.2: admin changes leave a persistent, append-only audit row. Rolled back after each test. */
@DatabaseIntegrationTest
@SpringBootTest
@Transactional
class AdminAuditTrailTest(@Autowired context: WebApplicationContext, @Autowired private val jdbc: JdbcTemplate) {
    private val mvc = MockMvcBuilders.webAppContextSetup(context)
        .apply<DefaultMockMvcBuilder>(springSecurity()).build()

    private fun lastAudit(action: String): Map<String, Any?> = jdbc.queryForMap(
        "select admin_id, entity_type, entity_id, details::text as details from audit_logs where action = ? order by id desc limit 1",
        action,
    )

    @Test
    fun `a booking status change is audited with the admin and no personal data`() {
        val admin = AdminPrincipal.insertAdmin(jdbc, "audit-booking")
        val court = jdbc.queryForObject("select min(id) from courts where is_available and legacy_sport is null", Long::class.java)!!
        val email = "audit-member-${System.nanoTime()}@example.test"
        val member = jdbc.queryForObject(
            "insert into users(full_name,email) values ('Audit Member Name', ?) returning id", Long::class.java, email,
        )!!
        val start = LocalDate.now(ZoneOffset.UTC).plusDays(5100).atTime(15, 0).atOffset(ZoneOffset.UTC)
        val booking = jdbc.queryForObject(
            "insert into bookings(user_id,court_id,starts_at,ends_at,total_price) values (?,?,?,?,25) returning id",
            Long::class.java, member, court, start, start.plusHours(1),
        )!!

        mvc.perform(patch("/api/admin/bookings/$booking/status").with(AdminPrincipal.of(admin))
            .contentType("application/json").content("""{"status":"cancelled"}""")).andExpect(status().isOk)

        val row = lastAudit("booking.status")
        assertEquals(admin, (row["admin_id"] as Number).toLong())
        assertEquals("booking", row["entity_type"])
        assertEquals(booking, (row["entity_id"] as Number).toLong())
        val details = row["details"] as String
        assertTrue(details.contains("cancelled"), details)
        assertFalse(details.contains(email) || details.contains("Audit Member Name"), "No personal data: $details")
    }

    @Test
    fun `a pricing change is audited with the new prices`() {
        val admin = AdminPrincipal.insertAdmin(jdbc, "audit-pricing")
        mvc.perform(put("/api/admin/pricing/padel").with(AdminPrincipal.of(admin)).contentType("application/json")
            .content("""{"daytimePrice":21,"daytimeTwoHourPrice":40,"eveningPrice":31,"eveningTwoHourPrice":60}"""))
            .andExpect(status().isOk)

        val row = lastAudit("pricing.update")
        assertEquals(admin, (row["admin_id"] as Number).toLong())
        val details = row["details"] as String
        assertTrue(details.contains("\"eveningPrice\": 31") && details.contains("\"sport\": \"padel\""), details)
    }

    @Test
    fun `the runtime role can add and read audit rows but never change or remove them`() {
        assertEquals("fortylove_app", jdbc.queryForObject("select current_user", String::class.java))
        fun can(privilege: String) = jdbc.queryForObject(
            "select has_table_privilege(current_user, 'public.audit_logs', ?)", Boolean::class.java, privilege,
        )!!
        assertTrue(can("INSERT") && can("SELECT"))
        listOf("UPDATE", "DELETE", "TRUNCATE", "TRIGGER", "REFERENCES").forEach {
            assertFalse(can(it), "fortylove_app must not have $it on audit_logs")
        }
    }
}

/**
 * Not transactional on purpose: proves a change and its audit row commit or roll back together.
 * Leaves one contact-message fixture behind in the disposable database (the app cannot delete rows).
 */
@DatabaseIntegrationTest
@SpringBootTest
class AdminAuditAtomicityTest(
    @Autowired private val jdbc: JdbcTemplate,
    @Autowired private val contacts: ContactMessageController,
) {
    @AfterEach
    fun clear() = SecurityContextHolder.clearContext()

    @Test
    fun `a change whose audit write fails is rolled back`() {
        val id = jdbc.queryForObject(
            "insert into contact_messages(name,phone,sport,message) values ('Atomicity fixture','0790000000','padel','audit test') returning id",
            Long::class.java,
        )!!

        // Passes the ADMIN role check but carries no AuthUser, so the audit write refuses after the
        // UPDATE has run; the status change must not survive.
        SecurityContextHolder.getContext().authentication =
            org.springframework.security.authentication.UsernamePasswordAuthenticationToken.authenticated(
                "staff", null, listOf(org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_ADMIN")),
            )
        assertThrows(IllegalStateException::class.java) {
            contacts.updateStatus(id, UpdateContactMessageStatusRequest("archived"))
        }

        assertEquals("new", jdbc.queryForObject("select status from contact_messages where id = ?", String::class.java, id))
        assertEquals(0, jdbc.queryForObject(
            "select count(*) from audit_logs where entity_type = 'contact_message' and entity_id = ?", Int::class.java, id,
        ))
    }
}
