package com.serva.booking.config

import com.serva.booking.testsupport.DatabaseIntegrationTest
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.HttpMethod
import org.springframework.http.MediaType
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request
import org.springframework.test.web.servlet.request.RequestPostProcessor
import org.springframework.test.web.servlet.setup.DefaultMockMvcBuilder
import org.springframework.test.web.servlet.setup.MockMvcBuilders
import org.springframework.web.bind.annotation.RequestMethod
import org.springframework.web.context.WebApplicationContext
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping

/**
 * Item 9.2: every admin route, discovered from the live handler mappings, rejects anonymous
 * callers (401) and ordinary members (403). New admin routes are covered automatically.
 * Requests are rejected by the security filter chain before any controller runs, so nothing
 * is written to the database.
 */
@DatabaseIntegrationTest
@SpringBootTest
class AdminRouteAuthorizationTest(
    @Autowired context: WebApplicationContext,
    @Autowired @Qualifier("requestMappingHandlerMapping") private val mappings: RequestMappingHandlerMapping,
) {
    private val mvc = MockMvcBuilders.webAppContextSetup(context)
        .apply<DefaultMockMvcBuilder>(springSecurity()).build()

    private data class Route(val method: HttpMethod, val uri: String)

    private fun concrete(pattern: String) =
        pattern.replace(Regex("""\{sport[^}]*}"""), "padel").replace(Regex("""\{[^}]+}"""), "1")

    private fun adminRoutes(): List<Route> = mappings.handlerMethods.keys.flatMap { info ->
        val methods = info.methodsCondition.methods.ifEmpty { setOf(RequestMethod.GET) }
        info.patternValues.filter { it.startsWith("/api/admin") }.flatMap { pattern ->
            methods.map { Route(HttpMethod.valueOf(it.name), concrete(pattern)) }
        }
    }.distinct().sortedBy { "${it.uri} ${it.method}" }

    // A distinct client address per request keeps the per-IP API limit from interfering.
    private var client = 0
    private fun freshClient() = RequestPostProcessor { it.remoteAddr = "10.99.${client / 250}.${client++ % 250 + 1}"; it }

    private fun status(route: Route, vararg processors: RequestPostProcessor): Int {
        val builder = request(route.method, route.uri).contentType(MediaType.APPLICATION_JSON).content("{}").with(freshClient())
        processors.forEach { builder.with(it) }
        return mvc.perform(builder).andReturn().response.status
    }

    @Test
    fun `every admin route rejects anonymous callers and members`() {
        val routes = adminRoutes()
        assertTrue(routes.size >= 20, "Discovered only ${routes.size} admin routes: $routes")

        val failures = routes.flatMap { route ->
            listOfNotNull(
                status(route).takeIf { it != 401 }?.let { "anonymous ${route.method} ${route.uri} -> $it" },
                status(route, user("member").roles("MEMBER")).takeIf { it != 403 }?.let { "member ${route.method} ${route.uri} -> $it" },
            )
        }
        assertEquals(emptyList<String>(), failures)
    }
}
