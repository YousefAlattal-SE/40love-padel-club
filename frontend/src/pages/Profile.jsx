import { clubCourtName } from '../format'
import { MemberLoading } from './MemberStates'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useUser } from '@clerk/react'
import { useAuth } from '../auth'
import api, { errorMessage } from '../api'
import './my-bookings.css'
import './profile.css'

const COPY = {
  en: {
    tag: 'MEMBER PROFILE', title: 'Your profile,', titleAccent: 'your game.',
    intro: 'Your club details, padel activity, and account preferences in one place.',
    memberSince: 'MEMBER SINCE', active: 'Active member', inactive: 'Inactive',
    edit: 'Edit profile', save: 'Save changes', cancel: 'Cancel', saving: 'Saving…',
    stats: 'YOUR PADEL ACTIVITY', statsHint: 'A view of your bookings and match reservations.',
    totalBookings: 'Total bookings', completedBookings: 'Completed bookings',
    matchesPlayed: 'Matches played', matchesJoined: 'Matches joined', playingHours: 'Playing hours',
    hoursHint: 'From completed court bookings',
    personal: 'Personal information', personalHint: 'Keep your member details up to date.',
    fullName: 'Full name', email: 'Email address', phone: 'Phone number', phoneHelp: 'Used only by club staff to contact you about reservations; no phone verification is used.', dob: 'Date of birth',
    gender: 'Gender', skill: 'Padel skill level', managed: 'Managed by your sign-in provider',
    optional: 'Optional', choose: 'Choose', male: 'Male', female: 'Female', nonBinary: 'Non-binary', preferNot: 'Prefer not to say',
    beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced', open: 'Open level',
    activity: 'My activity', activityHint: 'Your upcoming sessions and recent club activity.',
    upcomingBookings: 'Upcoming bookings', bookingHistory: 'Recent booking history',
    upcomingMatches: 'Upcoming matches', recentMatches: 'Recently joined matches',
    nextSessions: 'Your next court sessions', previousSessions: 'Past and cancelled bookings',
    matchesAhead: 'Confirmed matches ahead', latestJoins: 'Your latest match reservations',
    viewBookings: 'View all bookings', viewMatches: 'View all matches',
    noUpcomingBookings: 'No upcoming bookings yet.', noBookingHistory: 'No booking history yet.',
    noUpcomingMatches: 'No upcoming matches yet.', noRecentMatches: 'No joined matches yet.',
    preferences: 'Account preferences', preferencesHint: 'These settings use your current app preferences.',
    language: 'Language', theme: 'Theme', english: 'English', arabic: 'العربية', light: 'Light', dark: 'Dark',
    security: 'Account security', securityHint: 'Authentication is securely managed by Clerk.',
    verification: 'Email verification', connectedGoogle: 'Google account', verified: 'Verified', unverified: 'Not verified',
    connected: 'Connected', notConnected: 'Not connected', notAvailable: 'Not available',
    changePassword: 'Change password', currentPassword: 'Current password', newPassword: 'New password',
    confirmPassword: 'Confirm new password', updatePassword: 'Update password', passwordSuccess: 'Your password was updated.',
    passwordMismatch: 'The new passwords do not match.', passwordFailed: 'We could not update your password. Please try again.',
    passwordRequired: 'Enter your current password and a new password of at least 8 characters.',
    signOut: 'Sign out', signOutHint: 'End your current member session.',
    loading: 'Loading your profile…', loadFailed: 'We could not load your profile. Please try again.',
    activityFailed: 'Activity could not be loaded.', tryAgain: 'Try again',
    saved: 'Your profile changes have been saved.', saveFailed: 'We could not save your changes. Please try again.',
    required: 'Full name is required.',
    confirmed: 'Confirmed', cancelled: 'Cancelled', noShow: 'No show', completed: 'Completed', upcoming: 'Upcoming',
    court: 'Court', match: 'Padel match', unknown: 'Not provided',
  },
  ar: {
    tag: 'الملف الشخصي', title: 'ملفك الشخصي،', titleAccent: 'ومباراتك.',
    intro: 'بيانات النادي ونشاط البادل وتفضيلات حسابك في مكان واحد.',
    memberSince: 'عضو منذ', active: 'عضوية نشطة', inactive: 'غير نشط',
    edit: 'تعديل الملف الشخصي', save: 'حفظ التغييرات', cancel: 'إلغاء', saving: 'جارٍ الحفظ…',
    stats: 'نشاطك في البادل', statsHint: 'ملخص حجوزاتك ومشاركاتك في المباريات.',
    totalBookings: 'إجمالي الحجوزات', completedBookings: 'الحجوزات المكتملة',
    matchesPlayed: 'المباريات التي لعبتها', matchesJoined: 'المباريات المنضم إليها', playingHours: 'ساعات اللعب',
    hoursHint: 'من حجوزات الملاعب المكتملة',
    personal: 'المعلومات الشخصية', personalHint: 'حافظ على تحديث بيانات عضويتك.',
    fullName: 'الاسم الكامل', email: 'البريد الإلكتروني', phone: 'رقم الهاتف', phoneHelp: 'يستخدمه فريق النادي للتواصل معك بشأن الحجوزات فقط، ولا يتم التحقق من ملكية الرقم.', dob: 'تاريخ الميلاد',
    gender: 'الجنس', skill: 'مستوى البادل', managed: 'تُدار عبر مزود تسجيل الدخول',
    optional: 'اختياري', choose: 'اختر', male: 'ذكر', female: 'أنثى', nonBinary: 'غير ثنائي', preferNot: 'أفضل عدم الإجابة',
    beginner: 'مبتدئ', intermediate: 'متوسط', advanced: 'متقدم', open: 'مفتوح',
    activity: 'نشاطي', activityHint: 'جلساتك القادمة وآخر نشاطك في النادي.',
    upcomingBookings: 'الحجوزات القادمة', bookingHistory: 'سجل الحجوزات الأخير',
    upcomingMatches: 'المباريات القادمة', recentMatches: 'آخر المباريات التي انضممت إليها',
    nextSessions: 'جلساتك القادمة في الملاعب', previousSessions: 'الحجوزات السابقة والملغاة',
    matchesAhead: 'المباريات المؤكدة القادمة', latestJoins: 'أحدث حجوزات المباريات',
    viewBookings: 'عرض كل الحجوزات', viewMatches: 'عرض كل المباريات',
    noUpcomingBookings: 'لا توجد حجوزات قادمة حتى الآن.', noBookingHistory: 'لا يوجد سجل حجوزات حتى الآن.',
    noUpcomingMatches: 'لا توجد مباريات قادمة حتى الآن.', noRecentMatches: 'لم تنضم إلى مباريات بعد.',
    preferences: 'تفضيلات الحساب', preferencesHint: 'تستخدم هذه الإعدادات تفضيلات التطبيق الحالية.',
    language: 'اللغة', theme: 'المظهر', english: 'English', arabic: 'العربية', light: 'فاتح', dark: 'داكن',
    security: 'أمان الحساب', securityHint: 'تتم إدارة تسجيل الدخول بأمان عبر Clerk.',
    verification: 'التحقق من البريد', connectedGoogle: 'حساب Google', verified: 'تم التحقق', unverified: 'لم يتم التحقق',
    connected: 'متصل', notConnected: 'غير متصل', notAvailable: 'غير متاح',
    changePassword: 'تغيير كلمة المرور', currentPassword: 'كلمة المرور الحالية', newPassword: 'كلمة المرور الجديدة',
    confirmPassword: 'تأكيد كلمة المرور الجديدة', updatePassword: 'تحديث كلمة المرور', passwordSuccess: 'تم تحديث كلمة المرور.',
    passwordMismatch: 'كلمتا المرور الجديدتان غير متطابقتين.', passwordFailed: 'تعذّر تحديث كلمة المرور. حاول مرة أخرى.',
    passwordRequired: 'أدخل كلمة المرور الحالية وكلمة مرور جديدة من 8 أحرف على الأقل.',
    signOut: 'تسجيل الخروج', signOutHint: 'إنهاء جلسة العضوية الحالية.',
    loading: 'جارٍ تحميل ملفك الشخصي…', loadFailed: 'تعذّر تحميل الملف الشخصي. حاول مرة أخرى.',
    activityFailed: 'تعذّر تحميل النشاط.', tryAgain: 'إعادة المحاولة',
    saved: 'تم حفظ تغييرات الملف الشخصي.', saveFailed: 'تعذّر حفظ التغييرات. حاول مرة أخرى.',
    required: 'الاسم الكامل مطلوب.',
    confirmed: 'مؤكد', cancelled: 'ملغي', noShow: 'لم يحضر', completed: 'مكتمل', upcoming: 'قادم',
    court: 'ملعب', match: 'مباراة بادل', unknown: 'غير متوفر',
  },
}

