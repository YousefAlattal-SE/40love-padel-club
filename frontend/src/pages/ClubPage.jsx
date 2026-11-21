import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { FORTYLOVE_CONTENT as C } from '../content'
import logoLight from '../assets/40love-logo-light.jpg'
import logoDark from '../assets/40love-logo-dark.png'
import api from '../api'
import ContactMessageForm from './ContactMessageForm'
import './my-bookings.css'
import './club-pages.css'

const PAGE_COPY = {
  en: {
    '/courts': {
      tag: 'YOUR CLUB', title: 'Three courts,', titleAccent: 'one way to play.',
      body: 'Every court at 40 Love Padel Club & Cafe is floodlit, professionally surfaced and maintained daily. Book by the hour, up to a week ahead.',
      summaryLabel: 'PADEL COURTS', summaryFoot: 'Floodlit and open every day',
      sectionTitle: 'Choose your court', sectionHint: 'A premium Padel session, with everything ready for your next game.',
      includedTitle: 'Every court comes with', includedHint: 'Thoughtful details for a better session.',
      book: 'Book a Court',
    },
    '/pricing': {
      tag: 'COURT PRICING', title: 'Clear court pricing,', titleAccent: 'choose your time.',
      body: 'Daytime is 7:00 AM–6:00 PM. Evening is 6:00 PM–3:00 AM. The booking start time sets the rate when a session crosses 6:00 PM; each complete two-hour pair uses the bundle price.',
      summaryLabel: 'RATE OPTIONS', summaryFoot: 'Hourly and two-hour sessions',
      sectionTitle: 'Choose a time', sectionHint: 'Straightforward rates for every court session.',
      checkAvailability: 'Check Availability',
    },
    '/gallery': {
      tag: 'THE CLUB IN PICTURES', title: 'Nights at', titleAccent: '40 Love Padel Club & Cafe.',
      body: 'Floodlit courts, late finishes and match play under the lights. Tap any photo to view it full size.',
      summaryLabel: 'CLUB PHOTOS', summaryFoot: 'Courts and lounge',
      sectionTitle: 'Inside 40 Love', sectionHint: 'A closer look at the courts and the club lounge.',
      viewImage: 'View photo',
    },
    '/contact': {
      tag: 'CONTACT', title: 'Visit', titleAccent: '40 Love Padel Club & Cafe.',
      body: 'Open every day, including weekends. Our courts operate from 7:00 AM until 3:00 AM the following day.',
      summaryLabel: 'HOURS OPEN', summaryFoot: 'Every day, including weekends',
      sectionTitle: 'Plan your visit', sectionHint: 'Everything you need to find us or get in touch.',
      formTitle: 'Have a question?', formAccent: 'Send a note.',
      formDescription: 'Send your note to the 40 Love Padel Club & Cafe team. Your message will be saved in the admin dashboard.',
      phone: 'Phone', website: 'Website', address: 'Address', hours: 'Opening hours',
    },
  },
  ar: {
    '/courts': {
      tag: 'ناديك', title: 'ثلاثة ملاعب،', titleAccent: 'وطريقة واحدة للعب.',
      body: 'جميع ملاعب 40 Love Padel Club & Cafe مضاءة ومجهزة بأرضيات احترافية وتتم صيانتها يوميًا. احجز بالساعة حتى أسبوع مسبقًا.',
      summaryLabel: 'ملاعب بادل', summaryFoot: 'مضاءة ومفتوحة يوميًا',
      sectionTitle: 'اختر ملعبك', sectionHint: 'جلسة بادل مميزة، وكل شيء جاهز لمباراتك القادمة.',
      includedTitle: 'مزايا كل ملعب', includedHint: 'تفاصيل مدروسة لتجربة لعب أفضل.',
      book: 'احجز ملعبًا',
    },
    '/pricing': {
      tag: 'أسعار الملاعب', title: 'أسعار واضحة،', titleAccent: 'اختر موعدك.',
      body: 'الفترة النهارية من ٧ صباحًا حتى ٦ مساءً، والمسائية من ٦ مساءً حتى ٣ صباحًا. يحدد وقت بدء الحجز فئة السعر عند تجاوز الساعة السادسة، ويُطبّق سعر الباقتين لكل ساعتين كاملتين.',
      summaryLabel: 'خيارات الأسعار', summaryFoot: 'بالساعة أو لساعتين',
      sectionTitle: 'اختر موعدك', sectionHint: 'أسعار واضحة لكل جلسة في الملعب.',
      checkAvailability: 'تحقق من التوفر',
    },
    '/gallery': {
      tag: 'النادي بالصور', title: 'ليالٍ في', titleAccent: '40 Love Padel Club & Cafe.',
      body: 'ملاعب مضاءة ومباريات ليلية. اضغط على أي صورة لمشاهدتها بالحجم الكامل.',
      summaryLabel: 'صور النادي', summaryFoot: 'الملاعب والصالة',
      sectionTitle: 'داخل 40 Love', sectionHint: 'نظرة أقرب على الملاعب وصالة النادي.',
      viewImage: 'عرض الصورة',
    },
    '/contact': {
      tag: 'تواصل معنا', title: 'زر', titleAccent: '40 Love Padel Club & Cafe.',
      body: 'نفتح يوميًا، بما في ذلك عطلة نهاية الأسبوع. تعمل الملاعب من ٧ صباحًا حتى ٣ صباحًا من اليوم التالي.',
      summaryLabel: 'ساعات العمل', summaryFoot: 'يوميًا، بما في ذلك عطلة الأسبوع',
      sectionTitle: 'خطط لزيارتك', sectionHint: 'كل ما تحتاجه للوصول إلينا أو للتواصل معنا.',
      formTitle: 'لديك سؤال؟', formAccent: 'أرسل لنا رسالة.',
      formDescription: 'أرسل رسالتك إلى فريق نادي 40 Love للبادل والمقهى، وستُحفظ لتظهر في لوحة الإدارة.',
      phone: 'الهاتف', website: 'الموقع الإلكتروني', address: 'العنوان', hours: 'ساعات العمل',
    },
  },
}

