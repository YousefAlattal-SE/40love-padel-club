import { useEffect, useState } from 'react'
import api from '../api'
import './club-information.css'

const copy = {
  en: {
    caption: 'Court rates in Jordanian dinars',
    session: 'Start time', hour: '1 hour', twoHours: '2 hours', currency: 'JOD',
    daytime: 'Daytime', dayWindow: '7 AM to 6 PM', evening: 'Evening', eveningWindow: '6 PM to 3 AM',
    loading: 'Loading court rates…', empty: 'Court rates have not been published yet.',
    error: 'Court rates could not be loaded.', invalid: 'The club’s pricing information is incomplete.',
    retry: 'Try again', note: 'Rates are per court. Your start time determines the rate for the whole session.',
  },
  ar: {
    caption: 'أسعار حجز الملعب بالدينار الأردني',
    session: 'وقت البدء', hour: 'ساعة', twoHours: 'ساعتان', currency: 'د.أ.',
    daytime: 'نهارًا', dayWindow: 'من ٧ صباحًا إلى ٦ مساءً', evening: 'مساءً', eveningWindow: 'من ٦ مساءً إلى ٣ صباحًا',
    loading: 'جارٍ تحميل أسعار الملاعب…', empty: 'لم تُنشر أسعار الملاعب بعد.',
    error: 'تعذّر تحميل أسعار الملاعب.', invalid: 'بيانات أسعار الملاعب غير مكتملة.',
    retry: 'حاول مجددًا', note: 'الأسعار لكل ملعب. يُحتسب سعر الحجز كاملًا بحسب وقت بدء اللعب.',
  },
}

const priceFields = ['daytimePrice', 'daytimeTwoHourPrice', 'eveningPrice', 'eveningTwoHourPrice']

function readRates(data) {
  if (!Array.isArray(data)) return { status: 'invalid' }
  const row = data.find((item) => item?.sport === 'padel')
  if (!row) return { status: 'empty' }
  const valid = priceFields.every((key) => {
    const value = row[key]
    if (typeof value !== 'number' && !(typeof value === 'string' && value.trim())) return false
    return Number.isFinite(Number(value)) && Number(value) >= 0
  })
  return valid ? { status: 'ready', rates: row } : { status: 'invalid' }
}

export default function HomeRates({ locale }) {
  const t = copy[locale] || copy.en
  const [result, setResult] = useState({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    api.get('/pricing', { signal: controller.signal })
      .then(({ data }) => {
        if (!controller.signal.aborted) setResult(readRates(data))
      })
      .catch((error) => {
        if (!controller.signal.aborted) setResult({ status: 'error', code: error.response?.status })
      })
    return () => controller.abort()
  }, [attempt])

  function retry() {
    setResult({ status: 'loading' })
    setAttempt((value) => value + 1)
  }

  const { status, rates } = result
  const loading = status === 'loading'
  if (!loading && status !== 'ready') {
    return (
      <div className="club-rates-notice">
        <p role="status">{t[status]} {result.code && <bdi>({result.code})</bdi>}</p>
        <button type="button" onClick={retry}>{t.retry}</button>
      </div>
    )
  }

  const number = new Intl.NumberFormat(locale === 'ar' ? 'ar-JO-u-nu-arab' : 'en-GB', { maximumFractionDigits: 3 })
  const periods = [
    { name: t.daytime, time: t.dayWindow, hourly: 'daytimePrice', pair: 'daytimeTwoHourPrice' },
    { name: t.evening, time: t.eveningWindow, hourly: 'eveningPrice', pair: 'eveningTwoHourPrice' },
  ]

  return (
    <div className="club-rates">
      {loading && <span className="club-rates-sr" role="status">{t.loading}</span>}
      <table aria-busy={loading}>
        <caption className="club-rates-sr">{t.caption}</caption>
        <thead><tr><th scope="col">{t.session}</th><th scope="col">{t.hour}</th><th scope="col">{t.twoHours}</th></tr></thead>
        <tbody>
          {periods.map((period) => (
            <tr key={period.hourly}>
              <th scope="row">{period.name}<small>{period.time}</small></th>
              {[period.hourly, period.pair].map((key) => (
                <td key={key}>
                  {loading ? <span className="club-rate-skeleton" aria-hidden="true" /> : <><bdi>{number.format(rates[key])}</bdi> <small>{t.currency}</small></>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p>{t.note}</p>
    </div>
  )
}
