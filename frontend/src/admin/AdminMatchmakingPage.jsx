import PageControls from '../components/PageControls'
import Icon from './AdminIcon'
import { useEffect, useMemo, useState, useCallback } from 'react'
import api, { errorMessage } from '../api'
import { clubCourtName } from '../format'
import { AdminDialog, Badge, Notice, PageHeading, StatePanel } from './AdminUI'
import { useAdminLocale } from './AdminLocale'

// ─── Locale helpers ──────────────────────────────────────────────────────────
const TEXT = {
  en: {
    beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced', open: 'Open / all levels',
    draft: 'Draft', published: 'Published', cancelled: 'Cancelled', completed: 'Completed', confirmed: 'Confirmed',
    draftHint: 'A draft is private and will not appear to members.', publishedHint: 'Published matches appear on the member matchmaking page immediately.',
    createdPublished: 'Match created and published. Members can see it now.', createdDraft: 'Draft saved. Publish it when you are ready for members to see it.',
    paid: 'Paid', unpaid: 'Unpaid', waiting: 'Waiting', offered: 'Offer sent', accepted: 'Accepted', declined: 'Declined', expired: 'Expired', removed: 'Removed',
    loading: 'Loading data…', unable: 'Unable to load', retry: 'Try again', dismiss: 'Dismiss',
    editMatch: 'Edit Match', createMatch: 'Create Match', updateDetails: 'Update match details', newMatch: 'New organised match',
    court: 'Court', selectCourt: 'Select a court…', startDate: 'Start date & time', endDate: 'End date & time', maxPlayers: 'Max players',
    pricePlayer: 'Price per player (JOD)', skill: 'Skill level', status: 'Status', notes: 'Notes / description (optional)', notesPlaceholder: 'Any details members should know…',
    cancel: 'Cancel', saving: 'Saving…', saveChanges: 'Save changes', create: 'Create match',
    selectCourtError: 'Please select a court.', invalidDate: 'Invalid date/time.', endAfterStart: 'End time must be after start time.', futureStart: 'Start time must be in the future.', matchHours: 'Matches must be between 7:00 AM and 3:00 AM the following day.', negativePrice: 'Price cannot be negative.',
    details: 'Match Details', sport: 'Sport', date: 'Date', time: 'Time', pricePerPlayer: 'Price / player', players: 'Players',
    expectedTotal: 'Expected total', collected: 'Collected', confirmedPlayers: 'confirmed players', participants: 'Participants', waitlist: 'Waitlist', member: 'Member', priceLocked: 'Price locked', reservation: 'Reservation', payment: 'Payment', actions: 'Actions',
    markPaid: 'Mark paid', markUnpaid: 'Mark unpaid', paymentUpdated: 'Payment status updated.', noParticipants: 'No participants yet.', noWaitlist: 'No waiting list entries.',
    publishConfirm: 'Publish this match? This will block the court slot and allow members to join.', publishSuccess: 'Match published.',
    cancelConfirm: 'Cancel this match? All confirmed reservations will be cancelled. This cannot be undone.', cancelSuccess: 'Match cancelled. All reservations have been cancelled.',
    updated: 'Match updated.', created: 'Match created.', all: 'All', allLevels: 'All levels',
    match: 'Match', dateTime: 'Date & Time', pricePer: 'Price/player', noMatches: 'No matches found. Create one to get started.',
    spotsWaitlist: 'on waitlist', edit: 'Edit', publish: 'Publish', cancelMatch: 'Cancel match',
    skillLevel: 'Skill level', waitlistStatus: 'Status', joined: 'Joined', offerExpires: 'Offer expires',
    participantsCount: 'Participants', waitlistCount: 'Waiting list', expected: 'Expected total',
  },
  ar: {
    beginner: 'مبتدئ', intermediate: 'متوسط', advanced: 'متقدم', open: 'مفتوح لجميع المستويات',
    draft: 'مسودة', published: 'منشورة', cancelled: 'ملغاة', completed: 'مكتملة', confirmed: 'مؤكد',
    draftHint: 'المسودة خاصة ولن تظهر للأعضاء.', publishedHint: 'المباريات المنشورة تظهر مباشرة في صفحة المباريات للأعضاء.',
    createdPublished: 'تم إنشاء المباراة ونشرها، وأصبحت ظاهرة للأعضاء.', createdDraft: 'تم حفظ المسودة. انشريها عندما تصبح جاهزة للظهور للأعضاء.',
    paid: 'مدفوع', unpaid: 'غير مدفوع', waiting: 'بانتظار الدور', offered: 'تم إرسال العرض', accepted: 'تم القبول', declined: 'مرفوض', expired: 'منتهي', removed: 'تمت الإزالة',
    loading: 'جارٍ تحميل البيانات…', unable: 'تعذّر تحميل البيانات', retry: 'إعادة المحاولة', dismiss: 'إغلاق التنبيه',
    editMatch: 'تعديل المباراة', createMatch: 'إنشاء مباراة', updateDetails: 'تحديث تفاصيل المباراة', newMatch: 'مباراة منظمة جديدة',
    court: 'الملعب', selectCourt: 'اختاري ملعبًا…', startDate: 'تاريخ ووقت البداية', endDate: 'تاريخ ووقت النهاية', maxPlayers: 'الحد الأقصى للاعبين',
    pricePlayer: 'السعر لكل لاعب (دينار)', skill: 'مستوى المهارة', status: 'الحالة', notes: 'ملاحظات / وصف (اختياري)', notesPlaceholder: 'أضيفي أي تفاصيل مهمة للأعضاء…',
    cancel: 'إلغاء', saving: 'جارٍ الحفظ…', saveChanges: 'حفظ التعديلات', create: 'إنشاء المباراة',
    selectCourtError: 'يرجى اختيار ملعب.', invalidDate: 'التاريخ أو الوقت غير صالح.', endAfterStart: 'يجب أن يكون وقت النهاية بعد وقت البداية.', futureStart: 'يجب أن يكون موعد المباراة في المستقبل.', matchHours: 'يجب أن تقع المباراة بين ٧ صباحًا و٣ صباحًا من اليوم التالي.', negativePrice: 'لا يمكن أن يكون السعر سالبًا.',
    details: 'تفاصيل المباراة', sport: 'اللعبة', date: 'التاريخ', time: 'الوقت', pricePerPlayer: 'السعر لكل لاعب', players: 'اللاعبون',
    expectedTotal: 'الإجمالي المتوقع', collected: 'المبلغ المحصّل', confirmedPlayers: 'لاعبين مؤكدين', participants: 'المشاركون', waitlist: 'قائمة الانتظار', member: 'العضو', priceLocked: 'السعر المثبّت', reservation: 'الحجز', payment: 'الدفع', actions: 'الإجراءات',
    markPaid: 'تسجيل الدفع', markUnpaid: 'إلغاء تسجيل الدفع', paymentUpdated: 'تم تحديث حالة الدفع.', noParticipants: 'لا يوجد مشاركون حتى الآن.', noWaitlist: 'قائمة الانتظار فارغة.',
    publishConfirm: 'هل تريدين نشر المباراة؟ سيؤدي ذلك إلى حجز الملعب وإتاحة الانضمام للأعضاء.', publishSuccess: 'تم نشر المباراة.',
    cancelConfirm: 'هل تريدين إلغاء المباراة؟ سيتم إلغاء جميع الحجوزات المؤكدة. لا يمكن التراجع عن هذا الإجراء.', cancelSuccess: 'تم إلغاء المباراة وجميع الحجوزات.',
    updated: 'تم تحديث المباراة.', created: 'تم إنشاء المباراة.', all: 'الكل', allLevels: 'كل المستويات',
    match: 'المباراة', dateTime: 'التاريخ والوقت', pricePer: 'السعر لكل لاعب', noMatches: 'لا توجد مباريات. أنشئي مباراة جديدة للبدء.',
    spotsWaitlist: 'في قائمة الانتظار', edit: 'تعديل', publish: 'نشر', cancelMatch: 'إلغاء المباراة',
    skillLevel: 'مستوى المهارة', waitlistStatus: 'الحالة', joined: 'تاريخ الانضمام', offerExpires: 'انتهاء العرض',
    participantsCount: 'المشاركون', waitlistCount: 'قائمة الانتظار', expected: 'الإجمالي المتوقع',
  },
}
const tr = (key, ar = false) => (TEXT[ar ? 'ar' : 'en'][key] ?? key)
function sportLabel(sport, ar = false) {
  return String(sport || '').toLowerCase() === 'padel' ? (ar ? 'بادل' : 'Padel') : (ar ? 'مؤرشف' : 'Archived')
}
function skillLabel(level, ar = false) { return tr(level, ar) }
function statusLabel(status, ar = false) { return tr(status, ar) }
function courtLabel(name, ar = false) {
  if (!name) return '—'
  if (/^archived court$/i.test(name)) return ar ? 'ملعب مؤرشف' : 'Archived court'
  return clubCourtName(name, ar ? 'ar' : 'en')
}
function fmtDate(iso, ar = false) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat(ar ? 'ar-JO-u-nu-latn' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Amman' }).format(new Date(iso))
}
function fmtDateTime(iso, ar = false) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat(ar ? 'ar-JO-u-nu-latn' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Amman', hour12: false }).format(new Date(iso))
}
function fmtTime(iso, ar = false) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat(ar ? 'ar-JO-u-nu-latn' : 'en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Amman', hour12: false }).format(new Date(iso))
}
function fmtMoney(n, ar) {
  const amount = Number(n || 0).toLocaleString(ar ? 'ar-JO' : 'en-GB', { minimumFractionDigits: 3, maximumFractionDigits: 3 })
  return `${amount} ${ar ? 'د.أ.' : 'JOD'}`
}
function PhoneContact({ phone }) {
  if (!phone) return null
  const sanitized = String(phone).replace(/[^+\d]/g, '')
  const href = /^\+?\d{8,15}$/.test(sanitized) ? `tel:${sanitized}` : ''
  return href ? <a className="admin-phone-link" href={href} dir="ltr">{phone}</a> : <small dir="ltr">{phone}</small>
}

