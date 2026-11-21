package com.serva.booking.auth

import org.springframework.beans.factory.annotation.Value
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Component
import org.springframework.web.client.RestClient
import org.springframework.web.client.RestClientException
import org.springframework.web.server.ResponseStatusException
import java.util.Locale

data class ClerkProfile(val email: String, val fullName: String)

@Component
class ClerkProfileClient(
    restClientBuilder: RestClient.Builder,
    @Value($$"${app.clerk.secret-key:}") private val secretKey: String,
) {
    private val client = restClientBuilder.baseUrl("https://api.clerk.com/v1").build()

    fun getVerifiedProfile(clerkUserId: String): ClerkProfile {
        requireConfigured()

        val user: Map<*, *> = try {
            client.get()
                .uri("/users/{userId}", clerkUserId)
                .header(HttpHeaders.AUTHORIZATION, "Bearer $secretKey")
                .retrieve()
                .body(Map::class.java)
        } catch (_: RestClientException) {
            throw ResponseStatusException(HttpStatus.BAD_GATEWAY, "Could not retrieve the verified Clerk profile")
        } ?: throw ResponseStatusException(HttpStatus.BAD_GATEWAY, "Clerk returned an empty user profile")

        val primaryEmailId = user["primary_email_address_id"] as? String ?: ""
        val emailAddresses = user["email_addresses"] as? List<*> ?: emptyList<Any>()
        val primaryEmail = emailAddresses
            .filterIsInstance<Map<*, *>>()
            .firstOrNull { it["id"] == primaryEmailId }
        val verification = primaryEmail?.get("verification") as? Map<*, *>

        if (primaryEmail == null || verification?.get("status") != "verified") {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "A verified primary Clerk email is required")
        }

        val email = (primaryEmail["email_address"] as? String).orEmpty().trim().lowercase(Locale.ROOT)
        if (email.isBlank()) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "A verified primary Clerk email is required")
        }

        val fullName = listOf("first_name", "last_name")
            .map { (user[it] as? String).orEmpty().trim() }
            .filter(String::isNotBlank)
            .joinToString(" ")
            .ifBlank { email.substringBefore('@') }

        return ClerkProfile(email, fullName)
    }

    /** Update identity-owned fields through Clerk's Backend API. App contact data stays in our database. */
    fun updateProfile(clerkUserId: String, fullName: String) {
        requireConfigured()
        val names = fullName.trim().split(Regex("\\s+"), limit = 2)
        val identityUpdate = linkedMapOf<String, Any?>(
            "first_name" to names.first(),
            "last_name" to names.getOrNull(1).orEmpty(),
        )

        try {
            client.patch()
                .uri("/users/{userId}", clerkUserId)
                .header(HttpHeaders.AUTHORIZATION, "Bearer $secretKey")
                .body(identityUpdate)
                .retrieve()
                .toBodilessEntity()
        } catch (_: RestClientException) {
            throw ResponseStatusException(HttpStatus.BAD_GATEWAY, "Could not update the Clerk profile")
        }
    }

    private fun requireConfigured() {
        if (secretKey.isBlank()) {
            throw ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Clerk profile provisioning is not configured")
        }
    }
}
