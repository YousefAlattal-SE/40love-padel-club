package com.serva.booking.testsupport

import org.junit.jupiter.api.Tag
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.context.ContextConfiguration

/**
 * Marks a test that needs the disposable PostgreSQL database on 127.0.0.1:55434.
 *
 * - `@Tag("database")` keeps it out of the default `gradlew test` task.
 * - [DatabaseTestGate] skips it unless `gradlew databaseTest` enabled it, and verifies the
 *   target before Spring starts. (The gate is also auto-registered for every test class.)
 * - [TestDatabaseGuard] re-validates the resolved Spring configuration and the real
 *   connection pool settings before any connection is opened.
 *
 * `@SpringBootTest` is deliberately not included, so classes keep their own `properties`.
 */
@Target(AnnotationTarget.CLASS)
@Retention(AnnotationRetention.RUNTIME)
@MustBeDocumented
@Tag(DatabaseTestGate.DATABASE_TAG)
@ExtendWith(DatabaseTestGate::class)
@ActiveProfiles("test")
@ContextConfiguration(initializers = [TestDatabaseGuard::class])
annotation class DatabaseIntegrationTest
