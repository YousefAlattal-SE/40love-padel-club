import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { addDays, format, parseISO } from 'date-fns'
import { MemberDialog, MemberLoading } from './MemberStates'
import api, { errorMessage } from '../api'
import { useAuth } from '../auth'
import { confirmBookingWithSavedPhone, isPhoneNumberRequiredError, persistContactPhoneThenConfirm } from '../bookingPhoneFlow'
import { normalizeContactPhone } from '../contactPhone'
import { formatTime } from '../format'

// Club decision B-3; the server enforces the same limit.
const MAX_BOOKING_HOURS = 3

const SPORT_DETAILS = {
    padel: { en: 'Padel', ar: 'بادل' },
}

const COPY = {
    en: {
        club: '40 LOVE PADEL CLUB & CAFE', location: 'AMMAN, JORDAN', title: 'Your game.', titleAccent: 'Your time.',
        intro: 'Choose a date, find an open Padel slot, and get straight to the good part. Your next session starts here.',
        bookAhead: 'Book up to 7 days ahead', flexible: 'Flexible 1+ hour sessions', openDaily: 'OPEN DAILY', courtHours: 'COURT HOURS', hoursLine: '7 AM – 3 AM',
        premiumCourts: 'Padel courts', padelOnly: 'Padel only', openEveryDay: 'Hours open daily', bookingWindow: 'Days booking window',
        yourSession: '01 / YOUR SESSION', whenPlaying: 'When are we playing?', sessionHelp: 'Choose a date for your Padel session.', todayWindow: 'Today + next 7 days',
        chooseDate: 'Choose a date', liveAvailability: '02 / LIVE AVAILABILITY', findTime: 'Find your time.',
        availabilityHelp: 'Choose an available court and start time. The price band follows your booking start time.', liveSlots: 'LIVE SLOTS', court: 'COURT', courts: 'COURTS', courtTime: 'COURT / TIME',
        checking: 'Checking the courts...', latestTimes: 'Getting the latest available times.', noneAvailable: 'No courts available right now.',
        tryAnother: 'Try another date to find your next session.', booked: 'Booked', past: 'Past', book: 'Book', peakHour: 'Evening pricing', offPeakHour: 'Daytime pricing',
        available: 'Available', peakPricing: 'Evening price', alreadyBooked: 'Already booked', priceUnit: 'Hourly price · 2-hour bundle shown at confirmation',
        priceNote: 'Rates follow the booking start time. Longer sessions use the two-hour bundle for every complete pair of hours.',
        lockCourt: 'Lock in your court.', selectedTime: 'Your selected playing time', duration: 'Duration', hour: 'hour', hours: 'hours',
        totalPrice: 'Total session price', payAtClub: 'Pay at the club after your session.', confirmBooking: 'Confirm booking', reserving: 'Reserving your court...', cancelSelection: 'Cancel selection',
        confidence: 'Play with confidence.', assurance: 'Your selected slot is checked against live availability before your booking is confirmed.',
        dismiss: 'Dismiss message', dismissError: 'Dismiss error', noCourt: 'Court',
        phoneModalTitle: 'Phone Number Required',
        phoneModalText: 'Please enter your phone number to proceed with your booking confirmation. Our team will use it to contact you regarding your reservation and any required deposit.',
        phoneLabel: 'Phone number', phoneHelp: 'Contact only. No SMS, OTP, or phone verification is required.',
        phoneRequired: 'Please enter your phone number.', phoneInvalid: 'Enter a valid number with 8–15 digits. Add + and the country code for international numbers.',
        phoneSaveFailed: 'We could not save your phone number. Your booking was not confirmed. Please try again.',
        cancel: 'Cancel', continueConfirm: 'Confirm Booking', savingPhone: 'Saving phone…',
    },
    ar: {
        club: 'نادي 40 Love للبادل والمقهى', location: 'عمّان، الأردن', title: 'لعبتك.', titleAccent: 'على وقتك.',
        intro: 'اختر التاريخ واعثر على موعد بادل متاح. تبدأ جلستك القادمة من هنا.',
        bookAhead: 'احجز قبل ٧ أيام', flexible: 'جلسات مرنة تبدأ من ساعة', openDaily: 'مفتوح يوميًا', courtHours: 'ساعات الملاعب', hoursLine: '٧ صباحًا – ٣ صباحًا',
        premiumCourts: 'ملاعب بادل', padelOnly: 'بادل فقط', openEveryDay: 'ساعة عمل يوميًا', bookingWindow: 'أيام متاحة للحجز',
        yourSession: '٠١ / جلستك', whenPlaying: 'متى نلعب؟', sessionHelp: 'اختر التاريخ لجلسة البادل.', todayWindow: 'اليوم + الأيام السبعة القادمة',
        chooseDate: 'اختر التاريخ', liveAvailability: '٠٢ / المواعيد المتاحة', findTime: 'اختر موعدك.',
        availabilityHelp: 'اختر ملعبًا ووقت بدء متاحًا. تحدد ساعة بدء الحجز فئة السعر.', liveSlots: 'المواعيد المباشرة', court: 'ملعب', courts: 'ملاعب', courtTime: 'الملعب / الوقت',
        checking: 'جارٍ التحقق من الملاعب...', latestTimes: 'نبحث عن أحدث المواعيد المتاحة.', noneAvailable: 'لا توجد ملاعب متاحة حاليًا.',
        tryAnother: 'جرّب تاريخًا آخر للعثور على موعد مناسب.', booked: 'محجوز', past: 'انتهى', book: 'احجز', peakHour: 'سعر الفترة المسائية', offPeakHour: 'سعر الفترة النهارية',
        available: 'متاح', peakPricing: 'سعر المساء', alreadyBooked: 'محجوز مسبقًا', priceUnit: 'سعر الساعة · يظهر سعر الساعتين عند التأكيد',
        priceNote: 'تتبع الأسعار وقت بدء الحجز. تستخدم الجلسات الأطول سعر الساعتين لكل فترة كاملة من ساعتين.',
        lockCourt: 'ثبّت حجز ملعبك.', selectedTime: 'وقت اللعب الذي اخترته', duration: 'المدة', hour: 'ساعة', hours: 'ساعات',
        totalPrice: 'السعر الإجمالي للجلسة', payAtClub: 'الدفع في النادي بعد انتهاء جلستك.', confirmBooking: 'تأكيد الحجز', reserving: 'جارٍ حجز ملعبك...', cancelSelection: 'إلغاء الاختيار',
        confidence: 'العب بكل ثقة.', assurance: 'نتحقق من توفر الموعد مباشرة قبل تأكيد حجزك.',
        dismiss: 'إخفاء الرسالة', dismissError: 'إخفاء الخطأ', noCourt: 'ملعب',
        phoneModalTitle: 'رقم الهاتف مطلوب',
        phoneModalText: 'يرجى إدخال رقم هاتفك للمتابعة في تأكيد الحجز. سيستخدمه فريقنا للتواصل معك بشأن حجزك وأي دفعة مقدّمة مطلوبة.',
        phoneLabel: 'رقم الهاتف', phoneHelp: 'للتواصل فقط. لا نطلب رسالة نصية أو رمز تحقق أو التحقق من ملكية الرقم.',
        phoneRequired: 'يرجى إدخال رقم هاتفك.', phoneInvalid: 'أدخل رقمًا صحيحًا من 8 إلى 15 رقمًا. أضف + ورمز الدولة للأرقام الدولية.',
        phoneSaveFailed: 'تعذّر حفظ رقم هاتفك، ولم يتم تأكيد الحجز. حاول مرة أخرى.',
        cancel: 'إلغاء', continueConfirm: 'تأكيد الحجز', savingPhone: 'جارٍ حفظ الرقم…',
    },
}

