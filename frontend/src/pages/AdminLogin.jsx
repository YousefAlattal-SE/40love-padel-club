import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { SignIn } from '@clerk/react'
import { gsap } from '../animation/gsap'
import { useAuth } from '../auth'
import AuthBootstrapNotice from '../AuthBootstrapNotice'
import { clerkAppearance } from '../clerkAppearance'
import logo from '../assets/40love-logo-dark.png'
import courtsAtSunset from '../assets/40love-courts-sunset.jpeg'
import '../admin/admin.css'

const COPY = {
  en: {
    label: 'SECURE ADMIN AREA', title: 'Your club.\nUnder control.', subtitle: 'Manage bookings, courts, pricing and members from one secure workspace.',
    eyebrow: 'ADMINISTRATOR SIGN IN', help: 'Use your authorized administrator account to continue.', home: 'Back to website',
    denied: 'This account does not have administrator access.', failed: 'Could not finish sign-in. Try again or contact the club.', language: 'العربية', signOut: 'Sign out',
    brandTag: 'CLUB MANAGEMENT', location: 'AMMAN, JORDAN', hours: 'OPEN DAILY · 7 AM – 3 AM', theme: 'Toggle appearance',
  },
  ar: {
    label: 'منطقة الإدارة الآمنة', title: 'ناديك.\nتحت سيطرتك.', subtitle: 'أدر الحجوزات والملاعب والأسعار والأعضاء من مساحة عمل آمنة واحدة.',
    eyebrow: 'دخول المسؤول', help: 'استخدم حساب المسؤول المعتمد للمتابعة.', home: 'العودة إلى الموقع',
    denied: 'هذا الحساب لا يملك صلاحيات الإدارة.', failed: 'تعذّر إكمال تسجيل الدخول. حاول مجددًا أو تواصل مع النادي.', language: 'English', signOut: 'تسجيل الخروج',
    brandTag: 'إدارة النادي', location: 'عمّان، الأردن', hours: 'مفتوح يوميًا · ٧ صباحًا – ٣ صباحًا', theme: 'تبديل المظهر',
  },
}

function Icon({ name, size = 16 }) {
  const paths = {
    arrow: <><path d="M19 12H5M11 18l-6-6 6-6" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></>,
    moon: <path d="M20.4 15.1A8.5 8.5 0 0 1 8.9 3.6 8.6 8.6 0 1 0 20.4 15.1Z" />,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

export default function AdminLogin() {
  const { user, loading, profileError, retryProfile, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [locale, setLocale] = useState(() => localStorage.getItem('serva-locale') === 'ar' ? 'ar' : 'en')
  const [theme, setTheme] = useState(() => localStorage.getItem('serva-theme-v2') || 'light')
  const pageRef = useRef(null)
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

  useLayoutEffect(() => {
    const page = pageRef.current
    if (!page) return undefined

    const motion = gsap.matchMedia()
    motion.add('(prefers-reduced-motion: no-preference)', () => {
      const context = gsap.context(() => {
        gsap.from('.admin-login-brand, .admin-login-hero-copy, .admin-login-hero-foot', {
          autoAlpha: 0,
          y: 14,
          duration: 0.7,
          stagger: 0.12,
          ease: 'power2.out',
          clearProps: 'transform,opacity,visibility',
        })
        gsap.fromTo('.admin-login-hero-media img', { scale: 1.045 }, {
          scale: 1,
          duration: 1.8,
          ease: 'power2.out',
          clearProps: 'transform',
        })
        gsap.from('.admin-login-card', {
          autoAlpha: 0,
          y: 18,
          duration: 0.8,
          delay: 0.12,
          ease: 'power2.out',
          clearProps: 'transform,opacity,visibility',
        })
      }, page)

      return () => context.revert()
    })

    return () => motion.revert()
  }, [])

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

  if (profileError) return <AuthBootstrapNotice locale={locale} error={profileError} onRetry={retryProfile} onSignOut={logout} />
  if (loading) return <div className="admin-state-panel"><span className="admin-spinner" /><strong>{ar ? 'جارٍ التحقق من الجلسة…' : 'Checking your session…'}</strong></div>
  if (String(user?.role).toLowerCase() === 'admin') return <Navigate to={adminReturnTo} replace />

  return (
    <main className="admin-login-page" ref={pageRef} dir={ar ? 'rtl' : 'ltr'} lang={locale}>
      <section className="admin-login-hero" aria-labelledby="admin-login-title">
        <div className="admin-login-hero-media" aria-hidden="true"><img src={courtsAtSunset} alt="" /></div>
        <div className="admin-login-hero-top">
          <Link to="/" className="admin-login-brand" aria-label={ar ? 'الصفحة الرئيسية لنادي 40 Love للبادل والمقهى' : '40 Love Padel Club & Cafe home'} dir="ltr">
            <img src={logo} alt="" />
            <span><strong>40 LOVE</strong><small>PADEL CLUB &amp; CAFE</small></span>
          </Link>
          <span className="admin-login-brand-tag">{t.brandTag}</span>
        </div>
        <div className="admin-login-hero-copy">
          <span className="admin-login-hero-label">{t.label}</span>
          <h1 id="admin-login-title">{t.title.split('\n').map((line, i) => <span key={line}>{i > 0 && <br />}{line}</span>)}</h1>
          <p>{t.subtitle}</p>
        </div>
        <div className="admin-login-hero-foot">
          <span><Icon name="clock" size={15} />{t.location}</span>
          <span>{t.hours}</span>
        </div>
      </section>

      <section className="admin-login-form-wrap" aria-label={t.eyebrow}>
        <div className="admin-login-controls" dir="ltr">
          <button type="button" onClick={toggleLocale} aria-label={ar ? 'التبديل إلى الإنجليزية' : 'Switch to Arabic'}>{t.language}</button>
          <button type="button" aria-label={t.theme} onClick={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')}><Icon name={theme === 'dark' ? 'sun' : 'moon'} size={16} /></button>
        </div>

        <div className="admin-login-card">
          <div className="admin-eyebrow">{t.eyebrow}</div>
          <h2>{ar ? 'أهلًا بعودتك.' : 'Welcome back.'}</h2>
          <p className="admin-login-card-help">{t.help}</p>

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
          <Link className="admin-login-home" to="/"><Icon name="arrow" />{t.home}</Link>
        </div>
        <div className="admin-login-form-foot"><span className="admin-login-secure-dot" />{ar ? 'دخول مخصص لفريق النادي' : 'Authorized club staff only'}</div>
      </section>
    </main>
  )
}
