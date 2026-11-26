import { useCallback, useEffect, useLayoutEffect, useState } from 'react'

// Display preferences only (language and theme). These keys never carry
// authentication or authorization data.
const LOCALE_KEY = 'serva-locale'
const THEME_KEY = 'serva-theme-v2'

const readLocale = () => localStorage.getItem(LOCALE_KEY) === 'ar' ? 'ar' : 'en'
const readTheme = () => localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'

/** Shares the language/theme preference with the member site, the admin dashboard and Clerk (via Root). */
export function useAuthPreferences() {
  const [locale, setLocale] = useState(readLocale)
  const [theme, setTheme] = useState(readTheme)

  useLayoutEffect(() => {
    const root = document.documentElement
    root.dataset.theme = theme
    root.lang = locale
    root.dir = locale === 'ar' ? 'rtl' : 'ltr'
  }, [locale, theme])

  useEffect(() => {
    const sync = () => {
      setLocale(readLocale())
      setTheme(readTheme())
    }
    window.addEventListener('serva-locale-change', sync)
    window.addEventListener('serva-theme-change', sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener('serva-locale-change', sync)
      window.removeEventListener('serva-theme-change', sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const toggleLocale = useCallback(() => {
    localStorage.setItem(LOCALE_KEY, locale === 'ar' ? 'en' : 'ar')
    window.dispatchEvent(new Event('serva-locale-change'))
  }, [locale])

  const toggleTheme = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark'
    localStorage.setItem(THEME_KEY, next)
    window.dispatchEvent(new CustomEvent('serva-theme-change', { detail: next }))
  }, [theme])

  return { locale, theme, toggleLocale, toggleTheme }
}
