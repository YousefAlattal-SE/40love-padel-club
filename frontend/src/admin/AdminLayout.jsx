import Icon from './AdminIcon'
import { Suspense, useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import logoDark from '../assets/40love-logo-dark.png'
import { AdminDialog, StatePanel } from './AdminUI'
import './admin.css'
import { AdminLocaleContext } from './AdminLocale'

const LINKS = [
  { to: '/admin', key: 'overview', icon: 'grid', end: true },
  { to: '/admin/bookings', key: 'bookings', icon: 'calendar' },
  { to: '/admin/courts', key: 'courts', icon: 'court' },
  { to: '/admin/matchmaking', key: 'matchmaking', icon: 'trophy' },
  { to: '/admin/messages', key: 'messages', icon: 'message' },
  { to: '/admin/pricing', key: 'pricing', icon: 'tag' },
  { to: '/admin/customers', key: 'customers', icon: 'users' },
]

const LABELS = {
  en: { overview: 'Overview', bookings: 'Bookings', courts: 'Courts & availability', matchmaking: 'Matchmaking', messages: 'Contact messages', pricing: 'Pricing', customers: 'Customers', workspace: 'CLUB MANAGEMENT', admin: 'Administrator', publicSite: 'View public site', language: 'العربية', theme: 'Toggle theme', logout: 'Log out', loggedIn: 'SIGNED IN AS', mobileMenu: 'Toggle navigation' },
  ar: { overview: 'نظرة عامة', bookings: 'الحجوزات', courts: 'الملاعب والتوافر', matchmaking: 'المباريات', messages: 'رسائل التواصل', pricing: 'الأسعار', customers: 'العملاء', workspace: 'إدارة النادي', admin: 'مدير النظام', publicSite: 'عرض الموقع', language: 'English', theme: 'تغيير المظهر', logout: 'تسجيل الخروج', loggedIn: 'تم تسجيل الدخول باسم', mobileMenu: 'فتح القائمة' },
}

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [locale, setLocale] = useState(() => localStorage.getItem('serva-locale') === 'ar' ? 'ar' : 'en')
  const [theme, setTheme] = useState(() => localStorage.getItem('serva-theme-v2') || 'light')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [now, setNow] = useState('')
  const copy = LABELS[locale] || LABELS.en
  const isArabic = locale === 'ar'
  const routePath = location.pathname.replace(/\/+$/, '') || '/'
  const currentPage = copy[LINKS.find((item) => item.to === routePath)?.key] || copy.workspace


  function toggleLocale() {
    const next = isArabic ? 'en' : 'ar'
    setLocale(next)
    localStorage.setItem('serva-locale', next)
    window.dispatchEvent(new Event('serva-locale-change'))
  }

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.dir = isArabic ? 'rtl' : 'ltr'
    document.documentElement.lang = locale
    localStorage.setItem('serva-theme-v2', theme)
    localStorage.setItem('serva-locale', locale)
  }, [locale, theme, isArabic])

  useEffect(() => {
    const update = () => setNow(new Intl.DateTimeFormat(locale === 'ar' ? 'ar-JO' : 'en-GB', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Amman' }).format(new Date()))
    update()
    const interval = window.setInterval(update, 60000)
    return () => window.clearInterval(interval)
  }, [locale])

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 901px)')
    const closeOnDesktop = () => { if (desktop.matches) setMobileOpen(false) }
    desktop.addEventListener('change', closeOnDesktop)
    return () => desktop.removeEventListener('change', closeOnDesktop)
  }, [])

  function signOut() {
    logout()
    navigate('/', { replace: true })
  }

  const navigation = <>
    <Link className="admin-brand" to="/admin" aria-label={isArabic ? 'الصفحة الرئيسية للإدارة' : '40 LOVE administration home'} onClick={() => setMobileOpen(false)}>
      <span className="admin-brand-mark"><img src={logoDark} alt="" /></span>
      <span className="admin-brand-copy"><strong>40 LOVE</strong><small>PADEL CLUB &amp; CAFE</small></span>
    </Link>
    <div className="admin-workspace-label">{copy.workspace}</div>
    <nav className="admin-side-nav" aria-label={copy.workspace}>
      {LINKS.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} onClick={() => setMobileOpen(false)} className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}>
            <Icon name={item.icon} size={18} /><span>{copy[item.key]}</span>
          </NavLink>
      ))}
    </nav>
    <div className="admin-sidebar-bottom">
      <Link className="admin-public-link" to="/"><Icon name="arrow" size={16} />{copy.publicSite}</Link>
      <div className="admin-sidebar-user">
        <span className="admin-avatar">{(user?.fullName || 'S').trim().slice(0, 1).toUpperCase()}</span>
        <span className="admin-user-details"><strong><bdi>{user?.fullName || copy.admin}</bdi></strong><small>{copy.admin}</small></span>
        <button type="button" onClick={signOut} aria-label={copy.logout} title={copy.logout}><Icon name="logout" size={17} /></button>
      </div>
    </div>
  </>
  return <AdminLocaleContext.Provider value={locale}>
      <div className="club-operations admin-root">
        <a className="admin-skip" href="#admin-content">{isArabic ? 'انتقل إلى المحتوى' : 'Skip to content'}</a>
        <aside className="admin-sidebar">{navigation}</aside>
        {mobileOpen && <AdminDialog className="admin-nav-dialog" label={copy.workspace} onClose={() => setMobileOpen(false)}>
          <button className="admin-nav-close" onClick={() => setMobileOpen(false)} aria-label={isArabic ? 'إغلاق القائمة' : 'Close navigation'}>×</button>
          {navigation}
        </AdminDialog>}
          <section className="admin-main-shell">
            <header className="admin-topbar">
              <button type="button" className="admin-mobile-trigger" onClick={() => setMobileOpen((value) => !value)} aria-label={copy.mobileMenu} aria-expanded={mobileOpen} aria-haspopup="dialog"><Icon name={mobileOpen ? 'close' : 'menu'} /></button>
              <div className="admin-breadcrumb"><span>{isArabic ? 'نادي 40 Love للبادل والمقهى' : '40 Love Padel Club & Cafe'}</span><b aria-hidden="true">/</b><strong>{currentPage}</strong></div>
              <div className="admin-top-actions">
                <span className="admin-date-chip">{now}</span>
                <button type="button" className="admin-icon-button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={copy.theme} title={copy.theme}><Icon name={theme === 'dark' ? 'sun' : 'moon'} /></button>
                <button type="button" className="admin-language-button" lang={isArabic ? 'en' : 'ar'} onClick={toggleLocale}>{copy.language}</button>
              </div>
            </header>
            <main id="admin-content" className="admin-content" tabIndex={-1}><Suspense fallback={<StatePanel loading label={document.documentElement.lang === 'ar' ? 'جارٍ التحميل…' : 'Loading…'} />}><Outlet /></Suspense></main>
            <footer className="admin-footer"><span>© {new Date().getFullYear()} 40 Love Padel Club &amp; Cafe</span><div><Link to="/terms-of-service">{isArabic ? 'شروط الخدمة' : 'Terms of Service'}</Link><Link to="/privacy-policy">{isArabic ? 'سياسة الخصوصية' : 'Privacy Policy'}</Link></div></footer>
          </section>
        </div>
      </AdminLocaleContext.Provider>
}
