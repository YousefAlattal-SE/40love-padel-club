import java.io.IOException
import java.security.SecureRandom
import java.util.Base64
import java.util.concurrent.TimeUnit

plugins {
	kotlin("jvm") version "2.3.21"
	kotlin("plugin.spring") version "2.3.21"
	id("org.springframework.boot") version "4.1.2"
	id("io.spring.dependency-management") version "1.1.7"
	kotlin("plugin.jpa") version "2.3.21"
}

group = "com.serva"
version = "0.0.1-SNAPSHOT"

java {
	toolchain {
		languageVersion = JavaLanguageVersion.of(21)
	}
}

repositories {
	mavenCentral()
}

dependencies {
	implementation("org.springframework.boot:spring-boot-starter-data-jpa")
	implementation("org.springframework.boot:spring-boot-starter-flyway")
	implementation("org.springframework.boot:spring-boot-starter-security")
	implementation("org.springframework.boot:spring-boot-starter-oauth2-resource-server")
	implementation("org.springframework.boot:spring-boot-starter-validation")
	implementation("org.springframework.boot:spring-boot-starter-restclient")
	implementation("org.springframework.boot:spring-boot-starter-webmvc")
	implementation("org.flywaydb:flyway-database-postgresql")
	implementation("org.jetbrains.kotlin:kotlin-reflect")
	implementation("tools.jackson.module:jackson-module-kotlin")


	implementation("io.jsonwebtoken:jjwt-api:0.12.6")
	runtimeOnly("io.jsonwebtoken:jjwt-impl:0.12.6")
	runtimeOnly("io.jsonwebtoken:jjwt-jackson:0.12.6")

	implementation("org.postgresql:postgresql")
	testImplementation("org.springframework.boot:spring-boot-starter-data-jpa-test")
	testImplementation("org.springframework.boot:spring-boot-starter-flyway-test")
	testImplementation("org.springframework.boot:spring-boot-starter-security-test")
	testImplementation("org.springframework.boot:spring-boot-starter-validation-test")
	testImplementation("org.springframework.boot:spring-boot-starter-webmvc-test")
	testImplementation("org.jetbrains.kotlin:kotlin-test-junit5")
	testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}
kotlin {
	compilerOptions {
		freeCompilerArgs.addAll("-Xjsr305=strict", "-Xannotation-default-target=param-property")
	}
}

allOpen {
	annotation("jakarta.persistence.Entity")
	annotation("jakarta.persistence.MappedSuperclass")
	annotation("jakarta.persistence.Embeddable")
}

tasks.withType<Test> {
	useJUnitPlatform()
}

// ─── Test database isolation (T-1) ──────────────────────────────────────────────
// `gradlew test` never reaches a database: @DatabaseIntegrationTest classes are excluded by
// tag, the JVM-level gate is switched off, and database-related variables are removed from the
// forked test JVM. Only `gradlew databaseTest` may run them, and only after the target and
// the Docker identity of the disposable 127.0.0.1:55434 container have been verified here,
// before the test JVM starts. The test JVM repeats every check (DatabaseTestGate,
// TestDatabaseGuard), so IntelliJ runs that bypass Gradle are guarded as well.
val testDatabaseUrl = "jdbc:postgresql://127.0.0.1:55434/fortylove"
val testDatabaseContainer = "fortylove-automated-tests"
val forwardedTestDatabaseVariables = listOf(
	"FORTYLOVE_TEST_DB_URL",
	"FORTYLOVE_TEST_DB_USERNAME",
	"FORTYLOVE_TEST_DB_PASSWORD",
	"FORTYLOVE_TEST_CONTAINER_ID",
	"FORTYLOVE_TEST_SYSTEM_IDENTIFIER",
)
val scrubbedTestVariablePrefixes = listOf(
	"DB_", "SPRING_DATASOURCE_", "SPRING_FLYWAY_", "SPRING_SQL_INIT_", "SPRING_JPA_", "FLYWAY_", "PG", "FORTYLOVE_TEST_",
)

// Applied at configuration time so no later action can re-add these by accident.
tasks.withType<Test>().configureEach {
	environment.keys
		.filter { name -> scrubbedTestVariablePrefixes.any { name.uppercase().startsWith(it) } }
		.forEach { environment.remove(it) }
}

tasks.test {
	useJUnitPlatform { excludeTags("database") }
	systemProperty("fortylove.db-tests", "disabled")
}

