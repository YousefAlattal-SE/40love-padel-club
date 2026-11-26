export default function AuthBootstrapNotice({ locale, error, onRetry, onSignOut, member = false }) {
  const ar = locale === 'ar'
  const Wrapper = member ? 'div' : 'main'
  return (
    <Wrapper className={member ? 'member-auth-notice' : 'auth-bg-page'} dir={ar ? 'rtl' : 'ltr'}>
      <section className={member ? 'member-title' : 'auth auth-form auth-bootstrap-notice'} role="alert">
        <h1>{ar ? 'تعذّر إعداد الحساب' : 'Account setup could not finish'}</h1>
        <p className="muted">{error || (ar ? 'تعذّر الاتصال بخدمة الحسابات.' : 'The account service could not be reached.')}</p>
        <p className="muted">{ar ? 'حاول مرة أخرى، أو سجّل الخروج ثم تواصل مع النادي إذا استمرت المشكلة.' : 'Try again, or sign out and contact the club if the problem continues.'}</p>
        <button className="primary" type="button" onClick={onRetry}>{ar ? 'حاول مرة أخرى' : 'Try again'}</button>
        <button className="link" type="button" onClick={onSignOut}>{ar ? 'تسجيل الخروج' : 'Sign out'}</button>
      </section>
    </Wrapper>
  )
}