const COURTS = [
  {
    key: 'padel', count: 3, name: 'Padel', nameAr: 'بادل',
    description: 'Three glass-walled Padel courts with panoramic viewing, built for competitive games and social sessions.',
    descriptionAr: 'ثلاثة ملاعب بادل بجدران زجاجية وإطلالة بانورامية، مناسبة للمباريات التنافسية والجلسات الاجتماعية.',
    image: C.courts.find((court) => court.key === 'padel')?.image,
    features: ['Floodlit for night play', 'Glass walls & panoramic view', 'Premium turf surface', 'Rackets & balls available'],
    featuresAr: ['إضاءة للمباريات الليلية', 'جدران زجاجية وإطلالة بانورامية', 'أرضية عشبية فاخرة', 'مضارب وكرات متوفرة'],
  },
]

const INCLUDED = [
  {
    icon: 'clock', title: 'Floodlit until 3 AM', titleAr: 'ملاعب مضاءة حتى ٣ صباحًا',
    body: 'Match-quality lighting on all three Padel courts, every night.', bodyAr: 'إضاءة بجودة المباريات في ملاعب البادل الثلاثة كل ليلة.',
  },
  {
    icon: 'pulse', title: 'Pro-quality surfaces', titleAr: 'أرضيات بمواصفات احترافية',
    body: 'Maintained daily and resurfaced on schedule, never patched.', bodyAr: 'صيانة يومية وتجديد منتظم للأرضيات.',
  },
  {
    icon: 'pin', title: 'Free on-site parking', titleAr: 'مواقف مجانية في الموقع',
    body: 'Park at the entrance — no circling the block before your game.', bodyAr: 'اركن عند المدخل مباشرة قبل مباراتك.',
  },
]

function formatNumber(value, locale) {
  return Number(value || 0).toLocaleString(locale === 'ar' ? 'ar-JO' : 'en-GB', { maximumFractionDigits: 2 })
}

function galleryAlt(item, locale) {
  return locale === 'ar' ? (item.altAr || item.alt) : item.alt
}

function Icon({ name, size = 18 }) {
  const paths = {
    clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3 2" /></>,
    pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    phone: <path d="M7 3h3l2 5-2 1a13 13 0 0 0 5 5l1-2 5 2v3c0 1-1 2-2 2C10 19 5 14 5 7c0-2 1-3 2-4Z" />,
    web: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" /></>,
    check: <path d="m5 12 4 4L19 6" />,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.check}</svg>
}

