import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from './auth'
import logoLight from './assets/40love-logo-light.jpg'
import logoDark from './assets/40love-logo-dark.png'
import './booking.css'

const NAV_ITEMS = [
    { to: '/courts', en: 'Courts', ar: 'الملاعب' },
    { to: '/pricing', en: 'Pricing', ar: 'الأسعار' },
    { to: '/matchmaking', en: 'Matchmaking', ar: 'المباريات' },
    { to: '/gallery', en: 'Gallery', ar: 'المعرض' },
    { to: '/contact', en: 'Contact', ar: 'تواصل معنا' },
]

const ICONS = {
    arrow: 'M5 12h14M13 6l6 6-6 6',
    menu: 'M4 7h16M4 12h16M4 17h16',
    close: 'M6 6l12 12M18 6L6 18',
    sun: 'M12 3v2M12 19v2M3 12h2M19 12h2M5.64 5.64l1.42 1.42M16.94 16.94l1.42 1.42M18.36 5.64l-1.42 1.42M6.64 17.36l-1.42 1.42M12 7a5 5 0 100 10 5 5 0 000-10z',
    moon: 'M20 14.7A8 8 0 019.3 4 8 8 0 1020 14.7z',
    logout: 'M10 17l5-5-5-5M15 12H3M14 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4',
}

function Icon({ name, size = 18 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={ICONS[name] || ICONS.arrow} />
        </svg>
    )
}

function Brand({ onClick }) {
    const handleBrandClick = () => {
        // A Link to the current route does not reset scroll automatically.
        // Scroll to the top when the logo is clicked, including on the homepage itself.
        window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
    }

    const currentTheme = document.documentElement.dataset.theme || 'light'
    const logo = currentTheme === 'dark' ? logoDark : logoLight

    return (
        <Link
            className="video-logo"
            to="/"
            onClick={(event) => { handleBrandClick(); onClick?.(event) }}
            aria-label="40 Love Padel Club & Cafe home"
        >
            <span className="video-logo-frame"><img src={logo} alt="40 Love Padel Club & Cafe" /></span>
        </Link>
    )
}

function NavigationLinks({ locale, closeMenu = () => {}, user = null }) {
    return (
        <>
            {NAV_ITEMS.map((item) => (
                <NavLink key={item.to} to={item.to} onClick={closeMenu} className={({ isActive }) => isActive ? 'layout-nav-active' : undefined}>
                    {locale === 'ar' ? item.ar : item.en}
                </NavLink>
            ))}
            {user ? (
                <>
                    <NavLink to="/bookings" onClick={closeMenu} className={({ isActive }) => isActive ? 'layout-nav-active' : undefined}>
                        {locale === 'ar' ? 'حجوزاتي' : 'My bookings'}
                    </NavLink>
                    <NavLink to="/my-matchmaking" onClick={closeMenu} className={({ isActive }) => isActive ? 'layout-nav-active' : undefined}>
                        {locale === 'ar' ? 'مبارياتي' : 'My matches'}
                    </NavLink>
                    <NavLink to="/profile" onClick={closeMenu} className={({ isActive }) => isActive ? 'layout-nav-active' : undefined}>
                        {locale === 'ar' ? 'الملف الشخصي' : 'Profile'}
                    </NavLink>
                </>
            ) : (
                <>
                    <NavLink to="/login" onClick={closeMenu} className={({ isActive }) => isActive ? 'layout-nav-active' : undefined}>
                        {locale === 'ar' ? 'تسجيل الدخول' : 'Log in'}
                    </NavLink>
                    <NavLink to="/register" onClick={closeMenu} className={({ isActive }) => isActive ? 'layout-nav-active' : undefined}>
                        {locale === 'ar' ? 'إنشاء حساب' : 'Sign up'}
                    </NavLink>
                </>
            )}
        </>
    )
}

