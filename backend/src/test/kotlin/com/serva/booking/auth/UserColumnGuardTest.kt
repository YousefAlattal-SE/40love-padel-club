package com.serva.booking.auth

import jakarta.persistence.Column
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * Item 3.1a: the application must never write a user's role or active state, even if a future
 * code path saves a modified entity. Reads the JPA mapping only; no database is involved.
 */
class UserColumnGuardTest {

    private fun column(field: String): Column =
        User::class.java.getDeclaredField(field).getAnnotation(Column::class.java)
            ?: error("$field has no @Column mapping")

    @Test
    fun `role and active state are inserted once and never updated by the application`() {
        for (field in listOf("role", "isActive")) {
            assertFalse(column(field).updatable, "$field must not be updatable")
            assertTrue(column(field).insertable, "$field must still be written for new members")
        }
    }

    @Test
    fun `self-service profile fields remain updatable`() {
        for (field in listOf("fullName", "dateOfBirth", "skillLevel")) {
            assertTrue(column(field).updatable, "$field must stay updatable")
        }
    }
}
