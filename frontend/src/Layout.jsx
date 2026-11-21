import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigationType } from 'react-router-dom'
import { useAuth } from './auth'
import { FORTYLOVE_CONTENT as C } from './content'
import logo from './assets/40love-logo-dark.png'
import './booking.css'
import './club-foundation.css'
import './member-shell.css'
import './member-pages.css'

const MEMBER_LINKS = [
  { to: '/bookings', en: 'My bookings', ar: 'حجوزاتي' },
  { to: '/my-matchmaking', en: 'My matches', ar: 'مبارياتي' },
  { to: '/profile', en: 'Profile', ar: 'ملفي الشخصي' },
]
const GUEST_LINKS = [
  { to: '/login', en: 'Log in', ar: 'تسجيل الدخول' },
  { to: '/register', en: 'Create an account', ar: 'إنشاء حساب' },
]
const WORDS = {
  en: {
    home: '40 Love, home', venue: 'Padel Club & Café', skip: 'Skip to content', primary: 'Main navigation',
    book: 'Book a court', menu: 'Menu', close: 'Close menu', account: 'Member account', logout: 'Log out',
    dark: 'Use dark theme', light: 'Use light theme', darkLabel: 'Dark theme', lightLabel: 'Light theme',
    preferences: 'Preferences', accountLoading: 'Loading account', club: 'The club', visit: 'Visit us',
    instagram: 'Instagram', whatsapp: 'WhatsApp', terms: 'Terms of Service', privacy: 'Privacy Policy',
  },
  ar: {
    home: '40 Love، الصفحة الرئيسية', venue: 'نادي البادل والمقهى', skip: 'تخطَّ إلى المحتوى', primary: 'التنقل الرئيسي',
    book: 'احجز ملعبًا', menu: 'القائمة', close: 'إغلاق القائمة', account: 'حساب العضو', logout: 'تسجيل الخروج',
    dark: 'تفعيل المظهر الداكن', light: 'تفعيل المظهر الفاتح', darkLabel: 'المظهر الداكن', lightLabel: 'المظهر الفاتح',
    preferences: 'التفضيلات', accountLoading: 'جارٍ تحميل الحساب', club: 'النادي', visit: 'زورونا',
    instagram: 'إنستغرام', whatsapp: 'واتساب', terms: 'شروط الخدمة', privacy: 'سياسة الخصوصية',
  },
}

