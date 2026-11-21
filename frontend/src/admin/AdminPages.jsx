import Icon from './AdminIcon'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api, { errorMessage } from '../api'
import { Badge, Notice, PageHeading, StatePanel } from './AdminUI'
import { clubCourtName } from '../format'
import { useAdminLocale } from './AdminLocale'

const TEXT = {
  en: {
    overview: 'Club overview', overviewSub: 'Bookings, court availability and revenue.', refresh: 'Refresh data', todayBookings: "Today's bookings", upcoming: 'Upcoming sessions', customers: 'Total customers', availableCourts: 'Courts available', revenueToday: 'Revenue today', revenueMonth: 'Revenue this month', unpaid: 'Awaiting payment', fromBookings: 'Bookings this month', of: 'of', courts: 'courts', recent: 'Recent bookings', viewAll: 'View all', clubHealth: 'Club at a glance', courtsReady: 'Courts currently available', courtCoverage: 'Court availability', dataNote: 'Metrics update from your live booking database.', booking: 'Booking', member: 'Customer', court: 'Court', session: 'Session', amount: 'Amount', status: 'Status', payment: 'Payment', actions: 'Actions', searchBookings: 'Search customer, email, court…', allBookings: 'All bookings', confirmed: 'Confirmed', cancelled: 'Cancelled', noShow: 'No show', bookingStatusMix: 'Bookings by status', allPadelBookings: 'All padel bookings', totalBookings: 'Total bookings', unpaidFilter: 'Unpaid', paid: 'Paid', markPaid: 'Mark paid', undoPaid: 'Undo payment', cancel: 'Cancel', markNoShow: 'No show', cancelConfirm: 'Cancel this booking?', noShowConfirm: 'Mark this booking as no-show?', bookingUpdated: 'Booking updated.', paymentUpdated: 'Payment updated.', noBookings: 'No bookings match your filters.', loading: 'Loading data…', loadError: 'Unable to load this data.', retry: 'Try again', manageBookings: 'Manage bookings', manageCourts: 'Manage courts', managePricing: 'Manage pricing', manageCustomers: 'Browse customers', edit: 'Edit', enabled: 'Available', disabled: 'Unavailable', toggleUnavailable: 'Mark unavailable', toggleAvailable: 'Make available', courtStatusUpdated: 'Court availability updated.', noCourts: 'No courts found.', pricingTitle: 'Court pricing', pricingSub: 'Update daytime and evening rates, including two-hour bundles.', sport: 'Sport', daytime: 'Daytime · 7:00 AM–6:00 PM', evening: 'Evening · 6:00 PM–3:00 AM', oneHour: '1 hour', twoHours: '2 hours', save: 'Save prices', saving: 'Saving…', pricesSaved: 'Prices saved. New bookings will use these rates.', price: 'JOD', customersTitle: 'Customers', customersSub: 'Member accounts and booking activity.', searchCustomers: 'Search name, email, phone…', name: 'Name', contact: 'Contact', bookings: 'Bookings', bookingValue: 'Booking value', joined: 'Joined', account: 'Account', active: 'Active', inactive: 'Inactive', noCustomers: 'No customers found.', error: 'Something went wrong.', openAdmin: 'Open admin', quickLinks: 'Quick actions', seasonNote: 'Use these shortcuts to manage your day.', bookingOps: 'Reservations and payment status', courtOps: 'Court status and availability', pricingOps: 'Daytime and evening rates', memberOps: 'Customer list and booking history', hoursLabel: 'CLUB HOURS', hoursValue: 'Every day · 7:00 AM – 3:00 AM', nameShort: '40 Love Padel Club & Cafe operations', paidOnly: 'Paid', statusSaved: 'Status updated.', unauthorized: 'This account does not have administrator access.', adminLogin: 'Administrator sign in', email: 'Email address', password: 'Password', signIn: 'Sign in to admin', signingIn: 'Signing in…', signInHelp: 'Use an account that has been assigned the admin role.', goHome: 'Back to website', loginFailed: 'Could not sign in. Check your credentials and try again.', adminOnly: 'Administrator access required', loginTitle: 'Your club. Under control.', loginSubtitle: 'Sign in to manage bookings, courts, pricing and members.', emptyValue: '—', createdAt: 'Created', paidAtClub: 'Pay at club', query: 'Search', all: 'All', courtDetails: 'Court details', updateFailed: 'Update failed. Please try again.', sport_padel: 'Padel', archivedActivity: 'Archived', perHour: 'per hour', bookingsSubtitle: 'Review every reservation and record front-desk payments.', paidStatus: 'Payment recorded', unpaidStatus: 'Payment due', userUnavailable: 'Inactive account', countLabel: 'records', loadingOverview: 'Preparing your dashboard', noData: 'No data available yet.',
  },
  ar: {
    all: 'الكل', updateFailed: 'تعذّر حفظ التغيير. حاول مجددًا.', overview: 'نظرة عامة', overviewSub: 'الحجوزات وتوافر الملاعب والإيرادات.', refresh: 'تحديث البيانات', todayBookings: 'حجوزات اليوم', upcoming: 'الجلسات القادمة', customers: 'إجمالي العملاء', availableCourts: 'الملاعب المتاحة', revenueToday: 'إيرادات اليوم', revenueMonth: 'إيرادات هذا الشهر', unpaid: 'بانتظار الدفع', fromBookings: 'حجوزات هذا الشهر', of: 'من', courts: 'ملاعب', recent: 'أحدث الحجوزات', viewAll: 'عرض الكل', clubHealth: 'ملخص النادي', courtsReady: 'الملاعب المتاحة حاليًا', courtCoverage: 'توفر الملاعب', dataNote: 'يتم تحديث المؤشرات من قاعدة بيانات الحجوزات.', booking: 'الحجز', member: 'العميل', court: 'الملعب', session: 'الجلسة', amount: 'المبلغ', status: 'الحالة', payment: 'الدفع', actions: 'الإجراءات', searchBookings: 'ابحث باسم العميل أو البريد أو الملعب…', allBookings: 'كل الحجوزات', confirmed: 'مؤكد', cancelled: 'ملغي', noShow: 'لم يحضر', bookingStatusMix: 'الحجوزات حسب الحالة', allPadelBookings: 'جميع حجوزات البادل', totalBookings: 'إجمالي الحجوزات', unpaidFilter: 'غير مدفوع', paid: 'مدفوع', markPaid: 'تسجيل الدفع', undoPaid: 'إلغاء تسجيل الدفع', cancel: 'إلغاء', markNoShow: 'لم يحضر', cancelConfirm: 'هل تريد إلغاء هذا الحجز؟', noShowConfirm: 'هل تريد تسجيل عدم حضور العميل؟', bookingUpdated: 'تم تحديث الحجز.', paymentUpdated: 'تم تحديث الدفع.', noBookings: 'لا توجد حجوزات تطابق البحث.', loading: 'جارٍ تحميل البيانات…', loadError: 'تعذر تحميل البيانات.', retry: 'إعادة المحاولة', manageBookings: 'إدارة الحجوزات', manageCourts: 'إدارة الملاعب', managePricing: 'إدارة الأسعار', manageCustomers: 'عرض العملاء', edit: 'تعديل', enabled: 'متاح', disabled: 'غير متاح', toggleUnavailable: 'تحديد كغير متاح', toggleAvailable: 'إتاحة الملعب', courtStatusUpdated: 'تم تحديث توفر الملعب.', noCourts: 'لا توجد ملاعب.', pricingTitle: 'أسعار الملاعب', pricingSub: 'عدّل أسعار الفترة النهارية والمسائية، بما فيها باقات الساعتين. تطبق الأسعار على الحجوزات الجديدة.', sport: 'الرياضة', daytime: 'نهاري · ٧ صباحًا–٦ مساءً', evening: 'مسائي · ٦ مساءً–٣ صباحًا', oneHour: 'ساعة واحدة', twoHours: 'ساعتان', save: 'حفظ الأسعار', saving: 'جارٍ الحفظ…', pricesSaved: 'تم حفظ الأسعار. ستستخدم الحجوزات الجديدة الأسعار المحدّثة.', price: 'دينار أردني', customersTitle: 'العملاء', customersSub: 'حسابات الأعضاء ونشاط الحجوزات.', searchCustomers: 'ابحث بالاسم أو البريد أو الهاتف…', name: 'الاسم', contact: 'بيانات التواصل', bookings: 'الحجوزات', bookingValue: 'قيمة الحجوزات', joined: 'تاريخ الانضمام', account: 'الحساب', active: 'نشط', inactive: 'غير نشط', noCustomers: 'لم يتم العثور على عملاء.', error: 'حدث خطأ.', openAdmin: 'فتح لوحة الإدارة', quickLinks: 'إجراءات سريعة', seasonNote: 'استخدم الاختصارات لإدارة يومك.', bookingOps: 'الحجوزات وحالة الدفع', courtOps: 'حالة الملاعب وتوفرها', pricingOps: 'الأسعار النهارية والمسائية', memberOps: 'قائمة العملاء وسجل الحجوزات', hoursLabel: 'ساعات النادي', hoursValue: 'يوميًا · ٧:٠٠ صباحًا – ٣:٠٠ صباحًا', nameShort: 'عمليات نادي 40 Love للبادل والمقهى', paidOnly: 'مدفوع', statusSaved: 'تم تحديث الحالة.', unauthorized: 'هذا الحساب لا يملك صلاحيات الإدارة.', adminLogin: 'دخول المسؤول', email: 'البريد الإلكتروني', password: 'كلمة المرور', signIn: 'الدخول إلى لوحة الإدارة', signingIn: 'جارٍ تسجيل الدخول…', signInHelp: 'استخدم حسابًا تم تعيين صلاحية المسؤول له.', goHome: 'العودة إلى الموقع', loginFailed: 'تعذر تسجيل الدخول. تحقق من بياناتك وحاول مجددًا.', adminOnly: 'يتطلب صلاحية مسؤول', loginTitle: 'ناديك. تحت سيطرتك.', loginSubtitle: 'سجّل الدخول لإدارة الحجوزات والملاعب والأسعار والأعضاء.', emptyValue: '—', createdAt: 'تاريخ الإنشاء', paidAtClub: 'الدفع في النادي', sport_padel: 'بادل', archivedActivity: 'مؤرشف', perHour: 'لكل ساعة', bookingsSubtitle: 'راجع الحجوزات وسجّل المدفوعات في مكتب الاستقبال.', paidStatus: 'تم تسجيل الدفع', unpaidStatus: 'الدفع مستحق', userUnavailable: 'حساب غير نشط', countLabel: 'سجلات', loadingOverview: 'جارٍ تجهيز لوحة الإدارة', noData: 'لا توجد بيانات بعد.',
  },
}

