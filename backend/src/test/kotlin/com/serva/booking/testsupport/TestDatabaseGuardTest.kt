package com.serva.booking.testsupport

import com.zaxxer.hikari.HikariDataSource
import org.junit.jupiter.api.Assertions.assertDoesNotThrow
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Test
import org.springframework.context.support.GenericApplicationContext
import org.springframework.mock.env.MockEnvironment

/** No context is refreshed and no pool is started, so no connection can be attempted. */
class TestDatabaseGuardTest {

    private fun environment(vararg overrides: Pair<String, String>): MockEnvironment {
        val env = MockEnvironment()
            .withProperty("spring.datasource.url", TestDatabaseTarget.URL)
            .withProperty("spring.datasource.username", TestDatabaseTarget.USERNAME)
            .withProperty(DatabaseTestGate.ENV_SYSTEM_IDENTIFIER, "7311234567890123456")
            .withProperty("spring.flyway.enabled", "false")
            .withProperty("spring.sql.init.mode", "never")
            .withProperty("spring.jpa.hibernate.ddl-auto", "validate")
        overrides.forEach { (key, value) -> env.setProperty(key, value) }
        env.setActiveProfiles("test")
        return env
    }

    private fun initialize(env: MockEnvironment) {
        val context = GenericApplicationContext()
        context.environment = env
        TestDatabaseGuard().initialize(context)
    }

    @Test
    fun `accepts the guarded test configuration`() {
        assertDoesNotThrow { initialize(environment()) }
    }

    @Test
    fun `rejects unsafe resolved configuration before refresh`() {
        val unsafe = listOf(
            environment("spring.datasource.url" to "jdbc:postgresql://127.0.0.1:55433/fortylove_restore"),
            environment("spring.datasource.url" to "jdbc:postgresql://127.0.0.1:5433/fortylove"),
            environment("spring.datasource.username" to "postgres"),
            environment(DatabaseTestGate.ENV_SYSTEM_IDENTIFIER to "1' OR '1'='1"),
            environment("spring.flyway.enabled" to "true"),
            environment("spring.sql.init.mode" to "always"),
            environment("spring.jpa.hibernate.ddl-auto" to "create-drop"),
            environment("spring.datasource.hikari.jdbc-url" to "jdbc:postgresql://127.0.0.1:5433/fortylove"),
            environment("spring.datasource.hikari.data-source-properties.portNumber" to "5433"),
            environment("spring.datasource.jndi-name" to "java:comp/env/jdbc/prod"),
            environment("spring.flyway.url" to "jdbc:postgresql://127.0.0.1:5433/fortylove"),
        )
        for (env in unsafe) {
            assertThrows(UnsafeTestDatabaseException::class.java) { initialize(env) }
        }
    }

    @Test
    fun `requires the test profile and refuses production profiles`() {
        val noTest = environment().also { it.setActiveProfiles("local") }
        assertThrows(UnsafeTestDatabaseException::class.java) { initialize(noTest) }
        for (profile in listOf("prod", "production", "PROD")) {
            val withProd = environment().also { it.setActiveProfiles("test", profile) }
            assertThrows(UnsafeTestDatabaseException::class.java) { initialize(withProd) }
        }
    }

    @Test
    fun `pool check rejects a Hikari pool pointed elsewhere without starting it`() {
        val check = TestDatabaseGuard.PoolTargetCheck()
        HikariDataSource().use { pool ->
            pool.jdbcUrl = "jdbc:postgresql://127.0.0.1:55433/fortylove_restore"
            pool.username = TestDatabaseTarget.USERNAME
            assertThrows(UnsafeTestDatabaseException::class.java) { check.postProcessAfterInitialization(pool, "dataSource") }
        }
        HikariDataSource().use { pool ->
            pool.jdbcUrl = TestDatabaseTarget.URL
            pool.username = TestDatabaseTarget.USERNAME
            pool.addDataSourceProperty("portNumber", "5433")
            assertThrows(UnsafeTestDatabaseException::class.java) { check.postProcessAfterInitialization(pool, "dataSource") }
        }
        HikariDataSource().use { pool ->
            pool.jdbcUrl = TestDatabaseTarget.URL
            pool.username = TestDatabaseTarget.USERNAME
            assertDoesNotThrow { check.postProcessAfterInitialization(pool, "dataSource") }
        }
    }

    @Test
    fun `pool check ignores non-DataSource beans`() {
        assertDoesNotThrow { TestDatabaseGuard.PoolTargetCheck().postProcessAfterInitialization("not a pool", "other") }
    }
}
