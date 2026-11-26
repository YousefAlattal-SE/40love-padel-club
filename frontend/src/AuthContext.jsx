
import { useEffect, useState } from 'react'
import { useAuth as useClerkAuth } from '@clerk/react'
import api, {
  errorMessage,
  setAccessTokenProvider,
  setUnauthorizedHandler,
} from './api'
import { AuthContext } from './auth'
let bootstrapInFlight = null

function bootstrapProfile(clerkUserId, sessionToken) {
  if (bootstrapInFlight?.clerkUserId === clerkUserId) {
    return bootstrapInFlight.promise
  }

  const entry = {
    clerkUserId,
    promise: api.post('/auth/bootstrap', undefined, {
      headers: {
        Authorization: `Bearer ${sessionToken}`,
      },
    }).then(({ data }) => data),
  }

  bootstrapInFlight = entry

  return entry.promise.finally(() => {
    if (bootstrapInFlight === entry) {
      bootstrapInFlight = null
    }
  })
}

export function AuthProvider({ children }) {
  const {
    isLoaded,
    isSignedIn,
    userId,
    getToken,
    signOut,
  } = useClerkAuth()

  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profileError, setProfileError] = useState('')
  const [bootstrapAttempt, setBootstrapAttempt] = useState(0)

  // Register the token provider after Clerk initializes.
  useEffect(() => {
    setAccessTokenProvider(
        () => isLoaded && isSignedIn ? getToken() : null
    )

    setUnauthorizedHandler(async (adminRequest) => {
      await signOut()
      window.location.href = adminRequest ? '/admin/login' : '/login'
    })

    return () => {
      setAccessTokenProvider(null)
      setUnauthorizedHandler(null)
    }
  }, [getToken, isLoaded, isSignedIn, signOut])

  useEffect(() => {
    if (!isLoaded) return undefined

    if (!isSignedIn || !userId) {
      // Reset authenticated state when Clerk ends or changes the signed-in session.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUser(null)
      setProfileError('')
      setLoading(false)
      return undefined
    }

    let active = true

    setLoading(true)
    setProfileError('')

    async function loadProfile() {
      try {
        // Get the active Clerk session JWT.
        const sessionToken = await getToken()

        if (!sessionToken) {
          throw new Error(
              'Clerk did not provide an active session token. Please retry.'
          )
        }

        // Bootstrap the user's backend profile.
        const profile = await bootstrapProfile(userId, sessionToken)

        if (active) {
          setUser(profile)
        }
      } catch (error) {
        if (active) {
          setProfileError(errorMessage(error))
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void loadProfile()

    return () => {
      active = false
    }
  }, [getToken, isLoaded, isSignedIn, userId, bootstrapAttempt])

  async function logout() {
    setUser(null)
    setProfileError('')
    await signOut()
  }

  return (
      <AuthContext.Provider
          value={{
            user,
            updateUser: (updates) => setUser((current) => current ? { ...current, ...updates } : current),
            loading,
            profileError,
            retryProfile: () =>
                setBootstrapAttempt((attempt) => attempt + 1),
            logout,
          }}
      >
        {children}
      </AuthContext.Provider>
  )
}
