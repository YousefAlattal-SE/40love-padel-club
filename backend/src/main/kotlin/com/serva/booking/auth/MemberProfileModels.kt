package com.serva.booking.auth

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Size
import java.time.Instant
import java.time.LocalDate

data class MemberProfileResponse(
    val email: String,
    val fullName: String,
    val phone: String?,
    val dateOfBirth: LocalDate?,
    val gender: String?,
    val skillLevel: String?,
    val memberSince: Instant,
    val accountStatus: String,
    val authProvider: String,
    val role: Role,
)

data class UpdateMemberProfileRequest(
    @field:NotBlank
    @field:Size(max = 255)
    val fullName: String,

    @field:Size(max = 40)
    val phone: String? = null,

    val dateOfBirth: LocalDate? = null,

    @field:Pattern(
        regexp = "^(|female|male|non_binary|prefer_not_to_say)$",
        message = "must be one of female, male, non_binary, or prefer_not_to_say",
    )
    val gender: String? = null,

    @field:Pattern(
        regexp = "^(|beginner|intermediate|advanced|open)$",
        message = "must be one of beginner, intermediate, advanced, or open",
    )
    val skillLevel: String? = null,
)

data class UpdateMemberPhoneRequest(
    @field:NotBlank
    @field:Size(max = 40)
    val phone: String,
)

data class MemberPhoneResponse(val phone: String)

fun User.toMemberProfileResponse() = MemberProfileResponse(
    email = email,
    fullName = fullName,
    phone = phone,
    dateOfBirth = dateOfBirth,
    gender = gender,
    skillLevel = skillLevel,
    memberSince = createdAt,
    accountStatus = if (isActive) "active" else "inactive",
    authProvider = if (clerkUserId == null) "legacy" else "clerk",
    role = role,
)
