package com.serva.booking.testsupport

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.nio.file.Files
import java.nio.file.Path
import kotlin.io.path.extension
import kotlin.io.path.invariantSeparatorsPathString
import kotlin.io.path.readText
import kotlin.io.path.relativeTo

/**
 * Static policy checks over the compiled test classes and the test sources. Nothing is
 * executed, no Spring context is created and no connection is attempted.
 */
class DatabaseTestAnnotationPolicyTest {

    private val testMethodAnnotations = setOf("Test", "ParameterizedTest", "RepeatedTest", "TestFactory", "TestTemplate")

    /** Classes known to need the disposable database. The scan must find all of them marked. */
    private val knownDatabaseTests = setOf(
        "com.serva.booking.BookingApplicationTests",
        "com.serva.booking.auth.AuthServiceRegistrationTest",
        "com.serva.booking.config.ApiBoundsTest",
        "com.serva.booking.config.DeploymentRegressionTest",
        "com.serva.booking.matchmaking.CourtSchedulingHttpTest",
        "com.serva.booking.matchmaking.MatchLifecycleTest",
    )

    private fun testClasses(): List<Class<*>> {
        val root = Path.of(javaClass.protectionDomain.codeSource.location.toURI())
        val loader = javaClass.classLoader
        return Files.walk(root).use { paths ->
            paths.filter { it.extension == "class" }
                .map { it.relativeTo(root).invariantSeparatorsPathString.removeSuffix(".class").replace('/', '.') }
                .toList()
        }.mapNotNull { name -> runCatching { Class.forName(name, false, loader) }.getOrNull() }
            .filter { cls -> cls.declaredMethods.any { m -> m.annotations.any { it.annotationClass.simpleName in testMethodAnnotations } } }
    }

    @Test
    fun `every test that can open a database connection is a DatabaseIntegrationTest`() {
        val classes = testClasses()
        assertTrue(classes.size >= 20, "Class scan found only ${classes.size} test classes; the scan location is wrong")

        val unmarked = classes.filter { DatabaseTestGate.isDatabaseCapable(it) && !DatabaseTestGate.isMarked(it) }.map { it.name }
        assertEquals(emptyList<String>(), unmarked)

        val marked = classes.filter { DatabaseTestGate.isMarked(it) }.map { it.name }.toSet()
        assertTrue(marked.containsAll(knownDatabaseTests), "Missing @DatabaseIntegrationTest: ${knownDatabaseTests - marked}")
    }

    @Test
    fun `test sources outside testsupport never build their own connections`() {
        val root = listOf(Path.of("src/test/kotlin"), Path.of("backend/src/test/kotlin")).firstOrNull { Files.isDirectory(it) }
        assertTrue(root != null, "Test sources not found from working directory ${Path.of("").toAbsolutePath()}")

        val forbidden = listOf("DriverManager", "PGSimpleDataSource", "PGConnectionPoolDataSource", "DataSourceBuilder", "jdbc:postgresql")
        val violations = Files.walk(root!!).use { paths ->
            paths.filter { it.extension == "kt" }
                .filter { !it.relativeTo(root).invariantSeparatorsPathString.startsWith("com/serva/booking/testsupport/") }
                .toList()
        }.flatMap { file -> forbidden.filter { file.readText().contains(it) }.map { "${file.fileName}: $it" } }

        assertEquals(emptyList<String>(), violations)
    }
}
