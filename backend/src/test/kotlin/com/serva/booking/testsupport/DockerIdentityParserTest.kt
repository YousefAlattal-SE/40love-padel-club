package com.serva.booking.testsupport

import org.junit.jupiter.api.Assertions.assertDoesNotThrow
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Test

/** Fixture strings only (fake ids); Docker is never called. */
class DockerIdentityParserTest {

    private val id = "1".repeat(64)
    private val other = "2".repeat(64)

    private fun inspect(
        containerId: String = id,
        name: String = "/fortylove-automated-tests",
        running: String = "true",
        image: String = "postgres:16-alpine",
        ports: String = "5432/tcp=127.0.0.1:55434; ",
        mounts: String = "",
        tmpfs: String = "/var/lib/postgresql/data,",
    ) = "$containerId|$name|$running|$image|$ports|$mounts|$tmpfs\n"

    private fun verify(output: String, publishers: List<String> = listOf(id)) =
        DockerIdentity.verify(DockerIdentity.parseInspect(output), id, publishers)

    @Test
    fun `accepts the pinned tmpfs container that alone publishes 55434`() {
        assertDoesNotThrow { verify(inspect()) }
        assertDoesNotThrow { verify(inspect(mounts = "tmpfs:/var/lib/postgresql/data,", tmpfs = "")) }
    }

    @Test
    fun `rejects any identity, storage or port deviation`() {
        val rejected = listOf(
            inspect(containerId = other),
            inspect(name = "/fortylove-db"),
            inspect(name = "/fortylove-restore-test"),
            inspect(running = "false"),
            inspect(image = "postgres:15"),
            inspect(ports = "5432/tcp=127.0.0.1:5433; "),
            inspect(ports = "5432/tcp=0.0.0.0:55434; "),
            inspect(ports = "5432/tcp=127.0.0.1:55434;0.0.0.0:55434; "),
            inspect(ports = "5432/tcp=127.0.0.1:55434; 5433/tcp=127.0.0.1:5433; "),
            inspect(ports = ""),
            inspect(mounts = "volume:/var/lib/postgresql/data,"),
            inspect(mounts = "bind:/backups,"),
            inspect(tmpfs = ""),
        )
        for (output in rejected) {
            assertThrows(UnsafeTestDatabaseException::class.java, { verify(output) }, output)
        }
    }

    @Test
    fun `rejects a second publisher or a missing publisher`() {
        assertThrows(UnsafeTestDatabaseException::class.java) { verify(inspect(), listOf(id, other)) }
        assertThrows(UnsafeTestDatabaseException::class.java) { verify(inspect(), listOf(other)) }
        assertThrows(UnsafeTestDatabaseException::class.java) { verify(inspect(), emptyList()) }
    }

    @Test
    fun `rejects malformed or multi-container inspect output`() {
        assertThrows(UnsafeTestDatabaseException::class.java) { DockerIdentity.parseInspect("") }
        assertThrows(UnsafeTestDatabaseException::class.java) { DockerIdentity.parseInspect(inspect() + inspect()) }
        assertThrows(UnsafeTestDatabaseException::class.java) { DockerIdentity.parseInspect("$id|only|three") }
    }

    @Test
    fun `finds every container publishing host port 55434`() {
        val ps = """
            $id|127.0.0.1:55434->5432/tcp
            $other|127.0.0.1:5433->5432/tcp
            ${"3".repeat(64)}|0.0.0.0:55434->5432/tcp, :::55434->5432/tcp
            ${"4".repeat(64)}|
        """.trimIndent()
        assertEquals(listOf(id, "3".repeat(64)), DockerIdentity.parsePublishers(ps))
    }
}
