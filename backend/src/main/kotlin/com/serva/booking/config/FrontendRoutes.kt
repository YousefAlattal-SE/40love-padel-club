package com.serva.booking.config

import org.springframework.context.annotation.Configuration
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer

@Configuration
class FrontendRoutes : WebMvcConfigurer {
    override fun addViewControllers(registry: ViewControllerRegistry) {
        // The root is Spring's static welcome page. Clerk uses hash routing inside its widgets.
        val routes = listOf(
            "/courts", "/pricing", "/gallery", "/contact", "/book", "/bookings",
            "/matchmaking", "/my-matchmaking", "/profile", "/login", "/register",
            "/terms-of-service", "/privacy-policy", "/admin", "/admin/login",
            "/admin/bookings", "/admin/courts", "/admin/pricing", "/admin/customers",
            "/admin/messages", "/admin/matchmaking",
        )
        for (route in routes) {
            registry.addViewController(route).setViewName("forward:/index.html")
            registry.addViewController("$route/").setViewName("forward:/index.html")
        }
    }
}
