import { useEffect, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { FORTYLOVE_CONTENT as C } from '../content'
import walkway from '../assets/40love-court-walkway.jpeg'
import coffee from '../assets/40love-court-coffee.jpeg'
import exterior from '../assets/40love-club-exterior-sunset.jpeg'
import ContactMessageForm from './ContactMessageForm'
import HomeGallery from './HomeGallery'
import HomeRates from './HomeRates'
import '../landing.css'
import './club-home.css'

const COPY = {
  en: {
    place: 'Dahyet Al-Nakheel, Jordan', title: 'Padel in', accent: 'Amman.',
    intro: 'Three floodlit courts, a courtside café and time for one more game.',
    book: 'Book a court', find: 'Find a match', hours: 'Club hours', daily: 'Daily, 7 AM to 3 AM',
    open: 'Open now', closed: 'Closed now',
    club: 'The venue', inside: 'Around the club.', gallery: 'View the gallery',
    courts: 'On the blue courts', courtBody: 'Glass walls open the view across three panoramic padel courts. The lights stay on until 3 AM.', viewCourts: 'Explore the courts',
    cafe: 'Coffee by the court', cafeBody: 'Take your coffee out to the terrace or settle into the lounge between games.', viewCafe: 'See the café and terrace',
    courtAlt: 'Walkway beside the club’s glass-walled blue courts', cafeAlt: 'A 40 LOVE coffee cup on the net post beside the blue turf',
    social: 'Matchmaking', match: 'Join a doubles match.', matchBody: 'Browse sessions by skill level and reserve a place. If a match is full, you can join its waiting list.', doubles: 'Doubles court',
    rates: 'Court hire', pricing: 'Playing rates.', prices: 'View pricing',
    questions: 'Booking questions', faq: [
      ['How do I book a court?', 'Sign in, choose a date, then select an available court and start time. Review the price before confirming.'],
      ['When do I need a phone number?', 'You can register without a phone number. If your profile is missing one, you’ll be asked to add it when you confirm a booking.'],
      ['Where can I find my reservations?', 'Sign in and open My bookings for your court reservations. Your matchmaking sessions and waiting-list offers appear in My matches.'],
    ],
    visit: 'Visit us', district: 'Dahyet Al-Nakheel.', directions: 'Get directions', whatsapp: 'WhatsApp', contact: 'Send the club a message',
    map: 'Show the location map', mapTitle: '40 LOVE Padel Club & Cafe in Amman', venueAlt: 'The club sign and planted terrace on Othman Naseef Street at dusk',
  },
  ar: {
    place: 'ضاحية النخيل، الأردن', title: 'بادل في', accent: 'عمّان.',
    intro: 'ثلاثة ملاعب مضاءة، ومقهى بجانب الملعب، ووقت لمباراة أخرى.',
    book: 'احجز ملعبًا', find: 'ابحث عن مباراة', hours: 'ساعات النادي', daily: 'يوميًا من ٧ صباحًا حتى ٣ صباحًا',
    open: 'مفتوح الآن', closed: 'مغلق الآن',
    club: 'المكان', inside: 'جولة في النادي.', gallery: 'تصفّح الصور',
    courts: 'على الملاعب الزرقاء', courtBody: 'تطلّ الملاعب الثلاثة على بعضها من خلال جدران زجاجية بانورامية. وتبقى الأضواء مضاءة حتى الثالثة صباحًا.', viewCourts: 'استكشف الملاعب',
    cafe: 'قهوة بجانب الملعب', cafeBody: 'استمتع بقهوتك على الشرفة أو خذ استراحة في صالة النادي بين المباريات.', viewCafe: 'استكشف المقهى والشرفة',
    courtAlt: 'ممرّ بجانب الملاعب الزرقاء المحاطة بالزجاج', cafeAlt: 'كوب قهوة من مقهى 40 LOVE على قائم الشبكة بجانب الملعب الأزرق',
    social: 'المباريات', match: 'انضمّ إلى مباراة زوجية.', matchBody: 'تصفّح المباريات حسب المستوى واحجز مكانك. إذا اكتمل عدد اللاعبين، يمكنك الانضمام إلى قائمة الانتظار.', doubles: 'ملعب بادل زوجي',
    rates: 'حجز الملاعب', pricing: 'أسعار اللعب.', prices: 'تفاصيل الأسعار',
    questions: 'أسئلة حول الحجز', faq: [
      ['كيف أحجز ملعبًا؟', 'سجّل الدخول وحدّد التاريخ، ثم اختر ملعبًا متاحًا ووقت بدء اللعب. يمكنك مراجعة السعر قبل تأكيد الحجز.'],
      ['متى أحتاج إلى رقم هاتف؟', 'يمكنك إنشاء حساب من دون رقم هاتف. إذا لم يكن الرقم محفوظًا في ملفك الشخصي، فسيُطلب منك إدخاله عند تأكيد الحجز.'],
      ['أين أجد حجوزاتي؟', 'بعد تسجيل الدخول، افتح «حجوزاتي» للاطّلاع على الملاعب التي حجزتها. وستجد المباريات التي انضممت إليها وعروض قائمة الانتظار في «مبارياتي».'],
    ],
    visit: 'زرنا', district: 'ضاحية النخيل.', directions: 'الاتجاهات إلى النادي', whatsapp: 'واتساب', contact: 'راسل فريق النادي',
    map: 'عرض خريطة الموقع', mapTitle: 'موقع نادي 40 LOVE للبادل والمقهى في عمّان', venueAlt: 'لافتة النادي وشرفته المزروعة عند الغروب في شارع عثمان نصيف',
  },
}

const directionsUrl = 'https://www.google.com/maps/search/?api=1&query=40+Love+Padel+Club+%26+Cafe+Othman+Naseef+Street+Dahyet+Al-Nakheel+Amman+Jordan'
const mapUrl = 'https://www.google.com/maps?q=40+Love+Padel+Club+%26+Cafe+Othman+Naseef+Street+Dahyet+Al-Nakheel+Amman+Jordan&output=embed'
const ammanHour = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Amman', hour: '2-digit', hourCycle: 'h23' })

function isClubOpen() {
  const hour = Number(ammanHour.format(new Date()))
  return hour >= C.hours.openHour || hour < C.hours.closeHour
}

function Arrow() {
  return <svg className="club-action-arrow" viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
}

function Hours({ t }) {
  const [open, setOpen] = useState(isClubOpen)
  useEffect(() => {
    const timer = window.setInterval(() => setOpen(isClubOpen()), 60_000)
    return () => window.clearInterval(timer)
  }, [])
  return (
    <div className="club-hours">
      <div><span className="club-label">{t.hours}</span><strong>{t.daily}</strong></div>
      <span className="club-open-status"><i aria-hidden="true" className={open ? 'is-open' : ''} />{open ? t.open : t.closed}</span>
    </div>
  )
}

function VenueStory({ src, alt, title, body, to, action }) {
  return (
    <article className="club-story">
      <img src={src} alt={alt} loading="lazy" width="1179" height="1560" />
      <h3>{title}</h3><p>{body}</p>
      <Link className="club-text-link" to={to}>{action}<Arrow /></Link>
    </article>
  )
}

function CourtDiagram({ label }) {
  return (
    <svg className="club-doubles" viewBox="0 0 360 200" role="img" aria-label={label}>
      <g fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="12" y="16" width="336" height="168" />
        <path d="M52 16v168m256-168v168M52 100h256M180 10v180" />
      </g>
      <g fill="var(--club-felt)">
        <circle cx="79" cy="65" r="6" /><circle cx="111" cy="138" r="6" />
      </g>
      <g fill="var(--club-paper)">
        <circle cx="247" cy="61" r="6" /><circle cx="285" cy="138" r="6" />
      </g>
    </svg>
  )
}

export default function Home() {
  const { locale } = useOutletContext()
  const t = COPY[locale]
  const [mapOpen, setMapOpen] = useState(false)

  return (
    <div className="club-home">
      <section className="club-hero" aria-labelledby="club-home-title">
        <div className="club-hero-panel">
          <div className="club-hero-intro">
            <p className="club-location"><span aria-hidden="true" />{t.place}</p>
            <h1 id="club-home-title"><span>{t.title}</span>{' '}<em>{t.accent}</em></h1>
            <p className="club-intro">{t.intro}</p>
            <div className="club-hero-actions">
              <Link className="club-button" to="/book">{t.book}<Arrow /></Link>
              <Link className="club-secondary" to="/matchmaking">{t.find}<Arrow /></Link>
            </div>
          </div>
          <Hours t={t} />
        </div>
        <HomeGallery locale={locale} />
      </section>

      <section className="club-block club-venue" id="courts" aria-labelledby="club-venue-title">
        <div className="club-spread-heading">
          <div><p className="club-label">{t.club}</p><h2 id="club-venue-title">{t.inside}</h2></div>
          <Link to="/gallery" id="gallery" className="club-text-link">{t.gallery}<Arrow /></Link>
        </div>
        <div className="club-stories">
          <VenueStory src={walkway} alt={t.courtAlt} title={t.courts} body={t.courtBody} to="/courts" action={t.viewCourts} />
          <VenueStory src={coffee} alt={t.cafeAlt} title={t.cafe} body={t.cafeBody} to="/gallery" action={t.viewCafe} />
        </div>
      </section>

      <section className="club-match" id="matchmaking" aria-labelledby="club-match-title">
        <div className="club-block club-match-inner">
          <div><p className="club-label">{t.social}</p><h2 id="club-match-title">{t.match}</h2>
            <p className="club-body">{t.matchBody}</p><Link className="club-button" to="/matchmaking">{t.find}<Arrow /></Link>
          </div>
          <CourtDiagram label={t.doubles} />
        </div>
      </section>

      <section className="club-block club-pricing" id="pricing" aria-labelledby="club-rates-title">
        <div><p className="club-label">{t.rates}</p><h2 id="club-rates-title">{t.pricing}</h2><Link className="club-text-link" to="/pricing">{t.prices}<Arrow /></Link></div>
        <div><HomeRates locale={locale} />
          <div className="club-faq" id="booking"><h3>{t.questions}</h3>
            {t.faq.map(([question, answer], i) => <details key={i}><summary>{question}</summary><p>{answer}</p></details>)}
          </div>
        </div>
      </section>

      <section className="club-visit" id="contact" aria-labelledby="club-visit-title">
        <div className="club-block club-visit-inner">
          <img className="club-visit-photo" src={exterior} width="1114" height="1600" alt={t.venueAlt} loading="lazy" />
          <div><p className="club-label">{t.visit}</p><h2 id="club-visit-title">{t.district}</h2>
            <address>{locale === 'ar' ? C.contact.addressAr : C.contact.address}</address>
            <p className="club-visit-hours">{C.contact.hours[locale]}</p>
            <div className="club-visit-links">
              <a className="club-text-link" href={directionsUrl} target="_blank" rel="noreferrer">{t.directions}<Arrow /></a>
              <a className="club-text-link" href={C.contact.whatsappHref} target="_blank" rel="noreferrer">{t.whatsapp}</a>
              <a className="club-text-link" href={C.contact.phoneHref}><bdi dir="ltr">{C.contact.phone}</bdi></a>
            </div>
            <details className="club-disclosure" onToggle={(event) => setMapOpen(event.currentTarget.open)}><summary>{t.map}</summary>
              {mapOpen && <iframe title={t.mapTitle} src={mapUrl} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />}
            </details>
            <details className="club-disclosure club-contact"><summary>{t.contact}</summary><ContactMessageForm variant="editorial" locale={locale} /></details>
          </div>
        </div>
      </section>
    </div>
  )
}
