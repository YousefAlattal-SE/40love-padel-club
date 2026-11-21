package com.serva.booking.auth

import jakarta.validation.Valid
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/profile")
class MemberProfileController(private val profiles: MemberProfileService) {

    @GetMapping
    fun get(@AuthenticationPrincipal user: AuthUser): MemberProfileResponse = profiles.get(user.id)

    @PatchMapping
    fun update(
        @AuthenticationPrincipal user: AuthUser,
        @Valid @RequestBody request: UpdateMemberProfileRequest,
    ): MemberProfileResponse = profiles.update(user.id, request)

    @PatchMapping("/phone")
    fun updatePhone(
        @AuthenticationPrincipal user: AuthUser,
        @Valid @RequestBody request: UpdateMemberPhoneRequest,
    ): MemberPhoneResponse = profiles.updatePhone(user.id, request.phone)
}
