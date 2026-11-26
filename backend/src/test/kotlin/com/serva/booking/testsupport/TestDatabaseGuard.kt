package com.serva.booking.testsupport

import com.zaxxer.hikari.HikariDataSource
import org.springframework.beans.factory.config.BeanPostProcessor
import org.springframework.context.ApplicationContextInitializer
import org.springframework.context.ConfigurableApplicationContext
import org.springframework.core.env.ConfigurableEnvironment
import org.springframework.core.env.EnumerablePropertySource
import javax.sql.DataSource

/**
 * Second, Spring-level line of defence (after [DatabaseTestGate]). Runs before the context is
 * refreshed, so it sees the final property values after every override (environment
 * variables, `@SpringBootTest(properties)`, profile files) but before any bean exists.
 *
 * It also registers [PoolTargetCheck], which inspects each real DataSource after property
 * binding and before the lazily started Hikari pool opens its first connection.
 */
class TestDatabaseGuard : ApplicationContextInitializer<ConfigurableApplicationContext> {

    override fun initialize(context: ConfigurableApplicationContext) {
        validate(context.environment)
        context.addBeanFactoryPostProcessor { beanFactory -> beanFactory.addBeanPostProcessor(PoolTargetCheck()) }
    }

    companion object {
        /** Alternative ways to point Spring at a database or to make it write schema/data on start-up. */
        private val FORBIDDEN_PROPERTY_PREFIXES = listOf(
            "spring.datasource.hikari.jdbc-url",
            "spring.datasource.hikari.jdbcurl",
            "spring.datasource.hikari.data-source-properties",
            "spring.datasource.hikari.data-source-class-name",
            "spring.datasource.hikari.data-source-j-n-d-i",
            "spring.datasource.jndi-name",
            "spring.datasource.driver-class-name",
            "spring.datasource.type",
            "spring.flyway.url",
            "spring.flyway.user",
            "spring.flyway.password",
            "spring.liquibase",
            "spring.sql.init.schema-locations",
            "spring.sql.init.data-locations",
        )

        fun validate(environment: ConfigurableEnvironment) {
            val profiles = environment.activeProfiles.map { it.lowercase() }
            if ("test" !in profiles) throw UnsafeTestDatabaseException("Database tests require the 'test' profile")
            if (profiles.any { it == "prod" || it == "production" }) {
                throw UnsafeTestDatabaseException("Database tests must never run with a production profile")
            }

            TestDatabaseTarget.requireSafe(
                environment.getProperty("spring.datasource.url"),
                environment.getProperty("spring.datasource.username"),
            )
            TestDatabaseTarget.requireSystemIdentifier(environment.getProperty(DatabaseTestGate.ENV_SYSTEM_IDENTIFIER))

            requireValue(environment, "spring.flyway.enabled", setOf("false"))
            requireValue(environment, "spring.sql.init.mode", setOf("never"))
            requireValue(environment, "spring.jpa.hibernate.ddl-auto", setOf("validate", "none"))

            // Enumerated names catch prefixed keys; containsProperty also resolves the relaxed
            // environment-variable form (for example SPRING_DATASOURCE_HIKARI_JDBC_URL).
            val forbidden = (
                propertyNames(environment).filter { name -> FORBIDDEN_PROPERTY_PREFIXES.any { name.lowercase().startsWith(it) } } +
                    FORBIDDEN_PROPERTY_PREFIXES.filter { environment.containsProperty(it) }
                ).toSortedSet()
            if (forbidden.isNotEmpty()) {
                throw UnsafeTestDatabaseException("These properties are not allowed in database tests: $forbidden")
            }
        }

        private fun requireValue(environment: ConfigurableEnvironment, name: String, allowed: Set<String>) {
            val value = environment.getProperty(name)?.trim()?.lowercase()
            if (value !in allowed) throw UnsafeTestDatabaseException("$name must be one of $allowed in database tests")
        }

        private fun propertyNames(environment: ConfigurableEnvironment): Set<String> =
            environment.propertySources
                .filterIsInstance<EnumerablePropertySource<*>>()
                .flatMap { it.propertyNames.asList() }
                .toSet()
    }

    /** Checks the bound pool settings; a Hikari pool does not connect until first use. */
    class PoolTargetCheck : BeanPostProcessor {
        override fun postProcessAfterInitialization(bean: Any, beanName: String): Any {
            if (bean !is DataSource) return bean
            if (bean !is HikariDataSource) {
                throw UnsafeTestDatabaseException("DataSource '$beanName' is not the guarded Hikari pool")
            }
            TestDatabaseTarget.requireSafe(bean.jdbcUrl, bean.username)
            if (bean.dataSourceClassName != null || bean.dataSource != null || bean.dataSourceJNDI != null ||
                !bean.dataSourceProperties.isEmpty()
            ) {
                throw UnsafeTestDatabaseException("DataSource '$beanName' uses an unguarded connection source")
            }
            return bean
        }
    }
}