const WEEKDAYS = {
    en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    ar: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
}
const MONTHS = {
    en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    ar: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
}

// Show eight club dates; before 3 AM the after-midnight slots belong to yesterday's club day.
function buildDays() {
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Amman', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date())
    const part = (type) => Number(parts.find((item) => item.type === type)?.value)
    const start = new Date(part('year'), part('month') - 1, part('day'), 12)
    if (part('hour') < 3) start.setDate(start.getDate() - 1)
    return Array.from({ length: 8 }, (_, i) => addDays(start, i))
}

const money = (value, locale = 'en') => {
    const amount = Number(value).toLocaleString(locale === 'ar' ? 'ar-JO-u-nu-latn' : 'en-JO', { maximumFractionDigits: 2 })
    return `${amount} ${locale === 'ar' ? 'د.أ.' : 'JOD'}`
}

function getLocalizedError(message, locale) {
    if (locale !== 'ar' || !message) return message
    const value = String(message).toLowerCase()
    if (/network|failed to fetch|connection refused|err_network/.test(value)) return 'تعذّر الاتصال بالخادم. تحقق من اتصالك وحاول مرة أخرى.'
    if (/unauthori[sz]ed|token|log in|login|session expired/.test(value)) return 'انتهت جلسة الدخول. سجّل الدخول مرة أخرى ثم حاول.'
    if (/slot|availability|already booked|not available|conflict/.test(value)) return 'هذا الموعد لم يعد متاحًا. اختر موعدًا آخر من الجدول.'
    if (/invalid|required|validation/.test(value)) return 'يرجى التحقق من المعلومات والمحاولة مرة أخرى.'
    return message
}

