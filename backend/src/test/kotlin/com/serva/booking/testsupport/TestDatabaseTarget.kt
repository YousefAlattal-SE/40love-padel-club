package com.serva.booking.testsupport

/**
 * The only database that database-backed tests may reach: the disposable
 * `fortylove-automated-tests` container on 127.0.0.1:55434 (tmpfs storage).
 *
 * The protected environments use the same database name (`fortylove`), so the name
 * alone proves nothing. The URL must match one canonical string exactly; any variation
 * (other host spelling, missing port, query parameters, multiple hosts) is rejected
 * before a connection is attempted.
 */
object TestDatabaseTarget {
    const val HOST = "127.0.0.1"
    const val PORT = 55434
    const val DATABASE = "fortylove"
    const val URL = "jdbc:postgresql://$HOST:$PORT/$DATABASE"
    const val USERNAME = "fortylove_app"
    const val CONTAINER_NAME = "fortylove-automated-tests"

    /** Ports of environments that must never be reached by tests (named in error messages). */
    val PROTECTED_PORTS: Map<Int, String> = mapOf(
        5432 to "default PostgreSQL port / exited containers",
        5433 to "fortylove-db (original, protected)",
        55433 to "fortylove-test-forward -> fortylove-restore-test (protected)",
        59526 to "fortylove-manual-381ce18989 (not authorized)",
    )

    private val CONTAINER_ID = Regex("^[0-9a-f]{64}$")
    private val SYSTEM_IDENTIFIER = Regex("^[0-9]{1,20}$")
    private val PORT_HINT = Regex(":(\\d{1,6})(?=[/?,]|$)")

    /** Throws [UnsafeTestDatabaseException] unless [url] and [username] are exactly the disposable target. */
    fun requireSafe(url: String?, username: String?) {
        if (url == null || url.isEmpty()) {
            throw UnsafeTestDatabaseException("No test database URL is configured")
        }
        if (url != URL) {
            throw UnsafeTestDatabaseException(
                "Refusing test database URL ${describe(url)}; only $URL is allowed${protectedHint(url)}",
            )
        }
        if (username != USERNAME) {
            throw UnsafeTestDatabaseException("Refusing test database login; only $USERNAME is allowed")
        }
    }

    fun requireContainerId(id: String?) {
        if (id == null || !CONTAINER_ID.matches(id)) {
            throw UnsafeTestDatabaseException(
                "FORTYLOVE_TEST_CONTAINER_ID must be the full 64-character lowercase Docker ID of $CONTAINER_NAME",
            )
        }
    }

    fun requireSystemIdentifier(value: String?) {
        if (value == null || !SYSTEM_IDENTIFIER.matches(value)) {
            throw UnsafeTestDatabaseException(
                "FORTYLOVE_TEST_SYSTEM_IDENTIFIER must be the numeric PostgreSQL system identifier of the disposable cluster",
            )
        }
    }

    /** Echoes the URL without query parameters or user-info, so a password placed there is never printed. */
    private fun describe(url: String): String =
        "'" + url.substringBefore('?').replace(Regex("//[^/]*@"), "//<redacted>@").take(120) + "'"

    private fun protectedHint(url: String): String {
        val port = PORT_HINT.findAll(url).mapNotNull { it.groupValues[1].toIntOrNull() }.firstOrNull { it in PROTECTED_PORTS }
        return if (port == null) "" else " (port $port is ${PROTECTED_PORTS.getValue(port)})"
    }
}

class UnsafeTestDatabaseException(message: String) : IllegalStateException(message)
