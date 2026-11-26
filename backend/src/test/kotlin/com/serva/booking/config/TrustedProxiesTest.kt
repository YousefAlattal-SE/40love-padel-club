package com.serva.booking.config

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.springframework.mock.web.MockHttpServletRequest

/** Item 12.1: fail-closed client address resolution. No DNS lookups, no network. */
class TrustedProxiesTest {

    private fun request(peer: String, vararg forwarded: String) = MockHttpServletRequest("GET", "/api/x").apply {
        remoteAddr = peer
        forwarded.forEach { addHeader("X-Forwarded-For", it) }
    }

    @Test
    fun `nothing is trusted by default, so forwarded headers are ignored`() {
        val none = TrustedProxies.parse("")
        assertFalse(none.enabled)
        assertEquals("203.0.113.9", none.clientAddress(request("203.0.113.9", "198.51.100.1")))
    }

    @Test
    fun `accepts IPv4, IPv6 and CIDR entries`() {
        val proxies = TrustedProxies.parse(" 10.0.0.0/8 , 192.168.1.5, ::1, fd00::/8 ")
        assertTrue(proxies.enabled)
        assertTrue(proxies.isTrusted("10.20.30.40"))
        assertTrue(proxies.isTrusted("192.168.1.5"))
        assertFalse(proxies.isTrusted("192.168.1.6"))
        assertTrue(proxies.isTrusted("0:0:0:0:0:0:0:1"))
        assertTrue(proxies.isTrusted("fd12:3456::1"))
        assertFalse(proxies.isTrusted("2001:db8::1"))
        assertFalse(proxies.isTrusted("not-an-ip"))
    }

    @Test
    fun `rejects invalid entries and host names instead of resolving them`() {
        for (spec in listOf("10.0.0.0/33", "proxy.example.com", "1.2.3", "256.1.1.1", "10.0.0.0/", "::1/129", "localhost")) {
            assertThrows(IllegalArgumentException::class.java, { TrustedProxies.parse(spec) }, spec)
        }
    }

    @Test
    fun `forwarded client is used only when the connection comes from a trusted proxy`() {
        val proxies = TrustedProxies.parse("10.0.0.0/8")
        assertEquals("198.51.100.7", proxies.clientAddress(request("10.0.0.2", "198.51.100.7")))
        // An untrusted peer cannot choose its own address.
        assertEquals("203.0.113.9", proxies.clientAddress(request("203.0.113.9", "198.51.100.7")))
    }

    @Test
    fun `client-supplied entries to the left of the proxy chain cannot spoof the address`() {
        val proxies = TrustedProxies.parse("10.0.0.0/8")
        // The client sends "1.1.1.1"; the proxy appends the real client address on the right.
        assertEquals("198.51.100.7", proxies.clientAddress(request("10.0.0.2", "1.1.1.1, 198.51.100.7")))
        assertEquals("198.51.100.7", proxies.clientAddress(request("10.0.0.2", "1.1.1.1", "198.51.100.7, 10.0.0.3")))
    }

    @Test
    fun `malformed or missing forwarded data falls back to the proxy address`() {
        val proxies = TrustedProxies.parse("10.0.0.0/8")
        assertEquals("10.0.0.2", proxies.clientAddress(request("10.0.0.2")))
        assertEquals("10.0.0.2", proxies.clientAddress(request("10.0.0.2", "1.1.1.1, evil.example")))
        assertEquals("10.0.0.2", proxies.clientAddress(request("10.0.0.2", "1.1.1.1, unknown")))
    }

    @Test
    fun `an entirely internal chain resolves to its first hop`() {
        val proxies = TrustedProxies.parse("10.0.0.0/8")
        assertEquals("10.0.0.9", proxies.clientAddress(request("10.0.0.2", "10.0.0.9, 10.0.0.3")))
    }
}
