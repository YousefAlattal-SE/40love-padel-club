package com.serva.booking.config

import jakarta.servlet.http.HttpServletRequest
import java.net.InetAddress

/**
 * Security item 12.1: resolves the real client address behind a reverse proxy, fail-closed.
 *
 * Configured with TRUSTED_PROXIES (comma-separated IP literals or CIDR ranges). When it is empty
 * (the default) nothing is trusted and `X-Forwarded-For` is never read. When it is set, the header
 * is used only if the TCP peer itself is a trusted proxy, and the chain is read from the right,
 * skipping trusted hops: entries a client prepends on the left can never be chosen. Any malformed
 * hop falls back to the peer address. Only literals are accepted, so no DNS lookup ever happens.
 */
class TrustedProxies private constructor(private val ranges: List<Range>) {

    val enabled: Boolean get() = ranges.isNotEmpty()

    fun isTrusted(address: String): Boolean = parseLiteral(address)?.let(::contains) ?: false

    fun clientAddress(request: HttpServletRequest): String {
        val peer = request.remoteAddr
        if (!enabled || !isTrusted(peer)) return peer
        val hops = request.getHeaders(FORWARDED_FOR).toList()
            .flatMap { it.split(',') }
            .map { it.trim() }
            .filter { it.isNotEmpty() }
        if (hops.isEmpty()) return peer
        for (hop in hops.asReversed()) {
            val address = parseLiteral(hop) ?: return peer
            if (!contains(address)) return hop
        }
        return hops.first()
    }

    private fun contains(address: ByteArray): Boolean = ranges.any { it.contains(address) }

    private class Range(private val network: ByteArray, private val prefix: Int) {
        fun contains(address: ByteArray): Boolean {
            if (address.size != network.size) return false
            val fullBytes = prefix / 8
            for (i in 0 until fullBytes) if (address[i] != network[i]) return false
            val remainingBits = prefix % 8
            if (remainingBits == 0) return true
            val mask = (0xFF shl (8 - remainingBits)) and 0xFF
            return (address[fullBytes].toInt() and mask) == (network[fullBytes].toInt() and mask)
        }
    }

    companion object {
        private const val FORWARDED_FOR = "X-Forwarded-For"
        private val IPV4 = Regex("""^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$""")
        private val IPV6 = Regex("""^[0-9A-Fa-f:.]+$""")

        val NONE = TrustedProxies(emptyList())

        /** Parses TRUSTED_PROXIES; any invalid entry fails start-up rather than being ignored. */
        fun parse(spec: String): TrustedProxies {
            val entries = spec.split(',').map { it.trim() }.filter { it.isNotEmpty() }
            return TrustedProxies(entries.map { entry ->
                val address = entry.substringBefore('/')
                val bytes = parseLiteral(address)
                    ?: throw IllegalArgumentException("TRUSTED_PROXIES entry is not an IP address or CIDR range: $entry")
                val bits = bytes.size * 8
                val prefix = if ('/' in entry) entry.substringAfter('/').toIntOrNull() else bits
                require(prefix != null && prefix in 0..bits) { "TRUSTED_PROXIES entry has an invalid prefix: $entry" }
                Range(bytes, prefix)
            })
        }

        /** IP literal to bytes without DNS; anything else (host names, garbage) returns null. */
        private fun parseLiteral(value: String): ByteArray? {
            IPV4.matchEntire(value)?.let { match ->
                val octets = match.groupValues.drop(1).map { it.toInt() }
                return if (octets.all { it in 0..255 }) octets.map { it.toByte() }.toByteArray() else null
            }
            if (':' !in value || !IPV6.matches(value)) return null
            // A value containing ':' is parsed as an IPv6 literal by the JDK; no name lookup occurs.
            return runCatching { InetAddress.getByName(value).address }.getOrNull()
        }
    }
}
