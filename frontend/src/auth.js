import { createContext, useContext } from 'react'

// Shared by AuthContext.jsx (provides it) and every page that needs the logged-in user
export const AuthContext = createContext(null)

export const useAuth = () => useContext(AuthContext)
