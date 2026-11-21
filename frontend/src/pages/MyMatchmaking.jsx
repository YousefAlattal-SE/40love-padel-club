import { useCallback, useEffect, useState } from 'react'
import api, { errorMessage } from '../api'
import './my-bookings.css'
import './my-matchmaking.css'

const COPY = {
  en: {
    tag: 'YOUR MATCHES',
    title: 'Your matches,',
    titleAccent: 'your place.',
    intro: 'Keep your match reservations, payment details, and waiting-list offers together in one place.',
    active: 'Active reservations',
    activeHint: 'Your upcoming match sessions',
    waitlist: 'Waiting list',
    waitlistHint: 'Matches you are waiting to join',
    history: 'Reservation history',
    historyHint: 'Cancelled and previous match reservations',
    summaryLabel: 'ACTIVE MATCHES',
    summaryFoot: 'Confirmed match spots',
    activeCount: 'reservations',
    reservation: 'reservation',
    reservations: 'reservations',
    loading: 'Loading your match reservations…',
    tryAgain: 'Try again',
    loadFailed: 'We could not load your match reservations. Please try again.',
    confirmed: 'Confirmed',
    cancelled: 'Cancelled',
    completed: 'Completed',
    noShow: 'No show',
    paid: 'Paid',
    unpaid: 'Unpaid',
    paymentAtClub: 'Pay at the club',
    price: 'Price per player',
    skill: 'Skill level',
    bookedOn: 'Reserved on',
    openLevel: 'Open level',
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced',
    padel: 'Padel',
    archived: 'Archived match',
    archivedCourt: 'Archived court',
    court: 'Court',
    cancel: 'Cancel reservation',
    cancelling: 'Cancelling…',
    cannotCancel: 'Cannot cancel',
    cancellationEnded: 'Cancellation is available up to 12 hours before the match.',
    cancelConfirm: 'Cancel this reservation? You will release your spot.',
    cancelSuccess: 'Reservation cancelled.',
    cancelFailed: 'We could not cancel this reservation. Please try again.',
    dismiss: 'Dismiss message',
    retry: 'Retry',
    noActive: 'No active match reservations yet.',
    noActiveHelp: 'Find a match and reserve your spot to get started.',
    browse: 'Browse upcoming matches',
    noWaitlist: 'You are not on any waiting lists.',
    noWaitlistHelp: 'When a match is full, you can join its waiting list.',
    noHistory: 'No reservation history yet.',
    noHistoryHelp: 'Cancelled and past match reservations will appear here.',
    offerKicker: 'SPOT AVAILABLE',
    offerTitle: 'A spot just opened up!',
    offerDescription: 'Accept within the time remaining to claim your spot.',
    expiresIn: 'Time remaining',
    expired: 'Expired',
    accept: 'Accept spot',
    decline: 'Decline',
    pleaseWait: 'Please wait…',
    acceptSuccess: 'Spot accepted! Your reservation is confirmed.',
    acceptFailed: 'We could not accept this offer. Please try again.',
    declineSuccess: 'Offer declined.',
    declineFailed: 'We could not decline this offer. Please try again.',
    declineConfirm: 'Decline this match offer?',
    position: 'Waiting-list position',
    positionNumber: 'Position',
    waitDescription: 'You will have 10 minutes to accept if a spot becomes available.',
    leaveList: 'Leave waiting list',
    leaveConfirm: 'Leave the waiting list for this match?',
    leaveSuccess: 'Removed from the waiting list.',
    leaveFailed: 'We could not remove you from the waiting list. Please try again.',
    paymentNotice: 'Payment at the club',
    paymentHelp: 'Please bring the exact amount and pay at the club on match day.',
    noReservations: 'No match reservations yet.',
    noReservationsHelp: 'Your next match is just one reservation away.',
    joinMatch: 'Find a match',
  },
  ar: {
    tag: 'مبارياتك',
    title: 'مبارياتك،',
    titleAccent: 'ومكانك محفوظ.',
    intro: 'تابع حجوزات مبارياتك وحالة الدفع وعروض قائمة الانتظار كلها في مكان واحد.',
    active: 'الحجوزات النشطة',
    activeHint: 'جلسات المباريات القادمة',
    waitlist: 'قائمة الانتظار',
    waitlistHint: 'المباريات التي تنتظر الانضمام إليها',
    history: 'سجل الحجوزات',
    historyHint: 'الحجوزات السابقة والملغاة للمباريات',
    summaryLabel: 'المباريات النشطة',
    summaryFoot: 'أماكن المباريات المؤكدة',
    activeCount: 'حجوزات',
    reservation: 'حجز',
    reservations: 'حجوزات',
    loading: 'جارٍ تحميل حجوزات المباريات…',
    tryAgain: 'إعادة المحاولة',
    loadFailed: 'تعذّر تحميل حجوزات مبارياتك. يرجى المحاولة مرة أخرى.',
    confirmed: 'مؤكد',
    cancelled: 'ملغي',
    completed: 'مكتمل',
    noShow: 'لم تحضر',
    paid: 'مدفوع',
    unpaid: 'غير مدفوع',
    paymentAtClub: 'الدفع في النادي',
    price: 'السعر لكل لاعب',
    skill: 'مستوى اللعب',
    bookedOn: 'تاريخ الحجز',
    openLevel: 'جميع المستويات',
    beginner: 'مبتدئ',
    intermediate: 'متوسط',
    advanced: 'متقدم',
    padel: 'بادل',
    archived: 'مباراة مؤرشفة',
    archivedCourt: 'ملعب مؤرشف',
    court: 'ملعب',
    cancel: 'إلغاء الحجز',
    cancelling: 'جارٍ الإلغاء…',
    cannotCancel: 'لا يمكن الإلغاء',
    cancellationEnded: 'يمكن الإلغاء حتى 12 ساعة قبل موعد المباراة.',
    cancelConfirm: 'هل تريد إلغاء هذا الحجز؟ سيتم تحرير مكانك.',
    cancelSuccess: 'تم إلغاء الحجز.',
    cancelFailed: 'تعذّر إلغاء الحجز. يرجى المحاولة مرة أخرى.',
    dismiss: 'إغلاق الرسالة',
    retry: 'إعادة المحاولة',
    noActive: 'لا توجد حجوزات مباريات نشطة حتى الآن.',
    noActiveHelp: 'ابحث عن مباراة واحجز مكانك للبدء.',
    browse: 'تصفّح المباريات القادمة',
    noWaitlist: 'لستَ على قائمة انتظار لأي مباراة.',
    noWaitlistHelp: 'عندما تكتمل مباراة، يمكنك الانضمام إلى قائمة انتظارها.',
    noHistory: 'لا يوجد سجل حجوزات حتى الآن.',
    noHistoryHelp: 'ستظهر هنا حجوزات المباريات السابقة والملغاة.',
    offerKicker: 'مكان متاح',
    offerTitle: 'أصبح هناك مكان متاح!',
    offerDescription: 'اقبل العرض قبل انتهاء الوقت المتبقي لتأكيد مكانك.',
    expiresIn: 'الوقت المتبقي',
    expired: 'انتهى الوقت',
    accept: 'قبول المكان',
    decline: 'رفض العرض',
    pleaseWait: 'يرجى الانتظار…',
    acceptSuccess: 'تم قبول المكان! تم تأكيد حجزك.',
    acceptFailed: 'تعذّر قبول العرض. يرجى المحاولة مرة أخرى.',
    declineSuccess: 'تم رفض العرض.',
    declineFailed: 'تعذّر رفض العرض. يرجى المحاولة مرة أخرى.',
    declineConfirm: 'هل تريد رفض عرض الانضمام إلى المباراة؟',
    position: 'موقعك في قائمة الانتظار',
    positionNumber: 'الموقع',
    waitDescription: 'سيكون لديك 10 دقائق لقبول العرض إذا توفر مكان.',
    leaveList: 'مغادرة قائمة الانتظار',
    leaveConfirm: 'هل تريد مغادرة قائمة انتظار هذه المباراة؟',
    leaveSuccess: 'تمت إزالتك من قائمة الانتظار.',
    leaveFailed: 'تعذّرت إزالتك من قائمة الانتظار. يرجى المحاولة مرة أخرى.',
    paymentNotice: 'الدفع في النادي',
    paymentHelp: 'يرجى إحضار المبلغ والدفع في النادي يوم المباراة.',
    noReservations: 'لا توجد حجوزات مباريات حتى الآن.',
    noReservationsHelp: 'تفصلك خطوة حجز واحدة عن مباراتك القادمة.',
    joinMatch: 'ابحث عن مباراة',
  },
}