fun runDockerReadOnly(vararg args: String): String {
	val process = try {
		ProcessBuilder(listOf("docker") + args).redirectErrorStream(true).start()
	} catch (e: IOException) {
		throw GradleException("Docker CLI is unavailable, so the disposable test database cannot be verified")
	}
	val output = process.inputStream.bufferedReader().readText()
	if (!process.waitFor(30, TimeUnit.SECONDS)) {
		process.destroyForcibly()
		throw GradleException("docker ${args.first()} timed out")
	}
	if (process.exitValue() != 0) throw GradleException("docker ${args.first()} failed")
	return output
}

fun verifyDisposableTestDatabase(task: Test) {
	val env = System.getenv()
	fun required(name: String): String =
		env[name]?.takeIf { it.isNotEmpty() } ?: throw GradleException("$name must be set for databaseTest")

	val url = required("FORTYLOVE_TEST_DB_URL")
	if (url != testDatabaseUrl) {
		val port = Regex(":(\\d+)(?=[/?,]|$)").find(url)?.groupValues?.get(1)
		val hint = when (port) {
			"5433" -> " (5433 is the protected original database fortylove-db)"
			"55433" -> " (55433 is the protected restore database)"
			else -> ""
		}
		throw GradleException("Refusing FORTYLOVE_TEST_DB_URL; only $testDatabaseUrl is allowed$hint")
	}
	if (required("FORTYLOVE_TEST_DB_USERNAME") != "fortylove_app") {
		throw GradleException("FORTYLOVE_TEST_DB_USERNAME must be fortylove_app")
	}
	required("FORTYLOVE_TEST_DB_PASSWORD")
	val containerId = required("FORTYLOVE_TEST_CONTAINER_ID")
	if (!Regex("^[0-9a-f]{64}$").matches(containerId)) {
		throw GradleException("FORTYLOVE_TEST_CONTAINER_ID must be the full 64-character id of $testDatabaseContainer")
	}
	if (!Regex("^[0-9]{1,20}$").matches(required("FORTYLOVE_TEST_SYSTEM_IDENTIFIER"))) {
		throw GradleException("FORTYLOVE_TEST_SYSTEM_IDENTIFIER must be numeric")
	}

	// Read-only Docker metadata. The test JVM additionally checks image, mounts and tmpfs.
	val identity = runDockerReadOnly(
		"inspect", "--type", "container", "--format", "{{.Id}}|{{.Name}}|{{.State.Running}}", containerId,
	).trim()
	if (identity != "$containerId|/$testDatabaseContainer|true") {
		throw GradleException("FORTYLOVE_TEST_CONTAINER_ID is not the running $testDatabaseContainer container")
	}
	val publishers = runDockerReadOnly("ps", "--no-trunc", "--format", "{{.ID}}|{{.Ports}}")
		.lines()
		.filter { it.substringAfter('|', "").contains(":55434->") }
		.map { it.substringBefore('|').trim() }
	if (publishers != listOf(containerId)) {
		throw GradleException("Port 55434 must be published by $testDatabaseContainer only")
	}

	forwardedTestDatabaseVariables.forEach { task.environment(it, env.getValue(it)) }
	// Legacy login tests need a signing key; a fresh random one is used per run and never stored.
	val key = ByteArray(64).also { SecureRandom().nextBytes(it) }
	task.environment("JWT_SECRET", Base64.getUrlEncoder().withoutPadding().encodeToString(key))
}

val databaseTest by tasks.registering(Test::class) {
	description = "Runs @DatabaseIntegrationTest classes against the disposable 127.0.0.1:55434 container only."
	group = "verification"
	testClassesDirs = sourceSets.test.get().output.classesDirs
	classpath = sourceSets.test.get().runtimeClasspath
	useJUnitPlatform { includeTags("database") }
	systemProperty("fortylove.db-tests", "enabled")
	shouldRunAfter(tasks.test)
	outputs.upToDateWhen { false }
	doFirst { verifyDisposableTestDatabase(this as Test) }
}

val frontendDir = layout.projectDirectory.dir("../frontend")
val frontendOutput = layout.buildDirectory.dir("generated/vite")
val buildFrontend by tasks.registering(Exec::class) {
	workingDir(frontendDir)
	val npm = if (System.getProperty("os.name").startsWith("Windows")) "npm.cmd" else "npm"
	commandLine(npm, "run", "build", "--", "--outDir", frontendOutput.get().asFile.absolutePath, "--emptyOutDir")
	outputs.dir(frontendOutput)
	// Vite also reads mode-specific .env files and build-time process variables.
	outputs.upToDateWhen { false }
}

// The old checked-in static snapshot is never an input to the runtime classpath.
sourceSets.main { resources.exclude("static/**") }
tasks.processResources {
	from(buildFrontend) { into("static") }
}
