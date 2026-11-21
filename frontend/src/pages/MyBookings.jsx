import { MemberLoading } from './MemberStates'
import { useCallback, useEffect, useState } from 'react'
import api, { errorMessage } from '../api'
import './my-bookings.css'

const COPY = {
    en: {
        tag: 'YOUR BOOKINGS',
        title: 'Your courts,',
        titleAccent: 'your time.',
        intro: 'Everything you have booked, in one place. Keep track of your next session and revisit past games.',
        upcoming: 'Upcoming',
        history: 'History',
        upcomingHint: 'Your next sessions',
        historyHint: 'Previous sessions and cancelled bookings',
        emptyUpcoming: 'No upcoming bookings yet.',
        emptyUpcomingHelp: 'Your next game is one booking away.',
        emptyHistory: 'Nothing here yet.',
        emptyHistoryHelp: 'Completed and cancelled bookings will appear here.',
        loading: 'Loading your bookings…',
        confirmed: 'Confirmed',
        cancelled: 'Cancelled',
        noShow: 'No show',
        completed: 'Completed',
        cancel: 'Cancel booking',
        cancelling: 'Cancelling…',
        cancellationEnded: 'Free cancellation has ended',
        paid: 'Paid',
        payAtClub: 'Pay at the club',
        hour: 'hour',
        hours: 'hours',
        sportPadel: 'Padel',
        archivedActivity: 'Archived activity',
        archivedCourt: 'Archived court',
        court: 'Court',
        tryAgain: 'Try again',
        cancelConfirm: 'Cancel this booking for',
        cancelFailed: 'We could not cancel this booking. Please try again.',
        loadFailed: 'We could not load your bookings. Please try again.',
        upcomingCount: 'UPCOMING SESSIONS',
    },
    ar: {
        tag: 'حجوزاتي',
        title: 'ملاعبك،',
        titleAccent: 'على وقتك.',
        intro: 'كل حجوزاتك في مكان واحد. تابع جلستك القادمة وراجع مبارياتك السابقة بسهولة.',
        upcoming: 'الحجوزات القادمة',
        history: 'سجل الحجوزات',
        upcomingHint: 'جلساتك القادمة',
        historyHint: 'الجلسات السابقة والحجوزات الملغاة',
        emptyUpcoming: 'لا توجد حجوزات قادمة حتى الآن.',
        emptyUpcomingHelp: 'باقي حجز واحد لتبدأ مباراتك القادمة.',
        emptyHistory: 'لا يوجد شيء هنا حتى الآن.',
        emptyHistoryHelp: 'ستظهر هنا الحجوزات المكتملة والملغاة.',
        loading: 'جارٍ تحميل حجوزاتك…',
        confirmed: 'مؤكد',
        cancelled: 'ملغي',
        noShow: 'لم تحضر',
        completed: 'مكتمل',
        cancel: 'إلغاء الحجز',
        cancelling: 'جارٍ الإلغاء…',
        cancellationEnded: 'انتهت فترة الإلغاء المجاني',
        paid: 'مدفوع',
        payAtClub: 'الدفع في النادي',
        hour: 'ساعة',
        hours: 'ساعات',
        sportPadel: 'بادل',
        archivedActivity: 'نشاط مؤرشف',
        archivedCourt: 'ملعب مؤرشف',
        court: 'ملعب',
        tryAgain: 'إعادة المحاولة',
        cancelConfirm: 'هل تريد إلغاء هذا الحجز بتاريخ',
        cancelFailed: 'تعذّر إلغاء الحجز. يرجى المحاولة مرة أخرى.',
        loadFailed: 'تعذّر تحميل حجوزاتك. يرجى المحاولة مرة أخرى.',
        upcomingCount: 'الجلسات القادمة',
    },
}

const AMMAN_TIME_ZONE = 'Asia/Amman'

function readLocale() {
    if (typeof document === 'undefined') return 'en'
    if (document.documentElement.lang === 'ar') return 'ar'
    return localStorage.getItem('serva-locale') === 'ar' ? 'ar' : 'en'
}

function formatStart(iso, locale) {
    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) return String(iso || '')
    const language = locale === 'ar' ? 'ar-JO' : 'en-GB'
    const dateText = new Intl.DateTimeFormat(language, {
        timeZone: AMMAN_TIME_ZONE,
        weekday: 'short',
        day: 'numeric',
        month: 'short',
    }).format(date)
    const timeText = new Intl.DateTimeFormat(language, {
        timeZone: AMMAN_TIME_ZONE,
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
    }).format(date)
    return `${dateText}${locale === 'ar' ? '،' : ','} ${timeText}`
}

