package com.serva.booking.config

import jakarta.servlet.http.HttpServletRequestWrapper
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.mock.web.MockHttpServletRequest
import org.springframework.mock.web.MockHttpServletResponse
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.*
import org.springframework.test.web.servlet.setup.DefaultMockMvcBuilder
import org.springframework.test.web.servlet.setup.MockMvcBuilders
import org.springframework.transaction.annotation.Transactional
import com.serva.booking.testsupport.DatabaseIntegrationTest
import org.springframework.web.context.WebApplicationContext
import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset

@DatabaseIntegrationTest
@SpringBootTest(properties = ["app.public-origin=https://club.example.test"])
@Transactional
class ApiBoundsTest(@Autowired context: WebApplicationContext, @Autowired private val jdbc: JdbcTemplate) {
    private val mvc = MockMvcBuilders.webAppContextSetup(context).apply<DefaultMockMvcBuilder>(springSecurity()).build()

    @Test
    fun `staff search pages are bounded and stable`() {
        for (i in 1..3) jdbc.update("INSERT INTO users(full_name,email) VALUES (?,?)", "PageFixture", "page$i@example.test")
        fun page(n: Int) = post("/api/admin/customers").with(user("staff").roles("ADMIN"))
            .contentType("application/json").content("""{"search":"PageFixture"}""").param("size","1").param("page",n.toString())
        mvc.perform(page(0)).andExpect(status().isOk).andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].email").value("page3@example.test"))
        mvc.perform(page(1)).andExpect(status().isOk).andExpect(jsonPath("$[0].email").value("page2@example.test"))
        for (size in listOf("0","101")) mvc.perform(get("/api/matches").param("size",size)).andExpect(status().isBadRequest)
    }

    @Test
    fun `same-origin works and untrusted API preflight is denied`() {
        mvc.perform(get("/api/matches").secure(true).with { it.scheme = "https"; it.serverPort = 443; it }.header("Origin","https://localhost"))
            .andExpect(status().isOk).andExpect(header().exists("Strict-Transport-Security"))
            .andExpect(header().string("Referrer-Policy","same-origin"))
            .andExpect(header().exists("Content-Security-Policy"))
        mvc.perform(options("/api/matches").header("Origin","https://club.example.test")
            .header("Access-Control-Request-Method","GET").header("Access-Control-Request-Headers","Authorization"))
            .andExpect(status().isOk).andExpect(header().string("Access-Control-Allow-Origin","https://club.example.test"))
        mvc.perform(options("/api/matches").header("Origin","https://elsewhere.example")
            .header("Access-Control-Request-Method","GET")).andExpect(status().isForbidden)
            .andExpect(header().doesNotExist("Access-Control-Allow-Origin"))
        mvc.perform(get("/api/matches").header("Origin","https://elsewhere.example")).andExpect(status().isForbidden)
    }

    @Test
    fun `limits declared and streaming bodies and repeated login requests`() {
        mvc.perform(post("/api/contact-messages").contentType("application/json").content(ByteArray(32769)))
            .andExpect(status().`is`(413))
        val filter = ApiLimitsFilter(Clock.fixed(Instant.EPOCH, ZoneOffset.UTC))
        val raw = MockHttpServletRequest("POST","/api/contact-messages").apply { setContent(ByteArray(32769)) }
        val streaming = object : HttpServletRequestWrapper(raw) { override fun getContentLengthLong() = -1L }
        val response = MockHttpServletResponse()
        filter.doFilter(streaming, response) { _, _ -> error("Oversized body reached controller") }
        assertEquals(413,response.status)
        repeat(21) { index ->
            val login = MockHttpServletRequest("POST","/api/auth/login").apply {
                setContent(byteArrayOf())
                addHeader("X-Forwarded-For","192.0.2.$index")
            }
            val result = MockHttpServletResponse()
            filter.doFilter(login,result) { _, _ -> assertTrue(index < 20) }
            assertEquals(if (index < 20) 200 else 429,result.status)
            if (index == 20) assertEquals("60",result.getHeader("Retry-After"))
        }
    }
}
