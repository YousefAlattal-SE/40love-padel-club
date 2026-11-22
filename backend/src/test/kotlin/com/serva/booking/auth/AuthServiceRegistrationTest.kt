package com.serva.booking.auth

import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity
import org.springframework.test.web.client.MockRestServiceServer
import org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo
import org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.*
import org.springframework.test.web.servlet.setup.MockMvcBuilders
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.client.RestClient
import org.springframework.web.context.WebApplicationContext
import org.springframework.web.server.ResponseStatusException

@SpringBootTest
@Transactional
class AuthServiceRegistrationTest @Autowired constructor(
    context: WebApplicationContext,
    private val users: UserRepository,
    private val passwords: PasswordEncoder,
    private val auth: AuthService,
) {
    private val mvc = MockMvcBuilders.webAppContextSetup(context)
        .apply<org.springframework.test.web.servlet.setup.DefaultMockMvcBuilder>(springSecurity()).build()

    @Test
    fun `no caller can claim an address through the retired registration route`() {
        val email = "unused@example.test"
        fun request() = post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
            .content("""{"email":"$email","password":"fixture-password","fullName":"Fixture Member"}""")
        mvc.perform(request()).andExpect(status().isUnauthorized)
        mvc.perform(request().with(user("member").roles("MEMBER"))).andExpect(status().isNotFound)
        mvc.perform(post("/api/auth/bootstrap")).andExpect(status().isUnauthorized)
        assertFalse(users.existsByEmail(email))
    }

    @Test
    fun `Clerk onboarding requires the primary address itself to be verified`() {
        val builder = RestClient.builder()
        val server = MockRestServiceServer.bindTo(builder).build()
        val service = ClerkUserProvisioningService(users, ClerkProfileClient(builder, "test-only"))
        val email = "primary@example.test"
        fun reply(subject: String, verification: String) {
            server.expect(requestTo("https://api.clerk.com/v1/users/$subject")).andRespond(withSuccess(
                """{"primary_email_address_id":"primary","email_addresses":[
                    {"id":"secondary","email_address":"other@example.test","verification":{"status":"verified"}},
                    {"id":"primary","email_address":"$email","verification":{"status":"$verification"}}
                ],"first_name":"Fixture"}""", MediaType.APPLICATION_JSON))
        }
        reply("subject-one", "unverified")
        val rejected = assertThrows(ResponseStatusException::class.java) { service.bootstrap("subject-one", null) }
        assertEquals(HttpStatus.FORBIDDEN, rejected.statusCode)
        assertFalse(users.existsByEmail(email))
        server.verify()
        server.reset()
        reply("subject-one", "verified")
        val created = service.bootstrap("subject-one", null)
        assertEquals(Role.member, created.role)
        assertEquals(email, created.email)
        assertNull(users.findByEmail(email)?.passwordHash)
        assertEquals(created.id, service.bootstrap("subject-one", null).id)
        server.verify()
        server.reset()
        reply("subject-two", "verified")
        assertThrows(EmailAlreadyUsedException::class.java) { service.bootstrap("subject-two", null) }
        assertEquals("subject-one", users.findByEmail(email)?.clerkUserId)
        assertNull(users.findByClerkUserId("subject-two"))
        server.verify()
    }

    @Test
    fun `existing legacy passwords still issue tokens with the database role`() {
        for (role in listOf(Role.member, Role.admin)) {
            val email = "${role.name}@example.test"
            val password = "local-fixture-password"
            users.saveAndFlush(User(email = email, passwordHash = passwords.encode(password), role = role))
            val token = auth.login(LoginRequest(email, password)).token
            mvc.perform(get("/api/auth/me").header("Authorization", "Bearer $token"))
                .andExpect(status().isOk).andExpect(jsonPath("$.role").value(role.name))
            val expected = if (role == Role.admin) status().isOk else status().isForbidden
            mvc.perform(get("/api/admin/overview").header("Authorization", "Bearer $token")).andExpect(expected)
            assertNull(users.findByEmail(email)?.clerkUserId)
        }
    }
}