function Brand({ locale, onNavigate }) {
  function goHome(event) {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
    onNavigate?.()
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  return (
    <Link className="club-brand" to="/" aria-label={WORDS[locale].home} onClick={goHome}>
      <span className="club-brand-mark"><img src={logo} alt="" width="40" height="40" /></span>
      <span className="club-brand-name">
        <strong lang="en" dir="ltr">40 LOVE</strong>
        <span>{WORDS[locale].venue}</span>
      </span>
    </Link>
  )
}

function ThemeSymbol() {
  return (
    <svg width="19" height="19" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="6.6" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 3.4a6.6 6.6 0 0 1 0 13.2Z" fill="currentColor" />
    </svg>
  )
}

function Preferences({ locale, theme, onLocale, onTheme, expanded = false }) {
  const ar = locale === 'ar'
  const dark = theme === 'dark'
  const words = WORDS[locale]
  return (
    <>
      <button className="club-tool" type="button" onClick={onLocale} lang={ar ? 'en' : 'ar'}
        aria-label={ar ? 'Switch to English' : 'التبديل إلى العربية'}>
        {ar ? (expanded ? 'English' : 'EN') : 'العربية'}
      </button>
      <button className="club-tool" type="button" onClick={onTheme}
        title={dark ? words.light : words.dark} aria-label={dark ? words.light : words.dark}>
        <ThemeSymbol />{expanded && (dark ? words.lightLabel : words.darkLabel)}
      </button>
    </>
  )
}

function ClubLinks({ locale, onNavigate }) {
  return C.nav.map((item) => (
    <NavLink key={item.id} to={'/' + item.id} onClick={onNavigate}>{item[locale]}</NavLink>
  ))
}

function AccountLinks({ auth, locale, onNavigate }) {
  const { loading, profileError, user } = auth
  if (loading) return <span className="club-account-loading" role="status" aria-label={WORDS[locale].accountLoading} />
  // A signed-in member can recover the profile through the existing protected-route notice.
  if (profileError) return <Link to="/profile" onClick={onNavigate}>{WORDS[locale].account}</Link>
  return (user ? MEMBER_LINKS : GUEST_LINKS).map((item) => (
    <NavLink key={item.to} to={item.to} onClick={onNavigate}>{item[locale]}</NavLink>
  ))
}

function MemberHeader({ locale, theme, onLocale, onTheme, auth }) {
  const { user, loading, logout, profileError } = auth
  const hasAccount = Boolean(user || profileError)
  const words = WORDS[locale]
  const dialog = useRef(null)
  const closeButton = useRef(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()
  const preferences = { locale, theme, onLocale, onTheme }

  function openMenu() {
    dialog.current.showModal()
    closeButton.current.focus({ preventScroll: true })
    setMenuOpen(true)
  }
  function closeMenu() {
    dialog.current?.close()
  }
  useEffect(() => {
    dialog.current?.close()
  }, [pathname])
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1080px)')
    desktop.addEventListener('change', closeMenu)
    return () => desktop.removeEventListener('change', closeMenu)
  }, [])

  return (
    <>
      <a className="club-skip" href="#member-main">{words.skip}</a>
      <header className="club-mast">
        <div className="club-mast-inner">
          <Brand locale={locale} />
          <nav className="club-mast-links" aria-label={words.primary}><ClubLinks locale={locale} /></nav>
          <div className="club-mast-actions">
            <div className="club-mast-tools">
              <Preferences {...preferences} />
              {loading && <span className="club-account-loading" role="status" aria-label={words.accountLoading} />}
              {!loading && (hasAccount
                ? <button className="club-tool club-account-tool" type="button" onClick={openMenu} aria-haspopup="dialog"
                    aria-controls="member-menu" aria-expanded={menuOpen}>{words.account}</button>
                : <Link className="club-tool club-account-tool" to="/login">{GUEST_LINKS[0][locale]}</Link>)}
            </div>
            <Link className="club-mast-book" to="/book">{words.book}</Link>
            <button className="club-menu-trigger" type="button" onClick={openMenu} aria-label={words.menu}
              aria-controls="member-menu" aria-haspopup="dialog" aria-expanded={menuOpen}>
              <svg width="23" height="19" viewBox="0 0 24 20" fill="none" aria-hidden="true">
                <path d="M2 5.5h20M2 14.5h14" stroke="currentColor" strokeWidth="1.6" />
              </svg>
            </button>
          </div>
        </div>
      </header>
      <dialog ref={dialog} id="member-menu" className="club-menu" data-lenis-prevent="" aria-label={words.menu}
        onClose={() => setMenuOpen(false)} onClick={(event) => { if (event.target === event.currentTarget) closeMenu() }}>
        <div className="club-menu-inner">
          <div className="club-menu-head">
            <Brand locale={locale} onNavigate={closeMenu} />
            <button ref={closeButton} className="club-menu-close" type="button" onClick={closeMenu} aria-label={words.close}>
              <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><path d="m4 4 14 14M18 4 4 18" stroke="currentColor" strokeWidth="1.5" /></svg>
            </button>
          </div>
          <nav className="club-menu-links" aria-label={words.primary}><ClubLinks locale={locale} onNavigate={closeMenu} /></nav>
          <div className="club-menu-account">
            <h2>{words.account}</h2>
            {user?.fullName && <span><bdi>{user.fullName}</bdi></span>}
            <AccountLinks locale={locale} auth={auth} onNavigate={closeMenu} />
            {hasAccount && <button type="button" onClick={() => { closeMenu(); logout() }}>{words.logout}</button>}
          </div>
          <div className="club-menu-prefs" role="group" aria-label={words.preferences}>
            <Preferences {...preferences} expanded />
          </div>
          <Link className="club-mast-book" to="/book" onClick={closeMenu}>{words.book}</Link>
        </div>
      </dialog>
    </>
  )
}