// ─── Icons ───────────────────────────────────────────────────────────────────
function matchStatusTone(status) {
  return status === 'published' ? 'success' : status === 'cancelled' ? 'danger' : status === 'completed' ? 'neutral' : 'warning'
}

// ─── Match Form Modal ─────────────────────────────────────────────────────────

const clubInputClock = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Amman', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
})

function toClubInput(date) {
  const parts = Object.fromEntries(clubInputClock.formatToParts(date).map(({ type, value }) => [type, value]))
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
}

function MatchFormModal({ editMatch, courts, onSave, onClose }) {
  const ar = useAdminLocale() === 'ar'
  const now = new Date()
  const defaultStart = new Date(now.getTime() + 24*60*60*1000)

  const [form, setForm] = useState({
    courtId: editMatch?.courtId || (courts[0]?.id || ''),
    startsAt: editMatch ? toClubInput(new Date(editMatch.startsAt)) : toClubInput(defaultStart),
    endsAt: editMatch ? toClubInput(new Date(editMatch.endsAt)) : toClubInput(new Date(defaultStart.getTime() + 2*60*60*1000)),
    maxPlayers: editMatch?.maxPlayers ?? 4,
    pricePerPlayer: editMatch?.pricePerPlayer ?? '35.000',
    skillLevel: editMatch?.skillLevel ?? 'open',
    description: editMatch?.description ?? '',
    status: editMatch?.status ?? 'published',
  })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

  async function submit(e) {
    e.preventDefault()
    setFormError('')
    // Basic validation
    if (!form.courtId) { setFormError(tr('selectCourtError', ar)); return }
    const startsAt = form.startsAt + ':00+03:00'
    const endsAt = form.endsAt + ':00+03:00'
    const s = new Date(startsAt), en = new Date(endsAt)
    if (isNaN(s.getTime()) || isNaN(en.getTime())) { setFormError(tr('invalidDate', ar)); return }
    if (en <= s) { setFormError(tr('endAfterStart', ar)); return }
    if (s <= new Date()) { setFormError(tr('futureStart', ar)); return }
    const [year, month, day] = form.startsAt.slice(0, 10).split('-').map(Number)
    const [startHour, startMinute] = form.startsAt.slice(11).split(':').map(Number)
    const [endYear, endMonth, endDay] = form.endsAt.slice(0, 10).split('-').map(Number)
    const [endHour, endMinute] = form.endsAt.slice(11).split(':').map(Number)
    const localMs = (y, m, d, h, min) => Date.UTC(y, m - 1, d, h, min)
    const startMs = localMs(year, month, day, startHour, startMinute)
    const endMs = localMs(endYear, endMonth, endDay, endHour, endMinute)
    const clubDayStartMs = startHour < 3
      ? localMs(year, month, day - 1, 7, 0)
      : localMs(year, month, day, 7, 0)
    const clubDayEndMs = clubDayStartMs + 20 * 60 * 60 * 1000
    if (startHour >= 3 && startHour < 7 || startMs < clubDayStartMs || startMs >= clubDayEndMs || endMs > clubDayEndMs) {
      setFormError(tr('matchHours', ar))
      return
    }
    if (Number(form.pricePerPlayer) < 0) { setFormError(tr('negativePrice', ar)); return }

    if (editMatch && editMatch.status !== 'cancelled' && form.status === 'cancelled' && !window.confirm(tr('cancelConfirm', ar))) return
    setSaving(true)
    const court = courts.find(c => c.id === Number(form.courtId))
    const payload = {
      sport: court ? court.sport : 'padel', // Fallback just in case
      courtId: Number(form.courtId),
      startsAt,
      endsAt,
      maxPlayers: Number(form.maxPlayers),
      pricePerPlayer: Number(form.pricePerPlayer),
      skillLevel: form.skillLevel,
      description: form.description || null,
    }
    try {
      payload.status = form.status
      const response = editMatch
        ? await api.patch(`/admin/matchmaking/${editMatch.id}`, payload)
        : await api.post('/admin/matchmaking', payload)
      onSave(response.data)
    } catch (err) {
      setFormError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminDialog className="admin-modal-card" label={editMatch ? tr('editMatch', ar) : tr('createMatch', ar)} onClose={onClose} busy={saving}>
        <div className="admin-modal-header">
          <div>
            <h2 id="admin-match-modal-title">
              {editMatch ? tr('updateDetails', ar) : tr('newMatch', ar)}
            </h2>
          </div>
          <button type="button" className="admin-modal-close" disabled={saving} onClick={onClose} aria-label={tr('cancel', ar)}>
            <Icon name="close" size={15} />
          </button>
        </div>
        <form onSubmit={submit} className="admin-match-form-body">
          <label className="admin-modal-field">
            {tr('court', ar)} *
            <select className="admin-modal-control" value={form.courtId} onChange={e => set('courtId', e.target.value)} required>
              <option value="">{tr('selectCourt', ar)}</option>
              {courts.map(c => <option key={c.id} value={c.id}>{courtLabel(c.name, ar)} ({sportLabel(c.sport, ar)})</option>)}
            </select>
          </label>

          <div className="admin-modal-grid">
            <label className="admin-modal-field">
              {tr('startDate', ar)} ({ar ? 'توقيت عمّان' : 'Amman time'}) *
              <input className="admin-modal-control" type="datetime-local" value={form.startsAt} onChange={e => set('startsAt', e.target.value)} required />
            </label>
            <label className="admin-modal-field">
              {tr('endDate', ar)} ({ar ? 'توقيت عمّان' : 'Amman time'}) *
              <input className="admin-modal-control" type="datetime-local" value={form.endsAt} onChange={e => set('endsAt', e.target.value)} required />
            </label>
          </div>

          <div className="admin-modal-grid">
            <label className="admin-modal-field">
              {tr('maxPlayers', ar)} *
              <input className="admin-modal-control" type="number" min="2" max="20" value={form.maxPlayers} onChange={e => set('maxPlayers', e.target.value)} required />
            </label>
            <label className="admin-modal-field">
              {tr('pricePlayer', ar)} *
              <input className="admin-modal-control" type="number" min="0" step="0.001" value={form.pricePerPlayer} onChange={e => set('pricePerPlayer', e.target.value)} required />
            </label>
          </div>

          <div className="admin-modal-grid">
            <label className="admin-modal-field">
              {tr('skill', ar)}
              <select className="admin-modal-control" value={form.skillLevel} onChange={e => set('skillLevel', e.target.value)}>
                <option value="open">{tr('open', ar)}</option>
                <option value="beginner">{tr('beginner', ar)}</option>
                <option value="intermediate">{tr('intermediate', ar)}</option>
                <option value="advanced">{tr('advanced', ar)}</option>
              </select>
            </label>
            <label className="admin-modal-field">
              {tr('status', ar)}
              <select className="admin-modal-control" value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="published">{tr('published', ar)}</option>
                <option value="draft">{tr('draft', ar)}</option>
                {editMatch && <option value="completed">{tr('completed', ar)}</option>}
                {editMatch && <option value="cancelled">{tr('cancelled', ar)}</option>}
              </select>
              <small className="admin-field-hint">
                {form.status === 'published' ? tr('publishedHint', ar) : tr('draftHint', ar)}
              </small>
            </label>
          </div>

          <label className="admin-modal-field">
            {tr('notes', ar)}
            <textarea className="admin-modal-control" value={form.description} onChange={e => set('description', e.target.value)} rows={3} maxLength={2000} placeholder={tr('notesPlaceholder', ar)} />
          </label>

          {formError && <div className="admin-form-error" role="alert">{formError}</div>}

          <div className="admin-modal-actions">
            <button type="button" className="admin-button secondary" disabled={saving} onClick={onClose}>
              {tr('cancel', ar)}
            </button>
            <button type="submit" disabled={saving} className="admin-button primary">
              {saving ? tr('saving', ar) : editMatch ? tr('saveChanges', ar) : tr('create', ar)}
            </button>
          </div>
        </form>
    </AdminDialog>
  )
}

// ─── Match Detail Drawer ───────────────────────────────────────────────────────

function MatchDetailPanel({ matchId, onClose, onRefresh }) {
  const ar = useAdminLocale() === 'ar'
  const [detailError, setDetailError] = useState('')
  const [match, setMatch]   = useState(null)
  const [reservations, setReservations] = useState([])
  const [waitlist, setWaitlist] = useState([])
  const [totals, setTotals] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('participants')
  const [busyId, setBusyId] = useState(null)
  const [notice, setNotice] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      api.get(`/admin/matchmaking/${matchId}`),
      api.get(`/admin/matchmaking/${matchId}/reservations`),
      api.get(`/admin/matchmaking/${matchId}/waitlist`),
      api.get(`/admin/matchmaking/${matchId}/totals`),
    ])
      .then(([m, r, w, t]) => {
        setDetailError(''); setMatch(m.data); setReservations(r.data); setWaitlist(w.data); setTotals(t.data)
        setLoading(false)
      })
      .catch(err => { setDetailError(errorMessage(err)); setLoading(false) })
  }, [matchId])

  // Intentional: load data when the selected match changes.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [load])

  async function togglePayment(res) {
    setBusyId(res.id)
    setNotice(null)
    try {
      await api.patch(`/admin/matchmaking/reservations/${res.id}/payment`, { paid: res.paymentStatus !== 'paid' })
      setNotice({ type: 'success', text: tr('paymentUpdated', ar) })
      load(); onRefresh()
    } catch (err) { setNotice({ type: 'error', text: errorMessage(err) }) }
    finally { setBusyId(null) }
  }

  return (
    <AdminDialog className="admin-match-detail-drawer" label={tr('details', ar)} onClose={onClose}>
        <div className="admin-match-detail-header">
          <h2 id="admin-match-detail-title">{tr('details', ar)}</h2>
          <button type="button" className="admin-modal-close" onClick={onClose} aria-label={tr('cancel', ar)}>
            <Icon name="close" size={15} />
          </button>
        </div>

        <StatePanel loading={loading} error={detailError} retry={load} />

        {!loading && !detailError && match && (
          <>
            <div className="admin-match-detail-content">
              {notice && <Notice type={notice.type} onClose={() => setNotice(null)}>{notice.text}</Notice>}

              <div className="admin-match-facts">
                {[
                  [tr('sport', ar), sportLabel(match.sport, ar)],
                  [tr('court', ar), courtLabel(match.courtName, ar)],
                  [tr('date', ar), fmtDate(match.startsAt, ar)],
                  [tr('time', ar), `${fmtTime(match.startsAt, ar)} – ${fmtTime(match.endsAt, ar)}`],
                  [tr('skill', ar), skillLabel(match.skillLevel, ar)],
                  [tr('pricePerPlayer', ar), fmtMoney(match.pricePerPlayer, ar)],
                  [tr('players', ar), `${match.confirmedCount} / ${match.maxPlayers}`],
                  [tr('status', ar), statusLabel(match.status, ar)],
                ].map(([k, v]) => (
                  <div key={k} className="admin-match-fact">
                    <span>{k}</span>
                    <strong>{v}</strong>
                  </div>
                ))}
              </div>

              {totals && (
                <div className="admin-match-totals">
                  <div className="admin-match-total">
                    <span>{tr('expectedTotal', ar)}</span>
                    <strong>{fmtMoney(totals.expectedTotal, ar)}</strong>
                    <small>{totals.confirmedCount} {tr('confirmedPlayers', ar)}</small>
                  </div>
                  <div className="admin-match-total is-collected">
                    <span>{tr('collected', ar)}</span>
                    <strong>{fmtMoney(totals.collectedTotal, ar)}</strong>
                    <small>{totals.paidCount} {tr('paid', ar)}</small>
                  </div>
                </div>
              )}

              {/* Tabs */}
              <div className="admin-match-detail-tabs" role="group" aria-label={tr('details', ar)}>
                {[['participants', `${tr('participants', ar)} (${reservations.length})`], ['waitlist', `${tr('waitlist', ar)} (${waitlist.filter(w => w.status === 'waiting' || w.status === 'offered').length})`]].map(([key, label]) => (
                  <button key={key} type="button" aria-pressed={tab === key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>{label}</button>
                ))}
              </div>

              {tab === 'participants' && (
                <div className="admin-match-detail-table-scroll" tabIndex={0} role="region" aria-label={tr(tab, ar)}>
                  <table className="admin-match-detail-table">
                    <thead>
                      <tr>
                        {[tr('member', ar), tr('priceLocked', ar), tr('reservation', ar), tr('payment', ar), tr('actions', ar)].map(h => <th key={h}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {reservations.map(res => (
                        <tr key={res.id}>
                          <td><strong>{res.fullName}</strong><small>{res.email}</small><PhoneContact phone={res.phone} /></td>
                          <td>{fmtMoney(res.priceSnapshot, ar)}</td>
                          <td><Badge tone={res.status === 'confirmed' ? 'success' : 'danger'}>{statusLabel(res.status, ar)}</Badge></td>
                          <td><Badge tone={res.paymentStatus === 'paid' ? 'success' : 'warning'}>{tr(res.paymentStatus, ar)}</Badge></td>
                          <td>
                            {res.status === 'confirmed' && (
                              <button
                                className="admin-table-action link"
                                disabled={busyId === res.id}
                                onClick={() => togglePayment(res)}
                              >
                                {busyId === res.id ? '…' : res.paymentStatus === 'paid' ? tr('markUnpaid', ar) : tr('markPaid', ar)}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {reservations.length === 0 && (
                        <tr><td colSpan={5} className="admin-table-empty">{tr('noParticipants', ar)}</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {tab === 'waitlist' && (
                <div className="admin-match-detail-table-scroll" tabIndex={0} role="region" aria-label={tr(tab, ar)}>
                  <table className="admin-match-detail-table">
                    <thead>
                      <tr>
                        {['#', tr('member', ar), tr('status', ar), tr('joined', ar), tr('offerExpires', ar)].map(h => <th key={h}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {waitlist.map(entry => (
                        <tr key={entry.id}>
                          <td>{entry.position || '—'}</td>
                          <td><strong>{entry.fullName}</strong><small>{entry.email}</small><PhoneContact phone={entry.phone} /></td>
                          <td><Badge tone={entry.status === 'offered' ? 'warning' : entry.status === 'accepted' ? 'success' : 'neutral'}>{statusLabel(entry.status, ar)}</Badge></td>
                          <td>{fmtDateTime(entry.joinedAt, ar)}</td>
                          <td>{entry.offerExpiresAt ? fmtDateTime(entry.offerExpiresAt, ar) : '—'}</td>
                        </tr>
                      ))}
                      {waitlist.length === 0 && (
                        <tr><td colSpan={5} className="admin-table-empty">{tr('noWaitlist', ar)}</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
    </AdminDialog>
  )
}

// ─── Admin Matchmaking Page ───────────────────────────────────────────────────

export function AdminMatchmakingPage() {
  const locale = useAdminLocale()
  const ar = locale === 'ar'
  const [page, setPage] = useState(0)
  const [matches, setMatches] = useState([])
  const [courts, setCourts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [editMatch, setEditMatch] = useState(null)
  const [detailId, setDetailId] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [reload, setReload] = useState(0)
  const refresh = () => { setLoading(true); setReload(v => v + 1) }

  useEffect(() => {
    let live = true
    Promise.all([
      api.get('/admin/matchmaking', { params: { page, status: statusFilter === 'all' ? undefined : statusFilter } }),
      api.get('/courts'),
    ])
      .then(([m, c]) => { if (live) { setMatches(m.data); setCourts(c.data); setError('') } })
      .catch(err => { if (live) setError(errorMessage(err)) })
      .finally(() => { if (live) setLoading(false) })
    return () => { live = false }
  }, [reload, page, statusFilter])

  async function publishMatch(match) {
    if (!window.confirm(`${tr('publishConfirm', ar)}\n${courtLabel(match.courtName, ar)}`)) return
    setBusyId(match.id)
    setNotice(null)
    try {
      await api.post(`/admin/matchmaking/${match.id}/publish`)
      setNotice({ type: 'success', text: tr('publishSuccess', ar) })
      refresh()
    } catch (err) { setNotice({ type: 'error', text: errorMessage(err) }) }
    finally { setBusyId(null) }
  }

  async function cancelMatch(match) {
    if (!window.confirm(tr('cancelConfirm', ar))) return
    setBusyId(match.id)
    setNotice(null)
    try {
      await api.post(`/admin/matchmaking/${match.id}/cancel`)
      setNotice({ type: 'success', text: tr('cancelSuccess', ar) })
      refresh()
    } catch (err) { setNotice({ type: 'error', text: errorMessage(err) }) }
    finally { setBusyId(null) }
  }

  const filtered = useMemo(() =>
    matches.filter(m => statusFilter === 'all' || m.status === statusFilter),
    [matches, statusFilter]
  )

  const statusFilters = [
    { key: 'all', label: tr('all', ar) },
    { key: 'draft', label: tr('draft', ar) },
    { key: 'published', label: tr('published', ar) },
    { key: 'completed', label: tr('completed', ar) },
    { key: 'cancelled', label: tr('cancelled', ar) },
  ]

  return (
    <div className="admin-matchmaking-page" dir={ar ? 'rtl' : 'ltr'} lang={ar ? 'ar' : 'en'}>
      <PageHeading
        title={ar ? 'إدارة المباريات' : 'Matchmaking'}
        description={ar ? 'أنشئ وأدر المباريات المنظمة للأعضاء.' : 'Create and manage organised matches for members.'}
        action={
          <button className="admin-button primary" onClick={() => { setEditMatch(null); setShowForm(true) }}>
            <Icon name="plus" size={15} />{ar ? 'إنشاء مباراة' : 'Create match'}
          </button>
        }
      />

      <Notice type={notice?.type} onClose={() => setNotice(null)}>{notice?.text}</Notice>

      <section className="admin-panel admin-list-panel">
        <div className="admin-toolbar">
          <button className="admin-button secondary" onClick={refresh}><Icon name="refresh" size={15} />{ar ? 'تحديث' : 'Refresh'}</button>
        </div>

        <div className="admin-filter-row" data-lenis-prevent>
          {statusFilters.map(f => (
            <button key={f.key} aria-pressed={statusFilter === f.key} className={statusFilter === f.key ? 'active' : ''} onClick={() => { setPage(0); setStatusFilter(f.key) }}>{f.label}</button>
          ))}
        </div>

        <PageControls page={page} count={matches.length} onPage={setPage} ar={ar} loading={loading} />
        <StatePanel loading={loading} error={error} retry={refresh} empty={filtered.length === 0 ? tr('noMatches', ar) : null} ar={ar}>
          <div className="admin-table-scroll" tabIndex={0} role="region" aria-label={tr('match', ar)} data-lenis-prevent>
            <table className="admin-table admin-match-table">
              <thead>
                <tr>
                  {[tr('match', ar), tr('court', ar), tr('dateTime', ar), tr('players', ar), tr('pricePer', ar), tr('status', ar), tr('actions', ar)].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(match => (
                  <tr key={match.id} className="admin-match-row" onClick={event => { if (!event.target.closest('button, a, input, select')) setDetailId(match.id) }}>
                    <td>
                      <strong>{sportLabel(match.sport, ar)}</strong>
                      <small>{skillLabel(match.skillLevel, ar)}</small>
                    </td>
                    <td><button type="button" className="admin-detail-link" onClick={() => setDetailId(match.id)}>{courtLabel(match.courtName, ar)}</button></td>
                    <td>
                      <strong>{fmtDate(match.startsAt, ar)}</strong>
                      <small>{fmtTime(match.startsAt, ar)} – {fmtTime(match.endsAt, ar)}</small>
                    </td>
                    <td>
                      <strong>{match.confirmedCount} / {match.maxPlayers}</strong>
                      {match.waitlistCount > 0 && <small>{match.waitlistCount} {tr('spotsWaitlist', ar)}</small>}
                    </td>
                    <td className="admin-money-cell">
                      <strong>{fmtMoney(match.pricePerPlayer, ar)}</strong>
                    </td>
                    <td>
                      <Badge tone={matchStatusTone(match.status)}>{statusLabel(match.status, ar)}</Badge>
                    </td>
                    <td>
                      <div className="admin-row-actions">
                        <button type="button" className="admin-button secondary admin-action-icon" title={tr('edit', ar)} onClick={() => { setEditMatch(match); setShowForm(true) }}>
                          <Icon name="edit" size={13} />
                        </button>
                        {match.status === 'draft' && (
                          <button type="button" className="admin-button primary admin-action-icon" title={tr('publish', ar)} disabled={busyId === match.id} onClick={() => publishMatch(match)}>
                            <Icon name="publish" size={13} />
                          </button>
                        )}
                        {(match.status === 'draft' || match.status === 'published') && (
                          <button type="button" className="admin-button danger admin-action-icon" title={tr('cancelMatch', ar)} disabled={busyId === match.id} onClick={() => cancelMatch(match)}>
                            <Icon name="cancel" size={13} />
                          </button>
                        )}
                        {busyId === match.id && <span className="admin-mini-spinner" />}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </StatePanel>
      </section>

      {showForm && (
        <MatchFormModal
          editMatch={editMatch}
          courts={courts}
          onClose={() => { setShowForm(false); setEditMatch(null) }}
          onSave={(saved) => {
            setShowForm(false)
            setEditMatch(null)
            const message = editMatch
              ? tr('updated', ar)
              : tr(saved?.status === 'published' ? 'createdPublished' : 'createdDraft', ar)
            setNotice({ type: 'success', text: message })
            refresh()
          }}
        />
      )}

      {detailId && (
        <MatchDetailPanel
          matchId={detailId}
          onClose={() => setDetailId(null)}
          onRefresh={refresh}
        />
      )}
    </div>
  )
}