function localCourtName(name, locale) {
    if (locale !== 'ar') return name
    const number = String(name || '').match(/\d+/)?.[0]
    return number ? `ملعب ${number}` : (name || 'الملعب')
}

function localDateLabel(day, locale, includeYear = false) {
    if (locale === 'en') return format(day, includeYear ? 'EEE, d MMM yyyy' : 'EEE, d MMM')
    return `${WEEKDAYS.ar[day.getDay()]}، ${day.getDate()} ${MONTHS.ar[day.getMonth()]}${includeYear ? ` ${day.getFullYear()}` : ''}`
}

export default function Book() {
    const { updateUser } = useAuth()
    const days = useMemo(() => buildDays(), [])
    const [params] = useSearchParams()
    const requestedDate = params.get('date')

    // The shared Layout updates HTML[lang] and HTML[dir]. Observe those
    // attributes so this page follows its existing EN/AR switch immediately.
    const [locale, setLocale] = useState(() => {
        const saved = typeof window !== 'undefined' ? localStorage.getItem('serva-locale') : 'en'
        return document.documentElement.lang === 'ar' || saved === 'ar' ? 'ar' : 'en'
    })
    useEffect(() => {
        const syncLocale = () => {
            const next = document.documentElement.lang === 'ar' || localStorage.getItem('serva-locale') === 'ar' ? 'ar' : 'en'
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

    const isArabic = locale === 'ar'
    const t = COPY[locale]
    const [date, setDate] = useState(() => days.some(day => format(day, 'yyyy-MM-dd') === requestedDate) ? requestedDate : format(days[0], 'yyyy-MM-dd'))
    const sport = 'padel'
    const [availabilityError, setAvailabilityError] = useState(false)
    const [refresh, setRefresh] = useState(0)
    const [data, setData] = useState(null)
    const [selected, setSelected] = useState(null) // { court, index }
    const [hours, setHours] = useState(1)
    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')
    const [busy, setBusy] = useState(false)
    const [phoneModal, setPhoneModal] = useState(false)
    const [contactPhone, setContactPhone] = useState('')
    const [phoneSaving, setPhoneSaving] = useState(false)
    const [phoneError, setPhoneError] = useState('')
    const [phoneSaveError, setPhoneSaveError] = useState('')
    const bookingRequestInFlight = useRef(false)
    const phoneSubmitInFlight = useRef(false)


    useEffect(() => {
        const controller = new AbortController()
        api.get('/availability', { params: { date, sport }, signal: controller.signal })
            .then(({ data }) => { if (!controller.signal.aborted) setData(data) })
            .catch(() => { if (!controller.signal.aborted) setAvailabilityError(true) })
        return () => controller.abort()
    }, [date, sport, refresh])

    function refreshAvailability() {
        setAvailabilityError(false)
        setRefresh(value => value + 1)
    }

    function changeDate(nextDate) {
        if (nextDate === date) return
        setAvailabilityError(false)
        setDate(nextDate)
        setSelected(null)
        setData(null)
        setError('')
        setNotice('')
    }

    function pick(court, index) {
        setSelected({ court, index })
        setHours(1)
        setNotice('')
        setError('')
    }

    // Count the consecutive free slots after the chosen slot, up to the club's 3-hour booking limit.
    const maxHours = useMemo(() => {
        if (!selected) return 0
        const { slots } = selected.court
        let count = 0
        while (count < MAX_BOOKING_HOURS && selected.index + count < slots.length && slots[selected.index + count].status === 'free') count++
        return count
    }, [selected])

    const chosenSlots = selected ? selected.court.slots.slice(selected.index, selected.index + hours) : []
    const startSlot = chosenSlots[0]
    const total = startSlot
        ? Math.floor(hours / 2) * Number(startSlot.twoHourPrice) + (hours % 2) * Number(startSlot.price)
        : 0
    const headerSlots = data?.courts?.[0]?.slots ?? []
    const courtCount = data?.courts?.length
    const selectedDate = parseISO(date)
    const selectedSportName = SPORT_DETAILS[sport][isArabic ? 'ar' : 'en']

    async function book() {
        if (!selected || !chosenSlots.length || bookingRequestInFlight.current) return
        bookingRequestInFlight.current = true
        const { court, index } = selected
        setBusy(true)
        setError('')
        try {
            const result = await confirmBookingWithSavedPhone(
                async () => (await api.get('/profile')).data,
                async (profile) => {
                    updateUser?.({ phone: profile.phone })
                    const { data: booking } = await api.post('/bookings', {
                        courtId: court.courtId,
                        startsAt: court.slots[index].startsAt,
                        hours,
                    })
                    return booking
                },
                () => {
                    setPhoneError('')
                    setPhoneSaveError('')
                    setPhoneModal(true)
                },
            )
            if (result.phoneRequired) return
            const { booking } = result
            const confirmedTotal = Number(booking?.totalPrice ?? total)
            const courtName = localCourtName(court.courtName, locale)
            setNotice(isArabic
                ? `تم تأكيد حجزك! ${courtName} محجوز لمدة ${hours} ${hours === 1 ? 'ساعة' : 'ساعات'}. يرجى دفع ${money(confirmedTotal, locale)} في النادي.`
                : `You're booked! ${courtName} is reserved for ${hours} ${hours > 1 ? 'hours' : 'hour'}. Please pay ${money(confirmedTotal, locale)} at the club.`)
            setSelected(null)
        } catch (err) {
            if (isPhoneNumberRequiredError(err)) {
                setPhoneError('')
                setPhoneSaveError('')
                setPhoneModal(true)
            } else {
                setError(errorMessage(err))
            }
        } finally {
            bookingRequestInFlight.current = false
            setBusy(false)
            refreshAvailability()
        }
    }

    function closePhoneModal() {
        if (phoneSaving) return
        setPhoneModal(false)
        setContactPhone('')
        setPhoneError('')
        setPhoneSaveError('')
    }

    async function savePhoneAndConfirm(event) {
        event.preventDefault()
        if (phoneSubmitInFlight.current) return
        const normalizedPhone = normalizeContactPhone(contactPhone)
        if (!normalizedPhone) {
            setPhoneError(contactPhone.trim() ? t.phoneInvalid : t.phoneRequired)
            return
        }

        phoneSubmitInFlight.current = true
        setPhoneSaving(true)
        setPhoneError('')
        setPhoneSaveError('')
        try {
            await persistContactPhoneThenConfirm(async (phone) => {
                const { data: profile } = await api.patch('/profile/phone', { phone })
                updateUser?.({ phone: profile.phone })
            }, async () => {
                setPhoneModal(false)
                setContactPhone('')
                await book()
            }, normalizedPhone)
        } catch (err) {
            const detail = getLocalizedError(errorMessage(err), locale)
            const status = err?.response?.status
            const prefix = isArabic ? 'تعذّر حفظ رقم الهاتف' : 'Phone save failed'
            setPhoneSaveError(status ? `${prefix} (HTTP ${status}): ${detail}` : (detail || t.phoneSaveFailed))
        } finally {
            phoneSubmitInFlight.current = false
            setPhoneSaving(false)
        }
    }

    const isChosen = (court, index) => Boolean(
        selected && selected.court.courtId === court.courtId &&
        index >= selected.index && index < selected.index + hours,
    )

    return (
        <div className="booking-page" dir={isArabic ? 'rtl' : 'ltr'} lang={locale}>
            <header className="member-title"><h1>{isArabic ? 'احجز ملعبًا.' : 'Book a court.'}</h1><p>{t.bookAhead} · {t.hoursLine}</p></header>

            <section className="booking-panel booking-session-panel">
                <div className="booking-panel-heading">
                    <div><h2>{t.whenPlaying}</h2><p>{t.sessionHelp}</p></div>
                    <span className="booking-window-pill">{t.todayWindow}</span>
                </div>

                <div className="booking-control-group">
                    <div className="booking-control-title"><span>{t.chooseDate}</span></div>
                    <div className="booking-days" aria-label={t.chooseDate} data-lenis-prevent>
                        {days.map((day) => {
                            const key = format(day, 'yyyy-MM-dd')
                            const active = key === date
                            return (
                                <button key={key} type="button" className={`booking-day ${active ? 'is-active' : ''}`} aria-pressed={active} onClick={() => changeDate(key)}>
                                    <span className="booking-day-week">{WEEKDAYS[locale][day.getDay()]}</span>
                                    <strong>{day.getDate()}</strong>
                                    <span className="booking-day-month">{MONTHS[locale][day.getMonth()]}</span>
                                </button>
                            )
                        })}
                    </div>
                </div>

            </section>

            {notice && <div className="booking-alert booking-alert-success" role="status"><span className="booking-alert-icon">✓</span><span>{notice}</span><button type="button" onClick={() => setNotice('')} aria-label={t.dismiss}>×</button></div>}
            {error && <div className="booking-alert booking-alert-error" role="alert"><span className="booking-alert-icon">!</span><span>{getLocalizedError(error, locale)}</span><button type="button" onClick={() => setError('')} aria-label={t.dismissError}>×</button></div>}

            <section className="booking-panel booking-availability-panel">
                <div className="booking-panel-heading booking-availability-heading">
                    <div><h2>{t.findTime}</h2><p>{t.availabilityHelp}</p></div>
                    <div className="booking-availability-meta"><span className="booking-live-dot" /> {t.liveSlots} <span className="booking-meta-divider">/</span> {courtCount !== undefined && `${courtCount} ${courtCount === 1 ? t.court : t.courts}`}</div>
                </div>

                {availabilityError && <div role="alert"><p>{isArabic ? 'تعذّر تحميل المواعيد المتاحة.' : 'Available times could not be loaded.'}</p><button type="button" onClick={refreshAvailability}>{isArabic ? 'حاول مجددًا' : 'Try again'}</button></div>}
                {!data && !availabilityError && (
                    <MemberLoading label={t.checking} />
                )}

                {data && data.courts.length === 0 && (
                    <div className="booking-empty"><span className="booking-empty-mark">⌁</span><strong>{t.noneAvailable}</strong><p>{t.tryAnother}</p></div>
                )}

                {data && data.courts.length > 0 && (
                    <>
                        <div className="booking-table-wrap" data-lenis-prevent>
                            <table className="booking-table">
                                <thead><tr><th className="booking-court-column">{t.courtTime}</th>{headerSlots.map((slot) => <th key={slot.label}>{slot.label}</th>)}</tr></thead>
                                <tbody>
                                {data.courts.map((court) => (
                                    <tr key={court.courtId}>
                                        <th scope="row" className="booking-court-name"><span><strong>{localCourtName(court.courtName, locale)}</strong><small>{selectedSportName}</small></span></th>
                                        {court.slots.map((slot, index) => {
                                            const chosen = isChosen(court, index)
                                            const statusLabel = slot.status === 'booked' ? t.booked : slot.status === 'past' ? t.past : `${t.book} ${formatTime(slot.startsAt)} ${isArabic ? 'مقابل' : 'for'} ${money(slot.price, locale)}`
                                            return (
                                                <td key={slot.startsAt}>
                                                    <button
                                                        type="button"
                                                        className={`booking-slot ${slot.status} ${slot.peak ? 'is-peak' : ''} ${chosen ? 'is-chosen' : ''}`}
                                                        disabled={slot.status !== 'free'}
                                                        onClick={() => pick(court, index)}
                                                        aria-label={`${localCourtName(court.courtName, locale)}, ${statusLabel}`}
                                                        title={slot.peak ? t.peakHour : t.offPeakHour}
                                                    >
                                                        {slot.status === 'booked' ? <span className="booking-slot-unavailable">{t.booked}</span> : slot.status === 'past' ? <span className="booking-slot-past">—</span> : <><strong>{Number(slot.price)}</strong><small>{isArabic ? 'د.أ.' : 'JOD'}</small></>}
                                                    </button>
                                                </td>
                                            )
                                        })}
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="booking-legend"><span><i className="booking-legend-swatch available" /> {t.available}</span><span><i className="booking-legend-swatch peak" /> {t.peakPricing}</span><span><i className="booking-legend-swatch booked" /> {t.alreadyBooked}</span><span className="booking-legend-note">{t.priceUnit}</span></div>
                    </>
                )}
            </section>

            {selected && chosenSlots.length > 0 && (
                <section className="booking-confirm-panel" aria-label={t.lockCourt}>
                    <div className="booking-confirm-main">

                        <h2>{t.lockCourt}</h2>
                        <div className="booking-confirm-court"><div><strong>{localCourtName(selected.court.courtName, locale)}</strong><span>{selectedSportName} <i>·</i> {localDateLabel(selectedDate, locale)}</span></div></div>
                        <div className="booking-confirm-time"><span className="booking-confirm-clock">◷</span><div><strong>{formatTime(chosenSlots[0].startsAt)} <i>–</i> {formatTime(chosenSlots[chosenSlots.length - 1].endsAt)}</strong><span>{t.selectedTime}</span></div></div>
                    </div>
                    <div className="booking-confirm-summary">
                        <label className="booking-duration-label" htmlFor="booking-duration"><span>{t.duration}</span><select id="booking-duration" value={hours} onChange={(event) => setHours(Number(event.target.value))}>
                            {Array.from({ length: maxHours }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1} {isArabic ? (index === 0 ? t.hour : t.hours) : (index > 0 ? t.hours : t.hour)}</option>)}
                        </select></label>
                        <div className="booking-total-row"><span>{t.totalPrice}</span><strong>{money(total, locale)}</strong></div>
                        <p className="booking-pricing-note">{t.priceNote}</p>
                        <p className="booking-payment-note">{t.payAtClub}</p>
                        <button className="booking-confirm-button" type="button" onClick={book} disabled={busy}>{busy ? <><span className="booking-button-spinner" /> {t.reserving}</> : <>{t.confirmBooking} <span>↗</span></>}</button>
                        <button className="booking-cancel-button" type="button" onClick={() => setSelected(null)} disabled={busy}>{t.cancelSelection}</button>
                    </div>
                </section>
            )}


            {phoneModal && (
                <MemberDialog label={t.phoneModalTitle} onClose={closePhoneModal} busy={phoneSaving}>
                    <section className="booking-phone-modal" aria-labelledby="booking-phone-title" aria-describedby="booking-phone-description" dir={isArabic ? 'rtl' : 'ltr'}>
                        <h2 id="booking-phone-title">{t.phoneModalTitle}</h2>
                        <p id="booking-phone-description" className="booking-phone-modal-copy">{t.phoneModalText}</p>
                        <form className="booking-phone-form" noValidate onSubmit={savePhoneAndConfirm}>
                            <label className="booking-phone-field" htmlFor="booking-contact-phone">
                                <span>{t.phoneLabel} <b aria-hidden="true">*</b></span>
                                <input
                                    id="booking-contact-phone"
                                    type="tel"
                                    inputMode="tel"
                                    autoComplete="tel"
                                    dir="ltr"
                                    required
                                    autoFocus
                                    maxLength={40}
                                    placeholder="+962 7X XXX XXXX"
                                    value={contactPhone}
                                    aria-invalid={Boolean(phoneError)}
                                    aria-describedby="booking-phone-help booking-phone-error"
                                    onBlur={() => {
                                        if (!normalizeContactPhone(contactPhone)) setPhoneError(contactPhone.trim() ? t.phoneInvalid : t.phoneRequired)
                                    }}
                                    onChange={(event) => {
                                        setContactPhone(event.target.value)
                                        setPhoneError('')
                                        setPhoneSaveError('')
                                    }}
                                />
                            </label>
                            <small id="booking-phone-help" className="booking-phone-help">{t.phoneHelp}</small>
                            <p id="booking-phone-error" className="booking-phone-error" role={phoneError || phoneSaveError ? 'alert' : undefined} aria-live="polite">{phoneError || phoneSaveError}</p>
                            <div className="booking-phone-actions">
                                <button className="booking-phone-cancel" type="button" onClick={closePhoneModal} disabled={phoneSaving}>{t.cancel}</button>
                                <button className="booking-phone-submit" type="submit" disabled={phoneSaving}>{phoneSaving ? t.savingPhone : t.continueConfirm}</button>
                            </div>
                        </form>
                    </section>
                </MemberDialog>
            )}
        </div>
    )
}
