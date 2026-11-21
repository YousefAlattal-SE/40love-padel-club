import { useEffect, useState } from 'react'
import { ClerkProvider } from '@clerk/react'
import { CLERK_ARABIC } from './clerkLocalization'
import App from './App.jsx'

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!clerkPubKey) {
  throw new Error('Missing Clerk Publishable Key')
}

export default function Root() {
  const [locale, setLocale] = useState(() => localStorage.getItem('serva-locale') === 'ar' ? 'ar' : 'en')

  useEffect(() => {
    const syncLocale = () => setLocale(localStorage.getItem('serva-locale') === 'ar' ? 'ar' : 'en')
    window.addEventListener('serva-locale-change', syncLocale)
    return () => window.removeEventListener('serva-locale-change', syncLocale)
  }, [])

  return (
    <ClerkProvider publishableKey={clerkPubKey} localization={locale === 'ar' ? CLERK_ARABIC : undefined}>
      <App />
    </ClerkProvider>
  )
}
