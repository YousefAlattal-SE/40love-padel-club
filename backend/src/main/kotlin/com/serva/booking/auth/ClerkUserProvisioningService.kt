package com.serva.booking.auth

import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.Locale

@Service
class ClerkUserProvisioningService(
    private val users: UserRepository,
    private val clerkProfiles: ClerkProfileClient,
) {

    @Transactional
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

        val user = users.save(
            User(
                email = email,
                clerkUserId = clerkUserId,
                passwordHash = null,
                fullName = profile.fullName,
                phone = normalizedPhone,
                role = Role.member,
            ),
        )
        return user.toResponse()
    }
}
