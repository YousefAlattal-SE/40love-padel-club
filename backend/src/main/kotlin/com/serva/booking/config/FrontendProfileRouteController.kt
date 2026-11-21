package com.serva.booking.config

import org.springframework.stereotype.Controller
import org.springframework.web.bind.annotation.GetMapping

/** Entry points that also support direct links when Spring serves the frontend build. */
@Controller
class FrontendProfileRouteController {

    @GetMapping(value = ["/profile", "/profile/", "/terms-of-service", "/terms-of-service/", "/privacy-policy", "/privacy-policy/"])
    fun appShell(): String = "forward:/index.html"
}
