import Icon from '../admin/AdminIcon'
import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { SignIn } from '@clerk/react'
import { AdminSession } from '../admin/AdminUI'
import { useAuth } from '../auth'
import { clerkAppearance } from '../clerkAppearance'
import logo from '../assets/40love-logo-dark.png'
import entrance from '../assets/40love-club-exterior-sunset.jpeg'
import '../admin/admin.css'

const COPY = {
  en: {
    title: 'Staff sign-in',
    help: 'Use your authorized administrator account to continue.', home: 'Back to website',
    denied: 'This account does not have administrator access.', language: 'العربية', signOut: 'Sign out',
    theme: 'Toggle appearance',
  },
  ar: {
    title: 'دخول فريق النادي',
    help: 'استخدم حساب المسؤول المعتمد للمتابعة.', home: 'العودة إلى الموقع',
    denied: 'هذا الحساب لا يملك صلاحيات الإدارة.', language: 'English', signOut: 'تسجيل الخروج',
    theme: 'تبديل المظهر',
  },
}

export default function AdminLogin() {
  const { user, loading, profileError, retryProfile, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [locale, setLocale] = useState(() => localStorage.getItem('serva-locale') === 'ar' ? 'ar' : 'en')
  const [theme, setTheme] = useState(() => localStorage.getItem('serva-theme-v2') || 'light')
  const ar = locale === 'ar'
  const t = COPY[locale] || COPY.en
  const requestedAdminPath = location.state?.from?.pathname || params.get('returnTo')
  const isAdminRoute = requestedAdminPath === '/admin' || requestedAdminPath?.startsWith('/admin/')
  const adminReturnTo = isAdminRoute && requestedAdminPath !== '/admin/login' ? requestedAdminPath : '/admin'

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.lang = locale
    document.documentElement.dir = ar ? 'rtl' : 'ltr'
    localStorage.setItem('serva-theme-v2', theme)
    localStorage.setItem('serva-locale', locale)
  }, [theme, locale, ar])


  useEffect(() => {
    if (String(user?.role).toLowerCase() === 'admin') navigate(adminReturnTo, { replace: true })
  }, [user, navigate, adminReturnTo])

  function toggleLocale() {
    const next = ar ? 'en' : 'ar'
    setLocale(next)
    localStorage.setItem('serva-locale', next)
    document.documentElement.lang = next
    document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr'
    window.dispatchEvent(new Event('serva-locale-change'))
  }

  if (profileError) return <AdminSession error={profileError} onRetry={retryProfile} onSignOut={logout} />
  if (loading) return <AdminSession />
  if (String(user?.role).toLowerCase() === 'admin') return <Navigate to={adminReturnTo} replace />

  return <main className="club-operations admin-login-page" dir={ar ? 'rtl' : 'ltr'} lang={locale}>
    <header className="admin-login-bar">
      <Link to="/" className="admin-login-brand"><img src={logo} alt="" /><span dir="ltr">40 LOVE</span></Link>
      <div className="admin-login-controls">
        <button type="button" lang={ar ? 'en' : 'ar'} onClick={toggleLocale}>{t.language}</button>
        <button type="button" aria-label={t.theme} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}><Icon name={theme === 'dark' ? 'sun' : 'moon'} /></button>
      </div>
    </header>
    <div className="admin-login-spread"><section className="admin-login-card" aria-labelledby="admin-login-title">
      <h1 id="admin-login-title">{t.title}</h1><p>{t.help}</p>
          {user ? (
            <div className="admin-login-error" role="alert">
              <p>{t.denied}</p>
              <button className="admin-button" type="button" onClick={logout}>{t.signOut}</button>
            </div>
          ) : (
            <>
              {params.get('unauthorized') && <div className="admin-login-error" role="alert">{t.denied}</div>}
              <SignIn
                routing="hash"
                withSignUp={false}
                transferable={false}
                fallbackRedirectUrl="/admin/login"
                forceRedirectUrl={`/admin/login?returnTo=${encodeURIComponent(adminReturnTo)}`}
                appearance={clerkAppearance(theme, 'admin')}
              />
            </>
          )}

      <Link className="admin-login-home" to="/">{t.home}</Link>
    </section>
    <figure><img src={entrance} alt={ar ? 'مدخل نادي 40 LOVE عند الغروب' : 'The entrance to 40 LOVE at dusk'} /></figure></div>
    <footer className="admin-footer"><span>40 LOVE Padel Club &amp; Cafe</span><div><Link to="/terms-of-service">{ar ? 'شروط الخدمة' : 'Terms of Service'}</Link><Link to="/privacy-policy">{ar ? 'سياسة الخصوصية' : 'Privacy Policy'}</Link></div></footer>
  </main>
}
