package com.serva.booking

import org.junit.jupiter.api.Test
import org.junit.jupiter.api.Assertions.assertEquals
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.jdbc.core.JdbcTemplate
import java.math.BigDecimal

@SpringBootTest
class BookingApplicationTests {
	@Autowired
	private lateinit var jdbc: JdbcTemplate

	@Test
	fun `application connects to the dedicated Padel-only database`() {
		assertEquals("fortylove", jdbc.queryForObject("SELECT current_database()", String::class.java))
		assertEquals(1, jdbc.queryForObject(
			"SELECT COUNT(*) FROM flyway_schema_history WHERE version = '6' AND success = true",
			Int::class.java,
		))
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
