import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { buildReservationMessage, buildWaMeLink } from '../lib/whatsapp'
import { markWhatsappSent } from '../lib/reservations'
import { formatPhoneForDisplay } from '../lib/phone'
import { formatDateAzFull } from '../lib/date'

function Confirmation() {
  const location = useLocation()
  const navigate = useNavigate()
  const { reservationId, fullName, phone, date, time, services, totalPrice } = location.state || {}
  const [sent, setSent] = useState(false)

  useEffect(() => {
    if (!reservationId) {
      navigate('/', { replace: true })
    }
  }, [reservationId, navigate])

  if (!reservationId) {
    return null
  }

  const message = buildReservationMessage({ customerName: fullName, date, time, services })
  const waLink = buildWaMeLink(phone, message)

  async function handleWhatsappClick() {
    setSent(true)
    try {
      await markWhatsappSent(reservationId, { status: 'sent' })
    } catch {
      // WhatsApp linki açılıb, statusun DB-də yenilənməməsi kritik deyil.
    }
  }

  if (sent) {
    return (
      <div className="max-w-md mx-auto">
        <div className="checkmark-badge flex flex-col items-center text-center py-6">
          <div className="flex items-center justify-center w-24 h-24 rounded-full bg-green-50">
            <svg className="w-14 h-14" viewBox="0 0 52 52">
              <circle
                className="checkmark-circle"
                cx="26"
                cy="26"
                r="24"
                fill="none"
                stroke="#16a34a"
                strokeWidth="3"
              />
              <path
                className="checkmark-check"
                fill="none"
                stroke="#16a34a"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14 27l7 7 16-16"
              />
            </svg>
          </div>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">Rezerv təsdiqləndi</h1>
          <p className="mt-1 text-sm text-gray-500">
            {fullName} · {formatPhoneForDisplay(phone)}
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 rounded-xl bg-green-50 text-green-700 text-sm font-medium py-3">
          <svg
            className="w-4 h-4 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
          WhatsApp mesajı göndərildi
        </div>

        <button
          onClick={() => navigate('/')}
          className="mt-3 w-full rounded-xl border border-gray-300 text-gray-700 font-medium py-3 hover:bg-gray-50 transition"
        >
          Yeni rezerv
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center py-6">
        <h1 className="text-xl font-bold text-gray-900">Rezerv yaradıldı</h1>
        <p className="mt-1 text-sm text-gray-500">
          {fullName} · {formatPhoneForDisplay(phone)}
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-100 overflow-hidden">
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

      <a
        href={waLink}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleWhatsappClick}
        className="mt-5 flex items-center justify-center gap-2 w-full rounded-xl bg-[#25D366] text-white font-semibold py-3 shadow-sm hover:brightness-95 transition"
      >
        <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.38 5.07L2 22l5.06-1.35A9.94 9.94 0 0 0 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1.6 0-3.09-.45-4.36-1.23l-.31-.18-3.01.8.8-2.93-.2-.31A7.94 7.94 0 0 1 4 12c0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8-8 8z" />
        </svg>
        WhatsApp ilə göndər
      </a>

      <button
        onClick={() => navigate('/')}
        className="mt-3 w-full rounded-xl border border-gray-300 text-gray-700 font-medium py-3 hover:bg-gray-50 transition"
      >
        Yeni rezerv
      </button>
    </div>
  )
}

export default Confirmation
