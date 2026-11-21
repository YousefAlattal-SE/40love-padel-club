package com.serva.booking.config

import com.serva.booking.BookingRuleException
import com.serva.booking.auth.EmailAlreadyUsedException
import com.serva.booking.auth.InvalidCredentialsException
import com.serva.booking.booking.BookingNotFoundException
import com.serva.booking.booking.PhoneNumberRequiredException
import com.serva.booking.booking.SlotTakenException
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice

@Suppress("unused")
@RestControllerAdvice
class ApiExceptionHandler {

    private fun error(status: HttpStatus, message: String): ResponseEntity<Map<String, Any>> =
        ResponseEntity.status(status).body(mapOf("error" to message))

    // Rule violations (club closed, date too far ahead, too late to cancel, ...) -> 400
    @ExceptionHandler(BookingRuleException::class)
    fun handleRule(e: BookingRuleException) =
        error(HttpStatus.BAD_REQUEST, e.message ?: "Invalid request")

    // Bad form input (invalid email, short password, ...) -> 400 with a message per field
    @ExceptionHandler(MethodArgumentNotValidException::class)
    fun handleValidation(e: MethodArgumentNotValidException): ResponseEntity<Map<String, Any>> {
        val fields = e.bindingResult.fieldErrors.associate { it.field to (it.defaultMessage ?: "invalid") }
        return ResponseEntity.badRequest().body(mapOf("error" to "Validation failed", "fields" to fields))
    }

    @ExceptionHandler(EmailAlreadyUsedException::class)
    fun handleEmailUsed(e: EmailAlreadyUsedException) =
        error(HttpStatus.CONFLICT, e.message ?: "Conflict")

    @ExceptionHandler(SlotTakenException::class)
    fun handleSlotTaken(e: SlotTakenException) =
        error(HttpStatus.CONFLICT, e.message ?: "Conflict")

    @ExceptionHandler(PhoneNumberRequiredException::class)
    fun handlePhoneNumberRequired(e: PhoneNumberRequiredException): ResponseEntity<Map<String, Any>> =
        ResponseEntity.status(HttpStatus.CONFLICT).body(
            mapOf(
                "error" to "PHONE_NUMBER_REQUIRED",
                "code" to "PHONE_NUMBER_REQUIRED",
                "message" to (e.message ?: "A contact phone number is required to confirm this booking"),
            ),
        )

    @ExceptionHandler(InvalidCredentialsException::class)
    fun handleBadLogin(e: InvalidCredentialsException) =
        error(HttpStatus.UNAUTHORIZED, e.message ?: "Unauthorized")

    @ExceptionHandler(BookingNotFoundException::class)
    fun handleNotFound(e: BookingNotFoundException) =
        error(HttpStatus.NOT_FOUND, e.message ?: "Not found")

    // ─── Matchmaking exceptions ────────────────────────────────────────────────

    @ExceptionHandler(com.serva.booking.matchmaking.MatchNotFoundException::class)
    fun handleMatchNotFound(e: com.serva.booking.matchmaking.MatchNotFoundException) =
        error(HttpStatus.NOT_FOUND, e.message ?: "Not found")

    @ExceptionHandler(com.serva.booking.matchmaking.MatchReservationNotFoundException::class)
    fun handleReservationNotFound(e: com.serva.booking.matchmaking.MatchReservationNotFoundException) =
        error(HttpStatus.NOT_FOUND, e.message ?: "Not found")

    @ExceptionHandler(com.serva.booking.matchmaking.MatchFullException::class)
    fun handleMatchFull(e: com.serva.booking.matchmaking.MatchFullException) =
        error(HttpStatus.CONFLICT, e.message ?: "Match is full")

    @ExceptionHandler(com.serva.booking.matchmaking.AlreadyReservedException::class)
    fun handleAlreadyReserved(e: com.serva.booking.matchmaking.AlreadyReservedException) =
        error(HttpStatus.CONFLICT, e.message ?: "Already reserved")

    @ExceptionHandler(com.serva.booking.matchmaking.AlreadyOnWaitlistException::class)
    fun handleAlreadyOnWaitlist(e: com.serva.booking.matchmaking.AlreadyOnWaitlistException) =
        error(HttpStatus.CONFLICT, e.message ?: "Already on waitlist")

    @ExceptionHandler(com.serva.booking.matchmaking.CancellationTooLateException::class)
    fun handleCancellationTooLate(e: com.serva.booking.matchmaking.CancellationTooLateException) =
        error(HttpStatus.BAD_REQUEST, e.message ?: "Cancellation deadline passed")
}
