import { useEffect, useState } from 'react'
import { Link, useLocation, useOutletContext } from 'react-router-dom'
import { FORTYLOVE_CONTENT as C } from '../content'
import { clubCourtName } from '../format'
import api from '../api'
import entrance from '../assets/40love-club-exterior-sunset.webp'
import ContactMessageForm from './ContactMessageForm'
import HomeGallery from './HomeGallery'
import HomeRates from './HomeRates'
import { MemberLoading } from './MemberStates'

const titles = {
  '/courts': ['The courts.', 'ملاعب النادي.'],
  '/pricing': ['Court rates.', 'أسعار الملاعب.'],
  '/gallery': ['The photo book.', 'صور النادي.'],
  '/contact': ['Visit the club.', 'زوروا النادي.'],
}

function CourtDirectory({ ar }) {
  const [courts, setCourts] = useState(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    api.get('/courts', { params: { sport: 'padel' }, signal: controller.signal })
      .then(({ data }) => {
        if (!Array.isArray(data)) throw new Error('Invalid court list')
        if (!controller.signal.aborted) setCourts(data)
      })
      .catch(() => { if (!controller.signal.aborted) setFailed(true) })
    return () => controller.abort()
  }, [attempt])
  if (failed) return <div role="alert"><p>{ar ? 'تعذّر تحميل الملاعب.' : 'The court list could not be loaded.'}</p>
    <button onClick={() => { setFailed(false); setAttempt(attempt + 1) }}>{ar ? 'حاول مجددًا' : 'Try again'}</button></div>
  if (!courts) return <MemberLoading label={ar ? 'جارٍ تحميل الملاعب…' : 'Loading courts…'} />
  if (!courts.length) return <p>{ar ? 'لا توجد ملاعب مدرجة حاليًا.' : 'There are no courts listed at the moment.'}</p>
  return <ul className="court-directory">{courts.map(court => <li key={court.id}>
    <strong>{clubCourtName(court.name, ar ? 'ar' : 'en')}</strong>
    <span>{court.available ? (ar ? 'متاح للحجز' : 'Open for bookings') : (ar ? 'غير متاح للحجز' : 'Unavailable for booking')}</span>
  </li>)}</ul>
}

export default function ClubPage() {
  const page = useLocation().pathname.replace(/\/+$/, '').toLowerCase()
  const { locale } = useOutletContext()
  const ar = locale === 'ar'
  const book = <Link className="member-primary" to="/book?sport=padel">{ar ? 'عرض المواعيد المتاحة' : 'Check court availability'}</Link>
  const address = ar ? C.contact.addressAr : C.contact.address
  return <article className="venue-page">
    <header className="member-title"><h1>{titles[page][ar ? 1 : 0]}</h1></header>
    {page === '/courts' && <>
      <div className="venue-spread"><img className="venue-print" src={C.gallery[0].image} alt={ar ? C.gallery[0].altAr : C.gallery[0].alt} />
        <section><h2>{ar ? 'بادل في ضاحية النخيل' : 'Padel in Dahyet Al-Nakheel'}</h2>
          <p>{ar ? 'ملاعب زجاجية مضاءة حتى الثالثة صباحًا. اختر يومًا للاطّلاع على مواعيد اللعب.' : 'Glass-walled courts, lit until 3 AM. Choose a date to see the available playing times.'}</p>
          <CourtDirectory ar={ar} />{book}</section></div>
      <section className="venue-rates"><h2>{ar ? 'أسعار الحجز' : 'Playing rates'}</h2><HomeRates locale={locale} /></section>
    </>}
    {page === '/pricing' && <div className="venue-spread price-spread"><section><h2>{ar ? 'ساعة أو ساعتان' : 'One or two hours'}</h2>
      <p>{ar ? 'يحدّد وقت البدء فئة السعر. لكل ساعتين كاملتين يُحتسب سعر الساعتين، وتُحسب أي ساعة إضافية بسعر الساعة.' : 'Your start time sets the rate. Each complete pair of hours uses the two-hour price. An extra hour uses the hourly price.'}</p>{book}</section><HomeRates locale={locale} /></div>}
    {page === '/gallery' && <div className="venue-gallery"><HomeGallery locale={locale} thumbnails /></div>}
    {page === '/contact' && <div className="venue-spread visit-spread"><section><img className="venue-print" src={entrance} alt={ar ? 'لافتة النادي عند الغروب' : 'The club entrance at dusk'} />
      <h2>{ar ? 'ضاحية النخيل' : 'Dahyet Al-Nakheel'}</h2><address>{address}</address><p>{C.contact.hours[locale]}</p>
      <div className="visit-contacts"><a href={C.contact.phoneHref}><bdi dir="ltr">{C.contact.phone}</bdi></a>
      <a href={C.contact.whatsappHref}> {ar ? 'واتساب' : 'WhatsApp'}</a><a href="https://40love.club">40love.club</a>
      <a href="https://www.instagram.com/40love.jo">{ar ? 'إنستغرام' : 'Instagram'}</a>
      <a href={'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(C.brand.name + ' ' + C.contact.address)}>{ar ? 'الاتجاهات' : 'Get directions'}</a></div></section>
      <section className="member-contact"><h2>{ar ? 'راسل النادي' : 'Send a message'}</h2><ContactMessageForm locale={locale} variant="editorial" /></section>
    </div>}
  </article>
}
