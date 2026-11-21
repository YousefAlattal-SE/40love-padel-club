import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { gsap, ScrollTrigger } from '../animation/gsap'
import SplitText from '../animation/SplitText'
import { scrollToTop } from '../animation/scrollController'
import { FORTYLOVE_CONTENT as C } from '../content'
import logoLight from '../assets/40love-logo-light.jpg'
import logoDark from '../assets/40love-logo-dark.png'
import api from '../api'
import ContactMessageForm from './ContactMessageForm'
import '../landing.css'

const T = (locale, value) => value?.[locale] ?? value?.en ?? value

function isClubOpen() {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Amman', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date())
  const hour = Number(parts.find((part) => part.type === 'hour')?.value || 0)
  return hour >= 7 || hour < 3
}

const iconPaths = {
  arrow: 'M5 12h14M13 6l6 6-6 6',
  chevron: 'M6 9l6 6 6-6',
  menu: 'M4 7h16M4 12h16M4 17h16',
  close: 'M6 6l12 12M18 6L6 18',
  sun: 'M12 3v2M12 19v2M3 12h2M19 12h2M5.64 5.64l1.42 1.42M16.94 16.94l1.42 1.42M18.36 5.64l-1.42 1.42M6.64 17.36l-1.42 1.42M12 7a5 5 0 100 10 5 5 0 000-10z',
  moon: 'M20 14.7A8 8 0 019.3 4 8 8 0 1020 14.7z',
  clock: 'M12 7v5l3 2M21 12a9 9 0 11-18 0 9 9 0 0118 0',
  calendar: 'M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z',
  spark: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z',
  car: 'M5 17h14M6 14l1-5h10l1 5M7 17a1.5 1.5 0 103 0M14 17a1.5 1.5 0 103 0',
  cup: 'M6 7h10v5a5 5 0 01-5 5 5 5 0 01-5-5V7zM16 9h2a2 2 0 010 4h-2M9 21h6M12 17v4',
  racket: 'M7 15c-2-2-2-5 0-7l1-1c2-2 5-2 7 0l1 1c2 2 2 5 0 7l-4 4-3-3 4-4M8 14l-3 3',
  pin: 'M12 21s7-6.1 7-12a7 7 0 10-14 0c0 5.9 7 12 7 12zM12 11a2 2 0 100-4 2 2 0 000 4z',
  check: 'M5 12l4 4L19 6',
  phone: 'M6 3h3l2 5-2 1a13 13 0 005 5l1-2 5 2v3c0 1-1 2-2 2C10.8 19 5 13.2 5 6c0-1 1-2 1-3z',
  instagram: 'M7 3h10a4 4 0 014 4v10a4 4 0 01-4 4H7a4 4 0 01-4-4V7a4 4 0 014-4zM12 8a4 4 0 100 8 4 4 0 000-8zM17.5 6.5h.01',
  whatsapp: 'M20 11.5a8 8 0 01-11.8 7L4 20l1.5-4.1A8 8 0 1120 11.5zM9 9.2c.2 1.7 1.8 3.4 3.4 4.1.5.2.9.1 1.2-.2l.8-.8',
}