function SectionHeading({ number, title, hint, count, countLabel, locale }) {
  const isArabic = locale === 'ar'
  return (
    <div className="mb-section-heading">
      <div>
        <span className="mb-section-kicker">{number} / {isArabic ? 'استكشف' : 'EXPLORE'}</span>
        <h2>{title}</h2>
        <p>{hint}</p>
      </div>
      {count !== undefined && <span className="mb-count-pill">{formatNumber(count, locale)} <span>{countLabel}</span></span>}
    </div>
  )
}

function PageFooter({ locale }) {
  const isArabic = locale === 'ar'
  return (
    <footer className="club-footer">
      <div className="club-footer-grid">
        <div className="club-footer-brand">
          <Link to="/" aria-label="40 Love Padel Club & Cafe home">
            <img className="club-footer-logo-light" src={logoLight} alt="40 Love Padel Club & Cafe" />
            <img className="club-footer-logo-dark" src={logoDark} alt="40 Love Padel Club & Cafe" />
          </Link>
          <p>{isArabic ? 'يضم 40 Love Padel Club & Cafe ثلاثة ملاعب بادل فاخرة ومضاءة في عمّان، وتبقى مفتوحة حتى ٣ صباحًا.' : '40 Love Padel Club & Cafe offers three premium, floodlit Padel courts in Amman, open until 3 AM.'}</p>
          <div className="club-footer-contact">
            <span><Icon name="pin" size={15} />{isArabic ? 'شارع عثمان نصيف، ضاحية النخيل، عمّان، الأردن' : C.contact.address}</span>
            <a href={C.contact.phoneHref}><Icon name="phone" size={15} />{C.contact.phone}</a>
            <span><Icon name="clock" size={15} />{C.contact.hours[locale]}</span>
          </div>
        </div>
        <div className="club-footer-links">
          <span>{isArabic ? 'استكشف' : 'EXPLORE'}</span>
          <Link to="/courts">{isArabic ? 'الملاعب' : 'Our Courts'}</Link>
          <Link to="/pricing">{isArabic ? 'الأسعار' : 'Pricing'}</Link>
          <Link to="/matchmaking">{isArabic ? 'المباريات' : 'Matchmaking'}</Link>
          <Link to="/gallery">{isArabic ? 'المعرض' : 'Gallery'}</Link>
          <Link to="/contact">{isArabic ? 'تواصل معنا' : 'Contact'}</Link>
        </div>
        <div className="club-footer-links club-footer-visit">
          <span>{isArabic ? 'زيارة' : 'VISIT'}</span>
          <p>{isArabic ? 'نرحب بالزوار، لكن الحجز المسبق يضمن توفر الملعب.' : 'Walk-ins welcome, but booking ahead guarantees your court.'}</p>
          <Link className="club-footer-book" to="/book">{isArabic ? 'احجز ملعبًا' : 'Book a Court'} <span aria-hidden="true">→</span></Link>
          <a className="club-footer-book" href="https://40love.club" target="_blank" rel="noreferrer">40love.club <span aria-hidden="true">↗</span></a>
          <div className="club-footer-socials" aria-label={isArabic ? 'روابط التواصل الاجتماعي' : 'Social links'}>
            <a href="https://www.instagram.com/40love.jo" target="_blank" rel="noreferrer" aria-label="Instagram">◎</a>
            <a href="https://tiktok.com" target="_blank" rel="noreferrer" aria-label="TikTok">t</a>
            <a href={C.contact.whatsappHref} target="_blank" rel="noreferrer" aria-label="WhatsApp">◔</a>
          </div>
        </div>
      </div>
      <div className="club-footer-bottom">
        <span>{isArabic ? `© ${new Date().getFullYear()} 40 Love Padel Club & Cafe. جميع الحقوق محفوظة.` : `© ${new Date().getFullYear()} 40 Love Padel Club & Cafe. All rights reserved.`}</span>
        <div><a href="https://40love.club" target="_blank" rel="noreferrer">40love.club</a></div>
      </div>
    </footer>
  )
}