const AMMAN_TIME_ZONE = 'Asia/Amman'

function readLocale() {
  if (typeof document === 'undefined') return 'en'
  if (document.documentElement.lang === 'ar') return 'ar'
  return localStorage.getItem('serva-locale') === 'ar' ? 'ar' : 'en'
}

function sportLabel(sport, locale, copy) {
  const key = String(sport || '').toLowerCase()
  if (key === 'padel') return copy.padel
  return copy.archived
}

function skillLabel(level, copy) {
  const key = String(level || 'open').toLowerCase()
  if (key === 'beginner') return copy.beginner
  if (key === 'intermediate') return copy.intermediate
  if (key === 'advanced') return copy.advanced
  if (key === 'open' || key === 'open_level' || key === 'all') return copy.openLevel
  return level || copy.openLevel
}

function formatDate(iso, locale) {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-JO' : 'en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: AMMAN_TIME_ZONE,
  }).format(date)
}

function formatTime(iso, locale) {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-JO' : 'en-GB', {
    hour: '2-digit', minute: '2-digit', timeZone: AMMAN_TIME_ZONE, hourCycle: 'h23',
  }).format(date)
}

function formatMoney(value, locale) {
  const amount = Number(value || 0).toLocaleString(locale === 'ar' ? 'ar-JO' : 'en-JO', {
    minimumFractionDigits: 0, maximumFractionDigits: 2,
  })
  return `${amount} JOD`
}

