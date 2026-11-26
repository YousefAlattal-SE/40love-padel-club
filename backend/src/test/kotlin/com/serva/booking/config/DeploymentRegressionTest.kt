package com.serva.booking.config

import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity
import org.springframework.test.web.servlet.setup.MockMvcBuilders
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.*
import org.springframework.transaction.annotation.Transactional
import com.serva.booking.testsupport.DatabaseIntegrationTest
import org.springframework.web.context.WebApplicationContext

@DatabaseIntegrationTest
@SpringBootTest
@Transactional
class DeploymentRegressionTest(@Autowired context: WebApplicationContext) {
    private val mvc = MockMvcBuilders.webAppContextSetup(context)
        .apply<org.springframework.test.web.servlet.setup.DefaultMockMvcBuilder>(springSecurity()).build()

    @Test
    fun `direct links and refresh forward only registered SPA routes`() {
        val routes = listOf("courts","pricing","gallery","contact","book","bookings","matchmaking","my-matchmaking",
            "profile","login","register","terms-of-service","privacy-policy","admin","admin/login","admin/courts",
            "admin/pricing","admin/bookings","admin/customers","admin/messages","admin/matchmaking")
        for (route in routes) {
            repeat(2) { mvc.perform(get("/$route").accept("text/html")).andExpect(forwardedUrl("/index.html")) }
        }
        for (path in listOf("/assets/missing.js","/missing","/admin/unknown","/missing.ico")) {
            mvc.perform(get(path)).andExpect(status().isNotFound)
        }
        mvc.perform(get("/api/missing").with(user("member").roles("MEMBER"))).andExpect(status().isNotFound)
    }

    @Test
    fun `private match collections enforce authentication and roles`() {
        for (path in listOf("/api/matches/my-reservations","/api/matches/my-waitlist")) {
            mvc.perform(get(path)).andExpect(status().isUnauthorized)
            mvc.perform(get(path).header("Authorization","Bearer invalid")).andExpect(status().isUnauthorized)
            mvc.perform(get(path).with(user("guest").roles("GUEST"))).andExpect(status().isForbidden)
        }
        mvc.perform(get("/api/matches")).andExpect(status().isOk)
    }

    @Test
    fun `contact phone is required and accepts local and international formatting`() {
        fun submit(phone: String) = mvc.perform(post("/api/contact-messages").contentType("application/json")
            .content("""{"phone":"$phone","name":"QA Contact","sport":"padel","message":"Disposable regression test"}"""))
        for (phone in listOf("", "not-a-phone", "123", "1234567890123456")) {
            submit(phone).andExpect(status().isBadRequest).andExpect(jsonPath("$.detail").isNotEmpty)
        }
        for ((phone, normalized) in mapOf("٠٧٩ ١٢٣ ٤٥٦٧" to "0791234567", "+962 79-123-4567" to "+962791234567",
            "+1 (202) 555-0100" to "+12025550100")) {
            submit(phone).andExpect(status().isOk).andExpect(jsonPath("$.phone").value(normalized))
        }
    }
}