export default function Layout() {
    const { user, logout } = useAuth()
    const [locale, setLocale] = useState(() => localStorage.getItem('serva-locale') || 'en')
    const [theme, setTheme] = useState(() => localStorage.getItem('serva-theme-v2') || 'light')
    const [menuOpen, setMenuOpen] = useState(false)
    const [scrolled, setScrolled] = useState(false)

    useEffect(() => {
        document.documentElement.dataset.theme = theme
        document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr'
        document.documentElement.lang = locale
        localStorage.setItem('serva-theme-v2', theme)
        localStorage.setItem('serva-locale', locale)
    }, [locale, theme])

    useEffect(() => {
        const syncLocale = () => {
            const next = localStorage.getItem('serva-locale')
            if (next === 'en' || next === 'ar') setLocale(next)
        }
        const syncTheme = (event) => {
            const next = event.detail || localStorage.getItem('serva-theme-v2')
            if (next === 'light' || next === 'dark') setTheme(next)
        }
        window.addEventListener('serva-locale-change', syncLocale)
        window.addEventListener('serva-theme-change', syncTheme)
        return () => {
            window.removeEventListener('serva-locale-change', syncLocale)
            window.removeEventListener('serva-theme-change', syncTheme)
        }
    }, [])

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 24)
        handleScroll()
        window.addEventListener('scroll', handleScroll, { passive: true })
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    const isArabic = locale === 'ar'

    function toggleLocale() {
        const next = isArabic ? 'en' : 'ar'
        setLocale(next)
        localStorage.setItem('serva-locale', next)
        window.dispatchEvent(new Event('serva-locale-change'))
    }

    return (
        <div style={{ minHeight: '100vh', position: 'relative' }}>

            <header className={`site-nav ${scrolled ? 'scrolled' : ''} booking-site-nav`}>
                <div className="nav-shell">
                    <Brand />

                    <nav className="desktop-nav" aria-label="Primary navigation">
                        <NavigationLinks locale={locale} user={user} />
                    </nav>

                    <div className="nav-actions booking-nav-actions">
                        <button className="lang-switch" type="button" onClick={toggleLocale} aria-label={isArabic ? 'Switch language to English' : 'تغيير اللغة إلى العربية'}>
                            {isArabic ? 'EN' : 'AR'}
                        </button>
                        <button className="icon-btn" type="button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={isArabic ? 'تغيير المظهر' : 'Toggle color theme'}>
                            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={17} />
                        </button>
                        <Link className="nav-book" to="/book">
                            {isArabic ? 'احجز ملعبًا' : 'Book a Court'} <Icon name="arrow" size={16} />
                        </Link>
                        {user && <div className="booking-nav-account">
              <span className="booking-nav-user" title={user.fullName || ''} aria-label={user.fullName || 'Account'}>
                {(user.fullName || 'S').trim().charAt(0).toUpperCase()}
              </span>
                            <button className="booking-nav-logout" type="button" onClick={logout} aria-label={isArabic ? 'تسجيل الخروج' : 'Log out'} title={isArabic ? 'تسجيل الخروج' : 'Log out'}>
                                <Icon name="logout" size={16} />
                            </button>
                        </div>}
                        <button className="mobile-menu-btn icon-btn" type="button" onClick={() => setMenuOpen(true)} aria-label={isArabic ? 'فتح القائمة' : 'Open menu'}>
                            <Icon name="menu" size={19} />
                        </button>
                    </div>
                </div>
            </header>

            <AnimatePresence>
                {menuOpen && (
                    <motion.div className="drawer-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMenuOpen(false)}>
                        <motion.aside
                            className="drawer"
                            initial={{ x: isArabic ? -420 : 420 }}
                            animate={{ x: 0 }}
                            exit={{ x: isArabic ? -420 : 420 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                            onClick={(event) => event.stopPropagation()}
                            aria-label={isArabic ? 'القائمة الرئيسية' : 'Main menu'}
                        >
                            <div className="drawer-head">
                                <Brand onClick={() => setMenuOpen(false)} />
                                <button className="icon-btn" type="button" onClick={() => setMenuOpen(false)} aria-label={isArabic ? 'إغلاق القائمة' : 'Close menu'}>
                                    <Icon name="close" size={19} />
                                </button>
                            </div>
                            <nav className="drawer-links" aria-label="Mobile navigation">
                                <NavigationLinks locale={locale} closeMenu={() => setMenuOpen(false)} user={user} />
                            </nav>
                            <Link className="drawer-book" to="/book" onClick={() => setMenuOpen(false)}>
                                {isArabic ? 'احجز ملعبًا' : 'Book a Court'} <Icon name="arrow" size={17} />
                            </Link>
                            {user && <div className="drawer-meta booking-drawer-meta">
                                <span>{user.fullName}</span>
                                <button type="button" onClick={logout}>{isArabic ? 'تسجيل الخروج' : 'Log out'} <Icon name="logout" size={14} /></button>
                            </div>}
                        </motion.aside>
                    </motion.div>
                )}
            </AnimatePresence>

            <main className="page booking-layout-main">
                <Outlet />
            </main>
        </div>
    )
}
