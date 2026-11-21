import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import logoLight from '../assets/40love-logo-light.jpg'
import logoDark from '../assets/40love-logo-dark.png'
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

function Icon({ name, size = 18 }) {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
    court: <><rect x="3" y="3" width="18" height="18" rx="1" /><path d="M12 3v18M3 12h18M8 3v18M16 3v18" /></>,
    tag: <><path d="M20 13 13 20 3 10V3h7z" /><circle cx="7.5" cy="7.5" r="1" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    message: <><path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-4-.9L3 21l1.9-4.5A8.5 8.5 0 1 1 21 11.5Z"/><path d="M8 11h8M8 15h5"/></>,
    trophy: <><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0 0 12 0V2Z"/></>,
    arrow: <><path d="M7 17 17 7M7 7h10v10" /></>,
    moon: <path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2Z" />,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M14 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /></>,
    menu: <><path d="M3 6h18M3 12h18M3 18h18" /></>,
    close: <path d="m6 6 12 12M18 6 6 18" />,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.grid}</svg>
}

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [locale, setLocale] = useState(() => localStorage.getItem('serva-locale') || 'en')
  const [theme, setTheme] = useState(() => localStorage.getItem('serva-theme-v2') || 'light')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [now, setNow] = useState('')
  const logo = theme === 'dark' ? logoDark : logoLight
  const copy = LABELS[locale] || LABELS.en
  const isArabic = locale === 'ar'
  const routePath = location.pathname.replace(/\/+$/, '') || '/'
  const currentPage = copy[LINKS.find((item) => item.to === routePath)?.key] || copy.workspace
  const isOverview = routePath === '/admin'

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

  function signOut() {
    logout()
    navigate('/', { replace: true })
  }

  return (
      <AdminLocaleContext.Provider value={locale}>
        <div className={`admin-root ${isArabic ? 'admin-rtl' : ''} ${isOverview ? 'admin-overview-shell' : ''}`}>
          <aside className={`admin-sidebar ${mobileOpen ? 'is-open' : ''}`}>
            <Link className="admin-brand" to="/admin" aria-label="40 Love Padel Club & Cafe admin home" onClick={() => setMobileOpen(false)}>
              <span className="admin-brand-mark"><img src={logo} alt="" /></span>
              <span className="admin-brand-copy"><strong>40 LOVE</strong><small>PADEL CLUB &amp; CAFE</small></span>
            </Link>
            <div className="admin-workspace-label">{copy.workspace}</div>
            <nav id="admin-primary-nav" className="admin-side-nav" aria-label={copy.workspace}>
              {LINKS.map((item) => (
                  <NavLink key={item.to} to={item.to} end={item.end} onClick={() => setMobileOpen(false)} className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}>
                    <Icon name={item.icon} size={18} /><span>{copy[item.key]}</span>{item.key === 'overview' && <i />}
                  </NavLink>
              ))}
            </nav>
            <div className="admin-sidebar-bottom">
              <div className="admin-live-indicator"><span /> <div><strong>{isArabic ? 'النظام متصل' : 'System operational'}</strong><small>{isArabic ? 'تحديثات مباشرة' : 'Booking API connected'}</small></div></div>
              <Link className="admin-public-link" to="/"><Icon name="arrow" size={16} />{copy.publicSite}</Link>
              <div className="admin-sidebar-user">
                <span className="admin-avatar">{(user?.fullName || 'S').trim().slice(0, 1).toUpperCase()}</span>
                <span className="admin-user-details"><strong>{user?.fullName || copy.admin}</strong><small>{copy.admin}</small></span>
                <button type="button" onClick={signOut} aria-label={copy.logout} title={copy.logout}><Icon name="logout" size={17} /></button>
              </div>
            </div>
          </aside>

          {mobileOpen && <button className="admin-mobile-overlay" onClick={() => setMobileOpen(false)} aria-label={isArabic ? 'إغلاق القائمة' : 'Close menu'} />}

          <section className="admin-main-shell">
            <header className="admin-topbar">
              <button type="button" className="admin-mobile-trigger" onClick={() => setMobileOpen((value) => !value)} aria-label={copy.mobileMenu} aria-expanded={mobileOpen} aria-controls="admin-primary-nav"><Icon name={mobileOpen ? 'close' : 'menu'} /></button>
              <div className="admin-breadcrumb"><span>{isArabic ? 'نادي 40 Love للبادل والمقهى' : '40 Love Padel Club & Cafe'}</span><b>/</b><strong>{currentPage}</strong></div>
              <div className="admin-top-actions">
                <span className="admin-date-chip">{now}</span>
                <button type="button" className="admin-icon-button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={copy.theme} title={copy.theme}><Icon name={theme === 'dark' ? 'sun' : 'moon'} /></button>
                <button type="button" className="admin-language-button" onClick={toggleLocale}>{copy.language}</button>
              </div>
            </header>
            <main className="admin-content"><Outlet /></main>
            <footer className="admin-footer"><span>© {new Date().getFullYear()} 40 Love Padel Club &amp; Cafe</span><span>{isArabic ? 'إدارة النادي' : 'Club operations'}</span></footer>
          </section>
        </div>
      </AdminLocaleContext.Provider>
  )
}
