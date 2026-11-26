package com.serva.booking.config

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider
import org.springframework.core.annotation.AnnotatedElementUtils
import org.springframework.core.type.filter.AnnotationTypeFilter
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

/**
 * Item 9.1: every admin route carries a second, method-level ADMIN check in addition to the
 * URL rule in SecurityConfig. Reads annotations only; no Spring context is started.
 */
class AdminMethodSecurityPolicyTest {
    private val adminExpression = "hasRole('ADMIN')"

    private fun controllers(): List<Class<*>> =
        ClassPathScanningCandidateComponentProvider(false)
            .apply { addIncludeFilter(AnnotationTypeFilter(RestController::class.java)) }
            .findCandidateComponents("com.serva.booking")
            .map { Class.forName(it.beanClassName) }

    /** Paths of a @RequestMapping (or @GetMapping etc.); `path` and `value` are aliases. */
    private fun paths(element: java.lang.reflect.AnnotatedElement): List<String> =
        AnnotatedElementUtils.findMergedAnnotation(element, RequestMapping::class.java)
            ?.let { (it.path.toList() + it.value.toList()).distinct().ifEmpty { listOf("") } } ?: emptyList()

    @Test
    fun `method security is enabled`() {
        assertNotNull(SecurityConfig::class.java.getAnnotation(EnableMethodSecurity::class.java))
    }

    @Test
    fun `every admin route requires the ADMIN role at class or method level`() {
        val routes = mutableListOf<String>()
        val unprotected = mutableListOf<String>()
        for (controller in controllers()) {
            val bases = paths(controller).ifEmpty { listOf("") }
            val classRule = controller.getAnnotation(PreAuthorize::class.java)?.value
            for (method in controller.declaredMethods) {
                val methodPaths = paths(method)
                if (methodPaths.isEmpty()) continue
                for (base in bases) for (path in methodPaths) {
                    val full = base + path
                    if (!full.startsWith("/api/admin")) continue
                    routes += "${controller.simpleName}.${method.name} $full"
                    val rule = method.getAnnotation(PreAuthorize::class.java)?.value ?: classRule
                    if (rule != adminExpression) unprotected += "${controller.simpleName}.${method.name} $full"
                }
            }
        }
        assertTrue(routes.size >= 20, "Found only ${routes.size} admin routes: $routes")
        assertEquals(emptyList<String>(), unprotected)
    }
}