const OVERVIEW_HINTS = {
  en: {
    upcoming: 'Confirmed bookings from now onward',
    customers: 'Accounts with the member role',
    revenueToday: 'Payments received today',
  },
  ar: {
    upcoming: 'الحجوزات المؤكدة من الآن فصاعدًا',
    customers: 'الحسابات المسجلة كأعضاء',
    revenueToday: 'المدفوعات المستلمة اليوم',
  },
}

function useCopy() {
  const locale = useAdminLocale()
  return { locale, t: TEXT[locale] || TEXT.en, ar: locale === 'ar' }
}

function statusTone(status) {
  return status === 'confirmed' ? 'success' : status === 'cancelled' ? 'danger' : status === 'no_show' ? 'warning' : 'neutral'
}
function statusLabel(status, t) {
  return status === 'confirmed' ? t.confirmed : status === 'cancelled' ? t.cancelled : status === 'no_show' ? t.noShow : status
}
function sportLabel(sport, t) { return t[`sport_${String(sport).toLowerCase()}`] || t.archivedActivity || t.court }
function money(value, locale) {
  const formatted = new Intl.NumberFormat(locale === 'ar' ? 'ar-JO' : 'en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(value || 0))
  return `${formatted} ${locale === 'ar' ? 'د.أ.' : 'JOD'}`
}
function dateTime(value, locale) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-JO' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Amman' }).format(date)
}
function dateOnly(value, locale) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-JO' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Amman' }).format(date)
}
function phoneHref(value) {
  const phone = String(value || '').replace(/[^+\d]/g, '')
  return /^\+?\d{8,15}$/.test(phone) ? `tel:${phone}` : ''
}
function PhoneContact({ phone }) {
  if (!phone) return null
  const href = phoneHref(phone)
  return href ? <a className="admin-phone-link" href={href} dir="ltr">{phone}</a> : <small dir="ltr">{phone}</small>
}

