package com.serva.booking.config

import org.springframework.stereotype.Controller
import org.springframework.web.bind.annotation.GetMapping

/** Serves the React app shell on direct navigation and refresh of the protected profile route. */
@Controller
class FrontendProfileRouteController {

    @GetMapping(value = ["/profile", "/profile/"])
    fun profile(): String = "forward:/index.html"
}