function formatMoney(value, locale) {
    const amount = Number(value || 0).toLocaleString(locale === 'ar' ? 'ar-JO' : 'en-JO', {
        maximumFractionDigits: 2,
    })
    return `${amount} ${locale === 'ar' ? 'د.أ.' : 'JOD'}`
}

function formatCourtName(name, locale, copy) {
    const raw = String(name || '')
    if (/^archived court$/i.test(raw)) return copy.archivedCourt
    if (locale !== 'ar') return raw || copy.court
    if (/[\u0600-\u06FF]/.test(raw)) return raw
    const number = raw.match(/\d+/)?.[0]
    const localizedNumber = number ? Number(number).toLocaleString('ar-JO') : ''
    if (!/padel/i.test(raw) && !number) return `${copy.court} ${raw}`
    return `${copy.court} ${copy.sportPadel}${localizedNumber ? ` ${localizedNumber}` : ''}`
}

function getSportName(name, locale, copy) {
    const raw = String(name || '')
    if (/padel/i.test(raw)) return copy.sportPadel
    return copy.archivedActivity
}

function getStatus(status, locale, copy, endsAt) {
    const normalized = String(status || '').toLowerCase().replace(/[ -]/g, '_')
    if (normalized === 'confirmed' && new Date(endsAt).getTime() <= Date.now()) return copy.completed
    if (normalized === 'confirmed') return copy.confirmed
    if (normalized === 'cancelled' || normalized === 'canceled') return copy.cancelled
    if (normalized === 'no_show') return copy.noShow
    return locale === 'ar' ? normalized.replaceAll('_', ' ') : normalized.replaceAll('_', ' ')
}

function BookingCard({ booking, locale, copy, onCancel, cancellingId }) {
    const isArabic = locale === 'ar'
    const rawStatus = String(booking.status || '').toLowerCase().replace(/[ -]/g, '_')
    const isConfirmed = rawStatus === 'confirmed'
    const cancellable = Boolean(onCancel && booking.cancellable && isConfirmed)
    const displayStatus = getStatus(booking.status, locale, copy, booking.endsAt)
    const courtName = formatCourtName(booking.courtName, locale, copy)
    const sportName = getSportName(booking.courtName, locale, copy)
    const hours = Number(booking.hours || 1)
    const duration = isArabic
        ? `${hours.toLocaleString('ar-JO')} ${hours === 1 ? copy.hour : copy.hours}`
        : `${hours} ${hours === 1 ? copy.hour : copy.hours}`
    const startTime = formatStart(booking.startsAt, locale)
    const isCancelling = cancellingId === booking.id
    const statusClass = rawStatus === 'confirmed' ? 'confirmed' : rawStatus === 'no_show' ? 'no-show' : 'cancelled'

    return (
        <article className="mb-booking-card">
            <div className="mb-booking-main">
                <div className="mb-sport-mark" aria-hidden="true">
                    <span>{booking.sport === 'padel' ? 'P' : '—'}</span>
                </div>
                <div className="mb-booking-details">
                    <div className="mb-booking-eyebrow">
                        <span>{sportName}</span>
                    </div>
                    <h3>{courtName}</h3>
                    <p className="mb-booking-time">
                        <span className="mb-meta-icon" aria-hidden="true">◷</span>
                        <span>{startTime}</span>
                        <span className="mb-meta-separator">·</span>
                        <span>{duration}</span>
                    </p>
                    <p className="mb-booking-payment">
                        <strong>{formatMoney(booking.totalPrice, locale)}</strong>
                        <span className="mb-meta-separator">·</span>
                        <span>{booking.paid ? copy.paid : copy.payAtClub}</span>
                    </p>
                </div>
            </div>

            <div className="mb-booking-actions">
        <span className={`mb-status mb-status-${statusClass}`}>
          <span className="mb-status-dot" aria-hidden="true" />
            {displayStatus}
        </span>
                {cancellable && (
                    <button className="mb-cancel-button" type="button" onClick={() => onCancel(booking)} disabled={isCancelling}>
                        {isCancelling ? copy.cancelling : copy.cancel}
                    </button>
                )}
                {onCancel && isConfirmed && !booking.cancellable && (
                    <small className="mb-cancel-note">{copy.cancellationEnded}</small>
                )}
            </div>
        </article>
    )
}

function EmptyState({ title, description }) {
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
        </div>
    )
}

