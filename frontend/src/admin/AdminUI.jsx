import { useLayoutEffect, useRef } from 'react'
import { useAdminLocale } from './AdminLocale'

function readableError(message, ar) {
  if (!ar || typeof message !== 'string') return message
  if (message === 'Could not reach the server') return 'تعذّر الاتصال بالخادم. تحقق من الاتصال وحاول مجددًا.'
  const status = message.match(/^Request failed with status (\d{3})$/)
  return status ? `تعذّر إكمال الطلب. رمز الاستجابة ${status[1]}.` : message
}

export function PageHeading({ title, description, action }) {
  return <header className="admin-page-heading"><div><h1>{title}</h1>{description && <p>{description}</p>}</div>{action}</header>
}

export function Notice({ type = 'info', children, onClose }) {
  const ar = useAdminLocale() === 'ar'
  if (!children) return null
  return <div className={'admin-notice ' + type} role={type === 'error' ? 'alert' : 'status'}>
    <span>{type === 'error' ? readableError(children, ar) : children}</span>{onClose && <button type="button" onClick={onClose} aria-label={ar ? 'إغلاق التنبيه' : 'Dismiss notice'}>×</button>}
  </div>
}

export function Badge({ children, tone = 'neutral' }) {
  return <span className={'admin-badge ' + tone}>{children}</span>
}

export function StatePanel({ loading, error, retry, empty, children, label }) {
  const ar = useAdminLocale() === 'ar'
  if (loading) return <div className="admin-state-panel" role="status">
    <strong>{label || (ar ? 'جارٍ تحميل البيانات…' : 'Loading records…')}</strong>
    <div className="admin-skeleton" aria-hidden="true"><i /><i /><i /></div>
  </div>
  if (error) return <div className="admin-state-panel" role="alert">
    <strong>{ar ? 'تعذّر تحميل البيانات' : 'Unable to load records'}</strong>
    <p>{readableError(error, ar)}</p><button className="admin-button secondary" onClick={retry}>{ar ? 'إعادة المحاولة' : 'Try again'}</button>
  </div>
  if (empty) return <p className="admin-state-panel" role="status">{empty}</p>
  return children
}

export function AdminDialog({ children, className, label, onClose, busy = false }) {
  const ref = useRef(null)
  useLayoutEffect(() => {
    const dialog = ref.current
    const opener = document.activeElement
    dialog.showModal()
    return () => {
      dialog.close()
      if (opener?.isConnected) opener.focus({ preventScroll: true })
    }
  }, [])
  return <dialog ref={ref} className={'admin-dialog ' + className} aria-label={label} data-lenis-prevent
    onCancel={event => { event.preventDefault(); if (!busy) onClose() }}
    onClick={event => {
      if (busy || event.target !== event.currentTarget) return
      const rect = event.currentTarget.getBoundingClientRect()
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose()
    }}>
    {children}
  </dialog>
}

export function AdminSession({ error, onRetry, onSignOut }) {
  const ar = document.documentElement.lang === 'ar'
  return <main className="club-operations admin-session"><StatePanel loading={!error} label={ar ? 'جارٍ التحقق من صلاحيات الإدارة…' : 'Checking administrator access…'} />
    {error && <section role="alert"><h1>{ar ? 'تعذّر فتح حساب الإدارة' : 'Unable to open the staff account'}</h1><p>{readableError(error, ar)}</p>
      <button className="admin-button primary" onClick={onRetry}>{ar ? 'إعادة المحاولة' : 'Try again'}</button>
      <button className="admin-button secondary" onClick={onSignOut}>{ar ? 'تسجيل الخروج' : 'Sign out'}</button></section>}
  </main>
}
