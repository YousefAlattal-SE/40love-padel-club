package com.serva.booking.auth

import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.StandardOpenOption
import java.security.SecureRandom
import java.util.Base64

/**
 * Keeps the legacy JWT filter usable in local development without checking a secret into
 * the project. Production deployments must provide JWT_SECRET explicitly.
 */
internal object JwtSecretResolver {
    private const val LOCAL_SECRET_FILE = ".fortylove/local-jwt-secret"
    private val productionProfiles = setOf("prod", "production")

    fun resolve(configuredSecret: String, activeProfiles: String, userHome: Path): String {
        if (configuredSecret.isNotBlank()) return configuredSecret

        val profiles = activeProfiles.split(',').map { it.trim().lowercase() }.toSet()
        check(profiles.intersect(productionProfiles).isEmpty()) {
            "JWT_SECRET must be configured when the prod or production profile is active"
        }

        return loadOrCreateLocalSecret(userHome.resolve(LOCAL_SECRET_FILE))
    }

    private fun loadOrCreateLocalSecret(secretPath: Path): String {
        Files.createDirectories(secretPath.parent)
        if (Files.exists(secretPath)) return readSecret(secretPath)

        val randomBytes = ByteArray(64).also(SecureRandom()::nextBytes)
        val generatedSecret = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes)
        return try {
            Files.writeString(secretPath, generatedSecret, StandardOpenOption.CREATE_NEW, StandardOpenOption.WRITE)
            generatedSecret
        } catch (_: java.nio.file.FileAlreadyExistsException) {
            // Another local backend process may have created the persistent key at the same time.
            readSecret(secretPath)
        }
    }

    private fun readSecret(secretPath: Path): String {
        val secret = Files.readString(secretPath).trim()
        check(secret.length >= 32) {
            "The local JWT secret file is invalid; remove it so a new local key can be generated"
        }
        return secret
    }
}
