package com.serva.booking.testsupport

import org.junit.jupiter.api.extension.ConditionEvaluationResult
import org.junit.jupiter.api.extension.ExecutionCondition
import org.junit.jupiter.api.extension.ExtensionContext
import org.springframework.core.annotation.MergedAnnotations

/**
 * JUnit gate evaluated before the Spring extension creates any application context, so a
 * refusal here happens before any DataSource exists.
 *
 * It is registered for every test class through JUnit extension auto-detection
 * (`junit-platform.properties` + `META-INF/services`), which is honoured by Gradle and by
 * IntelliJ's own JUnit runner alike. It does not depend on a test being annotated correctly:
 *
 * - A Spring test that can create a DataSource but lacks [DatabaseIntegrationTest] fails.
 * - A [DatabaseIntegrationTest] is skipped unless the JVM was started with
 *   `-Dfortylove.db-tests=enabled` (set only by `gradlew databaseTest`).
 * - When enabled, the target, the environment and the Docker identity are verified first.
 */
class DatabaseTestGate : ExecutionCondition {

    override fun evaluateExecutionCondition(context: ExtensionContext): ConditionEvaluationResult {
        val testClass = context.testClass.orElse(null) ?: return ConditionEvaluationResult.enabled("no test class")
        return decide(testClass, System.getProperty(SWITCH_PROPERTY), System.getenv()) { containerId ->
            verifiedContainers.computeIfAbsent(containerId) { DockerIdentity.verifyLive(it); true }
        }
    }

    companion object {
        const val SWITCH_PROPERTY = "fortylove.db-tests"
        const val ENABLED = "enabled"
        const val DATABASE_TAG = "database"

        const val ENV_URL = "FORTYLOVE_TEST_DB_URL"
        const val ENV_USERNAME = "FORTYLOVE_TEST_DB_USERNAME"
        const val ENV_PASSWORD = "FORTYLOVE_TEST_DB_PASSWORD"
        const val ENV_CONTAINER_ID = "FORTYLOVE_TEST_CONTAINER_ID"
        const val ENV_SYSTEM_IDENTIFIER = "FORTYLOVE_TEST_SYSTEM_IDENTIFIER"

        /** Variables that would redirect Spring or the PostgreSQL driver away from the guarded settings. */
        private val FORBIDDEN_ENV_PREFIXES = listOf("SPRING_DATASOURCE_", "SPRING_FLYWAY_", "SPRING_SQL_INIT_", "FLYWAY_", "PG")
        private val FORBIDDEN_ENV_NAMES = setOf("DB_URL", "DB_USERNAME", "DB_PASSWORD", "SPRING_JPA_HIBERNATE_DDL_AUTO")

        /** Spring test annotations that can create a DataSource. Matched by simple name to cover Boot module moves. */
        private val DATABASE_CAPABLE_ANNOTATIONS = setOf(
            "SpringBootTest", "DataJpaTest", "JdbcTest", "DataJdbcTest", "JooqTest", "DataR2dbcTest",
        )

        private val verifiedContainers = java.util.concurrent.ConcurrentHashMap<String, Boolean>()

        fun isDatabaseCapable(testClass: Class<*>): Boolean =
            MergedAnnotations.from(testClass, MergedAnnotations.SearchStrategy.TYPE_HIERARCHY)
                .stream()
                .anyMatch { it.type.simpleName in DATABASE_CAPABLE_ANNOTATIONS }

        fun isMarked(testClass: Class<*>): Boolean =
            MergedAnnotations.from(testClass, MergedAnnotations.SearchStrategy.TYPE_HIERARCHY)
                .isPresent(DatabaseIntegrationTest::class.java)

        /** Pure decision logic; [verifyContainer] is the only side effect and is injected for tests. */
        fun decide(
            testClass: Class<*>,
            switch: String?,
            env: Map<String, String>,
            verifyContainer: (String) -> Unit,
        ): ConditionEvaluationResult {
            val marked = isMarked(testClass)
            if (!marked) {
                if (isDatabaseCapable(testClass)) {
                    throw UnsafeTestDatabaseException(
                        "${testClass.name} can open a database connection but is not annotated @DatabaseIntegrationTest",
                    )
                }
                return ConditionEvaluationResult.enabled("not a database test")
            }

            if (switch != ENABLED) {
                return ConditionEvaluationResult.disabled(
                    "Database tests run only through 'gradlew databaseTest' against the disposable 55434 container",
                )
            }

            val forbidden = env.keys.map { it.uppercase() }
                .filter { name -> name in FORBIDDEN_ENV_NAMES || FORBIDDEN_ENV_PREFIXES.any { name.startsWith(it) } }
                .sorted()
            if (forbidden.isNotEmpty()) {
                throw UnsafeTestDatabaseException("Remove these environment variables before database tests: $forbidden")
            }

            TestDatabaseTarget.requireSafe(env[ENV_URL], env[ENV_USERNAME])
            if (env[ENV_PASSWORD].isNullOrEmpty()) throw UnsafeTestDatabaseException("$ENV_PASSWORD is not set")
            TestDatabaseTarget.requireSystemIdentifier(env[ENV_SYSTEM_IDENTIFIER])
            val containerId = env[ENV_CONTAINER_ID]
            TestDatabaseTarget.requireContainerId(containerId)
            verifyContainer(containerId!!)
            return ConditionEvaluationResult.enabled("disposable test database verified")
        }
    }
}