function CourtCard({ court, pricing, locale, copy }) {
  const isArabic = locale === 'ar'
  const courtName = isArabic ? court.nameAr : court.name
  const rates = { ...C.pricing.padel, ...pricing }
  const ratePeriods = [
    {
      key: 'daytime',
      label: isArabic ? 'نهاري · ٧ صباحًا–٦ مساءً' : 'DAYTIME · 7:00 AM–6:00 PM',
      price: rates.daytimePrice,
      bundle: rates.daytimeTwoHourPrice,
    },
    {
      key: 'evening',
      label: isArabic ? 'مسائي · ٦ مساءً–٣ صباحًا' : 'EVENING · 6:00 PM–3:00 AM',
      price: rates.eveningPrice,
      bundle: rates.eveningTwoHourPrice,
    },
  ]

  return (
    <article className="mb-booking-card club-court-card">
      <div className="club-court-image"><img src={court.image} alt={isArabic ? `ملعب ${courtName} في 40 Love Padel Club & Cafe` : `${court.name} court at 40 Love Padel Club & Cafe`} loading="lazy" /></div>
      <div className="club-court-content">
        <div className="mb-booking-eyebrow"><span>{isArabic ? `${formatNumber(court.count, locale)} ملاعب` : `${court.count} COURTS`}</span></div>
        <h3>{courtName}</h3>
        <p className="club-court-description">{isArabic ? court.descriptionAr : court.description}</p>
        <div className="club-feature-list">
          {(isArabic ? court.featuresAr : court.features).map((feature) => <span key={feature}><Icon name="check" size={14} />{feature}</span>)}
        </div>
        <div className="club-court-rates">
          {ratePeriods.map((period) => (
            <div className="club-rate-card" key={period.key}>
              <small>{period.label}</small>
              <strong>{formatNumber(period.price, locale)} <em>{isArabic ? 'دينار · ساعة' : 'JOD · 1 hour'}</em></strong>
              <span>{isArabic ? `ساعتان · ${formatNumber(period.bundle, locale)} دينار` : `2 hours · ${formatNumber(period.bundle, locale)} JOD`}</span>
            </div>
          ))}
        </div>
        <p className="club-rate-note">{isArabic ? 'يعتمد السعر على وقت بدء الحجز. تُحتسب كل ساعتين كاملتين بسعر باقة الساعتين.' : 'The rate is based on the booking start time. Each complete pair of hours uses the two-hour price.'}</p>
        <Link className="btn btn-accent club-action-button" to={`/book?sport=${court.key}`}>{copy.book}<span aria-hidden="true">→</span></Link>
      </div>
    </article>
  )
}