export function AdminOverviewPage() {
  const { t, locale, ar } = useCopy()
  const [overview, setOverview] = useState(null)
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  const refresh = () => { setLoading(true); setReload((v) => v + 1) }

  useEffect(() => {
    let live = true
    Promise.all([api.get('/admin/overview'), api.get('/admin/bookings')])
        .then(([summary, rows]) => { if (live) { setOverview(summary.data); setBookings(rows.data); setError('') } })
        .catch((err) => { if (live) setError(errorMessage(err)) })
        .finally(() => { if (live) setLoading(false) })
    return () => { live = false }
  }, [reload])

  const stats = overview ? [
    { key: 'todayBookings', value: overview.bookingsToday, hint: `${overview.bookingsThisMonth} ${t.fromBookings.toLowerCase()}` },
    { key: 'upcoming', value: overview.upcomingBookings, hint: OVERVIEW_HINTS[locale]?.upcoming },
    { key: 'customers', value: overview.totalCustomers, hint: OVERVIEW_HINTS[locale]?.customers },
    { key: 'availableCourts', value: `${overview.availableCourts}/${overview.totalCourts}`, hint: t.courtCoverage },
    { key: 'revenueToday', value: money(overview.revenueToday, locale), hint: OVERVIEW_HINTS[locale]?.revenueToday },
    { key: 'revenueMonth', value: money(overview.revenueThisMonth, locale), hint: '' },
  ] : []

  const statusCounts = useMemo(() => bookings.reduce((counts, booking) => {
    if (Object.prototype.hasOwnProperty.call(counts, booking.status)) counts[booking.status] += 1
    return counts
  }, { confirmed: 0, cancelled: 0, no_show: 0 }), [bookings])
  const statusBreakdown = [
    { key: 'confirmed', count: statusCounts.confirmed },
    { key: 'cancelled', count: statusCounts.cancelled },
    { key: 'noShow', status: 'no_show', count: statusCounts.no_show },
  ]

  return <div className="admin-overview-page">
    <PageHeading title={t.overview} description={t.overviewSub} action={<button className="admin-button secondary" onClick={refresh}><Icon name="refresh" size={15} />{t.refresh}</button>} />
    <StatePanel loading={loading} error={error} retry={refresh}>
      {overview && <>
        <div className="admin-summary">
          {[stats.slice(4), stats.slice(0, 4)].map((group, index) =>
            <dl className={index === 0 ? 'admin-revenue' : 'admin-activity'} key={group[0].key}>
              {group.map(stat => <div key={stat.key}><dt>{t[stat.key]}</dt>
                <dd className="admin-stat-value"><bdi>{stat.value}</bdi></dd>{stat.hint && <dd className="admin-stat-note">{stat.hint}</dd>}
              </div>)}
            </dl>)}
        </div>
          <section className="admin-panel admin-recent-panel">
            <div className="admin-panel-heading"><div><h2>{t.recent}</h2></div><Link to="/admin/bookings" className="admin-inline-link">{t.viewAll}<Icon name="arrow" size={15} /></Link></div>
            <div className="admin-table-scroll" role="region" aria-label={ar ? 'جدول السجلات' : 'Records table'} tabIndex={0} data-lenis-prevent><table className="admin-table"><thead><tr><th>{t.member}</th><th>{t.court}</th><th>{t.session}</th><th>{t.amount}</th><th>{t.status}</th></tr></thead><tbody>
            {bookings.slice(0, 6).map((booking) => <tr key={booking.id}><td><strong>{booking.customerName}</strong><small>{booking.email}</small><PhoneContact phone={booking.phone} /></td><td><strong>{clubCourtName(booking.courtName, locale)}</strong><small>{sportLabel(booking.sport, t)}</small></td><td>{dateTime(booking.startsAt, locale)}</td><td className="admin-money-cell">{money(booking.totalPrice, locale)}<small>{booking.paid ? t.paidStatus : t.unpaidStatus}</small></td><td><Badge tone={statusTone(booking.status)}>{statusLabel(booking.status, t)}</Badge></td></tr>)}
            {!bookings.length && <tr><td colSpan="5" className="admin-table-empty">{t.noData}</td></tr>}
            </tbody></table></div>
          </section>
        <div className="admin-overview-grid">
          <section className="admin-panel admin-status-panel" aria-labelledby="admin-booking-status-title">
            <div className="admin-panel-heading"><div><h2 id="admin-booking-status-title">{t.bookingStatusMix}</h2></div><span className="admin-status-total"><strong>{bookings.length}</strong><small>{t.totalBookings}</small></span></div>
            <p className="admin-status-caption">{t.allPadelBookings}</p>
            {bookings.length ? <>
              <div className="admin-status-bar" aria-hidden="true">
                {statusBreakdown.map((item) => <span key={item.key} className={`status-${item.status || item.key}`} style={{ width: `${(item.count / bookings.length) * 100}%` }} />)}
              </div>
              <ul className="admin-status-legend">
                {statusBreakdown.map((item) => <li key={item.key}>
                  <span className={`admin-status-dot status-${item.status || item.key}`} />
                  <span>{item.key === 'noShow' ? t.noShow : t[item.key]}</span>
                  <strong>{item.count}</strong>
                </li>)}
              </ul>
            </> : <p className="admin-status-empty">{t.noData}</p>}
          </section>
          <section className="admin-panel admin-quick-panel">
            <div className="admin-panel-heading"><div><h2>{t.quickLinks}</h2></div></div>
            <div className="admin-quick-list">
              <Link to="/admin/bookings"><span><strong>{t.manageBookings}</strong><small>{t.bookingOps}</small></span><Icon name="arrow" size={17} /></Link>
              <Link to="/admin/courts"><span><strong>{t.manageCourts}</strong><small>{t.courtOps}</small></span><Icon name="arrow" size={17} /></Link>
              <Link to="/admin/pricing"><span><strong>{t.managePricing}</strong><small>{t.pricingOps}</small></span><Icon name="arrow" size={17} /></Link>
              <Link to="/admin/customers"><span><strong>{t.manageCustomers}</strong><small>{t.memberOps}</small></span><Icon name="arrow" size={17} /></Link>
              <Link to="/admin/messages"><span><strong>{ar ? 'رسائل التواصل' : 'Contact messages'}</strong><small>{ar ? 'ملاحظات ورسائل الأعضاء والزوار' : 'Notes sent through the contact form'}</small></span><Icon name="arrow" size={17} /></Link>
            </div>
            <p className="admin-hours-callout">{t.hoursLabel} · {t.hoursValue}</p>
          </section>

        </div>
      </>}
    </StatePanel>
  </div>
}

