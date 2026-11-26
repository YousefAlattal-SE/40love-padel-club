package com.serva.booking.testsupport

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.springframework.boot.test.context.SpringBootTest

/** Exercises the gate's pure decision logic; the Docker check is replaced by a recorder. */
class DatabaseTestGateTest {

    @SpringBootTest
    class UnmarkedSpringTest

    @DatabaseIntegrationTest
    @SpringBootTest
    class MarkedSpringTest

    class PlainUnitTest

    private val containerId = "1".repeat(64)
    private val validEnv = mapOf(
        DatabaseTestGate.ENV_URL to TestDatabaseTarget.URL,
        DatabaseTestGate.ENV_USERNAME to TestDatabaseTarget.USERNAME,
        DatabaseTestGate.ENV_PASSWORD to "not-a-real-password",
        DatabaseTestGate.ENV_CONTAINER_ID to containerId,
        DatabaseTestGate.ENV_SYSTEM_IDENTIFIER to "7311234567890123456",
    )
    private val checked = mutableListOf<String>()
    private val recorder: (String) -> Unit = { checked += it }

    private fun decide(testClass: Class<*>, switch: String?, env: Map<String, String> = validEnv) =
        DatabaseTestGate.decide(testClass, switch, env, recorder)

    @Test
    fun `plain unit tests are unaffected`() {
        assertFalse(decide(PlainUnitTest::class.java, null).isDisabled)
        assertTrue(checked.isEmpty())
    }

    @Test
    fun `an unmarked Spring test fails before any context is created`() {
        assertThrows(UnsafeTestDatabaseException::class.java) { decide(UnmarkedSpringTest::class.java, DatabaseTestGate.ENABLED) }
        assertThrows(UnsafeTestDatabaseException::class.java) { decide(UnmarkedSpringTest::class.java, null) }
    }

    @Test
    fun `a database test is skipped unless databaseTest enabled it`() {
        for (switch in listOf(null, "", "disabled", "ENABLED", "true")) {
            assertTrue(decide(MarkedSpringTest::class.java, switch).isDisabled, "switch=$switch")
        }
        assertTrue(checked.isEmpty())
    }

    @Test
    fun `an enabled database test verifies the container after the target`() {
        assertFalse(decide(MarkedSpringTest::class.java, DatabaseTestGate.ENABLED).isDisabled)
        assertEquals(listOf(containerId), checked)
    }

    @Test
    fun `an enabled database test rejects unsafe settings without checking Docker`() {
        val unsafe = listOf(
            validEnv + (DatabaseTestGate.ENV_URL to "jdbc:postgresql://127.0.0.1:55433/fortylove_restore"),
            validEnv + (DatabaseTestGate.ENV_URL to "jdbc:postgresql://127.0.0.1:5433/fortylove"),
            validEnv - DatabaseTestGate.ENV_URL,
            validEnv + (DatabaseTestGate.ENV_USERNAME to "postgres"),
            validEnv - DatabaseTestGate.ENV_PASSWORD,
            validEnv - DatabaseTestGate.ENV_CONTAINER_ID,
            validEnv + (DatabaseTestGate.ENV_CONTAINER_ID to "ec6a490b"),
            validEnv - DatabaseTestGate.ENV_SYSTEM_IDENTIFIER,
            validEnv + ("DB_URL" to "jdbc:postgresql://127.0.0.1:5433/fortylove"),
            validEnv + ("SPRING_DATASOURCE_URL" to "jdbc:postgresql://127.0.0.1:5433/fortylove"),
            validEnv + ("spring_datasource_hikari_jdbc_url" to "x"),
            validEnv + ("PGHOST" to "127.0.0.1"),
            validEnv + ("PGSERVICEFILE" to "x"),
            validEnv + ("FLYWAY_URL" to "x"),
            validEnv + ("SPRING_SQL_INIT_MODE" to "always"),
        )
        for (env in unsafe) {
            assertThrows(UnsafeTestDatabaseException::class.java, { decide(MarkedSpringTest::class.java, DatabaseTestGate.ENABLED, env) }, env.keys.toString())
        }
        assertTrue(checked.isEmpty())
    }
}