const AMMAN_TIME_ZONE = 'Asia/Amman'

function readLocale() {
  return document.documentElement.lang === 'ar' || localStorage.getItem('serva-locale') === 'ar' ? 'ar' : 'en'
}

function formatDate(value, locale, options = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-JO' : 'en-GB', { ...options, timeZone: AMMAN_TIME_ZONE }).format(date)
}

function formatDateTime(value, locale) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-JO' : 'en-GB', {
    timeZone: AMMAN_TIME_ZONE,
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(date)
}

function Icon({ name }) {
  const paths = {
    bookings: <><rect x="4" y="5" width="16" height="15" rx="3" /><path d="M8 3v4M16 3v4M4 10h16M8 14h3" /></>,
    matches: <><circle cx="12" cy="12" r="9" /><path d="M3.5 9h17M3.5 15h17M12 3c2.5 2.4 3.6 5.4 3.6 9S14.5 18.6 12 21M12 3c-2.5 2.4-3.6 5.4-3.6 9s1.1 6.6 3.6 9" /></>,
    hours: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    profile: <><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.8-3.2 3.2-5 7-5s6.2 1.8 7 5" /></>,
    shield: <><path d="M12 3 19 6v5c0 4.5-2.5 7.7-7 10-4.5-2.3-7-5.5-7-10V6z" /><path d="m9 12 2 2 4-4" /></>,
  }
  return <svg className="profile-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

function SectionHeading({ id, title, hint, action }) {
  return (
    <div className="mb-section-heading">
      <div>

        <h2 id={id}>{title}</h2>
        {hint && <p>{hint}</p>}
      </div>
      {action}
    </div>
  )
}

function EmptyState({ children }) {
  return <div className="mb-empty-state"><span className="mb-empty-icon" aria-hidden="true"><Icon name="bookings" /></span><strong>{children}</strong></div>
}

function statusText(item, type, locale, copy) {
  const status = String(item.status || '').toLowerCase().replace(/[ -]/g, '_')
  if (status === 'cancelled' || status === 'canceled') return copy.cancelled
  if (status === 'no_show') return copy.noShow
  if (status === 'confirmed' && new Date(item.endsAt).getTime() <= Date.now()) return copy.completed
  return type === 'match' ? copy.confirmed : copy.upcoming
}

function ActivityItem({ item, type, locale, copy }) {
  const status = String(item.status || '').toLowerCase().replace(/[ -]/g, '_')
  const statusClass = status === 'confirmed' ? 'confirmed' : status === 'no_show' ? 'no-show' : 'cancelled'
  const name = clubCourtName(item.courtName, locale) || (type === 'booking' ? copy.court : copy.match)
  return (
    <article className="profile-activity-row">
      <div className="profile-activity-mark"><Icon name={type === 'booking' ? 'bookings' : 'matches'} /></div>
      <div className="profile-activity-details">
        <strong>{name}</strong>
        <span>{formatDateTime(item.startsAt, locale)}</span>
      </div>
      <span className={`mb-status mb-status-${statusClass}`}>{statusText(item, type, locale, copy)}</span>
    </article>
  )
}

function ActivitySection({ title, hint, items, itemType, empty, failed, copy, locale, viewTo, viewLabel }) {
  return (
    <section className="profile-activity-card mb-booking-card">
      <div className="profile-activity-card-heading">
        <div><h3>{title}</h3><p>{hint}</p></div>
        <span className="mb-count-pill">{items?.length ?? '—'}</span>
      </div>
      {failed ? <EmptyState>{copy.activityFailed}</EmptyState> : items?.length ? (
        <div className="profile-activity-list">{items.slice(0, 3).map((item) => <ActivityItem key={`${itemType}-${item.id}`} item={item} type={itemType} locale={locale} copy={copy} />)}</div>
      ) : <EmptyState>{empty}</EmptyState>}
      <Link className="profile-view-link" to={viewTo}>{viewLabel}<span aria-hidden="true">↗</span></Link>
    </section>
  )
}

export default function Profile() {
  const { user: authUser, logout, updateUser } = useAuth()
  const { isLoaded: clerkLoaded, user: clerkUser } = useUser()
  const [locale, setLocale] = useState(readLocale)
  const [theme, setTheme] = useState(() => localStorage.getItem('serva-theme-v2') || 'light')
  const [profile, setProfile] = useState(null)
  const [bookings, setBookings] = useState(null)
  const [matches, setMatches] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profileError, setProfileError] = useState('')
  const [bookingsError, setBookingsError] = useState(false)
  const [matchesError, setMatchesError] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState({ fullName: '', phone: '', dateOfBirth: '', gender: '', skillLevel: '' })
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' })
  const [passwordBusy, setPasswordBusy] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState('')
  const isArabic = locale === 'ar'
  const copy = COPY[locale]

  const load = useCallback(async () => {
    setLoading(true)
    setProfileError('')
    setBookingsError(false)
    setMatchesError(false)
    const [profileResult, bookingsResult, matchesResult] = await Promise.allSettled([
      api.get('/profile'), api.get('/bookings'), api.get('/matches/my-reservations'),
    ])
    if (profileResult.status === 'fulfilled') {
      setProfile(profileResult.value.data)
      setForm({
        fullName: profileResult.value.data.fullName || '',
        phone: profileResult.value.data.phone || '',
        dateOfBirth: profileResult.value.data.dateOfBirth || '',
        gender: profileResult.value.data.gender || '',
        skillLevel: profileResult.value.data.skillLevel || '',
      })
    } else {
      setProfileError(errorMessage(profileResult.reason))
    }
    if (bookingsResult.status === 'fulfilled') setBookings(Array.isArray(bookingsResult.value.data) ? bookingsResult.value.data : [])
    else { setBookings(null); setBookingsError(true) }
    if (matchesResult.status === 'fulfilled') setMatches(Array.isArray(matchesResult.value.data) ? matchesResult.value.data : [])
    else { setMatches(null); setMatchesError(true) }
    setLoading(false)
  }, [])

  // Fetch the authenticated member profile and activity when the page opens.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load() }, [load])
  useEffect(() => {
    const syncLocale = () => setLocale(readLocale())
    const syncTheme = (event) => {
      const next = event.detail || localStorage.getItem('serva-theme-v2') || 'light'
      if (next === 'light' || next === 'dark') setTheme(next)
    }
    window.addEventListener('serva-locale-change', syncLocale)
    window.addEventListener('serva-theme-change', syncTheme)
    return () => {
      window.removeEventListener('serva-locale-change', syncLocale)
      window.removeEventListener('serva-theme-change', syncTheme)
    }
  }, [])

  const [now] = useState(() => Date.now())
  const upcomingBookings = useMemo(() => (bookings || [])
    .filter((item) => String(item.status).toLowerCase() === 'confirmed' && new Date(item.endsAt).getTime() > now)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()), [bookings, now])
  const bookingHistory = useMemo(() => (bookings || [])
    .filter((item) => !upcomingBookings.some((upcoming) => upcoming.id === item.id))
    .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime()), [bookings, upcomingBookings])
  const upcomingMatches = useMemo(() => (matches || [])
    .filter((item) => String(item.status).toLowerCase() === 'confirmed' && new Date(item.endsAt).getTime() > now)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()), [matches, now])
  const recentMatches = useMemo(() => (matches || [])
    .filter((item) => String(item.status).toLowerCase() === 'confirmed')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [matches])

  const stats = [
    { key: 'totalBookings', value: bookingsError ? '—' : (bookings?.length ?? '—'), icon: 'bookings' },
    { key: 'completedBookings', value: bookingsError ? '—' : (bookings || []).filter((item) => String(item.status).toLowerCase() === 'confirmed' && new Date(item.endsAt).getTime() <= now).length, icon: 'bookings' },
    { key: 'matchesPlayed', value: matchesError ? '—' : (matches || []).filter((item) => String(item.status).toLowerCase() === 'confirmed' && new Date(item.endsAt).getTime() <= now).length, icon: 'matches' },
    { key: 'matchesJoined', value: matchesError ? '—' : (matches || []).filter((item) => String(item.status).toLowerCase() === 'confirmed').length, icon: 'matches' },
    { key: 'playingHours', value: bookingsError ? '—' : (bookings || []).filter((item) => String(item.status).toLowerCase() === 'confirmed' && new Date(item.endsAt).getTime() <= now).reduce((sum, item) => sum + Number(item.hours || 0), 0), icon: 'hours', hint: copy.hoursHint },
  ]

  function updateForm(key, value) { setForm((current) => ({ ...current, [key]: value })) }

  function selectLocale(next) {
    setLocale(next)
    localStorage.setItem('serva-locale', next)
    document.documentElement.lang = next
    document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr'
    window.dispatchEvent(new Event('serva-locale-change'))
  }

  function selectTheme(next) {
    setTheme(next)
    localStorage.setItem('serva-theme-v2', next)
    document.documentElement.dataset.theme = next
    window.dispatchEvent(new CustomEvent('serva-theme-change', { detail: next }))
  }

  function cancelEdit() {
    if (profile) setForm({
      fullName: profile.fullName || '', phone: profile.phone || '', dateOfBirth: profile.dateOfBirth || '',
      gender: profile.gender || '', skillLevel: profile.skillLevel || '',
    })
    setIsEditing(false)
    setNotice('')
  }

  async function saveProfile(event) {
    event.preventDefault()
    setNotice('')
    if (!form.fullName.trim()) { setNotice(copy.required); return }
    setSaving(true)
    try {
      const { data } = await api.patch('/profile', {
        fullName: form.fullName.trim(), phone: form.phone.trim() || null,
        dateOfBirth: form.dateOfBirth || null, gender: form.gender || null, skillLevel: form.skillLevel || null,
      })
      setProfile(data)
      setForm({ fullName: data.fullName || '', phone: data.phone || '', dateOfBirth: data.dateOfBirth || '', gender: data.gender || '', skillLevel: data.skillLevel || '' })
      updateUser?.({ fullName: data.fullName, phone: data.phone })
      setIsEditing(false)
      setNotice(copy.saved)
    } catch (error) {
      setNotice((!isArabic && error?.response?.data?.message) || copy.saveFailed)
    } finally {
      setSaving(false)
    }
  }

  async function updatePassword(event) {
    event.preventDefault()
    setPasswordMessage('')
    if (passwords.next.length < 8 || !passwords.current) { setPasswordMessage(copy.passwordRequired); return }
    if (passwords.next !== passwords.confirm) { setPasswordMessage(copy.passwordMismatch); return }
    setPasswordBusy(true)
    try {
      await clerkUser.updatePassword({ currentPassword: passwords.current, newPassword: passwords.next })
      setPasswords({ current: '', next: '', confirm: '' })
      setPasswordMessage(copy.passwordSuccess)
      setPasswordOpen(false)
    } catch (error) {
      setPasswordMessage((!isArabic && error?.errors?.[0]?.longMessage) || copy.passwordFailed)
    } finally {
      setPasswordBusy(false)
    }
  }

  if (loading) return <section className="my-bookings-page member-profile-page" dir={isArabic ? 'rtl' : 'ltr'} lang={locale}><MemberLoading label={copy.loading} /></section>
  if (!profile) return <section className="my-bookings-page member-profile-page" dir={isArabic ? 'rtl' : 'ltr'} lang={locale}><div className="mb-error-state" role="alert"><strong>{(!isArabic && profileError) || copy.loadFailed}</strong><button type="button" onClick={load}>{copy.tryAgain}</button></div></section>

  const verified = clerkLoaded ? clerkUser?.primaryEmailAddress?.verification?.status === 'verified' : null
  const googleConnected = clerkLoaded ? Boolean(clerkUser?.externalAccounts?.some((account) => /google/i.test(String(account.provider || '')))) : null
  const avatar = clerkLoaded ? clerkUser?.imageUrl : ''
  const initials = String(profile.fullName || authUser?.fullName || '40').trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()

  return (
    <section className="my-bookings-page member-profile-page" dir={isArabic ? 'rtl' : 'ltr'} lang={locale}>
      <header className="mb-page-hero">
        <div className="mb-hero-copy">

          <h1>{isArabic ? 'ملفي الشخصي.' : 'Member profile.'}</h1>
          <p>{copy.intro}</p>
        </div>
        <aside className="mb-hero-summary profile-member-since">
          <span className="mb-summary-label">{copy.memberSince}</span>
          <strong>{formatDate(profile.memberSince, locale, { month: 'short', year: 'numeric' }) || '—'}</strong>
          <span className="mb-summary-foot"><i />{isArabic ? '40 Love Padel Club & Cafe' : '40 Love Padel Club & Cafe'}</span>
        </aside>
      </header>

      {notice && <div className={notice === copy.saved ? 'mb-inline-success' : 'mb-inline-error'} role={notice === copy.saved ? 'status' : 'alert'}><span>{notice}</span><button type="button" onClick={() => setNotice('')} aria-label={isArabic ? 'إغلاق الرسالة' : 'Dismiss message'}>×</button></div>}

      <section className="mb-bookings-section profile-summary-section" aria-label={copy.tag}>
        <article className="mb-booking-card profile-member-card">
          <div className="profile-avatar" aria-hidden="true">{avatar ? <img src={avatar} alt="" /> : initials}</div>
          <div className="profile-member-copy">
            <span className="mb-booking-eyebrow">{copy.tag}</span>
            <h2>{profile.fullName || copy.unknown}</h2>
            <p>{profile.email}</p>
            <div className="profile-member-meta">
              {profile.phone && <span dir="ltr">{profile.phone}</span>}
              <span className={`mb-status ${profile.accountStatus === 'active' ? 'mb-status-confirmed' : ''}`}><span className="mb-status-dot" />{profile.accountStatus === 'active' ? copy.active : copy.inactive}</span>
            </div>
          </div>
          <button type="button" className="profile-primary-button" onClick={() => { setNotice(''); setIsEditing(true) }} disabled={isEditing}>{copy.edit}</button>
        </article>
      </section>

      <section className="mb-bookings-section" aria-labelledby="profile-stats-title">
        <SectionHeading id="profile-stats-title" title={copy.stats} hint={copy.statsHint} />
        <div className="profile-stats-grid">
          {stats.map((stat) => (
            <article className="mb-booking-card profile-stat-card" key={stat.key}>
              <span className="profile-stat-icon"><Icon name={stat.icon} /></span>
              <span className="profile-stat-label">{copy[stat.key]}</span>
              <strong>{Number.isFinite(stat.value) ? stat.value.toLocaleString(isArabic ? 'ar-JO' : 'en-GB') : stat.value}</strong>
              {stat.hint && <small>{stat.hint}</small>}
            </article>
          ))}
        </div>
      </section>

      <section className="mb-bookings-section" aria-labelledby="profile-personal-title">
        <SectionHeading id="profile-personal-title" title={copy.personal} hint={copy.personalHint} />
        <form className="mb-booking-card profile-panel" onSubmit={saveProfile}>
          <div className="profile-form-grid">
            <label className="profile-field"><span>{copy.fullName} <b>*</b></span><input className="profile-input" value={form.fullName} onChange={(event) => updateForm('fullName', event.target.value)} readOnly={!isEditing} maxLength={255} autoComplete="name" required /></label>
            <label className="profile-field"><span>{copy.email}</span><input className="profile-input" value={profile.email || ''} readOnly aria-describedby="profile-email-managed" /><small id="profile-email-managed">{copy.managed}</small></label>
            <label className="profile-field"><span>{copy.phone}</span><input className="profile-input" type="tel" dir="ltr" value={form.phone} onChange={(event) => updateForm('phone', event.target.value)} readOnly={!isEditing} maxLength={40} autoComplete="tel" /><small>{copy.phoneHelp}</small></label>
            <label className="profile-field"><span>{copy.dob} <em>{copy.optional}</em></span><input className="profile-input" type="date" value={form.dateOfBirth} onChange={(event) => updateForm('dateOfBirth', event.target.value)} readOnly={!isEditing} max={new Date().toISOString().slice(0, 10)} /></label>
            <label className="profile-field"><span>{copy.gender} <em>{copy.optional}</em></span><select className="profile-input" value={form.gender} onChange={(event) => updateForm('gender', event.target.value)} disabled={!isEditing}><option value="">{copy.choose}</option><option value="female">{copy.female}</option><option value="male">{copy.male}</option><option value="non_binary">{copy.nonBinary}</option><option value="prefer_not_to_say">{copy.preferNot}</option></select></label>
            <label className="profile-field"><span>{copy.skill} <em>{copy.optional}</em></span><select className="profile-input" value={form.skillLevel} onChange={(event) => updateForm('skillLevel', event.target.value)} disabled={!isEditing}><option value="">{copy.choose}</option><option value="beginner">{copy.beginner}</option><option value="intermediate">{copy.intermediate}</option><option value="advanced">{copy.advanced}</option><option value="open">{copy.open}</option></select></label>
          </div>
          {isEditing && <div className="profile-form-actions"><span className="profile-required-note">* {isArabic ? 'مطلوب' : 'Required'}</span><div><button className="profile-secondary-button" type="button" onClick={cancelEdit} disabled={saving}>{copy.cancel}</button><button className="profile-primary-button" type="submit" disabled={saving}>{saving ? copy.saving : copy.save}</button></div></div>}
        </form>
      </section>

      <section className="mb-bookings-section" aria-labelledby="profile-activity-title">
        <SectionHeading id="profile-activity-title" title={copy.activity} hint={copy.activityHint} />
        <div className="profile-activity-grid">
          <ActivitySection title={copy.upcomingBookings} hint={copy.nextSessions} items={bookingsError ? null : upcomingBookings} itemType="booking" empty={copy.noUpcomingBookings} failed={bookingsError} copy={copy} locale={locale} viewTo="/bookings" viewLabel={copy.viewBookings} />
          <ActivitySection title={copy.bookingHistory} hint={copy.previousSessions} items={bookingsError ? null : bookingHistory} itemType="booking" empty={copy.noBookingHistory} failed={bookingsError} copy={copy} locale={locale} viewTo="/bookings" viewLabel={copy.viewBookings} />
          <ActivitySection title={copy.upcomingMatches} hint={copy.matchesAhead} items={matchesError ? null : upcomingMatches} itemType="match" empty={copy.noUpcomingMatches} failed={matchesError} copy={copy} locale={locale} viewTo="/my-matchmaking" viewLabel={copy.viewMatches} />
          <ActivitySection title={copy.recentMatches} hint={copy.latestJoins} items={matchesError ? null : recentMatches} itemType="match" empty={copy.noRecentMatches} failed={matchesError} copy={copy} locale={locale} viewTo="/my-matchmaking" viewLabel={copy.viewMatches} />
        </div>
      </section>

      <div className="profile-settings-grid mb-bookings-section">
        <section aria-labelledby="profile-preferences-title">
          <SectionHeading id="profile-preferences-title" title={copy.preferences} hint={copy.preferencesHint} />
          <div className="mb-booking-card profile-panel profile-settings-card">
            <label className="profile-setting-row"><span><strong>{copy.language}</strong><small>{isArabic ? 'لغة عرض التطبيق' : 'Application display language'}</small></span><select className="profile-input profile-setting-select" value={locale} onChange={(event) => selectLocale(event.target.value)}><option value="en">{copy.english}</option><option value="ar">{copy.arabic}</option></select></label>
            <label className="profile-setting-row"><span><strong>{copy.theme}</strong><small>{isArabic ? 'المظهر الحالي للتطبيق' : 'Current application appearance'}</small></span><select className="profile-input profile-setting-select" value={theme} onChange={(event) => selectTheme(event.target.value)}><option value="light">{copy.light}</option><option value="dark">{copy.dark}</option></select></label>
          </div>
        </section>

        <section aria-labelledby="profile-security-title">
          <SectionHeading id="profile-security-title" title={copy.security} hint={copy.securityHint} />
          <div className="mb-booking-card profile-panel profile-settings-card">
            <div className="profile-security-row"><span><strong>{copy.verification}</strong><small>{profile.email}</small></span><span className={`mb-status ${verified ? 'mb-status-confirmed' : ''}`}>{verified === null ? copy.notAvailable : verified ? copy.verified : copy.unverified}</span></div>
            <div className="profile-security-row"><span><strong>{copy.connectedGoogle}</strong><small>{isArabic ? 'حساب تسجيل الدخول الخارجي' : 'External sign-in account'}</small></span><span className={`mb-status ${googleConnected ? 'mb-status-confirmed' : ''}`}>{googleConnected === null ? copy.notAvailable : googleConnected ? copy.connected : copy.notConnected}</span></div>
            {clerkLoaded && clerkUser?.passwordEnabled && <div className="profile-security-row"><span><strong>{copy.changePassword}</strong><small>{isArabic ? 'تحديث كلمة مرور تسجيل الدخول' : 'Update your sign-in password'}</small></span><button className="profile-secondary-button" type="button" onClick={() => { setPasswordOpen((open) => !open); setPasswordMessage('') }}>{copy.changePassword}</button></div>}
            {passwordOpen && <form className="profile-password-form" onSubmit={updatePassword}>
              <label className="profile-field"><span>{copy.currentPassword}</span><input className="profile-input" type="password" autoComplete="current-password" value={passwords.current} onChange={(event) => setPasswords((value) => ({ ...value, current: event.target.value }))} required /></label>
              <label className="profile-field"><span>{copy.newPassword}</span><input className="profile-input" type="password" autoComplete="new-password" minLength={8} value={passwords.next} onChange={(event) => setPasswords((value) => ({ ...value, next: event.target.value }))} required /></label>
              <label className="profile-field"><span>{copy.confirmPassword}</span><input className="profile-input" type="password" autoComplete="new-password" minLength={8} value={passwords.confirm} onChange={(event) => setPasswords((value) => ({ ...value, confirm: event.target.value }))} required /></label>
              {passwordMessage && <p className="profile-form-message" role="status">{passwordMessage}</p>}
              <button className="profile-primary-button" type="submit" disabled={passwordBusy}>{passwordBusy ? copy.saving : copy.updatePassword}</button>
            </form>}
            {passwordMessage && !passwordOpen && <p className="profile-form-message" role="status">{passwordMessage}</p>}
            <div className="profile-security-row profile-signout-row"><span><strong>{copy.signOut}</strong><small>{copy.signOutHint}</small></span><button className="profile-secondary-button" type="button" onClick={logout}>{copy.signOut}</button></div>
          </div>
        </section>
      </div>
    </section>
  )
}