function Icon({ name, size = 20, stroke = 1.7 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={iconPaths[name] || iconPaths.spark} /></svg>
}

function Brand() {
  const handleBrandClick = () => {
    // A Link to the current route does not reset scroll automatically.
    // Scroll to the top when the logo is clicked, including on the homepage itself.
    scrollToTop()
  }

  const logo = document.documentElement.dataset.theme === 'dark' ? logoDark : logoLight

  return (
      <Link
          className="video-logo"
          to="/"
          onClick={handleBrandClick}
          aria-label="40 Love Padel Club & Cafe home"
      >
        <span className="video-logo-frame"><img src={logo} alt="40 Love Padel Club & Cafe" /></span>
      </Link>
  )
}

function Reveal({ children, className = '', delay = 0 }) {
  return <div className={className} data-gsap-reveal data-gsap-delay={delay}>{children}</div>
}

function SectionHeading({ eyebrow, title, body, locale, center = false }) {
  return (
      <div className={`section-heading ${center ? 'center' : ''}`} data-gsap-reveal>
        {eyebrow && <div className="kicker">{T(locale, eyebrow)}</div>}
        <h2>{T(locale, title)}</h2>
        {body && <p>{T(locale, body)}</p>}
      </div>
  )
}

function ScrollTo({ id, children, className = '', onClick }) {
  return <a className={className} href={`#${id}`} onClick={onClick}>{children}</a>
}

export default function Home() {
  const [locale, setLocale] = useState(() => localStorage.getItem('serva-locale') || 'en')
  const [theme, setTheme] = useState(() => localStorage.getItem('serva-theme-v2') || 'light')
  const [menuOpen, setMenuOpen] = useState(false)
  const [livePricing, setLivePricing] = useState(null)
  const [faqOpen, setFaqOpen] = useState(0)
  const [galleryOpen, setGalleryOpen] = useState(null)
  const [testimonial, setTestimonial] = useState(0)
  const [scrolled, setScrolled] = useState(false)
  const [openStatus, setOpenStatus] = useState(isClubOpen)
  const homeRef = useRef(null)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = locale
    localStorage.setItem('serva-theme-v2', theme)
    localStorage.setItem('serva-locale', locale)
  }, [locale, theme])

  useEffect(() => {
    let live = true
    api.get('/pricing').then(({ data }) => {
      if (live) setLivePricing(Object.fromEntries(data.map((row) => [row.sport, {
        daytimePrice: Number(row.daytimePrice),
        daytimeTwoHourPrice: Number(row.daytimeTwoHourPrice),
        eveningPrice: Number(row.eveningPrice),
        eveningTwoHourPrice: Number(row.eveningTwoHourPrice),
      }])))
    }).catch(() => {})
    return () => { live = false }
  }, [])

  useLayoutEffect(() => {
    const trigger = ScrollTrigger.create({
      start: 50,
      end: () => Math.max(ScrollTrigger.maxScroll(window) + 1, 51),
      onToggle: (self) => setScrolled(self.isActive),
      onRefresh: (self) => setScrolled(self.scroll() > 50),
    })

    return () => trigger.kill()
  }, [])

  useLayoutEffect(() => {
    const root = homeRef.current
    if (!root) return undefined

    const motionPreference = gsap.matchMedia(root)
    motionPreference.add('(prefers-reduced-motion: no-preference)', () => {
      const context = gsap.context(() => {
        gsap.utils.toArray('[data-gsap-reveal]', root).forEach((element) => {
          gsap.fromTo(element,
            { autoAlpha: 0, y: 24 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.72,
              delay: Number(element.dataset.gsapDelay) || 0,
              ease: 'power3.out',
              clearProps: 'transform,opacity,visibility',
              scrollTrigger: {
                trigger: element,
                start: 'top 88%',
                once: true,
              },
            },
          )
        })

        const hero = root.querySelector('.hero')
        const heroMedia = root.querySelector('.hero-media')
        if (hero && heroMedia) {
          gsap.to(heroMedia, {
            yPercent: 8,
            scale: 1.07,
            ease: 'none',
            scrollTrigger: {
              trigger: hero,
              start: 'top top',
              end: 'bottom top',
              scrub: 0.5,
            },
          })
        }

        const limeGlow = root.querySelector('.hero-ambient__glow--lime')
        const tealGlow = root.querySelector('.hero-ambient__glow--teal')
        const courtLines = root.querySelector('.hero-ambient__court')
        const ambience = gsap.timeline({
          repeat: -1,
          yoyo: true,
          defaults: { duration: 11, ease: 'sine.inOut' },
        })
        if (limeGlow) ambience.to(limeGlow, { x: 22, y: -14, scale: 1.06 }, 0)
        if (tealGlow) ambience.to(tealGlow, { x: -20, y: 16, scale: 1.05 }, 0)
        if (courtLines) ambience.to(courtLines, { rotation: 1.1 }, 0)
      }, root)

      ScrollTrigger.refresh()
      return () => context.revert()
    })

    return () => motionPreference.revert()
  }, [])

  useEffect(() => {
    const syncStatus = () => setOpenStatus(isClubOpen())
    const interval = window.setInterval(syncStatus, 60_000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    const interval = window.setInterval(() => setTestimonial((n) => (n + 1) % C.testimonials.length), 5200)
    return () => window.clearInterval(interval)
  }, [])

  function setLocaleState(next) {
    setLocale(next)
    localStorage.setItem('serva-locale', next)
    window.dispatchEvent(new Event('serva-locale-change'))
  }

  const price = { ...C.pricing.padel, ...livePricing?.padel }
  const rating = C.testimonials[testimonial]

  return (
      <div className="fortylove-site min-h-screen" style={{ position: 'relative' }} ref={homeRef}>
        <header className={`site-nav ${scrolled ? 'scrolled' : ''}`}>
          <div className="nav-shell">
            <Brand />
            <nav className="desktop-nav" aria-label="Primary navigation">
              {C.nav.map((item) => <ScrollTo key={item.id} id={item.id}>{T(locale, item)}</ScrollTo>)}
            </nav>
            <div className="nav-actions">
              <button className="lang-switch" onClick={() => setLocaleState(locale === 'en' ? 'ar' : 'en')} aria-label="Switch language">{locale === 'en' ? 'AR' : 'EN'}</button>
              <button className="icon-btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Toggle color theme"><Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} /></button>
              <Link className="nav-book" to="/book">{T(locale, C.hero.primary)} <Icon name="arrow" size={17} /></Link>
              <button className="mobile-menu-btn icon-btn" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Icon name="menu" size={20} /></button>
            </div>
          </div>
        </header>

        <AnimatePresence>
          {menuOpen && (
              <motion.div className="drawer-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMenuOpen(false)}>
                <motion.aside className="drawer" initial={{ x: locale === 'ar' ? -420 : 420 }} animate={{ x: 0 }} exit={{ x: locale === 'ar' ? -420 : 420 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }} onClick={(e) => e.stopPropagation()}>
                  <div className="drawer-head"><Brand /><button className="icon-btn" onClick={() => setMenuOpen(false)} aria-label="Close menu"><Icon name="close" size={20} /></button></div>
                  <nav className="drawer-links">
                    {C.nav.map((item) => <ScrollTo key={item.id} id={item.id} onClick={() => setMenuOpen(false)}>{T(locale, item)}</ScrollTo>)}
                  </nav>
                  <Link className="drawer-book" to="/book" onClick={() => setMenuOpen(false)}>{T(locale, C.hero.primary)} <Icon name="arrow" size={18} /></Link>
                  <div className="drawer-meta"><span>{C.contact.phone}</span><span>{T(locale, C.contact.hours)}</span></div>
                </motion.aside>
              </motion.div>
          )}
        </AnimatePresence>

        <main>
          <section className="hero" id="top">
            <div className="hero-media" />
            <div className="hero-ambient" aria-hidden="true">
              <span className="hero-ambient__glow hero-ambient__glow--lime" />
              <span className="hero-ambient__glow hero-ambient__glow--teal" />
              <svg className="hero-ambient__court" viewBox="0 0 640 640" fill="none" aria-hidden="true">
                <rect x="108" y="54" width="424" height="532" rx="12" />
                <path d="M320 54v532M108 320h424M190 54v132h260V54M190 586V454h260v132" />
              </svg>
            </div>
            <div className="hero-noise" />
            <div className="hero-vignette" />
            <div className="hero-content shell">
              <Reveal>
                <div className="hero-status"><span className={openStatus ? 'status-dot live' : 'status-dot'} />{openStatus ? (locale === 'en' ? 'Open now · until 3 AM' : 'مفتوح الآن · حتى ٣ صباحًا') : (locale === 'en' ? 'Closed · opens at 7 AM' : 'مغلق · يفتح ٧ صباحًا')}</div>
                <div className="hero-kicker">{T(locale, C.hero.eyebrow)}</div>
                <SplitText key={locale} className="hero-title">
                  {T(locale, C.hero.title).split('\n').map((line, i) => <span key={line} className={i === 2 ? 'hero-line accent-line' : 'hero-line'}>{line}</span>)}
                </SplitText>
                <p className="hero-copy">{T(locale, C.hero.body)}</p>
                <div className="hero-ctas"><Link className="btn btn-accent" to="/book">{T(locale, C.hero.primary)} <Icon name="arrow" size={18} /></Link><ScrollTo id="courts" className="btn btn-ghost">{T(locale, C.hero.secondary)}</ScrollTo></div>
                <div className="cancel-note"><span className="check-circle"><Icon name="check" size={12} /></span>{locale === 'en' ? 'Free cancellation up to 12 hours before your game' : 'إلغاء مجاني حتى 12 ساعة قبل موعد اللعب'}</div>
              </Reveal>
            </div>
            <div className="hero-scroll">{locale === 'en' ? 'Scroll to explore' : 'مرر للاستكشاف'} <span className="scroll-line" /></div>

          </section>

          <section className="stats-strip">
            <div className="shell stat-grid">{C.stats.map((stat, i) => <Reveal key={stat.en} delay={i * 0.06}><div className="stat"><strong>{stat.value}<em>{stat.suffix}</em></strong><span>{T(locale, stat)}</span></div></Reveal>)}</div>
          </section>

          <section className="section shell" id="courts">
            <SectionHeading locale={locale} eyebrow={{ en: 'The club', ar: 'النادي' }} title={{ en: 'One way to play.\nOne place to belong.', ar: 'رياضة واحدة.\nومكان تنتمي إليه.' }} body={{ en: 'Three purpose-built Padel courts, premium surfaces, and night-ready lighting — all in one elevated destination.', ar: 'ثلاثة ملاعب بادل مصممة بعناية، بأسطح فاخرة وإضاءة ليلية، في وجهة راقية واحدة.' }} />
            <div className="court-grid">{C.courts.map((court, i) => <Reveal key={court.key} delay={i * 0.08}><article className="court-card"><div className="court-image-wrap"><img src={court.image} alt={`${T(locale, court.label)} court at 40 Love Padel Club & Cafe`} loading="lazy" /><div className="court-image-overlay" /><span className="court-count">0{court.count} {locale === 'en' ? 'COURTS' : 'ملاعب'}</span></div><div className="court-body"><div className="eyebrow-line">{T(locale, court.label)}</div><h3>{T(locale, court.title).split('\n').map((l) => <span key={l}>{l}</span>)}</h3><p>{T(locale, court.description)}</p><div className="feature-list">{T(locale, court.features).map((f) => <span key={f}>{f}</span>)}</div><Link className="text-link" to={`/book?sport=${court.key}`}>{locale === 'en' ? 'Book now' : 'احجز الآن'} <Icon name="arrow" size={16} /></Link></div></article></Reveal>)}</div>
          </section>

          <section className="section matchmaking-section" id="matchmaking">
            <div className="shell matchmaking-layout">
              <Reveal className="matchmaking-intro">
                <div className="kicker">{locale === 'en' ? '40 LOVE PADEL CLUB & CAFE · MATCHMAKING' : 'المباريات في نادي 40 Love للبادل والمقهى'}</div>
                <h2>{locale === 'en' ? <>Your next game.<br /><span>Your next team.</span></> : <>مباراتك القادمة.<br /><span>وفريقك الجديد.</span></>}</h2>
                <p>{locale === 'en' ? 'Want to play but do not have a full group? Join an upcoming Padel match, reserve your spot, and meet players at your level.' : 'حاب تلعب وما عندك مجموعة كاملة؟ انضم إلى مباراة بادل، واحجز مكانك وتعرّف على لاعبين بمستواك.'}</p>
                <div className="matchmaking-benefits">
                  <span><i>01</i>{locale === 'en' ? 'Browse upcoming matches' : 'تصفّح المباريات القادمة'}</span>
                  <span><i>02</i>{locale === 'en' ? 'Reserve an individual spot' : 'احجز مكانك بشكل فردي'}</span>
                  <span><i>03</i>{locale === 'en' ? 'Pay in person at the club' : 'ادفع عند وصولك للنادي'}</span>
                </div>
                <Link className="btn btn-accent" to="/matchmaking">{locale === 'en' ? 'Find a Match' : 'ابحث عن مباراة'} <Icon name="arrow" size={17} /></Link>
              </Reveal>
              <div className="matchmaking-sport-grid">
                <Reveal delay={0.05}><article className="matchmaking-sport-card sport-padel-card"><span className="matchmaking-sport-symbol">P</span><div><small>{locale === 'en' ? 'PADEL' : 'بادل'}</small><h3>Padel</h3><p>{locale === 'en' ? 'Find a doubles game and fill the open spots.' : 'اعثر على مباراة زوجية وأكمل الأماكن المتاحة.'}</p></div><Link to="/matchmaking" aria-label={locale === 'en' ? 'Find Padel matches' : 'ابحث عن مباريات بادل'}>↗</Link></article></Reveal>
                <div className="matchmaking-note"><Icon name="check" size={17} /><span>{locale === 'en' ? 'No need to organize a full team. See the available spots before you join.' : 'لا تحتاج إلى تنظيم فريق كامل؛ شاهد الأماكن المتاحة قبل الانضمام.'}</span></div>
              </div>
            </div>
          </section>

          <section className="section section-dark" id="booking">
            <div className="shell"><SectionHeading locale={locale} eyebrow={{ en: 'Simple by design', ar: 'بساطة في التصميم' }} title={{ en: 'Book it in\nfour simple steps.', ar: 'احجزها في\nأربع خطوات بسيطة.' }} body={{ en: 'Choose a session from 1 to 20 hours within our daily opening hours. Book up to 7 days ahead or lock in a weekly recurring slot.', ar: 'اختر جلسة من ساعة إلى ٢٠ ساعة ضمن ساعات العمل اليومية. احجز حتى ٧ أيام مسبقًا أو ثبّت موعدًا أسبوعيًا متكررًا.' }} /></div>
            <div className="shell steps-grid">{C.bookingSteps.map((step, i) => <Reveal key={step.number} delay={i * 0.06}><div className="step"><span className="step-no">{step.number}</span><div><h3>{locale === 'en' ? step.enTitle : step.arTitle}</h3><p>{T(locale, step)}</p></div><span className="step-arrow">↗</span></div></Reveal>)}</div>
          </section>

          <section className="section shell" id="pricing">
            <SectionHeading locale={locale} eyebrow={{ en: 'Rates', ar: 'الأسعار' }} title={{ en: 'Clear court pricing.\nChoose your time.', ar: 'أسعار واضحة للملاعب.\nاختر موعدك.' }} body={{ en: 'The booking start time sets the price band, even when a session crosses 6 PM. Longer sessions use the two-hour bundle for every complete pair of hours.', ar: 'يحدد وقت بدء الحجز فئة السعر حتى عند تجاوز الساعة السادسة مساءً. تستخدم الجلسات الأطول سعر الساعتين لكل فترة كاملة من ساعتين.' }} />
            <div className="pricing-head"><strong>Padel</strong><span>{locale === 'en' ? 'Per court · JOD' : 'للملاعب · دينار أردني'}</span></div>
            <div className="price-grid">
              <article className="price-card">
                <span>{locale === 'en' ? 'DAYTIME' : 'الفترة النهارية'}</span>
                <strong>{price.daytimePrice}<em>JOD · 1 hour</em></strong>
                <p>{locale === 'en' ? `2 hours · ${price.daytimeTwoHourPrice} JOD` : `ساعتان · ${price.daytimeTwoHourPrice} دينار`}</p>
                <div className="price-hours"><span>{C.pricing.hours.daytime[locale]}</span></div>
                <div className="price-rule" />
                <small>{locale === 'en' ? '7:00 AM to 6:00 PM' : 'من ٧ صباحًا حتى ٦ مساءً'}</small>
              </article>
              <article className="price-card featured">
                <div className="popular-badge">{locale === 'en' ? 'EVENING' : 'الفترة المسائية'}</div>
                <span>{locale === 'en' ? 'EVENING' : 'الفترة المسائية'}</span>
                <strong>{price.eveningPrice}<em>JOD · 1 hour</em></strong>
                <p>{locale === 'en' ? `2 hours · ${price.eveningTwoHourPrice} JOD` : `ساعتان · ${price.eveningTwoHourPrice} دينار`}</p>
                <div className="price-hours"><span>{C.pricing.hours.evening[locale]}</span></div>
                <div className="price-rule" />
                <small>{locale === 'en' ? '6:00 PM to 3:00 AM' : 'من ٦ مساءً حتى ٣ صباحًا'}</small>
                <Link to="/book" className="btn btn-accent compact">{T(locale, C.hero.primary)} <Icon name="arrow" size={16} /></Link>
              </article>
            </div>
          </section>

          <section className="section shell" id="why">
            <SectionHeading locale={locale} eyebrow={{ en: 'Why 40 Love Padel Club & Cafe', ar: 'لماذا نادي 40 Love للبادل والمقهى' }} title={{ en: 'Built for people who\nactually play.', ar: 'مصمم للناس الذين\nيلعبون فعلًا.' }} />
            <div className="bento-grid">{C.why.map((item, i) => <Reveal key={item.enTitle} className={`bento-${item.size}`} delay={i * 0.04}><article className="bento-card"><div className="bento-icon"><Icon name={item.icon} size={19} /></div><div><h3>{locale === 'en' ? item.enTitle : item.arTitle}</h3><p>{T(locale, item)}</p></div><span className="bento-corner">↗</span></article></Reveal>)}</div>
          </section>

          <section className="section shell" id="gallery">
            <div className="gallery-top"><SectionHeading locale={locale} eyebrow={{ en: '40 Love Padel Club & Cafe', ar: 'في نادي 40 Love للبادل والمقهى' }} title={{ en: 'Nights at 40 Love Padel Club & Cafe.', ar: 'ليالي نادي 40 Love للبادل والمقهى.' }} /><span className="gallery-note">{locale === 'en' ? 'Tap any image to expand.' : 'اضغط على أي صورة للتكبير.'}</span></div>
            <div className="gallery-grid">{C.gallery.map((g, i) => <motion.button key={g.image} className={`gallery-item g${i + 1}`} onClick={() => setGalleryOpen(i)} whileHover={{ y: -6 }}><img src={g.image} alt={locale === 'ar' ? g.altAr : g.alt} loading="lazy" /></motion.button>)}</div>
          </section>

          <section className="section testimonial-section" aria-hidden="true">
            <div className="shell testimonial-shell"><div><div className="kicker">{locale === 'en' ? 'MEMBERS SAY' : 'آراء الأعضاء'}</div><div className="stars">★★★★★</div><AnimatePresence mode="wait"><motion.blockquote key={rating.name} initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={{ duration: 0.35 }}>“{T(locale, rating.quote)}”</motion.blockquote></AnimatePresence><div className="member-quote"><strong>{rating.name}</strong><span>{rating.role}</span></div></div><div className="test-controls"><button className="icon-btn" onClick={() => setTestimonial((testimonial - 1 + C.testimonials.length) % C.testimonials.length)} aria-label="Previous testimonial">←</button><div className="test-dots">{C.testimonials.map((x, i) => <button key={x.name} className={i === testimonial ? 'active' : ''} onClick={() => setTestimonial(i)} aria-label={`Testimonial ${i + 1}`} />)}</div><button className="icon-btn" onClick={() => setTestimonial((testimonial + 1) % C.testimonials.length)} aria-label="Next testimonial">→</button></div></div>
          </section>

          <section className="section shell" id="community">
            <SectionHeading locale={locale} eyebrow={{ en: 'Community', ar: 'المجتمع' }} title={{ en: 'More than a court.', ar: 'أكثر من ملعب.' }} body={{ en: 'Find your people, sharpen your game, and make some noise on court.', ar: 'اعثر على مجتمعك، طوّر لعبتك، واصنع بعض الضجيج في الملعب.' }} />
            <div className="event-grid">{C.events.map((event, i) => <Reveal key={event.tag.en} delay={i * 0.06}><article className="event-card"><div className="eyebrow-line">{T(locale, event.tag)}</div><h3>{T(locale, event.title)}</h3><p>{T(locale, event.body)}</p><span className="event-arrow">↗</span></article></Reveal>)}</div>
            <div className="community-cta"><div><strong>{locale === 'en' ? 'Ready to play with the community?' : 'جاهز للعب مع المجتمع؟'}</strong><span>{locale === 'en' ? 'Join a league and meet your next rival.' : 'انضم لدوري وقابل منافسك القادم.'}</span></div><a href="#contact" className="btn btn-accent">{locale === 'en' ? 'Join a League' : 'انضم لدوري'} <Icon name="arrow" size={17} /></a></div>
          </section>

          <section className="section shell" id="faq">
            <div className="faq-grid"><SectionHeading locale={locale} eyebrow={{ en: 'FAQ', ar: 'الأسئلة الشائعة' }} title={{ en: 'Everything you\nneed to know.', ar: 'كل ما تحتاج\nأن تعرفه.' }} body={{ en: 'Policies below are placeholders ready to be replaced with final club terms.', ar: 'السياسات أدناه مؤقتة وقابلة للاستبدال بشروط النادي النهائية.' }} /><div className="faq-list">{C.faq.map((item, i) => <div className={`faq-item ${faqOpen === i ? 'open' : ''}`} key={item.q.en}><button onClick={() => setFaqOpen(faqOpen === i ? -1 : i)}><span>{T(locale, item.q)}</span><span className="faq-plus">+</span></button><AnimatePresence initial={false}>{faqOpen === i && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}><p>{T(locale, item.a)}</p></motion.div>}</AnimatePresence></div>)}</div></div>
          </section>

          <section className="section location-section" id="contact">
            <div className="shell location-grid">
              <div>
                <SectionHeading locale={locale} eyebrow={{ en: 'Find us', ar: 'تفضل بزيارتنا' }} title={{ en: 'Dahyet Al-Nakheel,\nAmman.', ar: 'ضاحية النخيل،\nعمّان.' }} body={{ en: C.contact.address, ar: 'شارع عثمان نصيف، ضاحية النخيل، عمّان، الأردن' }} />
                <div className="contact-lines">
                  <a href={C.contact.phoneHref}><Icon name="phone" size={17} />{C.contact.phone}</a>
                  <a href="https://40love.club" target="_blank" rel="noreferrer"><span className="web-dot">↗</span>{C.contact.website}</a>
                  <div><Icon name="clock" size={17} />{T(locale, C.contact.hours)}</div>
                </div>
                <div className="location-actions">
                  <a className="btn btn-accent" href="https://www.google.com/maps/place/40+Love+Padel+Club%26Cafe" target="_blank" rel="noreferrer">{locale === 'en' ? 'Get Directions' : 'الاتجاهات'} <Icon name="arrow" size={16} /></a>
                  <a className="btn btn-ghost" href={C.contact.whatsappHref} target="_blank" rel="noreferrer"><Icon name="whatsapp" size={17} /> WhatsApp</a>
                </div>
              </div>
              <div className="map-card google-map-card">
                <iframe title={locale === 'en' ? '40 Love Padel Club & Cafe location on Google Maps' : 'موقع نادي 40 Love للبادل والمقهى على خرائط جوجل'} src="https://www.google.com/maps?q=40+Love+Padel+Club+%26+Cafe+Othman+Naseef+Street+Dahyet+Al-Nakheel+Amman+Jordan&output=embed" loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
                <a className="map-open-link" href="https://www.google.com/maps/search/?api=1&query=40+Love+Padel+Club+%26+Cafe+Othman+Naseef+Street+Dahyet+Al-Nakheel+Amman+Jordan" target="_blank" rel="noreferrer">{locale === 'en' ? 'Open in Google Maps ↗' : 'افتح في خرائط جوجل ↗'}</a>
              </div>
            </div>
            <div className="shell contact-form-wrap">
              <div className="contact-form-intro"><div className="kicker">{locale === 'en' ? 'CONTACT' : 'تواصل'}</div><h3>{locale === 'en' ? 'Have a question?\nSend a note.' : 'عندك سؤال؟\nأرسل لنا رسالة.'}</h3><p>{locale === 'en' ? 'Send your note to the 40 Love Padel Club & Cafe team. Your message will be saved in the admin dashboard.' : 'أرسل رسالتك إلى فريق نادي 40 Love للبادل والمقهى، وستُحفظ لتظهر في لوحة الإدارة.'}</p></div>
              <ContactMessageForm locale={locale} phone={C.contact.phone} />
            </div>
          </section>

          <section className="final-cta shell"><div className="final-card"><div><div className="kicker">{locale === 'en' ? 'YOUR NEXT SESSION' : 'جلستك القادمة'}</div><h2>{locale === 'en' ? <>Ready to play? <span>The court is waiting.</span></> : <>جاهز للعب؟ <span>الملعب بانتظارك.</span></>}</h2><p>{locale === 'en' ? 'Three Padel courts. One great game.' : 'ثلاثة ملاعب بادل. وتجربة لعب رائعة.'}</p></div><Link className="btn btn-dark" to="/book">{T(locale, C.hero.primary)} <Icon name="arrow" size={18} /></Link></div></section>
        </main>

        <footer className="site-footer">
          <div className="shell footer-grid">
            <div><Brand /><p>{locale === 'en' ? 'Premium Padel in Amman, built for the way you want to play.' : 'بادل فاخر في عمّان، مصمم بالطريقة التي تريد أن تلعب بها.'}</p><div className="socials"><a href="https://www.instagram.com/40love.jo" aria-label="Instagram"><Icon name="instagram" size={18} /></a><a href="https://tiktok.com" aria-label="TikTok" className="social-text">t</a><a href={C.contact.whatsappHref} aria-label="WhatsApp" target="_blank" rel="noreferrer"><Icon name="whatsapp" size={18} /></a></div></div>
            <div className="footer-col"><span>{locale === 'en' ? 'Explore' : 'استكشف'}</span>{C.nav.map((item) => <ScrollTo key={item.id} id={item.id}>{T(locale, item)}</ScrollTo>)}</div>
            <div className="footer-col"><span>{locale === 'en' ? 'Visit' : 'زيارة'}</span><span>{C.contact.address}</span><a href={C.contact.phoneHref}>{C.contact.phone}</a><a href="https://40love.club" target="_blank" rel="noreferrer">{C.contact.website}</a></div>
            <div className="footer-col"><span>{locale === 'en' ? 'Court hours' : 'ساعات الملاعب'}</span><strong>{locale === 'en' ? '7:00 AM' : '٧:٠٠ صباحًا'}</strong><small>—</small><strong>{locale === 'en' ? '3:00 AM' : '٣:٠٠ صباحًا'}</strong><Link className="footer-book" to="/book">{locale === 'en' ? 'Book a court' : 'احجز ملعبًا'} <Icon name="arrow" size={15} /></Link></div>
          </div>
          <div className="shell footer-bottom"><span>© {new Date().getFullYear()} 40 LOVE PADEL CLUB & CAFE</span><span>{locale === 'en' ? 'Amman, Jordan' : 'عمّان، الأردن'}</span></div>
        </footer>

        <AnimatePresence>{galleryOpen !== null && <motion.div className="lightbox" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setGalleryOpen(null)}><button className="lightbox-close icon-btn" onClick={() => setGalleryOpen(null)} aria-label="Close"><Icon name="close" size={20} /></button><motion.img initial={{ scale: 0.95 }} animate={{ scale: 1 }} transition={{ duration: 0.25 }} src={C.gallery[galleryOpen].image} alt={locale === 'ar' ? C.gallery[galleryOpen].altAr : C.gallery[galleryOpen].alt} onClick={(e) => e.stopPropagation()} /></motion.div>}</AnimatePresence>
        <Link to="/book" className={`mobile-book-float ${scrolled ? 'show' : ''}`}>{T(locale, C.hero.primary)} <Icon name="arrow" size={16} /></Link>
      </div>
  )
}
