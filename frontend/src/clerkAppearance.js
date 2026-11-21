export function clerkAppearance(theme, variant = 'default') {
  const dark = theme === 'dark'
  const appearance = {
    variables: {
      colorPrimary: dark ? '#A5C94F' : '#075E6B',
      colorBackground: dark ? '#0D7E8D' : '#FFFFFF',
      colorText: dark ? '#F3F7F1' : '#17343A',
      colorTextSecondary: dark ? '#AAB9B6' : '#5D6B6E',
      colorInputBackground: dark ? '#0E1B20' : '#FFFFFF',
      colorInputText: dark ? '#F3F7F1' : '#17343A',
      colorInputTextSecondary: dark ? '#AAB9B6' : '#5D6B6E',
      colorNeutral: dark ? '#D7E2DF' : '#17343A',
      borderRadius: '12px',
      fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif",
    },
    elements: {
      rootBox: { width: '100%' },
      cardBox: { width: '100%', boxShadow: 'none' },
      card: {
        width: '100%',
        backgroundColor: dark ? '#0D7E8D' : '#FFFFFF',
        color: dark ? '#F3F7F1' : '#17343A',
        boxShadow: 'none',
        border: '0',
        padding: '0',
      },
      headerTitle: { display: 'none' },
      headerSubtitle: { display: 'none' },
      formFieldLabel: { color: dark ? '#E5EFEC' : '#17343A' },
      formFieldInput: {
        backgroundColor: dark ? '#075E6B' : '#FFFFFF',
        color: dark ? '#F3F7F1' : '#17343A',
        borderColor: dark ? 'rgba(255,255,255,.2)' : '#D4DFD0',
      },
      formFieldInputShowPasswordButton: { color: dark ? '#D7E2DF' : '#425B60' },
      formFieldAction: { color: dark ? '#D2E882' : '#075E6B' },
      formButtonPrimary: { fontWeight: '700', color: dark ? '#183319' : '#FFFFFF' },
      socialButtonsBlockButton: {
        backgroundColor: dark ? '#075E6B' : '#FFFFFF',
        color: dark ? '#F3F7F1' : '#17343A',
        borderColor: dark ? 'rgba(255,255,255,.2)' : '#D4DFD0',
        fontWeight: '650',
      },
      dividerLine: { backgroundColor: dark ? 'rgba(255,255,255,.18)' : '#D4DFD0' },
      dividerText: { color: dark ? '#C3D1CE' : '#5D6B6E' },
      footer: { background: 'transparent' },
      footerActionText: { color: dark ? '#D7E2DF' : '#425B60' },
      footerActionLink: { color: dark ? '#D2E882' : '#075E6B' },
    },
  }

  if (variant === 'admin') {
    appearance.variables.colorPrimary = dark ? '#B8D65A' : '#A5C94F'
    appearance.variables.colorBackground = dark ? '#0A5964' : '#FFFFFF'
    appearance.variables.colorInputTextSecondary = dark ? '#C5D5D1' : '#65777A'
    appearance.elements.card.backgroundColor = dark ? '#0A5964' : '#FFFFFF'
    appearance.elements.formFieldLabel = {
      color: dark ? '#E5EFEC' : '#17343A',
      fontSize: '13px',
      fontWeight: '650',
    }
    appearance.elements.formFieldInput = {
      ...appearance.elements.formFieldInput,
      minHeight: '54px',
      padding: '13px 15px',
      borderRadius: '12px',
      fontSize: '15px',
      borderColor: dark ? 'rgba(255,255,255,.24)' : '#C7D5D2',
    }
    appearance.elements.formButtonPrimary = {
      ...appearance.elements.formButtonPrimary,
      minHeight: '54px',
      borderRadius: '12px',
      fontSize: '14px',
      fontWeight: '750',
      color: '#17343A',
    }
    appearance.elements.socialButtonsBlockButton = {
      ...appearance.elements.socialButtonsBlockButton,
      minHeight: '52px',
      borderRadius: '12px',
      fontSize: '14px',
      width: '100%',
      boxSizing: 'border-box',
      position: 'relative',
      justifyContent: 'center',
      borderColor: dark ? 'rgba(255,255,255,.24)' : '#C7D5D2',
    }
    appearance.elements.formFieldAction = {
      ...appearance.elements.formFieldAction,
      fontSize: '13px',
    }
    appearance.elements.footerAction = { display: 'none' }
    appearance.elements.footerActionText = { display: 'none' }
    appearance.elements.footerActionLink = { display: 'none' }
  }

  if (variant === 'member') {
    const memberSurface = dark ? '#162A25' : '#FFFFFF'
    const memberInput = dark ? '#203A33' : '#FBFCF8'
    const memberInk = dark ? '#F1F4EB' : '#172B24'
    const memberMuted = dark ? '#B5C2B7' : '#5E7066'
    const memberLine = dark ? 'rgba(234,243,231,.16)' : 'rgba(23,54,42,.18)'

    appearance.variables.colorPrimary = dark ? '#B4D65B' : '#A7CA4B'
    appearance.variables.colorBackground = memberSurface
    appearance.variables.colorText = memberInk
    appearance.variables.colorTextSecondary = memberMuted
    appearance.variables.colorInputBackground = memberInput
    appearance.variables.colorInputText = memberInk
    appearance.variables.colorInputTextSecondary = memberMuted
    appearance.variables.colorNeutral = memberInk
    appearance.elements.card.backgroundColor = memberSurface
    appearance.elements.card.color = memberInk
    appearance.elements.formFieldLabel = { color: memberInk, fontWeight: '650' }
    appearance.elements.formFieldInput = {
      ...appearance.elements.formFieldInput,
      backgroundColor: memberInput,
      color: memberInk,
      borderColor: memberLine,
    }
    appearance.elements.formFieldInputShowPasswordButton = { color: memberMuted }
    appearance.elements.formFieldAction = { color: dark ? '#D2E882' : '#14645F' }
    appearance.elements.formButtonPrimary = { ...appearance.elements.formButtonPrimary, color: '#203021' }
    appearance.elements.socialButtonsBlockButton = {
      ...appearance.elements.socialButtonsBlockButton,
      backgroundColor: memberInput,
      color: memberInk,
      borderColor: memberLine,
    }
    appearance.elements.dividerLine = { backgroundColor: memberLine }
    appearance.elements.dividerText = { color: memberMuted }
    appearance.elements.footerActionText = { color: memberMuted }
    appearance.elements.footerActionLink = { color: dark ? '#D2E882' : '#14645F' }
  }

  return appearance
}