function formatCourtName(name, locale, copy) {
  const raw = String(name || '')
  if (/^archived court$/i.test(raw)) return copy.archivedCourt
  if (locale !== 'ar' || /[\u0600-\u06FF]/.test(raw)) return raw || copy.court
  if (/court/i.test(raw)) {
    const number = raw.match(/\d+/)?.[0]
    const localizedNumber = number ? Number(number).toLocaleString('ar-JO') : ''
    return `${copy.court}${localizedNumber ? ` ${localizedNumber}` : ''}`
  }
  return raw || copy.court
}

function normalizeStatus(status) {
  return String(status || '').toLowerCase().replace(/[ -]/g, '_')
}

function statusLabel(status, copy, locale) {
  const key = normalizeStatus(status)
  if (key === 'confirmed') return copy.confirmed
  if (key === 'cancelled' || key === 'canceled') return copy.cancelled
  if (key === 'completed' || key === 'finished') return copy.completed
  if (key === 'no_show') return copy.noShow
  return locale === 'ar' ? key.replaceAll('_', ' ') : key.replaceAll('_', ' ')
}

function formatCountdown(isoExpiry, copy) {
  if (!isoExpiry) return ''
  const seconds = Math.floor((new Date(isoExpiry).getTime() - Date.now()) / 1000)
  if (seconds <= 0) return copy.expired
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return `${minutes}:${String(remainder).padStart(2, '0')}`
}

function SportMark({ sport }) {
  const key = String(sport || '').toLowerCase()
  const mark = key === 'padel' ? 'P' : '—'
  return <div className="mb-sport-mark" aria-hidden="true"><span>{mark}</span></div>
}

function EmptyState({ title, description, link, linkLabel }) {
  return (
      <div className="mb-empty-state">
      <span className="mb-empty-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none">
          <rect x="4" y="5" width="16" height="15" rx="3" />
          <path d="M8 3v4M16 3v4M4 10h16M8 14h3" />
        </svg>
      </span>
        <strong>{title}</strong>
        <p>{description}</p>
        {link && <a className="mym-empty-link" href={link}>{linkLabel}</a>}
      </div>
  )
}

