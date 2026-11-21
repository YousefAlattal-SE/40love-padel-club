package com.serva.booking.auth

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Test
import org.mockito.ArgumentMatchers.any
import org.mockito.Mockito.mock
import org.mockito.Mockito.verify
import org.mockito.Mockito.verifyNoInteractions
import org.mockito.Mockito.`when`

class ClerkUserProvisioningServiceTest {
    private val users = mock(UserRepository::class.java)
    private val profiles = mock(ClerkProfileClient::class.java)
    private val service = ClerkUserProvisioningService(users, profiles)

    @Test
    fun `creates a member from server-verified Clerk profile only`() {
        `when`(users.findByClerkUserId("user_new")).thenReturn(null)
        `when`(profiles.getVerifiedProfile("user_new")).thenReturn(ClerkProfile("NEW@example.test", "New Member"))
        `when`(users.existsByEmail("new@example.test")).thenReturn(false)
        `when`(users.save(any(User::class.java))).thenAnswer { it.getArgument<User>(0) }

        val created = service.bootstrap("user_new", "+962 79 111 8877")

        assertEquals("new@example.test", created.email)
        assertEquals("New Member", created.fullName)
        assertEquals("+962791118877", created.phone)
        assertEquals(Role.member, created.role)
        val saved = org.mockito.ArgumentCaptor.forClass(User::class.java)
        verify(users).save(saved.capture())
        assertEquals("user_new", saved.value.clerkUserId)
        assertNull(saved.value.passwordHash)
        assertEquals(Role.member, saved.value.role)
    }

    @Test
    fun `does not link a Clerk identity to an existing email account`() {
        `when`(users.findByClerkUserId("user_new")).thenReturn(null)
        `when`(profiles.getVerifiedProfile("user_new")).thenReturn(ClerkProfile("old@example.test", "Someone"))
        `when`(users.existsByEmail("old@example.test")).thenReturn(true)

        assertThrows(EmailAlreadyUsedException::class.java) { service.bootstrap("user_new", "+962791118877") }
        verify(users, org.mockito.Mockito.never()).save(any(User::class.java))
    }

    @Test
    fun `provisions a new Clerk identity when no contact phone is provided`() {
        `when`(users.findByClerkUserId("user_new")).thenReturn(null)
        `when`(profiles.getVerifiedProfile("user_new")).thenReturn(ClerkProfile("NEW@example.test", "New Member"))
        `when`(users.existsByEmail("new@example.test")).thenReturn(false)
        `when`(users.save(any(User::class.java))).thenAnswer { it.getArgument<User>(0) }

        val created = service.bootstrap("user_new", null)

        assertEquals("new@example.test", created.email)
        assertNull(created.phone)
        assertEquals(Role.member, created.role)
        verify(users).save(any(User::class.java))
    }

    @Test
    fun `returns existing Clerk-linked account without refreshing profile or role`() {
        val existing = User(id = 31L, email = "admin@example.test", clerkUserId = "user_existing", role = Role.admin)
        `when`(users.findByClerkUserId("user_existing")).thenReturn(existing)

        // Existing Google/Clerk members retain access even when their historical row has no phone.
        val response = service.bootstrap("user_existing", null)

        assertEquals(Role.admin, response.role)
        verifyNoInteractions(profiles)
    }

    @Test
    fun `existing Google member can sign in without adding a phone`() {
        val existing = User(id = 32L, email = "google-member@example.test", clerkUserId = "user_google_member")
        `when`(users.findByClerkUserId("user_google_member")).thenReturn(existing)

        val response = service.bootstrap("user_google_member", null)

        assertEquals(Role.member, response.role)
        assertNull(response.phone)
        verifyNoInteractions(profiles)
    }
}
