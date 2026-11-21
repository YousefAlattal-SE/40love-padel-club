import { createContext, useContext } from 'react'

export const AdminLocaleContext = createContext('en')
export const useAdminLocale = () => useContext(AdminLocaleContext)