function StatusBadge({ status, copy, locale, tone }) {
  const normalized = normalizeStatus(status)
  const className = normalized === 'confirmed' ? 'mb-status-confirmed'
      : normalized === 'cancelled' || normalized === 'canceled' ? 'mb-status-cancelled'
          : normalized === 'no_show' ? 'mb-status-no-show' : ''
  return (
      <span className={`mb-status ${className} ${tone ? `mym-status-${tone}` : ''}`}>
      <span className="mb-status-dot" aria-hidden="true" />
        {statusLabel(status, copy, locale)}
    </span>
  )
}

function WaitlistOfferCard({ entry, onAccept, onDecline, loading, copy }) {
  const [countdown, setCountdown] = useState(() => formatCountdown(entry.offerExpiresAt, copy))

  useEffect(() => {
    if (!entry.offerExpiresAt) return undefined
    const interval = setInterval(() => {
      const next = formatCountdown(entry.offerExpiresAt, copy)
      setCountdown(next)
      if (next === copy.expired) clearInterval(interval)
    }, 1000)
    return () => clearInterval(interval)
  }, [entry.offerExpiresAt, copy])

  return (
      <article className="mb-booking-card mym-offer-card">
        <div className="mb-booking-main">
          <div className="mym-offer-icon" aria-hidden="true"><span>✓</span></div>
          <div className="mb-booking-details">
            <div className="mb-booking-eyebrow"><span>{copy.offerKicker}</span><i /></div>
            <h3>{copy.offerTitle}</h3>
            <p className="mb-booking-time">{copy.offerDescription}</p>
            <p className="mb-booking-payment"><strong>{copy.expiresIn}:</strong><span className="mym-countdown">{countdown || '—'}</span></p>
          </div>
        </div>
        <div className="mym-offer-actions">
          <button type="button" className="mym-primary-button" onClick={onAccept} disabled={loading || countdown === copy.expired}>
            {loading ? copy.pleaseWait : copy.accept}
          </button>
          <button type="button" className="mym-secondary-button" onClick={onDecline} disabled={loading}>
            {copy.decline}
          </button>
        </div>
      </article>
  )
}

function ReservationCard({ reservation, locale, copy, onCancel, busyId }) {
  const status = normalizeStatus(reservation.status)
  const isActive = status === 'confirmed'
  const canCancel = Boolean(reservation.cancellable && isActive)
  const sport = sportLabel(reservation.sport, locale, copy)
  const court = formatCourtName(reservation.courtName, locale, copy)
  const paid = String(reservation.paymentStatus || '').toLowerCase() === 'paid'
  const isBusy = busyId === reservation.id

  return (
      <article className={`mb-booking-card mym-reservation-card ${isActive ? '' : 'mym-reservation-past'}`}>
        <div className="mb-booking-main">
          <SportMark sport={reservation.sport} />
          <div className="mb-booking-details">
            <div className="mb-booking-eyebrow"><span>{sport}</span><i /><span>{copy.reservation}</span></div>
            <h3>{court} · {sport}</h3>
            <p className="mb-booking-time">
              <span className="mb-meta-icon" aria-hidden="true">◷</span>
              <span>{formatDate(reservation.startsAt, locale)}</span>
              <span className="mb-meta-separator">·</span>
              <span>{formatTime(reservation.startsAt, locale)} – {formatTime(reservation.endsAt, locale)}</span>
            </p>
            <p className="mb-booking-payment">
              <strong>{formatMoney(reservation.pricePerPlayer, locale)}</strong>
              <span className="mb-meta-separator">·</span>
              <span>{copy.price}</span>
              <span className="mb-meta-separator">·</span>
              <span>{copy.skill}: {skillLabel(reservation.skillLevel, copy)}</span>
            </p>
            <p className="mb-booking-payment mym-payment-line">
              <strong>{paid ? copy.paid : copy.paymentAtClub}</strong>
              <span className="mym-payment-note">{paid ? '' : copy.paymentHelp}</span>
            </p>
          </div>
        </div>
        <div className="mb-booking-actions mym-reservation-actions">
          <StatusBadge status={reservation.status} copy={copy} locale={locale} />
          <span className={`mb-status ${paid ? 'mym-status-paid' : 'mym-status-unpaid'}`}>
          <span className="mb-status-dot" aria-hidden="true" />{paid ? copy.paid : copy.unpaid}
        </span>
          {isActive && (
              <>
                <button type="button" className="mb-cancel-button" onClick={() => onCancel(reservation)} disabled={!canCancel || isBusy}>
                  {isBusy ? copy.cancelling : canCancel ? copy.cancel : copy.cannotCancel}
                </button>
                {!canCancel && <small className="mb-cancel-note">{copy.cancellationEnded}</small>}
              </>
          )}
        </div>
      </article>
  )
}

