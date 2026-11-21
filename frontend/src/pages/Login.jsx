import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { SignIn } from '@clerk/react'
import { useAuth } from '../auth'
import AuthBootstrapNotice from '../AuthBootstrapNotice'
import { clerkAppearance } from '../clerkAppearance'
import logoLight from '../assets/40love-logo-light.jpg'
import logoDark from '../assets/40love-logo-dark.png'

const COPY = {
  en: {
    titleStart: 'Welcome', titleAccent: 'back.',
    subtitle: 'Log in to manage your bookings at 40 Love Padel Club & Cafe.',
    storyKicker: 'AMMAN, JORDAN · OPEN DAILY',
    storyTitle: 'Your next court is closer than you think.',
    storyBody: 'Book a game, find your people, and keep every session in one place.',
    storyHours: 'Every day · 7 AM — 3 AM',
    language: 'العربية', theme: 'Toggle color theme',
  },
  ar: {
    titleStart: 'أهلًا', titleAccent: 'بعودتك.',
    subtitle: 'سجّل الدخول لإدارة حجوزاتك في نادي 40 Love للبادل والمقهى.',
    storyKicker: 'عمّان، الأردن · مفتوح يوميًا',
    storyTitle: 'ملعبك القادم أقرب مما تتخيل.',
    storyBody: 'احجز مباراتك، تعرّف على لاعبين جدد، واجمع جلساتك في مكان واحد.',
    storyHours: 'يوميًا · ٧ صباحًا — ٣ صباحًا',
    language: 'English', theme: 'تبديل المظهر',
  },
}

const MOON_PATH = 'M20 14.7A8 8 0 019.3 4 8 8 0 1020 14.7z'
const SUN_PATH = 'M12 3v2M12 19v2M3 12h2M19 12h2M5.64 5.64l1.42 1.42M16.94 16.94l1.42 1.42M18.36 5.64l-1.42 1.42M6.64 17.36l-1.42-1.42M12 7a5 5 0 100 10 5 5 0 000-10z'

function ThemeIcon({ dark }) {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={dark ? SUN_PATH : MOON_PATH} /></svg>
}

export default function Login() {
  const { user, loading, profileError, retryProfile, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [locale, setLocale] = useState(() => localStorage.getItem('serva-locale') === 'ar' ? 'ar' : 'en')
  const [theme, setTheme] = useState(() => localStorage.getItem('serva-theme-v2') || 'light')
  const ar = locale === 'ar'
  const t = COPY[locale] || COPY.en
  const logo = theme === 'dark' ? logoDark : logoLight
  const requestedReturnTo = location.state?.from?.pathname || new URLSearchParams(location.search).get('returnTo')
  const returnTo = requestedReturnTo?.startsWith('/') && !requestedReturnTo.startsWith('//') ? requestedReturnTo : '/'
  const signUpUrl = `/register?returnTo=${encodeURIComponent(returnTo)}`

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.lang = locale
    document.documentElement.dir = ar ? 'rtl' : 'ltr'
    localStorage.setItem('serva-theme-v2', theme)
    localStorage.setItem('serva-locale', locale)
  }, [theme, locale, ar])

  useEffect(() => {
    if (user) navigate(String(user.role).toLowerCase() === 'admin' ? '/admin' : returnTo, { replace: true })
  }, [user, navigate, returnTo])

  function toggleLocale() {
    const next = ar ? 'en' : 'ar'
    setLocale(next)
    localStorage.setItem('serva-locale', next)
    document.documentElement.lang = next
    document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr'
    window.dispatchEvent(new Event('serva-locale-change'))
  }

  if (profileError) return <AuthBootstrapNotice locale={locale} error={profileError} onRetry={retryProfile} onSignOut={logout} />
  if (loading) return <p className="page muted">{ar ? 'جارٍ التحقق من الجلسة…' : 'Checking your session…'}</p>
  if (user) return <Navigate to={String(user.role).toLowerCase() === 'admin' ? '/admin' : returnTo} replace />

  return (
    <div className={`auth-bg-page${ar ? ' auth-bg-page--rtl' : ''}`} dir={ar ? 'rtl' : 'ltr'}>
      <div className="auth-page-controls" dir="ltr">
        <button type="button" className="auth-control auth-language-toggle" onClick={toggleLocale} aria-label={ar ? 'Switch to English' : 'التبديل إلى العربية'}>{t.language}</button>
        <button type="button" className="auth-control auth-theme-toggle" onClick={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')} aria-label={t.theme}><ThemeIcon dark={theme === 'dark'} /></button>
      </div>
      <aside className="member-auth-story">
        <span className="member-auth-story-kicker"><i />{t.storyKicker}</span>
        <div>
          <span className="member-auth-story-index">40 LOVE / CLUB ACCESS</span>
          <h2>{t.storyTitle}</h2>
          <p>{t.storyBody}</p>
          <span className="member-auth-story-hours">{t.storyHours}</span>
        </div>
      </aside>
      <main className="auth auth-form auth-form--clerk">
        <img className="auth-logo auth-logo--login" src={logo} alt="40 Love Padel Club & Cafe" />
        <h1>{t.titleStart} <span className="accent">{t.titleAccent}</span></h1>
        <p className="muted">{t.subtitle}</p>
        <SignIn
          routing="hash"
          signUpUrl={signUpUrl}
          fallbackRedirectUrl={returnTo}
          forceRedirectUrl={returnTo}
          appearance={clerkAppearance(theme, 'member')}
        />
      </main>
    </div>
  )
}