export function AdminBookingsPage() {
  const { t, locale, ar } = useCopy()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [notice, setNotice] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [reload, setReload] = useState(0)
  const refresh = () => { setLoading(true); setReload((v) => v + 1) }

  useEffect(() => {
    let live = true
    api.get('/admin/bookings').then(({ data }) => { if (live) { setBookings(data); setError('') } }).catch((err) => { if (live) setError(errorMessage(err)) }).finally(() => { if (live) setLoading(false) })
    return () => { live = false }
  }, [reload])

  const filtered = useMemo(() => bookings.filter((b) => {
    const q = search.trim().toLowerCase()
    const matches = !q || [b.customerName, b.email, b.phone, b.courtName, b.sport, String(b.id)].some((x) => String(x || '').toLowerCase().includes(q))
    const filterMatch = filter === 'all' || (filter === 'unpaid' ? !b.paid && b.status === 'confirmed' : b.status === filter)
    return matches && filterMatch
  }), [bookings, search, filter])

  async function updateStatus(booking, status) {
    if (status === 'cancelled' && !window.confirm(t.cancelConfirm)) return
    if (status === 'no_show' && !window.confirm(t.noShowConfirm)) return
    setBusyId(booking.id); setNotice(null)
    try {
      await api.patch(`/admin/bookings/${booking.id}/status`, { status })
      setBookings((current) => current.map((row) => row.id === booking.id ? { ...row, status } : row))
      setNotice({ type: 'success', text: t.bookingUpdated })
    } catch (err) { setNotice({ type: 'error', text: errorMessage(err) || t.updateFailed }) }
    finally { setBusyId(null) }
  }
  async function togglePayment(booking) {
    setBusyId(booking.id); setNotice(null)
    try {
      await api.patch(`/admin/bookings/${booking.id}/payment`, { paid: !booking.paid, paymentMethod: 'cash' })
      setBookings((current) => current.map((row) => row.id === booking.id ? { ...row, paid: !row.paid, paymentMethod: booking.paid ? null : 'cash' } : row))
      setNotice({ type: 'success', text: t.paymentUpdated })
    } catch (err) { setNotice({ type: 'error', text: errorMessage(err) || t.updateFailed }) }
    finally { setBusyId(null) }
  }
  const filters = [{ key: 'all', label: t.allBookings }, { key: 'confirmed', label: t.confirmed }, { key: 'unpaid', label: t.unpaidFilter }, { key: 'cancelled', label: t.cancelled }, { key: 'no_show', label: t.noShow }]

  return <>
    <PageHeading title={t.manageBookings} description={t.bookingsSubtitle} action={<span className="admin-count-chip">{filtered.length} {t.countLabel}</span>} />
    <Notice type={notice?.type} onClose={() => setNotice(null)}>{notice?.text}</Notice>
    <section className="admin-panel admin-list-panel">
      <div className="admin-toolbar"><div className="admin-search"><Icon name="search" size={17} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t.searchBookings} aria-label={t.searchBookings} /></div><button className="admin-button secondary" onClick={refresh}><Icon name="refresh" size={15} />{t.refresh}</button></div>
      <div className="admin-filter-row" data-lenis-prevent>{filters.map((item) => <button key={item.key} aria-pressed={filter === item.key} className={filter === item.key ? 'active' : ''} onClick={() => setFilter(item.key)}>{item.label}</button>)}</div>
      <StatePanel loading={loading} error={error} retry={refresh} empty={filtered.length === 0 ? t.noBookings : null}>
        <div className="admin-table-scroll" role="region" aria-label={ar ? 'جدول السجلات' : 'Records table'} tabIndex={0} data-lenis-prevent><table className="admin-table admin-bookings-table"><thead><tr><th>{t.booking}</th><th>{t.member}</th><th>{t.court}</th><th>{t.session}</th><th>{t.amount}</th><th>{t.status}</th><th>{t.payment}</th><th>{t.actions}</th></tr></thead><tbody>
        {filtered.map((booking) => <tr key={booking.id}>
          <td><span className="admin-id">#{booking.id}</span><small>{dateOnly(booking.createdAt, locale)}</small></td>
          <td><strong>{booking.customerName}</strong><small>{booking.email}</small><PhoneContact phone={booking.phone} /></td>
          <td><strong>{clubCourtName(booking.courtName, locale)}</strong><small>{sportLabel(booking.sport, t)}</small></td>
          <td><strong>{dateTime(booking.startsAt, locale)}</strong><small>{booking.hours} {ar ? 'ساعة' : booking.hours === 1 ? 'hour' : 'hours'}</small></td>
          <td className="admin-money-cell"><strong>{money(booking.totalPrice, locale)}</strong></td>
          <td><Badge tone={statusTone(booking.status)}>{statusLabel(booking.status, t)}</Badge></td>
          <td><Badge tone={booking.paid ? 'success' : 'warning'}>{booking.paid ? t.paid : t.unpaidFilter}</Badge><button className="admin-table-action link" disabled={busyId === booking.id} onClick={() => togglePayment(booking)}>{booking.paid ? t.undoPaid : t.markPaid}</button></td>
          <td><div className="admin-row-actions"><select aria-label={`${t.status} ${booking.id}`} value={booking.status} disabled={busyId === booking.id} onChange={(e) => updateStatus(booking, e.target.value)}><option value="confirmed">{t.confirmed}</option><option value="cancelled">{t.cancelled}</option><option value="no_show">{t.noShow}</option></select>{busyId === booking.id && <span className="admin-mini-spinner" />}</div></td>
        </tr>)}
        </tbody></table></div>
      </StatePanel>
    </section>
  </>
}

