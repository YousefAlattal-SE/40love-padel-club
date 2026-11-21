const arabicDigitOffset = '٠'.codePointAt(0)
const easternArabicDigitOffset = '۰'.codePointAt(0)

export function normalizeContactPhone(value) {
  const ascii = Array.from(String(value || '').trim(), (character) => {
    const codePoint = character.codePointAt(0)
    if (codePoint >= arabicDigitOffset && codePoint <= arabicDigitOffset + 9) {
      return String(codePoint - arabicDigitOffset)
    }
    if (codePoint >= easternArabicDigitOffset && codePoint <= easternArabicDigitOffset + 9) {
      return String(codePoint - easternArabicDigitOffset)
    }
    return character
  }).join('')

  if (!ascii || ascii.length > 40 || !/^\+?[0-9][0-9\s().-]*$/.test(ascii)) return ''
  const digits = ascii.replace(/\D/g, '')
  if (digits.length < 8 || digits.length > 15) return ''
  return `${ascii.startsWith('+') ? '+' : ''}${digits}`
}
