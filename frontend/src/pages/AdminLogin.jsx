import { SignIn } from '@clerk/react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth'
import { useAuthPreferences } from '../authPreferences'
import { authPageUrl, destinationFor, isAdminPath, isAdminUser, requestedPath, safeReturnPath } from '../authRouting'
import { clerkAppearance } from '../clerkAppearance'
import AuthShell, { AuthStatus } from '../components/AuthShell'
import entrance from '../assets/40love-club-exterior-sunset.webp'

const COPY = {
  en: {
    eyebrow: 'Club management',
    title: 'Staff sign-in',
    help: 'Use your authorized administrator account to continue.',
    verifyingTitle: 'One moment.',
    verifying: 'Checking administrator access…',
    errorTitle: 'Unable to open the staff account.',
    errorHelp: 'Try again, or sign out and sign in again.',
    deniedTitle: 'No staff access.',
    denied: 'This account does not have administrator access.',
    memberArea: 'Go to the member area',
    retry: 'Try again',
    signOut: 'Sign out',
    alt: 'The entrance to 40 LOVE at dusk',
  },
  ar: {
    eyebrow: 'إدارة النادي',
    title: 'دخول فريق النادي',
    help: 'استخدم حساب المسؤول المعتمد للمتابعة.',
    verifyingTitle: 'لحظة من فضلك.',
    verifying: 'جارٍ التحقق من صلاحيات الإدارة…',
    errorTitle: 'تعذّر فتح حساب الإدارة.',
    errorHelp: 'حاول مرة أخرى، أو سجّل الخروج ثم سجّل الدخول من جديد.',
    deniedTitle: 'لا توجد صلاحية إدارة.',
    denied: 'هذا الحساب لا يملك صلاحيات الإدارة.',
    memberArea: 'الانتقال إلى منطقة الأعضاء',
    retry: 'حاول مرة أخرى',
    signOut: 'تسجيل الخروج',
    alt: 'مدخل نادي 40 LOVE عند الغروب',
  },
}

export default function AdminLogin() {
  const { user, loading, profileError, retryProfile, logout } = useAuth()
  const preferences = useAuthPreferences()
  const { state, search } = useLocation()
  const t = COPY[preferences.locale] || COPY.en
  const requested = requestedPath(state, search)

  // The backend-verified role decides; signing in on this page grants nothing by itself.
  if (isAdminUser(user)) return <Navigate to={destinationFor(user, requested)} replace />

  const safe = safeReturnPath(requested)
  const adminReturn = safe && isAdminPath(safe) ? safe : null
  const selfUrl = authPageUrl('/admin/login', adminReturn)
  const shell = { preferences, variant: 'admin', image: entrance, imageAlt: t.alt, eyebrow: t.eyebrow }

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

  if (user) {
    return (
      <AuthShell {...shell} title={t.deniedTitle}>
        <AuthStatus kind="denied" message={t.denied} actions={<>
          <Link className="auth-button auth-button--primary" to="/">{t.memberArea}</Link>
          <button className="auth-button auth-button--secondary" type="button" onClick={logout}>{t.signOut}</button>
        </>} />
      </AuthShell>
    )
  }

  const unauthorized = new URLSearchParams(search).has('unauthorized')
  return (
    <AuthShell {...shell} title={t.title} intro={t.help}>
      {unauthorized && (
        <div className="auth-notice">
          <AuthStatus kind="denied" message={t.denied} />
        </div>
      )}
      <SignIn
        routing="hash"
        withSignUp={false}
        transferable={false}
        forceRedirectUrl={selfUrl}
        fallbackRedirectUrl={selfUrl}
        appearance={clerkAppearance(preferences.theme, 'admin')}
      />
    </AuthShell>
  )
}
