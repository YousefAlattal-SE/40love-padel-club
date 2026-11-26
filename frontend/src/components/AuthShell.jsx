import { useId, useLayoutEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import logo from '../assets/40love-logo-dark.png'
import '../club-foundation.css'
import '../auth-pages.css'

const WORDS = {
  en: {
    home: '40 LOVE, back to the website', venue: 'Padel Club & Café', skip: 'Skip to the form',
    preferences: 'Display preferences', language: 'العربية', languageLabel: 'التبديل إلى العربية',
    dark: 'Use dark theme', light: 'Use light theme', back: 'Back to website',
    terms: 'Terms of Service', privacy: 'Privacy Policy', legal: 'Legal',
  },
  ar: {
    home: '40 LOVE، العودة إلى الموقع', venue: 'نادي البادل والمقهى', skip: 'تخطَّ إلى النموذج',
    preferences: 'تفضيلات العرض', language: 'English', languageLabel: 'Switch to English',
    dark: 'تفعيل المظهر الداكن', light: 'تفعيل المظهر الفاتح', back: 'العودة إلى الموقع',
    terms: 'شروط الخدمة', privacy: 'سياسة الخصوصية', legal: 'روابط قانونية',
  },
}

function ThemeSymbol() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="6.6" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 3.4a6.6 6.6 0 0 1 0 13.2Z" fill="currentColor" />
    </svg>
  )
}

/**
 * Shared frame for every authentication screen (member sign-in, sign-up, staff sign-in and
 * the Clerk password-reset / verification steps they host). It deliberately has no member
 * navigation, so nothing from the member site appears while a role is being verified.
 */
export default function AuthShell({ preferences, variant = 'member', eyebrow, title, intro, image, imageAlt, children }) {
  const { locale, theme, toggleLocale, toggleTheme } = preferences
  const words = WORDS[locale] || WORDS.en
  const ar = locale === 'ar'
  const titleId = useId()
  const shell = useRef(null)

  useLayoutEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]')
    if (!meta || !shell.current) return undefined
    const previous = meta.content
    meta.content = getComputedStyle(shell.current).getPropertyValue('--club-bg').trim() || previous
    return () => { meta.content = previous }
  }, [theme])

  return (
    <div ref={shell} className={`club-operations auth-shell auth-shell--${variant}`} dir={ar ? 'rtl' : 'ltr'} lang={locale}>
      <a className="auth-skip" href="#auth-main">{words.skip}</a>
      <header className="auth-bar">
        <Link className="auth-brand" to="/" aria-label={words.home}>
          <img src={logo} alt="" width="40" height="40" />
          <span><strong lang="en" dir="ltr">40 LOVE</strong><small>{words.venue}</small></span>
        </Link>
        <div className="auth-tools" role="group" aria-label={words.preferences}>
          <button type="button" className="auth-tool" onClick={toggleLocale} lang={ar ? 'en' : 'ar'} aria-label={words.languageLabel}>
            {words.language}
          </button>
          <button type="button" className="auth-tool auth-tool--icon" onClick={toggleTheme}
            aria-label={theme === 'dark' ? words.light : words.dark} title={theme === 'dark' ? words.light : words.dark}>
            <ThemeSymbol />
          </button>
        </div>
      </header>

      <main id="auth-main" className="auth-main" tabIndex={-1}>
        <section className="auth-panel" aria-labelledby={titleId}>
          {eyebrow && <p className="auth-eyebrow">{eyebrow}</p>}
          <h1 id={titleId}>{title}</h1>
          {intro && <p className="auth-intro">{intro}</p>}
          <div className="auth-body">{children}</div>
          <Link className="auth-back" to="/">{words.back}</Link>
        </section>
        {image && (
          <figure className="auth-figure">
            <img src={image} alt={imageAlt || ''} loading="lazy" decoding="async" />
          </figure>
        )}
      </main>

      <footer className="auth-foot">
        <small dir="ltr">© {new Date().getFullYear()} 40 LOVE Padel Club &amp; Cafe</small>
        <nav aria-label={words.legal}>
          <Link to="/terms-of-service">{words.terms}</Link>
          <Link to="/privacy-policy">{words.privacy}</Link>
        </nav>
      </footer>
    </div>
  )
}

/** Loading, error and notice states shown inside the auth frame instead of the Clerk form. */
export function AuthStatus({ kind = 'loading', message, detail, actions }) {
  if (kind === 'loading') {
    return (
      <div className="auth-status" role="status" aria-live="polite">
        <span className="auth-spinner" aria-hidden="true" />
        <p>{message}</p>
      </div>
    )
  }
  return (
    <div className={`auth-status auth-status--${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      <p className="auth-status-title">{message}</p>
      {detail && <p className="auth-status-detail">{detail}</p>}
      {actions && <div className="auth-actions">{actions}</div>}
    </div>
  )
}
