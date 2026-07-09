import { useEffect, useState } from 'react'
import { normalizePhone, isValidPhone, formatPhoneForDisplay } from '../lib/phone'

/**
 * `value` və `onChange` normalize edilmiş formatdadır (994XXXXXXXXX və ya '').
 * İstifadəçi istənilən formatda yaza bilər (0501234567, 501234567, +994...),
 * daxili olaraq normalize edilir.
 */
function PhoneInput({ value, onChange, label = 'Telefon nömrəsi', required = false }) {
  const [rawValue, setRawValue] = useState(value ? formatPhoneForDisplay(value) : '')
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    if (value && normalizePhone(rawValue) !== value) {
      setRawValue(formatPhoneForDisplay(value))
    }
    if (!value) {
      setRawValue('')
    }
    // Yalnız xaricdən (parent) `value` sıfırlandıqda sinxronizasiya edilir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const normalized = normalizePhone(rawValue)
  const showError = touched && rawValue.trim() !== '' && !isValidPhone(normalized)

  function handleChange(e) {
    const next = e.target.value
    setRawValue(next)
    onChange(normalizePhone(next) || '')
  }

  function handleBlur() {
    setTouched(true)
    if (isValidPhone(normalized)) {
      setRawValue(formatPhoneForDisplay(normalized))
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type="tel"
        inputMode="tel"
        placeholder="050 123 45 67"
        value={rawValue}
        onChange={handleChange}
        onBlur={handleBlur}
        className={`w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 ${
          showError
            ? 'border-red-400 focus:ring-red-300'
            : 'border-gray-300 focus:ring-gray-400'
        }`}
      />
      {showError && (
        <p className="mt-1 text-sm text-red-500">
          Düzgün Azərbaycan mobil nömrəsi daxil edin (məs. 050 123 45 67)
        </p>
      )}
    </div>
  )
}

export default PhoneInput
