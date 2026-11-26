package com.serva.booking.config

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.nio.file.Files
import java.nio.file.Path
import java.util.Properties
import kotlin.io.path.extension
import kotlin.io.path.readText

/**
 * Keeps the development and production configuration on one agreed set of environment
 * variable names, with legacy JWT off by default. Reads files only; nothing is started.
 */
class ConfigurationConsistencyTest {

    private val agreedNames = setOf(
        "DB_URL", "DB_USERNAME", "DB_PASSWORD",
        "LEGACY_JWT_ENABLED", "JWT_SECRET", "JWT_LIFETIME_MINUTES",
        "CLERK_AUTH_ENABLED", "CLERK_ISSUER", "CLERK_API_AUDIENCE", "CLERK_AUTHORIZED_PARTIES",
        "CLERK_SECRET_KEY", "CLERK_ALLOW_AUDIENCELESS",
        "APP_PUBLIC_ORIGIN", "API_GENERAL_PER_MINUTE", "API_SENSITIVE_PER_MINUTE",
        "API_WRITE_PER_MINUTE", "TRUSTED_PROXIES",
    )
    private val productionOnlyNames = setOf("PORT")
    private val retiredNames = setOf("CLERK_AUDIENCE", "PUBLIC_ORIGIN")

    private fun text(resource: String): String =
        requireNotNull(javaClass.getResource(resource)) { "$resource not on the classpath" }.readText()

    private fun properties(resource: String): Properties =
        Properties().apply { load(text(resource).reader()) }

    private fun placeholders(resource: String): Set<String> =
        Regex("""\$\{([A-Z][A-Z0-9_]*)""").findAll(text(resource)).map { it.groupValues[1] }.toSet()

    @Test
    fun `development configuration uses exactly the agreed variable names`() {
        assertEquals(agreedNames, placeholders("/application.properties"))
    }

    @Test
    fun `production configuration uses only agreed names and no retired ones`() {
        val names = placeholders("/application-prod.properties")
        assertEquals(emptySet<String>(), names - agreedNames - productionOnlyNames)
        assertEquals(emptySet<String>(), names intersect retiredNames)
    }

    @Test
    fun `legacy JWT is off by default and in production`() {
        assertEquals("\${LEGACY_JWT_ENABLED:false}", properties("/application.properties").getProperty("app.auth.legacy-jwt-enabled"))
        assertEquals("false", properties("/application-prod.properties").getProperty("app.auth.legacy-jwt-enabled"))
    }

    @Test
    fun `production does not require JWT_SECRET`() {
        assertFalse(properties("/application-prod.properties").containsKey("app.jwt.secret"))
        assertFalse("JWT_SECRET" in placeholders("/application-prod.properties"))
    }

    @Test
    fun `no Kotlin source defaults legacy JWT to enabled`() {
        val root = listOf(Path.of("src/main/kotlin"), Path.of("backend/src/main/kotlin")).firstOrNull { Files.isDirectory(it) }
        assertTrue(root != null, "Main sources not found from ${Path.of("").toAbsolutePath()}")
        val offenders = Files.walk(root!!).use { paths ->
            paths.filter { it.extension == "kt" && it.readText().contains("legacy-jwt-enabled:true") }.toList()
        }.map { it.fileName.toString() }
        assertEquals(emptyList<String>(), offenders)
    }
}
