import axios from 'axios'

// All calls go to /api/..., which Vite forwards to the Spring Boot backend (see vite.config.js)
const api = axios.create({ baseURL: '/api' })
let accessTokenProvider = null
let unauthorizedHandler = null

export function setAccessTokenProvider(provider) {
  accessTokenProvider = provider
}

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler
}

// Attach the current Clerk session token without persisting it in localStorage.
api.interceptors.request.use(async (config) => {
  // Bootstrap supplies the session token it just fetched after Clerk became ready.
  // Preserve it instead of asking Clerk again and potentially replacing it with null.
  if (config.headers?.Authorization) return config

  const token = accessTokenProvider ? await accessTokenProvider() : null
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Clerk session failures sign the user out; provisioning errors remain visible to AuthProvider.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const isBootstrapCall = err.config?.url?.startsWith('/auth/bootstrap')
    if (err.response?.status === 401 && !isBootstrapCall) {
      const adminRequest = err.config?.url?.startsWith('/admin/')
      if (unauthorizedHandler) {
        void unauthorizedHandler(adminRequest)
      } else {
        window.location.href = adminRequest ? '/admin/login' : '/login'
      }
    }
    return Promise.reject(err)
  },
)

// Turns a backend error into a readable message
export function errorMessage(err) {
  const response = err?.response
  const data = response?.data
  if (data?.fields) {
    return Object.entries(data.fields).map(([field, msg]) => `${field}: ${msg}`).join(', ')
  }
  if (data?.error || data?.message || data?.detail) {
    return data.error ?? data.message ?? data.detail
  }
  if (response) return `Request failed with status ${response.status}`
  if (err?.message && err?.code !== 'ERR_NETWORK') return err.message
  return 'Could not reach the server'
}

export default api
