// Post-authentication routing rules.
//
// The role always comes from the backend profile returned by /api/auth/bootstrap.
// Nothing here reads roles from storage, the URL, or the email address, and the
// page the user signed in on never grants anything: it only chooses a default.

const AUTH_PAGES = new Set(['/login', '/register', '/admin/login'])
const MAX_RETURN_LENGTH = 512
const PROBE_ORIGIN = 'https://return-path.invalid'
// Browsers strip tab/newline characters from URLs, so "/\t/evil.example" would become "//evil.example".
// eslint-disable-next-line no-control-regex
const UNSAFE_CHARACTERS = /[\\\u0000-\u001f\u007f]/

/**
 * Returns a same-origin path (pathname + search + hash) or null when the value is unsafe.
 * Rejects absolute URLs, protocol-relative paths, backslashes, control characters,
 * encoded dot segments, and the sign-in pages themselves (to prevent redirect loops).
 */
export function safeReturnPath(raw) {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > MAX_RETURN_LENGTH) return null
  if (!raw.startsWith('/') || raw.startsWith('//') || UNSAFE_CHARACTERS.test(raw)) return null

  let url
  try {
    url = new URL(raw, PROBE_ORIGIN)
  } catch {
    return null
  }
  if (url.origin !== PROBE_ORIGIN) return null

  let decodedPath
  try {
    decodedPath = decodeURIComponent(url.pathname)
  } catch {
    return null
  }
  if (decodedPath.startsWith('//') || decodedPath.includes('\\') || decodedPath.split('/').includes('..')) return null

  const normalized = (url.pathname.replace(/\/+$/, '') || '/').toLowerCase()
  if (AUTH_PAGES.has(normalized)) return null

  return url.pathname + url.search + url.hash
}

/** React Router matches paths case-insensitively, so the admin check does too. */
export function isAdminPath(path) {
  const pathname = String(path ?? '').split(/[?#]/)[0].replace(/\/+$/, '').toLowerCase()
  return pathname === '/admin' || pathname.startsWith('/admin/')
}

/** True only for the backend-verified administrator role. */
export function isAdminUser(user) {
  return String(user?.role ?? '').toLowerCase() === 'admin'
}

/**
 * Where a signed-in user goes after the backend profile has loaded.
 * Administrators: the requested admin page, otherwise the dashboard.
 * Everyone else: the requested non-admin page, otherwise the home page.
 */
export function destinationFor(user, requested) {
  const safe = safeReturnPath(requested)
  if (isAdminUser(user)) return safe && isAdminPath(safe) ? safe : '/admin'
  return safe && !isAdminPath(safe) ? safe : '/'
}

/** The page the visitor was trying to reach: router state first, then ?returnTo=. */
export function requestedPath(state, search) {
  const from = state?.from
  if (typeof from?.pathname === 'string') return from.pathname + (from.search || '') + (from.hash || '')
  return new URLSearchParams(search).get('returnTo')
}

/** Builds an auth page URL that carries a sanitized return path. */
export function authPageUrl(base, requested) {
  const safe = safeReturnPath(requested)
  return safe ? `${base}?returnTo=${encodeURIComponent(safe)}` : base
}
