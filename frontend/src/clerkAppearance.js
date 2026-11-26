// Clerk appearance for every authentication screen, matched to the club tokens in
// club-foundation.css (light and dark). Only visual properties are set here: password
// rules, verification requirements and other policies stay in the Clerk Dashboard.

const PALETTE = {
  light: {
    surface: '#fcfaf2', input: '#fcfaf2', ink: '#172e29', muted: '#4f6259', line: '#c6cbbd', control: '#728075',
    accent: '#1b514a', onAccent: '#faf8ed', link: '#1b514a', error: '#923f32', success: '#285a39', warning: '#73501e',
  },
  dark: {
    surface: '#142522', input: '#192f2b', ink: '#f3f2e4', muted: '#bccac0', line: '#455b52', control: '#80978c',
    accent: '#c1d48d', onAccent: '#152e27', link: '#d8e69e', error: '#f1aa95', success: '#b4d7a8', warning: '#e9c38a',
  },
}

export function clerkAppearance(theme, variant = 'member') {
  const c = theme === 'dark' ? PALETTE.dark : PALETTE.light
  const control = { minHeight: '48px', borderRadius: '3px' }

  const appearance = {
    // Both the current and the earlier Clerk variable names are given; unknown names are ignored.
    variables: {
      colorPrimary: c.accent,
      colorPrimaryForeground: c.onAccent,
      colorTextOnPrimaryBackground: c.onAccent,
      colorBackground: c.surface,
      colorForeground: c.ink,
      colorText: c.ink,
      colorMutedForeground: c.muted,
      colorTextSecondary: c.muted,
      colorInput: c.input,
      colorInputBackground: c.input,
      colorInputForeground: c.ink,
      colorInputText: c.ink,
      colorNeutral: c.ink,
      colorDanger: c.error,
      colorSuccess: c.success,
      colorWarning: c.warning,
      colorBorder: c.control,
      borderRadius: '3px',
      fontFamily: 'var(--club-sans)',
      fontSize: '1rem',
    },
    elements: {
      rootBox: { width: '100%' },
      cardBox: { width: '100%', boxShadow: 'none', border: '0' },
      card: { width: '100%', backgroundColor: 'transparent', color: c.ink, boxShadow: 'none', border: '0', padding: '0', gap: '22px' },
      header: { gap: '6px', textAlign: 'start' },
      headerTitle: { color: c.ink, fontSize: '1.35rem', fontWeight: '650' },
      headerSubtitle: { color: c.muted },
      main: { gap: '20px' },
      form: { gap: '18px' },
      formFieldLabel: { color: c.ink, fontWeight: '650' },
      formFieldInput: { ...control, backgroundColor: c.input, color: c.ink, borderColor: c.control },
      formFieldInputShowPasswordButton: { color: c.muted, minWidth: '44px', minHeight: '44px' },
      formFieldAction: { color: c.link, fontWeight: '600' },
      formFieldHintText: { color: c.muted },
      formFieldErrorText: { color: c.error, fontWeight: '600', fontSize: '.9rem' },
      formFieldSuccessText: { color: c.success },
      formFieldWarningText: { color: c.warning },
      formButtonPrimary: {
        ...control,
        backgroundColor: c.accent,
        color: c.onAccent,
        fontWeight: '700',
        fontSize: '1rem',
        textTransform: 'none',
        boxShadow: 'none',
      },
      formButtonReset: { color: c.link },
      socialButtonsBlockButton: { ...control, backgroundColor: c.input, color: c.ink, borderColor: c.control, fontWeight: '650' },
      alternativeMethodsBlockButton: { ...control, backgroundColor: c.input, color: c.ink, borderColor: c.control },
      dividerLine: { backgroundColor: c.line },
      dividerText: { color: c.muted },
      identityPreview: { backgroundColor: c.input, borderColor: c.line },
      identityPreviewText: { color: c.ink },
      identityPreviewEditButton: { color: c.link },
      otpCodeFieldInput: { minHeight: '48px', color: c.ink, borderColor: c.control },
      formResendCodeLink: { color: c.link, fontWeight: '600' },
      backLink: { color: c.link },
      alert: { backgroundColor: c.surface, borderColor: c.error, color: c.error },
      alertText: { color: c.error },
      footer: { background: 'transparent' },
      footerActionText: { color: c.muted },
      footerActionLink: { color: c.link, fontWeight: '650' },
    },
  }

  if (variant === 'admin') {
    // Staff accounts are provisioned by the club, so the sign-up prompt is hidden.
    appearance.elements.footerAction = { display: 'none' }
  }

  return appearance
}
