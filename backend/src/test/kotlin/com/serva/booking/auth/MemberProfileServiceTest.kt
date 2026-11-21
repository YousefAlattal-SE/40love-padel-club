package com.serva.booking.auth

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test
import org.mockito.ArgumentMatchers.any
import org.mockito.Mockito.mock
import org.mockito.Mockito.never
import org.mockito.Mockito.verify
import org.mockito.Mockito.`when`
import org.springframework.http.HttpStatus
import org.springframework.web.server.ResponseStatusException
import java.time.LocalDate
import java.util.Optional

class MemberProfileServiceTest {
    private val users = mock(UserRepository::class.java)
    private val clerkProfiles = mock(ClerkProfileClient::class.java)
    private val service = MemberProfileService(users, clerkProfiles)

    @Test
    fun `updates application fields and Clerk identity using authenticated database user`() {
        val member = User(
            id = 19L,
            email = "member@example.test",
            clerkUserId = "user_clerk_19",
            fullName = "Old Name",
            phone = "+962790000000",
        )
        `when`(users.findById(19L)).thenReturn(Optional.of(member))
        `when`(users.save(any(User::class.java))).thenAnswer { it.getArgument<User>(0) }

        val updated = service.update(
            19L,
            UpdateMemberProfileRequest(
                fullName = "New Member",
                phone = "+962791111111",
                dateOfBirth = LocalDate.parse("1995-04-12"),
                gender = "prefer_not_to_say",
                skillLevel = "intermediate",
            ),
        )

        verify(clerkProfiles).updateProfile("user_clerk_19", "New Member")
        verify(users).save(member)
        assertEquals("member@example.test", updated.email)
        assertEquals("New Member", updated.fullName)
        assertEquals("+962791111111", updated.phone)
        assertEquals("intermediate", updated.skillLevel)
        assertEquals(Role.member, updated.role)
    }

    @Test
    fun `does not save profile when provider update fails`() {
        val member = User(id = 19L, email = "member@example.test", clerkUserId = "user_clerk_19")
        `when`(users.findById(19L)).thenReturn(Optional.of(member))
        org.mockito.Mockito.doThrow(ResponseStatusException(HttpStatus.BAD_GATEWAY, "failed"))
            .`when`(clerkProfiles).updateProfile("user_clerk_19", "New Member")

        assertThrows(ResponseStatusException::class.java) {
            service.update(19L, UpdateMemberProfileRequest(fullName = "New Member"))
        }

        verify(users, never()).save(any(User::class.java))
    }

    @Test
    fun `saves a contact phone to the authenticated member profile without updating Clerk`() {
        val member = User(id = 19L, email = "member@example.test", clerkUserId = "user_clerk_19")
        `when`(users.findById(19L)).thenReturn(Optional.of(member))
        `when`(users.save(any(User::class.java))).thenAnswer { it.getArgument<User>(0) }

        val saved = service.updatePhone(19L, "+962 79 111 2233")

        assertEquals("+962791112233", saved.phone)
        assertEquals("+962791112233", member.phone)
        verify(users).save(member)
        org.mockito.Mockito.verifyNoInteractions(clerkProfiles)
    }

    @Test
    fun `rejects an empty phone without changing the profile`() {
        val member = User(id = 19L, email = "member@example.test")
        `when`(users.findById(19L)).thenReturn(Optional.of(member))

        assertThrows(ResponseStatusException::class.java) { service.updatePhone(19L, " ") }

        assertNull(member.phone)
        verify(users, never()).save(any(User::class.java))
    }
}
