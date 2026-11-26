package com.serva.booking.auth

import org.springframework.dao.DataIntegrityViolationException
import org.springframework.stereotype.Service
import java.util.Locale

@Service
class ClerkUserProvisioningService(
    private val users: UserRepository,
    private val clerkProfiles: ClerkProfileClient,
) {

    /**
     * Deliberately not @Transactional: each repository call runs in its own transaction, so no
     * database transaction is held open during the Clerk Backend API call, and a unique-constraint
     * failure from a concurrent first bootstrap can be followed by a fresh read (item 1.2).
     * The database unique constraints on clerk_user_id and email remain the authoritative guard.
     */
    fun bootstrap(clerkUserId: String, contactPhone: String?): UserResponse {
        users.findByClerkUserId(clerkUserId)?.let { existing ->
            if (!existing.isActive) throw InvalidCredentialsException()
            return existing.toResponse()
        }

        val normalizedPhone = ContactPhone.normalizeOptional(contactPhone)

        val profile = clerkProfiles.getVerifiedProfile(clerkUserId)
        val email = profile.email.trim().lowercase(Locale.ROOT)

        // Never link by email: the Clerk subject is the only identity key.
        if (users.existsByEmail(email)) throw EmailAlreadyUsedException()

        val user = try {
            users.save(
                User(
                    email = email,
                    clerkUserId = clerkUserId,
                    passwordHash = null,
                    fullName = profile.fullName,
                    phone = normalizedPhone,
                    role = Role.member,
                ),
            )
        } catch (_: DataIntegrityViolationException) {
            // A concurrent request for the same subject won the insert: return that account.
            // Otherwise another identity holds this email, which is never linked.
            val winner = users.findByClerkUserId(clerkUserId) ?: throw EmailAlreadyUsedException()
            if (!winner.isActive) throw InvalidCredentialsException()
            winner
        }
        return user.toResponse()
    }
}
