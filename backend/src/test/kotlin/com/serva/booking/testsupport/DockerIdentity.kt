package com.serva.booking.testsupport

import java.util.concurrent.TimeUnit

/**
 * Read-only Docker metadata checks proving that 127.0.0.1:55434 is published by the pinned,
 * tmpfs-backed `fortylove-automated-tests` container and by no other container.
 *
 * Only `docker inspect` and `docker ps` are executed; nothing is started, stopped or changed.
 * Parsing is separate from execution so it can be unit-tested with fixture strings.
 */
object DockerIdentity {
    const val DATA_DIRECTORY = "/var/lib/postgresql/data"
    const val EXPECTED_PORT_BINDINGS = "5432/tcp=${TestDatabaseTarget.HOST}:${TestDatabaseTarget.PORT}"

    /** One line, `|`-separated: id | name | running | image | port bindings | mounts | tmpfs paths. */
    const val INSPECT_FORMAT =
        "{{.Id}}|{{.Name}}|{{.State.Running}}|{{.Config.Image}}|" +
            "{{range \$p, \$b := .HostConfig.PortBindings}}{{\$p}}={{range \$b}}{{.HostIp}}:{{.HostPort}};{{end}} {{end}}|" +
            "{{range .Mounts}}{{.Type}}:{{.Destination}},{{end}}|" +
            "{{range \$k, \$v := .HostConfig.Tmpfs}}{{\$k}},{{end}}"

    /** One line per running container: full id | published ports. */
    const val PS_FORMAT = "{{.ID}}|{{.Ports}}"

    data class ContainerFacts(
        val id: String,
        val name: String,
        val running: Boolean,
        val image: String,
        val portBindings: String,
        val mounts: List<Pair<String, String>>,
        val tmpfsPaths: Set<String>,
    )

    fun parseInspect(output: String): ContainerFacts {
        val lines = output.lines().map { it.trim() }.filter { it.isNotEmpty() }
        if (lines.size != 1) throw UnsafeTestDatabaseException("Expected exactly one container in docker inspect output")
        val fields = lines.single().split('|')
        if (fields.size != 7) throw UnsafeTestDatabaseException("Unexpected docker inspect output format")
        return ContainerFacts(
            id = fields[0],
            name = fields[1],
            running = fields[2] == "true",
            image = fields[3],
            portBindings = fields[4].split(' ').map { it.trim().removeSuffix(";") }.filter { it.isNotEmpty() }.sorted().joinToString(" "),
            mounts = fields[5].split(',').filter { it.isNotEmpty() }.map { it.substringBefore(':') to it.substringAfter(':') },
            tmpfsPaths = fields[6].split(',').filter { it.isNotEmpty() }.toSet(),
        )
    }

    /** Ids of every running container that publishes host port 55434. */
    fun parsePublishers(output: String): List<String> {
        val marker = ":${TestDatabaseTarget.PORT}->"
        return output.lines()
            .map { it.trim() }
            .filter { it.isNotEmpty() }
            .filter { it.substringAfter('|', "").contains(marker) }
            .map { it.substringBefore('|') }
    }

    fun verify(facts: ContainerFacts, expectedId: String, publishers: List<String>) {
        TestDatabaseTarget.requireContainerId(expectedId)
        fun fail(reason: String): Nothing =
            throw UnsafeTestDatabaseException("Disposable test container check failed: $reason")

        if (facts.id != expectedId) fail("container id does not match FORTYLOVE_TEST_CONTAINER_ID")
        if (facts.name != "/${TestDatabaseTarget.CONTAINER_NAME}") fail("container is not ${TestDatabaseTarget.CONTAINER_NAME}")
        if (!facts.running) fail("container is not running")
        if (!facts.image.startsWith("postgres:16")) fail("container image is not postgres:16")
        if (facts.portBindings != EXPECTED_PORT_BINDINGS) fail("port bindings are not exactly $EXPECTED_PORT_BINDINGS")
        facts.mounts.firstOrNull { (type, _) -> type != "tmpfs" }?.let { (type, destination) ->
            fail("container has a persistent $type mount at $destination")
        }
        val dataOnTmpfs = DATA_DIRECTORY in facts.tmpfsPaths || ("tmpfs" to DATA_DIRECTORY) in facts.mounts
        if (!dataOnTmpfs) fail("$DATA_DIRECTORY is not on tmpfs")
        if (publishers != listOf(expectedId)) fail("port ${TestDatabaseTarget.PORT} must be published by this container only")
    }

    /** Runs the read-only Docker checks against the live daemon. Fails closed if Docker is unavailable. */
    fun verifyLive(expectedId: String) {
        TestDatabaseTarget.requireContainerId(expectedId)
        val facts = parseInspect(docker("inspect", "--type", "container", "--format", INSPECT_FORMAT, expectedId))
        val publishers = parsePublishers(docker("ps", "--no-trunc", "--format", PS_FORMAT))
        verify(facts, expectedId, publishers)
    }

    private fun docker(vararg args: String): String {
        val process = try {
            ProcessBuilder(listOf("docker") + args).redirectErrorStream(true).start()
        } catch (e: java.io.IOException) {
            throw UnsafeTestDatabaseException("Docker CLI is unavailable, so the test database cannot be verified")
        }
        val output = process.inputStream.bufferedReader().readText()
        if (!process.waitFor(30, TimeUnit.SECONDS)) {
            process.destroyForcibly()
            throw UnsafeTestDatabaseException("docker ${args.first()} timed out")
        }
        if (process.exitValue() != 0) throw UnsafeTestDatabaseException("docker ${args.first()} failed")
        return output
    }
}