function WaitlistCard({ entry, onLeave, busyId, locale, copy }) {
  const isBusy = busyId === `wl-${entry.matchId}`
  return (
      <article className="mb-booking-card mym-waitlist-card">
        <div className="mb-booking-main">
          <div className="mym-waitlist-icon" aria-hidden="true"><span>⌛</span></div>
          <div className="mb-booking-details">
            <div className="mb-booking-eyebrow"><span>{copy.waitlist}</span><i /><span>{copy.positionNumber} {Number(entry.position || 0).toLocaleString(locale === 'ar' ? 'ar-JO' : 'en-GB')}</span></div>
            <h3>{copy.position} #{Number(entry.position || 0).toLocaleString(locale === 'ar' ? 'ar-JO' : 'en-GB')}</h3>
            <p className="mb-booking-time">{copy.waitDescription}</p>
            {entry.startsAt && <p className="mb-booking-payment"><span>{formatDate(entry.startsAt, locale)} · {formatTime(entry.startsAt, locale)}</span></p>}
          </div>
        </div>
        <div className="mb-booking-actions mym-waitlist-actions">
          <span className="mb-status mym-status-waiting"><span className="mb-status-dot" aria-hidden="true" />{copy.waitlist}</span>
          <button type="button" className="mb-cancel-button" onClick={() => onLeave(entry.matchId)} disabled={isBusy}>
            {isBusy ? copy.pleaseWait : copy.leaveList}
          </button>
        </div>
      </article>
  )
}

function SectionHeading({ id, number, title, hint, count, locale, countLabel }) {
  return (
      <div className="mb-section-heading">
        <div>
          <span className="mb-section-kicker">{number} / {title}</span>
          <h2 id={id}>{title}</h2>
          <p>{hint}</p>
        </div>
        <span className="mb-count-pill">
        {Number(count || 0).toLocaleString(locale === 'ar' ? 'ar-JO' : 'en-GB')} <span>{countLabel}</span>
      </span>
      </div>
  )
}

