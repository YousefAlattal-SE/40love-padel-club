import { SignIn, SignUp } from '@clerk/react'
import { Navigate, useLocation, useOutletContext } from 'react-router-dom'
import { useAuth } from '../auth'
import AuthBootstrapNotice from '../AuthBootstrapNotice'
import { clerkAppearance } from '../clerkAppearance'
import { MemberLoading } from './MemberStates'
import court from '../assets/40love-court-walkway.jpeg'
import coffee from '../assets/40love-court-coffee.jpeg'

export default function MemberAccess({ register = false }) {
  const { user, loading, profileError, retryProfile, logout } = useAuth()
  const { theme, locale } = useOutletContext()
  const { state, search } = useLocation()
  const ar = locale === 'ar'
  const from = state?.from
  const requested = from ? from.pathname + (from.search || '') + (from.hash || '') : new URLSearchParams(search).get('returnTo')
  const returnTo = requested?.startsWith('/') && !requested.startsWith('//') && !requested.includes('\\') ? requested : '/'
  if (profileError) return <AuthBootstrapNotice member locale={locale} error={profileError} onRetry={retryProfile} onSignOut={logout} />
  if (loading) return <MemberLoading label={ar ? 'جارٍ التحقق من الجلسة…' : 'Checking your session…'} />
  if (user) return <Navigate to={String(user.role).toLowerCase() === 'admin' ? '/admin' : returnTo} replace />
  const props = { routing: 'hash', fallbackRedirectUrl: returnTo, forceRedirectUrl: returnTo, appearance: clerkAppearance(theme, 'member') }
  return <section className="access-spread">
    <div className="access-form"><h1>{register ? (ar ? 'إنشاء حساب.' : 'Join the club.') : (ar ? 'تسجيل الدخول.' : 'Welcome back.')}</h1>
      <p>{register ? (ar ? 'أنشئ حسابًا لحجز ملعب أو الانضمام إلى مباراة.' : 'Create an account to book a court or join a match.') : (ar ? 'سجّل الدخول للاطّلاع على حجوزاتك ومبارياتك.' : 'Sign in to see your reservations and matches.')}</p>
      {register ? <SignUp {...props} signInUrl={'/login?returnTo=' + encodeURIComponent(returnTo)} />
        : <SignIn {...props} signUpUrl={'/register?returnTo=' + encodeURIComponent(returnTo)} />}
    </div>
    <figure><img src={register ? coffee : court} alt={register ? (ar ? 'قهوة النادي بجانب الشبكة' : 'Club coffee beside the net') : (ar ? 'ممر بين ملاعب النادي' : 'The walkway between the club courts')} /></figure>
  </section>
}
