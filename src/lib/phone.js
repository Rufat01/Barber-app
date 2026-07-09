// Azərbaycan mobil nömrələri üçün normalize/format/validate helper-ləri.
//
// DB formatı (normalize edilmiş):  994501234567   ("+" işarəsi yoxdur)
// Göstərmə formatı:                +994 50 123 45 67
// wa.me və WhatsApp Cloud API da normalize edilmiş formatı gözləyir.

export const VALID_PREFIXES = ['50', '51', '55', '70', '77', '99', '10']

/**
 * İstifadəçi inputunu (məs. "0501234567", "+994 50 123 45 67", "994501234567")
 * normalize edilmiş "994XXXXXXXXX" formatına çevirir.
 * Etibarsız/natamam inputda null qaytarır.
 */
export function normalizePhone(input) {
  if (!input) return null

  const digits = String(input).replace(/\D/g, '')
  let nineDigits = null

  if (digits.startsWith('994') && digits.length === 12) {
    nineDigits = digits.slice(3)
  } else if (digits.startsWith('0') && digits.length === 10) {
    nineDigits = digits.slice(1)
  } else if (digits.length === 9) {
    nineDigits = digits
  } else {
    return null
  }

  const prefix = nineDigits.slice(0, 2)
  if (!VALID_PREFIXES.includes(prefix)) return null

  return `994${nineDigits}`
}

/** Normalize edilmiş "994XXXXXXXXX" nömrənin düzgünlüyünü yoxlayır. */
export function isValidPhone(normalized) {
  if (!normalized) return false
  return /^994(50|51|55|70|77|99|10)[0-9]{7}$/.test(normalized)
}

/** Normalize edilmiş nömrəni göstərmə formatına çevirir: +994 50 123 45 67 */
export function formatPhoneForDisplay(normalized) {
  if (!isValidPhone(normalized)) return normalized ?? ''

  const nineDigits = normalized.slice(3)
  const prefix = nineDigits.slice(0, 2)
  const part1 = nineDigits.slice(2, 5)
  const part2 = nineDigits.slice(5, 7)
  const part3 = nineDigits.slice(7, 9)

  return `+994 ${prefix} ${part1} ${part2} ${part3}`
}