export default function MyMatchmaking() {
  const [locale, setLocale] = useState(readLocale)
  const [reservations, setReservations] = useState(null)
  const [waitlist, setWaitlist] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [notice, setNotice] = useState(null)
  const copy = COPY[locale]
  const isArabic = locale === 'ar'

  useEffect(() => {
    const syncLocale = () => {
      const next = readLocale()
      setLocale((current) => current === next ? current : next)
    }
    syncLocale()
    const observer = new MutationObserver(syncLocale)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['lang', 'dir'] })
    window.addEventListener('storage', syncLocale)
    window.addEventListener('serva-locale-change', syncLocale)
    return () => {
      observer.disconnect()
      window.removeEventListener('storage', syncLocale)
      window.removeEventListener('serva-locale-change', syncLocale)
    }
  }, [])

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      api.get('/matches/my-reservations'),
      api.get('/matches/my-waitlist'),
    ])
        .then(([resData, wlData]) => {
          setReservations(Array.isArray(resData.data) ? resData.data : [])
          setWaitlist(Array.isArray(wlData.data) ? wlData.data : [])
          setError('')
        })
        .catch((err) => setError(errorMessage(err) || COPY[readLocale()].loadFailed))
        .finally(() => setLoading(false))
  }, [])

  // Fetch the member's current reservations when the page opens.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [load])

  async function cancelReservation(reservation) {
    if (!window.confirm(copy.cancelConfirm)) return
    setBusyId(reservation.id)
    setNotice(null)
    try {
      await api.post(`/matches/reservations/${reservation.id}/cancel`)
      setNotice({ type: 'success', text: copy.cancelSuccess })
      load()
    } catch (err) {
      setNotice({ type: 'error', text: errorMessage(err) || copy.cancelFailed })
    } finally {
      setBusyId(null)
    }
  }

  async function leaveWaitlist(matchId) {
    if (!window.confirm(copy.leaveConfirm)) return
    setBusyId(`wl-${matchId}`)
    setNotice(null)
    try {
      await api.delete(`/matches/${matchId}/waitlist`)
      setNotice({ type: 'success', text: copy.leaveSuccess })
      load()
    } catch (err) {
      setNotice({ type: 'error', text: errorMessage(err) || copy.leaveFailed })
    } finally {
      setBusyId(null)
    }
  }

  async function acceptOffer(matchId) {
    setBusyId(`accept-${matchId}`)
    setNotice(null)
    try {
      await api.post(`/matches/${matchId}/waitlist/accept`)
      setNotice({ type: 'success', text: copy.acceptSuccess })
      load()
    } catch (err) {
      setNotice({ type: 'error', text: errorMessage(err) || copy.acceptFailed })
    } finally {
      setBusyId(null)
    }
  }

  async function declineOffer(matchId) {
    if (!window.confirm(copy.declineConfirm)) return
    setBusyId(`decline-${matchId}`)
    setNotice(null)
    try {
      await api.post(`/matches/${matchId}/waitlist/decline`)
      setNotice({ type: 'success', text: copy.declineSuccess })
      load()
    } catch (err) {
      setNotice({ type: 'error', text: errorMessage(err) || copy.declineFailed })
    } finally {
      setBusyId(null)
    }
  }

  const activeReservations = (reservations || [])
      .filter((reservation) => normalizeStatus(reservation.status) === 'confirmed')
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
  const pastReservations = (reservations || [])
      .filter((reservation) => normalizeStatus(reservation.status) !== 'confirmed')
      .sort((a, b) => new Date(b.startsAt || b.createdAt || 0).getTime() - new Date(a.startsAt || a.createdAt || 0).getTime())
  const activeWaitlist = waitlist.filter((entry) => ['waiting', 'offered'].includes(normalizeStatus(entry.status)))
  const offeredEntries = activeWaitlist.filter((entry) => normalizeStatus(entry.status) === 'offered')
  const waitingEntries = activeWaitlist.filter((entry) => normalizeStatus(entry.status) === 'waiting')

  if (loading && reservations === null) {
    return (
        <section className="my-bookings-page my-matchmaking-page" dir={isArabic ? 'rtl' : 'ltr'} lang={locale}>
          <div className="mb-loading"><span className="mb-spinner" /><span>{copy.loading}</span></div>
        </section>
    )
  }

  if (reservations === null) {
    return (
        <section className="my-bookings-page my-matchmaking-page" dir={isArabic ? 'rtl' : 'ltr'} lang={locale}>
          <div className="mb-error-state" role="alert">
            <strong>{error || copy.loadFailed}</strong>
            <button type="button" onClick={load}>{copy.tryAgain}</button>
          </div>
        </section>
    )
  }

  return (
      <section className="my-bookings-page my-matchmaking-page" dir={isArabic ? 'rtl' : 'ltr'} lang={locale}>
        <header className="mb-page-hero">
          <div className="mb-hero-copy">
            <span className="mb-page-tag"><span className="mb-page-tag-dot" />{copy.tag}</span>
            <h1>{copy.title}<br /><span>{copy.titleAccent}</span></h1>
            <p>{copy.intro}</p>
          </div>
          <aside className="mb-hero-summary" aria-label={copy.summaryLabel}>
            <span className="mb-summary-label">{copy.summaryLabel}</span>
            <strong>{String(activeReservations.length).padStart(2, '0')}</strong>
            <span className="mb-summary-foot"><i />{copy.summaryFoot}</span>
          </aside>
        </header>

        {notice && (
            <div className={`mb-inline-error mym-notice mym-notice-${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}>
              <span>{notice.text}</span>
              <button type="button" onClick={() => setNotice(null)} aria-label={copy.dismiss}>×</button>
            </div>
        )}
        {error && <div className="mb-inline-error" role="alert"><span>{error}</span><button type="button" onClick={() => { setError(''); load() }} aria-label={copy.retry}>{copy.retry}</button></div>}

        {offeredEntries.length > 0 && (
            <section className="mb-bookings-section mym-offers-section" aria-labelledby="mym-offers-title">
              <SectionHeading id="mym-offers-title" number="01" title={copy.offerKicker} hint={copy.offerDescription} count={offeredEntries.length} locale={locale} countLabel={isArabic ? 'عروض' : offeredEntries.length === 1 ? 'offer' : 'offers'} />
              <div className="mb-booking-list">
                {offeredEntries.map((entry) => (
                    <WaitlistOfferCard
                        key={entry.id}
                        entry={entry}
                        copy={copy}
                        onAccept={() => acceptOffer(entry.matchId)}
                        onDecline={() => declineOffer(entry.matchId)}
                        loading={busyId === `accept-${entry.matchId}` || busyId === `decline-${entry.matchId}`}
                    />
                ))}
              </div>
            </section>
        )}

        <section className="mb-bookings-section" aria-labelledby="mym-active-title">
          <SectionHeading id="mym-active-title" number={offeredEntries.length > 0 ? '02' : '01'} title={copy.active} hint={copy.activeHint} count={activeReservations.length} locale={locale} countLabel={activeReservations.length === 1 ? copy.reservation : copy.reservations} />
          {activeReservations.length === 0 ? (
              <EmptyState title={copy.noActive} description={copy.noActiveHelp} link="/matchmaking" linkLabel={copy.browse} />
          ) : (
              <div className="mb-booking-list">
                {activeReservations.map((reservation) => (
                    <ReservationCard key={reservation.id} reservation={reservation} locale={locale} copy={copy} onCancel={cancelReservation} busyId={busyId} />
                ))}
              </div>
          )}
        </section>

        <section className="mb-bookings-section" aria-labelledby="mym-waitlist-title">
          <SectionHeading id="mym-waitlist-title" number={offeredEntries.length > 0 ? '03' : '02'} title={copy.waitlist} hint={copy.waitlistHint} count={waitingEntries.length} locale={locale} countLabel={isArabic ? 'قوائم' : waitingEntries.length === 1 ? 'place' : 'places'} />
          {waitingEntries.length === 0 ? (
              <EmptyState title={copy.noWaitlist} description={copy.noWaitlistHelp} />
          ) : (
              <div className="mb-booking-list">
                {waitingEntries.map((entry) => (
                    <WaitlistCard key={entry.id} entry={entry} onLeave={leaveWaitlist} busyId={busyId} locale={locale} copy={copy} />
                ))}
              </div>
          )}
        </section>

        <section className="mb-bookings-section mb-history-section" aria-labelledby="mym-history-title">
          <SectionHeading id="mym-history-title" number={offeredEntries.length > 0 ? '04' : '03'} title={copy.history} hint={copy.historyHint} count={pastReservations.length} locale={locale} countLabel={pastReservations.length === 1 ? copy.reservation : copy.reservations} />
          {pastReservations.length === 0 ? (
              <EmptyState title={copy.noHistory} description={copy.noHistoryHelp} />
          ) : (
              <div className="mb-booking-list">
                {pastReservations.map((reservation) => (
                    <ReservationCard key={reservation.id} reservation={reservation} locale={locale} copy={copy} busyId={busyId} />
                ))}
              </div>
          )}
        </section>

      </section>
  )
}