export default function MyBookings() {
    const [locale, setLocale] = useState(readLocale)
    const [bookings, setBookings] = useState(null)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(true)
    const [cancellingId, setCancellingId] = useState(null)
    const [now] = useState(() => Date.now())
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

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const response = await api.get('/bookings')
            setBookings(Array.isArray(response.data) ? response.data : [])
            setError('')
        } catch (err) {
            const currentLocale = readLocale()
            setError(currentLocale === 'ar' ? COPY.ar.loadFailed : (errorMessage(err) || COPY.en.loadFailed))
        } finally {
            setLoading(false)
        }
    }, [])

    // Fetch current bookings once the page mounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { load() }, [load])

    async function cancel(booking) {
        const yes = window.confirm(`${copy.cancelConfirm} ${formatStart(booking.startsAt, locale)}?`)
        if (!yes) return
        setCancellingId(booking.id)
        try {
            await api.delete(`/bookings/${booking.id}`)
            setError('')
            await load()
        } catch (err) {
            setError(isArabic ? copy.cancelFailed : (errorMessage(err) || copy.cancelFailed))
        } finally {
            setCancellingId(null)
        }
    }

    if (loading && bookings === null) {
        return (
            <section className="my-bookings-page" dir={isArabic ? 'rtl' : 'ltr'} lang={locale}>
                <MemberLoading label={copy.loading} />
            </section>
        )
    }

    if (bookings === null) {
        return (
            <section className="my-bookings-page" dir={isArabic ? 'rtl' : 'ltr'} lang={locale}>
                <div className="mb-error-state" role="alert">
                    <strong>{error || copy.loadFailed}</strong>
                    <button type="button" onClick={load}>{copy.tryAgain}</button>
                </div>
            </section>
        )
    }

    const upcoming = bookings
        .filter((booking) => booking.status === 'confirmed' && new Date(booking.endsAt).getTime() > now)
        .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
    const history = bookings.filter((booking) => !upcoming.some((item) => item.id === booking.id))

    return (
        <section className="my-bookings-page" dir={isArabic ? 'rtl' : 'ltr'} lang={locale}>
            <header className="mb-page-hero">
                <div className="mb-hero-copy">

                    <h1>{isArabic ? 'حجوزاتي.' : 'My bookings.'}</h1>
                    <p>{copy.intro}</p>
                </div>
                <aside className="mb-hero-summary" aria-label={copy.upcomingCount}>
                    <span className="mb-summary-label">{copy.upcomingCount}</span>
                    <strong>{String(upcoming.length).padStart(2, '0')}</strong>
                    <span className="mb-summary-foot"><i />{isArabic ? 'الحجوزات المؤكدة القادمة' : 'Confirmed sessions ahead'}</span>
                </aside>
            </header>

            {error && <div className="mb-inline-error" role="alert"><span>{error}</span><button type="button" onClick={() => setError('')} aria-label={isArabic ? 'إغلاق الرسالة' : 'Dismiss message'}>×</button></div>}

            <section className="mb-bookings-section" aria-labelledby="mb-upcoming-title">
                <div className="mb-section-heading">
                    <div>

                        <h2 id="mb-upcoming-title">{copy.upcoming}</h2>
                        <p>{copy.upcomingHint}</p>
                    </div>
                    <span className="mb-count-pill">{upcoming.length.toLocaleString(isArabic ? 'ar-JO' : 'en-GB')} <span>{isArabic ? 'حجز' : upcoming.length === 1 ? 'booking' : 'bookings'}</span></span>
                </div>
                {upcoming.length === 0 ? (
                    <EmptyState title={copy.emptyUpcoming} description={copy.emptyUpcomingHelp} />
                ) : (
                    <div className="mb-booking-list">
                        {upcoming.map((booking) => <BookingCard key={booking.id} booking={booking} locale={locale} copy={copy} onCancel={cancel} cancellingId={cancellingId} />)}
                    </div>
                )}
            </section>

            <section className="mb-bookings-section mb-history-section" aria-labelledby="mb-history-title">
                <div className="mb-section-heading">
                    <div>

                        <h2 id="mb-history-title">{copy.history}</h2>
                        <p>{copy.historyHint}</p>
                    </div>
                    <span className="mb-count-pill">{history.length.toLocaleString(isArabic ? 'ar-JO' : 'en-GB')} <span>{isArabic ? 'حجز' : history.length === 1 ? 'booking' : 'bookings'}</span></span>
                </div>
                {history.length === 0 ? (
                    <EmptyState title={copy.emptyHistory} description={copy.emptyHistoryHelp} />
                ) : (
                    <div className="mb-booking-list">
                        {history.map((booking) => <BookingCard key={booking.id} booking={booking} locale={locale} copy={copy} cancellingId={cancellingId} />)}
                    </div>
                )}
            </section>
        </section>
    )
}
