package com.serva.booking

import org.junit.jupiter.api.Test
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.test.context.SpringBootTest
import com.serva.booking.testsupport.DatabaseIntegrationTest
import org.springframework.core.io.support.PathMatchingResourcePatternResolver
import org.springframework.jdbc.core.JdbcTemplate
import java.math.BigDecimal

/**
 * Database identity and schema checks for the disposable test database.
 *
 * Flyway is disabled at application start-up and the restricted application login cannot read
 * `flyway_schema_history` (by the V9 design), so the applied schema version is proven through
 * catalog evidence that `fortylove_app` can read (`pg_catalog`), one entry per migration.
 */
@DatabaseIntegrationTest
@SpringBootTest
class BookingApplicationTests {
	@Autowired
	private lateinit var jdbc: JdbcTemplate

	@Value($$"${FORTYLOVE_TEST_SYSTEM_IDENTIFIER}")
	private lateinit var expectedSystemIdentifier: String

	private fun column(table: String, column: String) = Evidence("$table.$column column") {
		count("SELECT COUNT(*) FROM pg_attribute WHERE attrelid = to_regclass(?) AND attname = ? AND NOT attisdropped", table, column)
	}

	private fun constraint(table: String, name: String) = Evidence("$table constraint $name") {
		count("SELECT COUNT(*) FROM pg_constraint WHERE conrelid = to_regclass(?) AND conname = ?", table, name)
	}

	private fun trigger(table: String, name: String) = Evidence("$table trigger $name") {
		count("SELECT COUNT(*) FROM pg_trigger WHERE tgrelid = to_regclass(?) AND tgname = ? AND NOT tgisinternal", table, name)
	}

	private fun relation(name: String) = Evidence("relation $name") {
		count("SELECT COUNT(*) FROM pg_class WHERE oid = to_regclass(?)", name)
	}

	private class Evidence(val description: String, val present: () -> Boolean)

	private fun count(sql: String, vararg args: String): Boolean =
		jdbc.queryForObject(sql, Int::class.java, *args) == 1

	/** One entry per migration from V7 on; V1–V6 are covered by the Padel data assertions below. */
	private fun schemaEvidence(): Map<Int, List<Evidence>> = mapOf(
		7 to listOf(
			column("public.users", "clerk_user_id"),
			constraint("public.users", "uq_users_clerk_user_id"),
		),
		8 to listOf(
			column("public.users", "date_of_birth"),
			column("public.users", "gender"),
			column("public.users", "skill_level"),
			constraint("public.users", "chk_users_profile_gender"),
			constraint("public.users", "chk_users_profile_skill_level"),
		),
		9 to listOf(
			relation("public.court_occupancy"),
			constraint("public.court_occupancy", "court_occupancy_no_overlap"),
			trigger("public.bookings", "booking_claim_lock"),
			trigger("public.bookings", "booking_claim_sync"),
			trigger("public.matches", "match_claim_lock"),
			trigger("public.matches", "match_claim_sync"),
		),
		10 to listOf(
			column("public.match_waitlist", "offer_id"),
			constraint("public.match_waitlist", "offered_requires_identity"),
			relation("public.match_waitlist_offer_id_unique"),
		),
		11 to listOf(
			column("public.match_waitlist", "lifecycle_id"),
			column("public.match_reservations", "lifecycle_id"),
		),
	)

	/** Highest `V<n>__*.sql` on the classpath, so adding V12 forces this test to be extended. */
	private fun latestMigrationVersion(): Int =
		PathMatchingResourcePatternResolver()
			.getResources("classpath*:db/migration/V*__*.sql")
			.mapNotNull { resource -> resource.filename?.let { Regex("^V(\\d+)__").find(it)?.groupValues?.get(1)?.toInt() } }
			.max()

	@Test
	fun `connects to the disposable test cluster as the restricted login`() {
		assertEquals("fortylove", jdbc.queryForObject("SELECT current_database()", String::class.java))
		assertEquals("fortylove_app", jdbc.queryForObject("SELECT session_user", String::class.java))
		assertEquals("fortylove_app", jdbc.queryForObject("SELECT current_user", String::class.java))
		assertEquals(
			expectedSystemIdentifier,
			jdbc.queryForObject("SELECT system_identifier::text FROM pg_control_system()", String::class.java),
		)
	}

	@Test
	fun `schema contains every migration up to the latest one on the classpath`() {
		val latest = latestMigrationVersion()
		val evidence = schemaEvidence()
		assertTrue(
			latest <= evidence.keys.max(),
			"Migration V$latest has no schema evidence entry in BookingApplicationTests; add one",
		)

		val missing = evidence.filterKeys { it <= latest }
			.flatMap { (version, checks) -> checks.filterNot { it.present() }.map { "V$version: ${it.description}" } }
		assertEquals(emptyList<String>(), missing)
	}

	@Test
	fun `application connects to the dedicated Padel-only database`() {
		assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM courts WHERE sport <> 'padel'", Int::class.java))
		assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM matches WHERE sport <> 'padel'", Int::class.java))
		assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM pricing WHERE sport <> 'padel'", Int::class.java))
		assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM contact_messages WHERE sport <> 'padel'", Int::class.java))
		assertEquals(3, jdbc.queryForObject("SELECT COUNT(*) FROM courts WHERE sport = 'padel' AND legacy_sport IS NULL", Int::class.java))
		assertEquals(
			listOf("Padel Court 1", "Padel Court 2", "Padel Court 3"),
			jdbc.queryForList("SELECT name FROM courts WHERE sport = 'padel' AND legacy_sport IS NULL ORDER BY id", String::class.java),
		)
		assertEquals(BigDecimal("25.000"), jdbc.queryForObject("SELECT off_peak_price FROM pricing WHERE sport = 'padel'", BigDecimal::class.java))
		assertEquals(BigDecimal("45.000"), jdbc.queryForObject("SELECT daytime_two_hour_price FROM pricing WHERE sport = 'padel'", BigDecimal::class.java))
		assertEquals(BigDecimal("35.000"), jdbc.queryForObject("SELECT peak_price FROM pricing WHERE sport = 'padel'", BigDecimal::class.java))
		assertEquals(BigDecimal("60.000"), jdbc.queryForObject("SELECT evening_two_hour_price FROM pricing WHERE sport = 'padel'", BigDecimal::class.java))
		assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM off_peak_windows WHERE start_hour = 7 AND end_hour = 18", Int::class.java))
	}

}
