import { useState } from 'react'
import api from '../api'
import { normalizeContactPhone } from '../contactPhone'

export default function ContactMessageForm({ locale = 'en', phone = '', variant = 'home' }) {
  const isArabic = locale === 'ar'
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    setSubmitted(false)

    const form = event.currentTarget
    const fields = new FormData(form)
    const payload = {
      name: String(fields.get('name') || '').trim(),
      phone: String(fields.get('phone') || '').trim(),
      sport: 'padel',
      preferredTime: String(fields.get('preferredTime') || '').trim(),
      message: String(fields.get('message') || '').trim(),
    }

    try {
      if (!normalizeContactPhone(payload.phone)) {
        setError(isArabic ? 'أدخل رقم هاتف صالحًا يتكوّن من 8 إلى 15 رقمًا.' : 'Enter a valid phone number with 8 to 15 digits.')
        return
      }
      await api.post('/contact-messages', payload)
      form.reset()
      setSubmitted(true)
    } catch (err) {
      const responseMessage = err.response?.data?.detail || err.response?.data?.message || err.response?.data?.error
      setError((!isArabic && responseMessage) || (isArabic
        ? 'تعذر إرسال الرسالة. يرجى المحاولة مرة أخرى.'
        : 'We could not send your message. Please try again.'))
    } finally {
      setSubmitting(false)
    }
  }

  const editorial = variant === 'editorial'
  const className = editorial ? 'club-contact-form-home' : `contact-form video-contact-form${variant === 'club' ? ' club-contact-form' : ''}`

  return (
    <form className={className} onSubmit={handleSubmit}>
      <input type="hidden" name="sport" value="padel" />
      <label>
        <span>{isArabic ? 'الاسم' : 'Name'}</span>
        <input name="name" required minLength="2" maxLength="120" autoComplete="name" placeholder={isArabic ? 'اسمك الكامل' : 'Your full name'} />
      </label>
      <label>
        <span>{isArabic ? 'رقم الهاتف' : 'Phone'}</span>
        <input name="phone" required type="tel" maxLength="40" autoComplete="tel" placeholder={phone} />
      </label>
      <label className="full">
        <span>{isArabic ? 'الوقت المفضل' : 'Preferred time'}</span>
        <input name="preferredTime" maxLength="120" placeholder={isArabic ? 'مثال: الجمعة الساعة 9 مساءً' : 'e.g. Fri 9 PM'} />
      </label>
      <label className="full">
        <span>{isArabic ? 'الرسالة / الملاحظات' : 'Message / Notes'}</span>
        <textarea name="message" required minLength="5" maxLength="3000" rows="5" placeholder={isArabic ? 'كم عدد اللاعبين؟ وكيف يمكننا مساعدتك؟' : 'How many players, and what can we help with?'} />
      </label>
      {error && <div className="contact-feedback error" role="alert">{error}</div>}
      {submitted && <div className="contact-feedback success" role="status">{isArabic ? 'تم إرسال رسالتك بنجاح. سيتواصل معك فريق نادي 40 Love للبادل والمقهى قريبًا.' : 'Your message was sent successfully. The 40 Love Padel Club & Cafe team will follow up soon.'}</div>}
      <div className="form-actions">
        <button className={editorial ? 'club-button' : 'btn btn-accent'} type="submit" disabled={submitting}>
          {submitting ? (isArabic ? 'جارٍ الإرسال…' : 'Sending…') : submitted ? (isArabic ? 'تم الإرسال' : 'Message Sent') : (isArabic ? 'إرسال الرسالة' : 'Send Message')}
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </button>
        {!editorial && <span>{isArabic ? 'نرد خلال بضع ساعات.' : 'We reply within a few hours.'}</span>}
      </div>
    </form>
  )
}