function MemberFooter({ locale, auth }) {
  const words = WORDS[locale]
  return (
    <footer className="club-foot">
      <div className="club-foot-inner">
        <div className="club-foot-grid">
          <div className="club-foot-venue">
            <Brand locale={locale} />
            <p>{C.contact.hours[locale]}</p>
            <div className="club-foot-social">
              <a href="https://www.instagram.com/40love.jo" target="_blank" rel="noreferrer">{words.instagram}</a>
              <a href={C.contact.whatsappHref} target="_blank" rel="noreferrer">{words.whatsapp}</a>
            </div>
          </div>
          <nav aria-labelledby="club-foot-club">
            <h2 id="club-foot-club">{words.club}</h2><ClubLinks locale={locale} />
          </nav>
          <nav aria-labelledby="club-foot-account">
            <h2 id="club-foot-account">{words.account}</h2>
            <Link to="/book">{words.book}</Link>
            <AccountLinks locale={locale} auth={auth} />
          </nav>
          <div className="club-foot-visit">
            <h2>{words.visit}</h2>
            <address>{locale === 'ar' ? C.contact.addressAr : C.contact.address}</address>
            <a href={C.contact.phoneHref}><bdi dir="ltr">{C.contact.phone}</bdi></a>
            <a href="https://40love.club" dir="ltr" target="_blank" rel="noreferrer">40love.club</a>
          </div>
        </div>
        <div className="club-foot-base">
          <small dir="ltr">© {new Date().getFullYear()} 40 LOVE</small>
          <div><Link to="/terms-of-service">{words.terms}</Link><Link to="/privacy-policy">{words.privacy}</Link></div>
        </div>
      </div>
    </footer>
  )
}

export default function Layout() {
  const auth = useAuth()
  const [locale, setLocale] = useState(() => localStorage.getItem('serva-locale') === 'ar' ? 'ar' : 'en')
  const [theme, setTheme] = useState(() => localStorage.getItem('serva-theme-v2') === 'dark' ? 'dark' : 'light')
  const shell = useRef(null)
  const { pathname, hash } = useLocation()
  const navigationType = useNavigationType()
  const editorial = ['/', '/terms-of-service', '/privacy-policy'].includes(pathname.replace(/\/$/, '') || '/')

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = locale
    const browserColor = document.querySelector('meta[name="theme-color"]')
    browserColor.content = getComputedStyle(shell.current).getPropertyValue('--club-bg').trim()
    return () => {
      browserColor.content = theme === 'dark' ? '#075E6B' : '#F5F8F2'
    }
  }, [locale, theme])

  useLayoutEffect(() => {
    if (navigationType !== 'POP' && !hash) window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname, hash, navigationType])

  useEffect(() => {
    const sync = () => {
      setLocale(localStorage.getItem('serva-locale') === 'ar' ? 'ar' : 'en')
      setTheme(localStorage.getItem('serva-theme-v2') === 'dark' ? 'dark' : 'light')
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

  function toggleLocale() {
    localStorage.setItem('serva-locale', locale === 'ar' ? 'en' : 'ar')
    window.dispatchEvent(new Event('serva-locale-change'))
  }
  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    localStorage.setItem('serva-theme-v2', next)
    window.dispatchEvent(new CustomEvent('serva-theme-change', { detail: next }))
  }

  return (
    <div ref={shell} className="member-club member-club--editorial">
      <MemberHeader locale={locale} theme={theme} onLocale={toggleLocale} onTheme={toggleTheme} auth={auth} />
      <main id="member-main" tabIndex={-1} className={editorial ? undefined : 'member-pages'}>
        <Outlet context={{ locale, theme }} />
      </main>
      <MemberFooter locale={locale} auth={auth} />
    </div>
  )
}