function ClubPage() {
  const path = useLocation().pathname
  const [livePricing, setLivePricing] = useState({})
  const [locale, setLocale] = useState(() => localStorage.getItem('serva-locale') === 'ar' ? 'ar' : 'en')
  const [galleryOpen, setGalleryOpen] = useState(null)
  const isArabic = locale === 'ar'
  const copy = PAGE_COPY[locale][path] || PAGE_COPY[locale]['/courts']
  const pricing = { ...C.pricing.padel, ...livePricing.padel }

  useEffect(() => {
    const syncLocale = () => setLocale(localStorage.getItem('serva-locale') === 'ar' ? 'ar' : 'en')
    window.addEventListener('serva-locale-change', syncLocale)
    return () => window.removeEventListener('serva-locale-change', syncLocale)
  }, [])

  useEffect(() => {
    let live = true
    api.get('/pricing').then(({ data }) => {
      if (live) {
        setLivePricing(Object.fromEntries(data.map((row) => [row.sport, {
          daytimePrice: Number(row.daytimePrice),
          daytimeTwoHourPrice: Number(row.daytimeTwoHourPrice),
          eveningPrice: Number(row.eveningPrice),
          eveningTwoHourPrice: Number(row.eveningTwoHourPrice),
        }])))
      }
    }).catch(() => {})
    return () => { live = false }
  }, [])

  useEffect(() => {
    if (galleryOpen === null) return undefined
    const closeOnEscape = (event) => { if (event.key === 'Escape') setGalleryOpen(null) }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [galleryOpen])

  const summaryValue = path === '/courts'
    ? String(C.courts[0]?.count || 0).padStart(2, '0')
    : path === '/pricing'
      ? '04'
      : path === '/gallery'
        ? String(C.gallery.length).padStart(2, '0')
        : formatNumber((C.hours.closeHour - C.hours.openHour + 24) % 24, locale)

  return (
    <div className="my-bookings-page club-detail-page" dir={isArabic ? 'rtl' : 'ltr'} lang={locale}>
      <Link className="club-back-home" to="/">{isArabic ? '→ العودة للرئيسية' : '← Back to home'}</Link>
      <header className="mb-page-hero">
        <div className="mb-hero-copy">
          <span className="mb-page-tag"><span className="mb-page-tag-dot" />{copy.tag}</span>
          <h1>{copy.title}<br /><span>{copy.titleAccent}</span></h1>
          <p>{copy.body}</p>
          {path === '/courts' && <Link className="btn btn-accent club-action-button club-hero-action" to="/book">{copy.book}<span aria-hidden="true">→</span></Link>}
          {path === '/pricing' && <Link className="btn btn-accent club-action-button club-hero-action" to="/book">{copy.checkAvailability}<span aria-hidden="true">→</span></Link>}
        </div>
        <aside className="mb-hero-summary" aria-label={copy.summaryLabel}>
          <span className="mb-summary-label">{copy.summaryLabel}</span>
          <strong>{summaryValue}</strong>
          <span className="mb-summary-foot"><i />{copy.summaryFoot}</span>
        </aside>
      </header>

      {path === '/courts' && (
        <>
          <section className="mb-bookings-section" aria-labelledby="club-courts-heading">
            <div className="mb-section-heading">
              <div>
                <span className="mb-section-kicker">01 / {isArabic ? 'الملاعب' : 'THE COURTS'}</span>
                <h2 id="club-courts-heading">{copy.sectionTitle}</h2>
                <p>{copy.sectionHint}</p>
              </div>
              <span className="mb-count-pill">{formatNumber(C.courts[0]?.count || 0, locale)} <span>{isArabic ? 'ملاعب' : 'courts'}</span></span>
            </div>
            <div className="club-court-list">
              {COURTS.map((court) => <CourtCard key={court.key} court={court} pricing={livePricing[court.key]} locale={locale} copy={copy} />)}
            </div>
          </section>

          <section className="mb-bookings-section club-included-section" aria-labelledby="club-included-heading">
            <div className="mb-section-heading">
              <div>
                <span className="mb-section-kicker">02 / {isArabic ? 'المزايا' : 'THE DETAILS'}</span>
                <h2 id="club-included-heading">{copy.includedTitle}</h2>
                <p>{copy.includedHint}</p>
              </div>
            </div>
            <div className="club-included-grid">
              {INCLUDED.map((item) => (
                <article className="mb-booking-card club-included-card" key={item.title}>
                  <span className="club-included-icon"><Icon name={item.icon} size={19} /></span>
                  <h3>{isArabic ? item.titleAr : item.title}</h3>
                  <p>{isArabic ? item.bodyAr : item.body}</p>
                </article>
              ))}
            </div>
          </section>
        </>
      )}

      {path === '/pricing' && (
        <section className="mb-bookings-section" aria-labelledby="club-pricing-heading">
          <SectionHeading number="01" title={copy.sectionTitle} hint={copy.sectionHint} count={2} countLabel={isArabic ? 'فترتان' : 'time periods'} locale={locale} />
          <div className="club-pricing-grid">
            {[
              { key: 'daytime', label: isArabic ? 'نهاري' : 'DAYTIME', hours: isArabic ? '٧ صباحًا — ٦ مساءً' : '7:00 AM — 6:00 PM', price: pricing.daytimePrice, bundle: pricing.daytimeTwoHourPrice },
              { key: 'evening', label: isArabic ? 'مسائي' : 'EVENING', hours: isArabic ? '٦ مساءً — ٣ صباحًا' : '6:00 PM — 3:00 AM', price: pricing.eveningPrice, bundle: pricing.eveningTwoHourPrice },
            ].map((period) => (
              <article className="mb-booking-card club-pricing-card" key={period.key}>
                <div className="mb-booking-eyebrow"><span>{isArabic ? 'بادل' : 'PADEL'}</span><i /><span>{period.label}</span></div>
                <h3>{period.hours}</h3>
                <div className="club-price-row"><strong>{formatNumber(period.price, locale)} <em>{isArabic ? 'دينار · ساعة' : 'JOD · 1 hour'}</em></strong><span>{isArabic ? 'لكل ملعب' : 'per court'}</span></div>
                <div className="club-price-bundle"><span>{isArabic ? 'ساعتان' : '2 hours'}</span><strong>{formatNumber(period.bundle, locale)} {isArabic ? 'دينار' : 'JOD'}</strong></div>
              </article>
            ))}
          </div>
        </section>
      )}

      {path === '/gallery' && (
        <section className="mb-bookings-section" aria-labelledby="club-gallery-heading">
          <SectionHeading number="01" title={copy.sectionTitle} hint={copy.sectionHint} count={C.gallery.length} countLabel={isArabic ? 'صور' : 'photos'} locale={locale} />
          <div className="club-gallery-grid">
            {C.gallery.map((galleryItem, index) => {
              const alt = galleryAlt(galleryItem, locale)
              return (
                <button className="mb-booking-card club-gallery-card" type="button" key={`${galleryItem.alt}-${index}`} onClick={() => setGalleryOpen(index)} aria-label={`${copy.viewImage}: ${alt}`}>
                  <img src={galleryItem.image} alt={alt} loading="lazy" />
                  <span>{copy.viewImage}<b aria-hidden="true">↗</b></span>
                </button>
              )
            })}
          </div>
        </section>
      )}

      {path === '/contact' && (
        <>
          <section className="mb-bookings-section" aria-labelledby="club-contact-heading">
            <SectionHeading number="01" title={copy.sectionTitle} hint={copy.sectionHint} count={4} countLabel={isArabic ? 'طرق تواصل' : 'contact details'} locale={locale} />
            <div className="club-contact-grid">
              <article className="mb-booking-card club-contact-card">
                <span className="club-contact-icon"><Icon name="phone" /></span>
                <div><span className="mb-booking-eyebrow">{copy.phone}</span><a href={C.contact.phoneHref}>{C.contact.phone}</a></div>
              </article>
              <article className="mb-booking-card club-contact-card">
                <span className="club-contact-icon"><Icon name="web" /></span>
                <div><span className="mb-booking-eyebrow">{copy.website}</span><a href="https://40love.club" target="_blank" rel="noreferrer">{C.contact.website}</a></div>
              </article>
              <article className="mb-booking-card club-contact-card">
                <span className="club-contact-icon"><Icon name="pin" /></span>
                <div><span className="mb-booking-eyebrow">{copy.address}</span><p>{isArabic ? 'شارع عثمان نصيف، ضاحية النخيل، عمّان، الأردن' : C.contact.address}</p></div>
              </article>
              <article className="mb-booking-card club-contact-card">
                <span className="club-contact-icon"><Icon name="clock" /></span>
                <div><span className="mb-booking-eyebrow">{copy.hours}</span><p>{C.contact.hours[locale]}</p></div>
              </article>
            </div>
          </section>

          <section className="mb-bookings-section club-contact-form-section" aria-labelledby="club-contact-form-heading">
            <div className="mb-section-heading">
              <div>
                <span className="mb-section-kicker">02 / {isArabic ? 'أرسل رسالة' : 'SEND A MESSAGE'}</span>
                <h2 id="club-contact-form-heading">{copy.formTitle} {copy.formAccent}</h2>
                <p>{copy.formDescription}</p>
              </div>
            </div>
            <div className="mb-booking-card club-contact-form-card">
              <ContactMessageForm locale={locale} phone={C.contact.phone} variant="club" />
            </div>
          </section>
        </>
      )}

      <PageFooter locale={locale} />

      {galleryOpen !== null && C.gallery[galleryOpen] && (
        <div className="club-lightbox" role="dialog" aria-modal="true" aria-label={galleryAlt(C.gallery[galleryOpen], locale)} onClick={(event) => { if (event.target === event.currentTarget) setGalleryOpen(null) }}>
          <button className="club-lightbox-close" type="button" onClick={() => setGalleryOpen(null)} aria-label={isArabic ? 'إغلاق' : 'Close image'}>×</button>
          <img src={C.gallery[galleryOpen].image} alt={galleryAlt(C.gallery[galleryOpen], locale)} />
        </div>
      )}
    </div>
  )
}

export default ClubPage
