package com.serva.booking.court

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query

@Suppress("EnumEntryName")
enum class Sport { padel }

@Entity
@Table(name = "courts")
class Court(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    val name: String = "",

    val sport: String = Sport.padel.name,

    @Column(name = "legacy_sport")
    val legacySport: String? = null,

    @Column(name = "is_available")
    val isAvailable: Boolean = true,
)

interface CourtRepository : JpaRepository<Court, Long> {
    @Query("SELECT c FROM Court c WHERE c.sport = 'padel' AND c.legacySport IS NULL ORDER BY c.id")
    fun findPadelCourts(): List<Court>
}
