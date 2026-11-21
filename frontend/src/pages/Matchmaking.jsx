import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api, { errorMessage } from '../api'
import { useAuth } from '../auth'
import './matchmaking.css'

const COPY = {
  en: {
    eyebrow: '40 LOVE PADEL CLUB & CAFE · MATCHMAKING', title: 'Find your next match.',
    intro: 'Good games happen when the right players meet. Browse live sessions, choose your level, and reserve your place.',
    filter: 'Skill level', allLevels: 'All levels', openLevel: 'Open level', beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced',
    clearFilters: 'Clear filters', matches: 'matches', match: 'match', fullWaitlist: 'Full · waitlist open', spotsLeft: '{count} spot{suffix} left',
    time: 'Time', players: 'Players', skill: 'Skill level', capacity: 'Capacity', perPlayer: 'per player', paidAtClub: 'Paid at the club',
    joinWaitlist: 'Join waitlist', joinMatch: 'Join match', loading: 'Finding the next matches…', couldNotLoad: 'Could not load matches', retry: 'Try again',
    none: 'No upcoming matches', adjust: 'Try adjusting your filters.', checkBack: 'Check back soon for new organised matches.',
    close: 'Close', joinedList: 'Joined waiting list', reservationConfirmed: 'Reservation confirmed', onList: 'You’re on the list!', spotReserved: 'Your spot is reserved.',
    sport: 'Sport', court: 'Court', date: 'Date', pricePerPlayer: 'Price per player', reservationStatus: 'Reservation status', paymentStatus: 'Payment status',
    unpaid: 'UNPAID', waitingList: 'Waiting list', paymentTitle: 'Payment at the club', paymentText: 'No online payment is required. Please pay at 40 Love Padel Club & Cafe reception on the day of the match.',
    waitlistOffer: 'You have joined the waiting list. If a spot opens up, you will see an offer in My Matches. You will have 10 minutes to accept it.',
    done: 'Done', reserve: 'Reserve your spot', joinConfirm: 'Join waiting list', confirmReservation: 'Confirm reservation', pleaseWait: 'Please wait…',
    full: 'Match full · {count} on waitlist', spotsOf: '{available} of {total}', status: 'Status', spots: 'Spots left',
    waitlistPayment: 'If a spot opens, you will have 10 minutes to accept the offer.',
    reservePayment: 'Your place will be reserved. Payment is due at the club on the day of the match.', cancel: 'Cancel',
  },
  ar: {
    eyebrow: 'نادي 40 LOVE للبادل والمقهى · المباريات', title: 'اعثر على مباراتك القادمة.',
    intro: 'تبدأ المباريات الرائعة عندما يلتقي اللاعبون المناسبون. تصفّح الجلسات واختر مستواك واحجز مكانك.',
    filter: 'المستوى', allLevels: 'كل المستويات', openLevel: 'مستوى مفتوح', beginner: 'مبتدئ', intermediate: 'متوسط', advanced: 'متقدم',
    clearFilters: 'مسح التصفية', matches: 'مباريات', match: 'مباراة', fullWaitlist: 'مكتملة · قائمة انتظار مفتوحة', spotsLeft: 'متبقي {count} أماكن',
    time: 'الوقت', players: 'اللاعبون', skill: 'المستوى', capacity: 'السعة', perPlayer: 'للاعب الواحد', paidAtClub: 'الدفع في النادي',
    joinWaitlist: 'انضم لقائمة الانتظار', joinMatch: 'انضم للمباراة', loading: 'جارٍ البحث عن مباريات…', couldNotLoad: 'تعذّر تحميل المباريات', retry: 'حاول مجددًا',
    none: 'لا توجد مباريات قادمة', adjust: 'جرّب تعديل خيارات التصفية.', checkBack: 'عد قريبًا للاطلاع على المباريات الجديدة.',
    close: 'إغلاق', joinedList: 'تمت إضافتك إلى قائمة الانتظار', reservationConfirmed: 'تم تأكيد الحجز', onList: 'أنت على القائمة!', spotReserved: 'تم حجز مكانك.',
    sport: 'الرياضة', court: 'الملعب', date: 'التاريخ', pricePerPlayer: 'السعر للاعب', reservationStatus: 'حالة الحجز', paymentStatus: 'حالة الدفع',
    unpaid: 'غير مدفوع', waitingList: 'قائمة الانتظار', paymentTitle: 'الدفع في النادي', paymentText: 'لا يلزم الدفع عبر الإنترنت. يرجى الدفع في استقبال نادي 40 Love يوم المباراة.',
    waitlistOffer: 'انضممت إلى قائمة الانتظار. إذا توفر مكان، سيظهر لك عرض في صفحة مبارياتي، وستكون لديك ١٠ دقائق لقبوله.',
    done: 'تم', reserve: 'احجز مكانك', joinConfirm: 'انضم لقائمة الانتظار', confirmReservation: 'تأكيد الحجز', pleaseWait: 'يرجى الانتظار…',
    full: 'المباراة مكتملة · {count} في قائمة الانتظار', spotsOf: '{available} من {total}', status: 'الحالة', spots: 'الأماكن المتاحة',
    waitlistPayment: 'إذا توفر مكان، ستكون لديك ١٠ دقائق لقبول العرض.',
    reservePayment: 'سيتم حجز مكانك، والدفع في النادي يوم المباراة.', cancel: 'إلغاء',
  },
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function sportLabel(sport, locale) {
  return String(sport || '').toLowerCase() === 'padel' ? (locale === 'ar' ? 'بادل' : 'Padel') : (locale === 'ar' ? 'مباراة مؤرشفة' : 'Archived match')
}
function skillLabel(level, locale, t) {
  const labels = locale === 'ar'
    ? { beginner: t.beginner, intermediate: t.intermediate, advanced: t.advanced, open: t.openLevel }
    : { beginner: t.beginner, intermediate: t.intermediate, advanced: t.advanced, open: t.openLevel }
  return labels[level] || level
}
function fmtDate(iso, locale) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-JO' : 'en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Amman' }).format(new Date(iso))
}
function fmtTime(iso, locale) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-JO-u-nu-latn' : 'en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Amman', hour12: false }).format(new Date(iso))
}
function fmtMoney(n, locale) {
  const amount = Number(n || 0).toLocaleString(locale === 'ar' ? 'ar-JO-u-nu-latn' : 'en-JO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${amount} ${locale === 'ar' ? 'دينار' : 'JOD'}`
}

// ─── Icons ──────────────────────────────────────────────────────────────────────

function Icon({ name, size = 18 }) {
  const paths = {
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    court: <><rect x="3" y="3" width="18" height="18" rx="1"/><path d="M12 3v18M3 12h18"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    close: <path d="m6 6 12 12M18 6 6 18"/>,
    trophy: <><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0 0 12 0V2Z"/></>,
    info: <><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></>,
    star: <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>,
    credit: <><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M7 15h2"/></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.calendar}</svg>
}

// ─── Match card ─────────────────────────────────────────────────────────────────

function MatchCard({ match, onJoin, locale, t }) {
  const pct = Math.round((match.confirmedCount / match.maxPlayers) * 100)
  const isFull = match.availableSpots === 0
  const sport = String(match.sport || '').toLowerCase()

  return (
    <article className="mm-card">
      <div className="mm-card-header">
        <span className={`mm-sport-badge ${sport}`}>{sportLabel(match.sport, locale)}</span>
        <span className={`mm-status-badge ${isFull ? 'full' : ''}`}>
          {isFull ? t.fullWaitlist : t.spotsLeft.replace('{count}', match.availableSpots).replace('{suffix}', match.availableSpots !== 1 ? 's' : '')}
        </span>
      </div>

      <div className="mm-card-body">
        <h3 className="mm-card-title">{match.courtName} · {fmtDate(match.startsAt, locale)}</h3>

        <div className="mm-card-meta">
          <div className="mm-meta-item">
            <span className="mm-meta-label">{t.time}</span>
            <span className="mm-meta-value">{fmtTime(match.startsAt, locale)} – {fmtTime(match.endsAt, locale)}</span>
          </div>
          <div className="mm-meta-item">
            <span className="mm-meta-label">{t.players}</span>
            <span className="mm-meta-value">{match.confirmedCount} / {match.maxPlayers}</span>
          </div>
          {match.skillLevel && match.skillLevel !== 'open' && (
            <div className="mm-meta-item" style={{ gridColumn: '1 / -1' }}>
              <span className="mm-meta-label">{t.skill}</span>
              <span className="mm-meta-value">
                <span className="mm-skill-tag"><Icon name="star" size={11} />{skillLabel(match.skillLevel, locale, t)}</span>
              </span>
            </div>
          )}
        </div>

        <div className="mm-capacity">
          <div className="mm-capacity-label">
            <span>{t.capacity}</span>
            <strong>{match.confirmedCount} / {match.maxPlayers}</strong>
          </div>
          <div className="mm-capacity-bar">
            <div className={`mm-capacity-fill ${isFull ? 'full' : ''}`} style={{ width: `${pct}%` }} />
          </div>
        </div>

        {match.description && (
          <p className="mm-card-description">{match.description}</p>
        )}
      </div>

      <div className="mm-card-footer">
        <div className="mm-price">
          <span className="mm-price-value">{fmtMoney(match.pricePerPlayer, locale)}</span>
          <span className="mm-price-label">{t.perPlayer} · {t.paidAtClub}</span>
        </div>
        <button
          className={`mm-join-btn ${isFull ? 'waitlist' : ''}`}
          onClick={() => onJoin(match)}
        >
          {isFull ? t.joinWaitlist : t.joinMatch}
        </button>
      </div>
    </article>
  )
}

// ─── Reservation confirmation modal ────────────────────────────────────────────

function ReservationModal({ match, result, onClose, isWaitlist, locale, t }) {
  return (
    <div className="mm-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="mm-modal" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
        <div className="mm-modal-header">
          <div>
            <div className="mm-modal-kicker">{isWaitlist ? t.joinedList : t.reservationConfirmed}</div>
            <h2>{isWaitlist ? t.onList : t.spotReserved}</h2>
          </div>
          <button className="mm-modal-close" type="button" onClick={onClose} aria-label={t.close}><Icon name="close" size={15} /></button>
        </div>
        <div className="mm-modal-body" data-lenis-prevent>
          <div className="mm-success-check"><Icon name="check" size={24} /></div>

          {!isWaitlist && result && (
            <>
              {[
                [t.sport, sportLabel(match.sport, locale)],
                [t.court, match.courtName],
                [t.date, fmtDate(match.startsAt, locale)],
                [t.time, `${fmtTime(match.startsAt, locale)} – ${fmtTime(match.endsAt, locale)}`],
                [t.pricePerPlayer, fmtMoney(result.pricePerPlayer, locale)],
                [t.reservationStatus, result.status],
                [t.paymentStatus, t.unpaid],
              ].map(([label, value]) => (
                <div key={label} className="mm-confirm-row">
                  <span>{label}</span><span>{value}</span>
                </div>
              ))}
            </>
          )}

          {isWaitlist && result && <p className="mm-waitlist-copy">{t.waitlistOffer}</p>}

          <div className="mm-payment-notice">
            <strong><Icon name="credit" size={15} />{t.paymentTitle}</strong>
            {t.paymentText}
          </div>

          <div className="mm-modal-actions">
            <button className="primary" type="button" onClick={onClose}>{t.done}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Join confirmation modal ───────────────────────────────────────────────────

function JoinModal({ match, onConfirm, onClose, loading, error, locale, t }) {
  const isFull = match.availableSpots === 0
  return (
    <div className="mm-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="mm-modal" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
        <div className="mm-modal-header">
          <div>
            <div className="mm-modal-kicker">{isFull ? t.joinWaitlist : t.reserve}</div>
            <h2>{match.courtName}</h2>
          </div>
          <button className="mm-modal-close" type="button" onClick={onClose} aria-label={t.close}><Icon name="close" size={15} /></button>
        </div>
        <div className="mm-modal-body" data-lenis-prevent>
          {[
            [t.sport, sportLabel(match.sport, locale)],
            [t.date, fmtDate(match.startsAt, locale)],
            [t.time, `${fmtTime(match.startsAt, locale)} – ${fmtTime(match.endsAt, locale)}`],
            [t.skill, skillLabel(match.skillLevel, locale, t)],
            [t.pricePerPlayer, fmtMoney(match.pricePerPlayer, locale)],
            isFull ? [t.status, t.full.replace('{count}', match.waitlistCount)] : [t.spots, t.spotsOf.replace('{available}', match.availableSpots).replace('{total}', match.maxPlayers)],
          ].map(([label, value]) => (
            <div key={label} className="mm-confirm-row">
              <span>{label}</span><span>{value}</span>
            </div>
          ))}

          <div className="mm-payment-notice">
            <strong><Icon name="credit" size={15} />{t.paymentTitle}</strong>
            {isFull ? t.waitlistPayment : t.reservePayment}
          </div>

          {error && (
            <p className="mm-modal-error" role="alert">{error}</p>
          )}

          <div className="mm-modal-actions">
            <button className="secondary" type="button" onClick={onClose} disabled={loading}>{t.cancel}</button>
            <button className="primary" type="button" onClick={onConfirm} disabled={loading}>
              {loading ? t.pleaseWait : isFull ? t.joinConfirm : t.confirmReservation}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Matchmaking Page ─────────────────────────────────────────────────────

export default function MatchmakingPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [locale, setLocale] = useState(() => document.documentElement.lang === 'ar' || localStorage.getItem('serva-locale') === 'ar' ? 'ar' : 'en')
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [skillFilter, setSkillFilter] = useState('')
  const [joinTarget, setJoinTarget] = useState(null)    // match to join
  const [joinLoading, setJoinLoading] = useState(false)
  const [joinError, setJoinError] = useState('')
  const [confirmResult, setConfirmResult] = useState(null) // { match, result, isWaitlist }
  const t = COPY[locale]

  useEffect(() => {
    const syncLocale = () => setLocale(document.documentElement.lang === 'ar' || localStorage.getItem('serva-locale') === 'ar' ? 'ar' : 'en')
    const observer = new MutationObserver(syncLocale)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['lang', 'dir'] })
    window.addEventListener('serva-locale-change', syncLocale)
    syncLocale()
    return () => {
      observer.disconnect()
      window.removeEventListener('serva-locale-change', syncLocale)
    }
  }, [])

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (skillFilter) params.set('skillLevel', skillFilter)
    api.get(`/matches?${params}`)
      .then(({ data }) => { setMatches(data); setError('') })
      .catch(err => setError(errorMessage(err)))
      .finally(() => setLoading(false))
  }, [skillFilter])

  // Fetch public match data when filters change.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [load])

  function handleJoinClick(match) {
    if (!user) {
      navigate(`/login?redirect=/matchmaking`)
      return
    }
    setJoinTarget(match)
    setJoinError('')
  }

  async function handleConfirmJoin() {
    if (!joinTarget) return
    setJoinLoading(true)
    setJoinError('')
    const isFull = joinTarget.availableSpots === 0
    try {
      if (isFull) {
        const { data } = await api.post(`/matches/${joinTarget.id}/waitlist`)
        setConfirmResult({ match: joinTarget, result: data, isWaitlist: true })
      } else {
        const { data } = await api.post(`/matches/${joinTarget.id}/join`)
        setConfirmResult({ match: joinTarget, result: data, isWaitlist: false })
      }
      setJoinTarget(null)
      load() // refresh availability
    } catch (err) {
      setJoinError(errorMessage(err))
    } finally {
      setJoinLoading(false)
    }
  }

  return (
    <div className="mm-page" dir={locale === 'ar' ? 'rtl' : 'ltr'} lang={locale}>
      <div className="mm-hero">
        <div className="mm-hero-inner">
          <div className="mm-hero-eyebrow">{t.eyebrow}</div>
          <h1>{locale === 'ar' ? t.title : <>Find your<br />next match.</>}</h1>
          <p>{t.intro}</p>
        </div>
      </div>

      <div className="mm-content">
        {/* Filters */}
        <div className="mm-filters">
          <label>
            {t.filter}
            <select value={skillFilter} onChange={e => setSkillFilter(e.target.value)}>
              <option value="">{t.allLevels}</option>
              <option value="open">{t.openLevel}</option>
              <option value="beginner">{t.beginner}</option>
              <option value="intermediate">{t.intermediate}</option>
              <option value="advanced">{t.advanced}</option>
            </select>
          </label>
          {skillFilter && (
            <button className="mm-filter-reset" type="button" onClick={() => { setSkillFilter('') }}>
              {t.clearFilters}
            </button>
          )}
          <span className="mm-results-count">
            {!loading && `${matches.length.toLocaleString(locale === 'ar' ? 'ar-JO' : 'en-GB')} ${matches.length === 1 ? t.match : t.matches}`}
          </span>
        </div>

        {/* Grid */}
        <div className="mm-grid">
          {loading && (
            <div className="mm-state">
              <span className="admin-spinner" style={{ width: 28, height: 28 }} />
              <strong>{t.loading}</strong>
            </div>
          )}
          {!loading && error && (
            <div className="mm-state">
              <div className="mm-state-icon"><Icon name="info" size={24} /></div>
              <strong>{t.couldNotLoad}</strong>
              <p>{error}</p>
              <button className="mm-join-btn" type="button" onClick={load}>{t.retry}</button>
            </div>
          )}
          {!loading && !error && matches.length === 0 && (
            <div className="mm-state">
              <div className="mm-state-icon"><Icon name="trophy" size={24} /></div>
              <strong>{t.none}</strong>
              <p>{skillFilter ? t.adjust : t.checkBack}</p>
            </div>
          )}
          {!loading && !error && matches.map(match => (
            <MatchCard key={match.id} match={match} onJoin={handleJoinClick} locale={locale} t={t} />
          ))}
        </div>
      </div>

      {/* Join confirmation modal */}
      {joinTarget && (
        <JoinModal
          match={joinTarget}
          onConfirm={handleConfirmJoin}
          onClose={() => { setJoinTarget(null); setJoinError('') }}
          loading={joinLoading}
          error={joinError}
          locale={locale}
          t={t}
        />
      )}

      {/* Success modal */}
      {confirmResult && (
        <ReservationModal
          match={confirmResult.match}
          result={confirmResult.result}
          isWaitlist={confirmResult.isWaitlist}
          onClose={() => setConfirmResult(null)}
          locale={locale}
          t={t}
        />
      )}
    </div>
  )
}
