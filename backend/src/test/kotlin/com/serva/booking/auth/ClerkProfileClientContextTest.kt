package com.serva.booking.auth

import org.junit.jupiter.api.Test
import org.springframework.boot.autoconfigure.AutoConfigurations
import org.springframework.boot.restclient.autoconfigure.RestClientAutoConfiguration
import org.springframework.boot.test.context.runner.ApplicationContextRunner
import org.springframework.web.client.RestClient
import kotlin.test.assertNotNull

class ClerkProfileClientContextTest {
    private val contextRunner = ApplicationContextRunner()
        .withConfiguration(AutoConfigurations.of(RestClientAutoConfiguration::class.java))
        .withUserConfiguration(ClerkProfileClient::class.java)

    @Test
    fun `Boot provides the configured RestClient builder required by Clerk profile client`() {
        contextRunner.run { context ->
            assertNotNull(context.getBean(RestClient.Builder::class.java))
            assertNotNull(context.getBean(ClerkProfileClient::class.java))
        }
    }
}
