import { SignIn, SignUp } from '@clerk/react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth'
import { useAuthPreferences } from '../authPreferences'
import { authPageUrl, destinationFor, requestedPath, safeReturnPath } from '../authRouting'
import { clerkAppearance } from '../clerkAppearance'
import AuthShell, { AuthStatus } from '../components/AuthShell'
import court from '../assets/40love-court-walkway.jpeg'
import coffee from '../assets/40love-court-coffee.jpeg'

const COPY = {
  en: {
    signIn: { eyebrow: 'Members', title: 'Welcome back.', intro: 'Sign in to manage your court reservations and matches.', alt: 'The walkway between the club courts' },
    register: { eyebrow: 'Membership', title: 'Join the club.', intro: 'Create an account to book courts and join matches.', alt: 'Club coffee beside the net' },
    verifyingTitle: 'One moment.',
    verifying: 'Verifying your account…',
    errorTitle: 'Account setup could not finish.',
    errorHelp: 'Try again, or sign out and contact the club if the problem continues.',
    retry: 'Try again',
    signOut: 'Sign out',
  },
  ar: {
    signIn: { eyebrow: 'الأعضاء', title: 'أهلًا بعودتك.', intro: 'سجّل الدخول لإدارة حجوزات الملاعب ومبارياتك.', alt: 'ممر بين ملاعب النادي' },
    register: { eyebrow: 'العضوية', title: 'انضم إلى النادي.', intro: 'أنشئ حسابًا لحجز الملاعب والانضمام إلى المباريات.', alt: 'قهوة النادي بجانب الشبكة' },
    verifyingTitle: 'لحظة من فضلك.',
    verifying: 'جارٍ التحقق من حسابك…',
    errorTitle: 'تعذّر إكمال إعداد الحساب.',
    errorHelp: 'حاول مرة أخرى، أو سجّل الخروج وتواصل مع النادي إذا استمرت المشكلة.',
    retry: 'حاول مرة أخرى',
    signOut: 'تسجيل الخروج',
  },
}

export default function MemberAccess({ register = false }) {
  const { user, loading, profileError, retryProfile, logout } = useAuth()
  const preferences = useAuthPreferences()
  const { state, search } = useLocation()
  const t = COPY[preferences.locale] || COPY.en
  const page = register ? t.register : t.signIn
  const requested = requestedPath(state, search)

  // Route only once the backend profile (and therefore the verified role) is known.
  if (user) return <Navigate to={destinationFor(user, requested)} replace />

  const returnPath = safeReturnPath(requested)
  // Clerk always comes back to this page, which waits for the backend role before routing.
  // Sending Clerk straight to the destination would show the member site to administrators.
  const signInUrl = authPageUrl('/login', returnPath)
  const signUpUrl = authPageUrl('/register', returnPath)
  const shell = { preferences, variant: 'member', image: register ? coffee : court, imageAlt: page.alt }

  if (profileError) {
    return (
      <AuthShell {...shell} title={t.errorTitle}>
        <AuthStatus kind="error" message={t.errorHelp} detail={profileError} actions={<>
          <button className="auth-button auth-button--primary" type="button" onClick={retryProfile}>{t.retry}</button>
          <button className="auth-button auth-button--secondary" type="button" onClick={logout}>{t.signOut}</button>
        </>} />
      </AuthShell>
    )
  }

  if (loading) {
    return (
      <AuthShell {...shell} title={t.verifyingTitle}>
        <AuthStatus message={t.verifying} />
      </AuthShell>
    )
  }

  const appearance = clerkAppearance(preferences.theme, 'member')
  return (
    <AuthShell {...shell} eyebrow={page.eyebrow} title={page.title} intro={page.intro}>
      {register ? (
        <SignUp
          routing="hash"
          appearance={appearance}
          forceRedirectUrl={signUpUrl}
          fallbackRedirectUrl={signUpUrl}
          signInUrl={signInUrl}
          signInForceRedirectUrl={signInUrl}
        />
      ) : (
        <SignIn
          routing="hash"
          appearance={appearance}
          forceRedirectUrl={signInUrl}
          fallbackRedirectUrl={signInUrl}
          signUpUrl={signUpUrl}
          signUpForceRedirectUrl={signUpUrl}
        />
      )}
    </AuthShell>
  )
}
