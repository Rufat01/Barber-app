import { useEffect } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { formatPhoneForDisplay } from '../../lib/phone'
import { formatDateAzFull } from '../../lib/date'

/**
 * `Confirmation.jsx`-in qonaq versiyası. Qonaq rezervləri "pending" statusu ilə
 * yaradılır (bax `create_public_reservation` RPC-si) — berber təsdiqləməyənə qədər
 * müştəriyə heç bir WhatsApp göndərmə seçimi göstərilmir, sadəcə gözləmə mesajı.
 */
function PublicConfirmation() {
  const location = useLocation()
  const navigate = useNavigate()
  const { slug } = useParams()
  const { reservationId, fullName, phone, date, time, services, totalPrice } = location.state || {}

  useEffect(() => {
    if (!reservationId) {
      navigate(`/b/${slug}`, { replace: true })
    }
  }, [reservationId, navigate, slug])

  if (!reservationId) {
    return null
  }

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <div className="flex flex-col items-center text-center py-6">
        <div className="flex items-center justify-center w-24 h-24 rounded-full bg-amber-50">
          <svg className="w-14 h-14" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2">
            <circle cx="12" cy="12" r="9" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 3" />
          </svg>
        </div>
        <h1 className="mt-4 text-2xl font-bold text-gray-900">Sorğunuz göndərildi</h1>
        <p className="mt-1 text-sm text-gray-500">
          {fullName} · {formatPhoneForDisplay(phone)}
        </p>
      </div>

      <div className="flex items-center justify-center gap-2 rounded-xl bg-amber-50 text-amber-700 text-sm font-medium py-3">
        Berberin təsdiqi gözlənilir
      </div>

      <div className="mt-4 bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-gray-500">Tarix</span>
          <span className="text-sm font-medium text-gray-900">{formatDateAzFull(date)}</span>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-gray-500">Saat</span>
          <span className="text-sm font-medium text-gray-900">{time}</span>
        </div>
        <div className="px-4 py-3 space-y-1.5">
          {services.map((s) => (
            <div key={s.id} className="flex items-center justify-between text-sm">
              <span className="text-gray-700">{s.name}</span>
              <span className="text-gray-500">{s.price} AZN</span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
          <span className="text-sm font-semibold text-gray-700">Ümumi</span>
          <span className="text-lg font-bold text-gray-900">{totalPrice} AZN</span>
        </div>
      </div>
    </div>
  )
}

export default PublicConfirmation