export function AdminCourtsPage() {
  const { t, ar } = useCopy()
  const [courts, setCourts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [notice, setNotice] = useState(null)
  const [reload, setReload] = useState(0)
  const refresh = () => { setLoading(true); setReload((v) => v + 1) }
  useEffect(() => {
    let live = true
    api.get('/admin/courts').then(({ data }) => { if (live) { setCourts(data); setError('') } }).catch((err) => { if (live) setError(errorMessage(err)) }).finally(() => { if (live) setLoading(false) })
    return () => { live = false }
  }, [reload])
  async function toggleCourt(court) {
    if (court.available && !window.confirm(ar ? 'هل تريد إيقاف الحجوزات الجديدة لهذا الملعب؟' : 'Disable new bookings for this court?')) return
    setBusyId(court.id); setNotice(null)
    try {
      await api.patch(`/admin/courts/${court.id}/availability`, { available: !court.available })
      setCourts((current) => current.map((row) => row.id === court.id ? { ...row, available: !row.available } : row))
      setNotice({ type: 'success', text: t.courtStatusUpdated })
    } catch (err) { setNotice({ type: 'error', text: errorMessage(err) || t.updateFailed }) }
    finally { setBusyId(null) }
  }
  const groups = ['padel']
  return <>
    <PageHeading title={t.manageCourts} description={ar ? 'تحكّم في حالة الملاعب قبل أن يحجز العملاء.' : 'Control court availability before customers make a reservation.'} action={<span className="admin-count-chip">{courts.filter((c) => c.available).length} / {courts.length} {t.enabled}</span>} />
    <Notice type={notice?.type} onClose={() => setNotice(null)}>{notice?.text}</Notice>
    <StatePanel loading={loading} error={error} retry={refresh} empty={courts.length === 0 ? t.noCourts : null}>
      <div className="admin-court-group-list">{groups.map((sport) => {
        const items = courts.filter((court) => court.sport === sport)
        if (!items.length) return null
        return <section className="admin-court-group" key={sport}><div className="admin-court-group-heading"><div><div><h2>{sportLabel(sport, t)}</h2><p>{items.length} {ar ? 'ملاعب' : items.length === 1 ? 'court' : 'courts'}</p></div></div><Badge tone={items.every((c) => c.available) ? 'success' : 'warning'}>{items.filter((c) => c.available).length} / {items.length} {t.enabled}</Badge></div>
          <div className="admin-court-grid">{items.map((court) => <article className={`admin-court-card ${court.available ? '' : 'unavailable'}`} key={court.id}><div className="admin-court-card-top"><Badge tone={court.available ? 'success' : 'danger'}>{court.available ? t.enabled : t.disabled}</Badge></div><h3>{clubCourtName(court.name, ar ? 'ar' : 'en')}</h3><div className="admin-court-card-bottom"><button className={`admin-button ${court.available ? 'secondary' : 'primary'}`} disabled={busyId === court.id} onClick={() => toggleCourt(court)}>{busyId === court.id ? '…' : court.available ? t.toggleUnavailable : t.toggleAvailable}</button></div></article>)}</div>
        </section>
      })}</div>
    </StatePanel>
  </>
}

export function AdminPricingPage() {
  const { t, locale, ar } = useCopy()
  const [rates, setRates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState('')
  const [notice, setNotice] = useState(null)
  const [reload, setReload] = useState(0)
  const refresh = () => { setLoading(true); setReload((v) => v + 1) }
  useEffect(() => {
    let live = true
    api.get('/admin/pricing').then(({ data }) => { if (live) { setRates(data.map((row) => ({ ...row,
      daytimePrice: String(row.daytimePrice),
      daytimeTwoHourPrice: String(row.daytimeTwoHourPrice),
      eveningPrice: String(row.eveningPrice),
      eveningTwoHourPrice: String(row.eveningTwoHourPrice),
    }))); setError('') } }).catch((err) => { if (live) setError(errorMessage(err)) }).finally(() => { if (live) setLoading(false) })
    return () => { live = false }
  }, [reload])
  function updateRate(sport, key, value) { setRates((current) => current.map((row) => row.sport === sport ? { ...row, [key]: value } : row)) }
  async function saveRate(rate) {
    const prices = {
      daytimePrice: Number(rate.daytimePrice),
      daytimeTwoHourPrice: Number(rate.daytimeTwoHourPrice),
      eveningPrice: Number(rate.eveningPrice),
      eveningTwoHourPrice: Number(rate.eveningTwoHourPrice),
    }
    if ([rate.daytimePrice, rate.daytimeTwoHourPrice, rate.eveningPrice, rate.eveningTwoHourPrice].some(value => String(value).trim() === '') || Object.values(prices).some((price) => !Number.isFinite(price) || price < 0)) { setNotice({ type: 'error', text: ar ? 'أدخل أسعارًا صحيحة.' : 'Enter valid non-negative prices.' }); return }
    setSaving(rate.sport); setNotice(null)
    try {
      const { data } = await api.put(`/admin/pricing/${rate.sport}`, prices)
      setRates((current) => current.map((row) => row.sport === rate.sport ? {
        ...row,
        daytimePrice: String(data.daytimePrice),
        daytimeTwoHourPrice: String(data.daytimeTwoHourPrice),
        eveningPrice: String(data.eveningPrice),
        eveningTwoHourPrice: String(data.eveningTwoHourPrice),
        updatedAt: data.updatedAt,
      } : row))
      setNotice({ type: 'success', text: t.pricesSaved })
    } catch (err) { setNotice({ type: 'error', text: errorMessage(err) || t.updateFailed }) }
    finally { setSaving('') }
  }
  return <>
    <PageHeading title={t.pricingTitle} description={t.pricingSub}  />
    <Notice type={notice?.type} onClose={() => setNotice(null)}>{notice?.text}</Notice>
    <StatePanel loading={loading} error={error} retry={refresh} empty={rates.length === 0 ? t.noData : null}>
      <div className="admin-pricing-grid">{rates.map((rate) => <article className="admin-pricing-card" key={rate.sport}>

        <h2>{sportLabel(rate.sport, t)}</h2><p>{ar ? 'سعر الملعب حسب موعد بدء الحجز' : 'Per-court rates based on the booking start time'}</p>
        <div className="admin-price-fields">
          <section className="admin-price-group">
            <h3>{t.daytime}</h3>
            <label><span>{t.oneHour}</span><div><input type="number" min="0" step="0.5" value={rate.daytimePrice} onChange={(e) => updateRate(rate.sport, 'daytimePrice', e.target.value)} /><b>{ar ? 'د.أ.' : 'JOD'}</b></div></label>
            <label><span>{t.twoHours}</span><div><input type="number" min="0" step="0.5" value={rate.daytimeTwoHourPrice} onChange={(e) => updateRate(rate.sport, 'daytimeTwoHourPrice', e.target.value)} /><b>{ar ? 'د.أ.' : 'JOD'}</b></div></label>
          </section>
          <section className="admin-price-group evening">
            <h3>{t.evening}</h3>
            <label><span>{t.oneHour}</span><div><input type="number" min="0" step="0.5" value={rate.eveningPrice} onChange={(e) => updateRate(rate.sport, 'eveningPrice', e.target.value)} /><b>{ar ? 'د.أ.' : 'JOD'}</b></div></label>
            <label><span>{t.twoHours}</span><div><input type="number" min="0" step="0.5" value={rate.eveningTwoHourPrice} onChange={(e) => updateRate(rate.sport, 'eveningTwoHourPrice', e.target.value)} /><b>{ar ? 'د.أ.' : 'JOD'}</b></div></label>
          </section>
        </div>
        <div className="admin-pricing-card-footer"><span>{rate.updatedAt ? `${ar ? 'آخر تحديث' : 'Updated'} ${dateTime(rate.updatedAt, locale)}` : t.price}</span><button className="admin-button primary" disabled={saving === rate.sport} onClick={() => saveRate(rate)}>{saving === rate.sport ? t.saving : t.save}<Icon name="check" size={15} /></button></div>
      </article>)}</div>
      <div className="admin-info-callout"><p>{ar ? 'سيتم حساب أسعار الحجوزات الجديدة باستخدام القيم المحفوظة. الحجوزات السابقة تحتفظ بالسعر الذي تم تأكيده وقت الحجز.' : 'New booking quotes use these saved rates. Existing reservations keep the price confirmed at booking time.'}</p></div>
    </StatePanel>
  </>
}

export function AdminCustomersPage() {
  const { t, locale, ar } = useCopy()
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [reload, setReload] = useState(0)
  const refresh = () => { setLoading(true); setReload((v) => v + 1) }
  useEffect(() => {
    let live = true
    api.get('/admin/customers').then(({ data }) => { if (live) { setCustomers(data); setError('') } }).catch((err) => { if (live) setError(errorMessage(err)) }).finally(() => { if (live) setLoading(false) })
    return () => { live = false }
  }, [reload])
  const filtered = useMemo(() => customers.filter((c) => {
    const matchesSearch = [c.fullName, c.email, c.phone, String(c.id)].some((x) => String(x || '').toLowerCase().includes(search.trim().toLowerCase()))
    const matchesFilter = filter === 'all' || (filter === 'active' ? c.active : !c.active)
    return matchesSearch && matchesFilter
  }), [customers, search, filter])
  return <>
    <PageHeading title={t.customersTitle} description={t.customersSub} action={<span className="admin-count-chip">{filtered.length} {t.countLabel}</span>} />
    <section className="admin-panel admin-list-panel">
      <div className="admin-toolbar"><div className="admin-search"><Icon name="search" size={17} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t.searchCustomers} aria-label={t.searchCustomers} /></div><button className="admin-button secondary" onClick={refresh}><Icon name="refresh" size={15} />{t.refresh}</button></div>
      <div className="admin-filter-row" data-lenis-prevent>{[{ key: 'all', label: t.all }, { key: 'active', label: t.active }, { key: 'inactive', label: t.inactive }].map((item) => <button type="button" key={item.key} aria-pressed={filter === item.key} className={filter === item.key ? 'active' : ''} onClick={() => setFilter(item.key)}>{item.label}</button>)}</div>
      <StatePanel loading={loading} error={error} retry={refresh} empty={filtered.length === 0 ? t.noCustomers : null}>
        <div className="admin-table-scroll" role="region" aria-label={ar ? 'جدول السجلات' : 'Records table'} tabIndex={0} data-lenis-prevent><table className="admin-table"><thead><tr><th>{t.name}</th><th>{t.contact}</th><th>{t.bookings}</th><th>{t.bookingValue}</th><th>{t.joined}</th><th>{t.account}</th></tr></thead><tbody>
        {filtered.map((customer) => <tr key={customer.id}><td><div className="admin-customer-cell"><span>{customer.fullName.trim().slice(0, 1).toUpperCase()}</span><strong>{customer.fullName}</strong></div><small className="admin-id">#{customer.id}</small></td><td><strong>{customer.email}</strong>{customer.phone ? <PhoneContact phone={customer.phone} /> : <small>{t.emptyValue}</small>}</td><td><strong>{customer.bookingCount}</strong><small>{ar ? 'حجوزات غير ملغاة' : 'non-cancelled bookings'}</small></td><td className="admin-money-cell"><strong>{money(customer.bookingValue, locale)}</strong></td><td>{dateOnly(customer.createdAt, locale)}</td><td><Badge tone={customer.active ? 'success' : 'danger'}>{customer.active ? t.active : t.inactive}</Badge></td></tr>)}
        </tbody></table></div>
      </StatePanel>
    </section>
  </>
}


export function AdminContactMessagesPage() {
  const { t, locale, ar } = useCopy()
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [busyId, setBusyId] = useState(null)
  const [notice, setNotice] = useState(null)
  const [reload, setReload] = useState(0)
  const refresh = () => { setLoading(true); setReload((value) => value + 1) }

  useEffect(() => {
    let live = true
    api.get('/admin/contact-messages')
        .then(({ data }) => { if (live) { setMessages(data); setError('') } })
        .catch((err) => { if (live) setError(errorMessage(err)) })
        .finally(() => { if (live) setLoading(false) })
    return () => { live = false }
  }, [reload])

  const labels = ar
      ? { title: 'رسائل التواصل', subtitle: 'اقرأ الملاحظات والاستفسارات المرسلة من نموذج التواصل في الموقع.', eyebrow: 'مساحة الإدارة / 05', search: 'ابحث بالاسم أو الهاتف أو نص الرسالة…', all: 'الكل', new: 'جديدة', read: 'مقروءة', replied: 'تم الرد', archived: 'مؤرشفة', noMessages: 'لا توجد رسائل تطابق البحث.', name: 'الاسم', phone: 'الهاتف', sport: 'الرياضة', preferred: 'الوقت المفضل', message: 'الرسالة', received: 'تاريخ الإرسال', status: 'الحالة', markRead: 'تحديد كمقروءة', markReplied: 'تم الرد', archive: 'أرشفة', updateError: 'تعذر تحديث حالة الرسالة.', updated: 'تم تحديث حالة الرسالة.', count: 'رسائل' }
      : { title: 'Contact messages', subtitle: 'Read notes and enquiries sent through the website contact form.', eyebrow: 'ADMIN WORKSPACE / 05', search: 'Search name, phone, or message…', all: 'All', new: 'New', read: 'Read', replied: 'Replied', archived: 'Archived', noMessages: 'No messages match your search.', name: 'Name', phone: 'Phone', sport: 'Sport', preferred: 'Preferred time', message: 'Message', received: 'Received', status: 'Status', markRead: 'Mark as read', markReplied: 'Mark replied', archive: 'Archive', updateError: 'Could not update the message status.', updated: 'Message status updated.', count: 'messages' }

  const filtered = useMemo(() => messages.filter((message) => {
    const matchesSearch = [message.name, message.phone, message.sport, message.preferredTime, message.message]
        .some((value) => String(value || '').toLowerCase().includes(search.trim().toLowerCase()))
    return matchesSearch && (filter === 'all' || message.status === filter)
  }), [messages, search, filter])

  async function updateStatus(message, status) {
    if (status === 'archived' && !window.confirm(ar ? 'هل تريد أرشفة هذه الرسالة؟' : 'Archive this contact message?')) return
    setBusyId(message.id)
    setNotice(null)
    try {
      const { data } = await api.patch(`/admin/contact-messages/${message.id}`, { status })
      setMessages((current) => current.map((row) => row.id === message.id ? data : row))
      setNotice({ type: 'success', text: labels.updated })
    } catch (err) {
      setNotice({ type: 'error', text: errorMessage(err) || labels.updateError })
    } finally {
      setBusyId(null)
    }
  }

  const statusLabel = (status) => labels[status] || status
  const statusTone = (status) => status === 'new' ? 'warning' : status === 'replied' ? 'success' : status === 'archived' ? 'danger' : 'neutral'

  return <>
    <PageHeading title={labels.title} description={labels.subtitle} action={<span className="admin-count-chip">{filtered.length} {labels.count}</span>} />
    <Notice type={notice?.type} onClose={() => setNotice(null)}>{notice?.text}</Notice>
    <section className="admin-panel admin-list-panel admin-contact-messages-panel">
      <div className="admin-toolbar">
        <div className="admin-search"><Icon name="search" size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={labels.search} aria-label={labels.search} /></div>
        <button className="admin-button secondary" onClick={refresh}><Icon name="refresh" size={15} />{ar ? 'تحديث' : 'Refresh'}</button>
      </div>
      <div className="admin-filter-row" data-lenis-prevent>{['all', 'new', 'read', 'replied', 'archived'].map((status) => <button type="button" key={status} aria-pressed={filter === status} className={filter === status ? 'active' : ''} onClick={() => setFilter(status)}>{statusLabel(status)}</button>)}</div>
      <StatePanel loading={loading} error={error} retry={refresh} empty={filtered.length === 0 ? labels.noMessages : null}>
        <div className="admin-contact-message-list">
          {filtered.map((message) => <article key={message.id} className={`admin-contact-message-card ${message.status === 'new' ? 'is-new' : ''}`}>
            <div className="admin-contact-message-heading">
              <div><span className="admin-contact-message-avatar">{String(message.name || '?').trim().slice(0, 1).toUpperCase()}</span><div><strong>{message.name}</strong><small>{message.phone || '—'} · {dateTime(message.createdAt, locale)}</small></div></div>
              <Badge tone={statusTone(message.status)}>{statusLabel(message.status)}</Badge>
            </div>
            <div className="admin-contact-message-meta"><span><b>{labels.sport}:</b> {sportLabel(message.sport, t)}</span><span><b>{labels.preferred}:</b> {message.preferredTime || '—'}</span></div>
            <p className="admin-contact-message-body">{message.message}</p>
            <div className="admin-contact-message-actions">
              {phoneHref(message.phone) && <a className="admin-button secondary" href={phoneHref(message.phone)}>{ar ? 'اتصال' : 'Call member'}</a>}
              <button className="admin-button secondary" disabled={busyId === message.id || message.status === 'read'} onClick={() => updateStatus(message, 'read')}>{busyId === message.id ? '…' : labels.markRead}</button>
              <button className="admin-button primary" disabled={busyId === message.id || message.status === 'replied'} onClick={() => updateStatus(message, 'replied')}>{busyId === message.id ? '…' : labels.markReplied}</button>
              <button className="admin-button danger" disabled={busyId === message.id || message.status === 'archived'} onClick={() => updateStatus(message, 'archived')}>{labels.archive}</button>
            </div>
          </article>)}
        </div>
      </StatePanel>
    </section>
  </>
}
