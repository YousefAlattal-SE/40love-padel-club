package com.serva.booking.auth

import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.server.ResponseStatusException
import java.time.LocalDate

@Service
class MemberProfileService(
    private val users: UserRepository,
    private val clerkProfiles: ClerkProfileClient,
) {

    @Transactional(readOnly = true)
    fun get(userId: Long): MemberProfileResponse = requireActiveUser(userId).toMemberProfileResponse()

    @Transactional
    fun update(userId: Long, request: UpdateMemberProfileRequest): MemberProfileResponse {
        val member = requireActiveUser(userId)
        val fullName = request.fullName.trim()
        if (fullName.isBlank()) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Full name is required")
        }
        if (request.dateOfBirth?.isAfter(LocalDate.now()) == true) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Date of birth cannot be in the future")
        }

        val phone = ContactPhone.normalizeOptional(request.phone)

        // Keep identity-owned names synced to Clerk, while contact phone remains app data.
        member.clerkUserId?.let { clerkProfiles.updateProfile(it, fullName) }

        member.fullName = fullName
        member.phone = phone
        member.dateOfBirth = request.dateOfBirth
        member.gender = request.gender?.ifBlank { null }
        member.skillLevel = request.skillLevel?.ifBlank { null }
        return users.save(member).toMemberProfileResponse()
    }

    @Transactional
    fun updatePhone(userId: Long, value: String): MemberPhoneResponse {
        val member = requireActiveUser(userId)
        val phone = ContactPhone.normalizeRequired(value)
        member.phone = phone
        users.save(member)
        return MemberPhoneResponse(phone)
    }

    private fun requireActiveUser(userId: Long): User {
        val member = users.findById(userId).orElseThrow { InvalidCredentialsException() }
        if (!member.isActive) throw InvalidCredentialsException()
        return member
    }
}
