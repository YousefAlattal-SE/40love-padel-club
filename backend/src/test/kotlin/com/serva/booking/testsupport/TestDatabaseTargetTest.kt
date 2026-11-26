package com.serva.booking.testsupport

import org.junit.jupiter.api.Assertions.assertDoesNotThrow
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/** Pure string checks: no socket, Docker call or database connection is involved. */
class TestDatabaseTargetTest {

    private val user = TestDatabaseTarget.USERNAME

    @Test
    fun `accepts only the canonical disposable target`() {
        assertDoesNotThrow { TestDatabaseTarget.requireSafe("jdbc:postgresql://127.0.0.1:55434/fortylove", user) }
    }

    @Test
    fun `rejects protected environments and every non-canonical spelling`() {
        val rejected = listOf(
            "jdbc:postgresql://127.0.0.1:5433/fortylove",              // original (protected)
            "jdbc:postgresql://127.0.0.1:55433/fortylove_restore",     // restore (protected)
            "jdbc:postgresql://127.0.0.1:55433/fortylove",
            "jdbc:postgresql://127.0.0.1:5432/fortylove",
            "jdbc:postgresql://127.0.0.1:59526/fortylove",
            "jdbc:postgresql://127.0.0.1/fortylove",                   // missing port defaults to 5432
            "jdbc:postgresql://localhost:55434/fortylove",
            "jdbc:postgresql://[::1]:55434/fortylove",
            "jdbc:postgresql://127.0.0.2:55434/fortylove",
            "jdbc:postgresql://0.0.0.0:55434/fortylove",
            "jdbc:postgresql://172.17.0.2:5432/fortylove",
            "jdbc:postgresql://172.17.0.4:5432/fortylove",
            "jdbc:postgresql://host.docker.internal:55434/fortylove",
            "jdbc:postgresql://127.0.0.1:55434,127.0.0.1:5433/fortylove",
            "jdbc:postgresql://127.0.0.1:55434/fortylove?targetServerType=primary",
            "jdbc:postgresql://127.0.0.1:55434/fortylove?service=prod",
            "jdbc:postgresql://127.0.0.1:55434/fortylove_restore",
            "jdbc:postgresql://127.0.0.1:55434/fortylove/",
            "jdbc:postgresql://127.0.0.1:055434/fortylove",
            "jdbc:postgresql://127.0.0.1:55434/%66ortylove",
            "JDBC:POSTGRESQL://127.0.0.1:55434/fortylove",
            " jdbc:postgresql://127.0.0.1:55434/fortylove",
            "jdbc:postgresql://127.0.0.1:55434/fortylove ",
            "jdbc:postgresql:///fortylove",
            "jdbc:postgresql:fortylove",
            "",
        )
        for (url in rejected) {
            assertThrows(UnsafeTestDatabaseException::class.java, { TestDatabaseTarget.requireSafe(url, user) }, url)
        }
        assertThrows(UnsafeTestDatabaseException::class.java) { TestDatabaseTarget.requireSafe(null, user) }
    }

    @Test
    fun `rejects any login other than the restricted application role`() {
        for (login in listOf("postgres", "fortylove_migrator", "fortylove_claim_writer", "FORTYLOVE_APP", "", null)) {
            assertThrows(UnsafeTestDatabaseException::class.java) { TestDatabaseTarget.requireSafe(TestDatabaseTarget.URL, login) }
        }
    }

    @Test
    fun `names the protected environment in the error`() {
        val error = assertThrows(UnsafeTestDatabaseException::class.java) {
            TestDatabaseTarget.requireSafe("jdbc:postgresql://127.0.0.1:5433/fortylove", user)
        }
        assertTrue(error.message!!.contains("fortylove-db"))
    }

    @Test
    fun `never echoes query parameters or user info`() {
        val error = assertThrows(UnsafeTestDatabaseException::class.java) {
            TestDatabaseTarget.requireSafe("jdbc:postgresql://app:s3cret@127.0.0.1:5433/fortylove?password=s3cret", user)
        }
        assertFalse(error.message!!.contains("s3cret"))
    }

    @Test
    fun `validates container id and system identifier formats`() {
        assertDoesNotThrow { TestDatabaseTarget.requireContainerId("a".repeat(64)) }
        for (id in listOf("ec6a490b", "A".repeat(64), "a".repeat(63), "fortylove-automated-tests", null)) {
            assertThrows(UnsafeTestDatabaseException::class.java) { TestDatabaseTarget.requireContainerId(id) }
        }
        assertDoesNotThrow { TestDatabaseTarget.requireSystemIdentifier("7311234567890123456") }
        for (value in listOf("", "12a", "1' OR '1'='1", "1;DROP", null)) {
            assertThrows(UnsafeTestDatabaseException::class.java) { TestDatabaseTarget.requireSystemIdentifier(value) }
        }
    }
}
