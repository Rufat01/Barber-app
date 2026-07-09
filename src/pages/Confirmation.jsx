import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { buildReservationMessage, buildWaMeLink } from '../lib/whatsapp'
import { markWhatsappSent } from '../lib/reservations'
import { formatPhoneForDisplay } from '../lib/phone'

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

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-1">Rezerv təsdiqləndi ✅</h1>
      <p className="text-sm text-gray-500 mb-4">
        {fullName} · {formatPhoneForDisplay(phone)}
      </p>

      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Tarix</span>
          <span className="text-gray-900">{date}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Saat</span>
          <span className="text-gray-900">{time}</span>
        </div>
        <div className="border-t border-gray-100 pt-2">
          {services.map((s) => (
            <div key={s.id} className="flex justify-between text-sm py-0.5">
              <span className="text-gray-700">{s.name}</span>
              <span className="text-gray-500">{s.price} AZN</span>
            </div>
          ))}
        </div>
        <div className="flex justify-between border-t border-gray-100 pt-2 font-medium">
          <span className="text-gray-700">Ümumi</span>
          <span className="text-gray-900">{totalPrice} AZN</span>
        </div>
      </div>

      <a
        href={waLink}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleWhatsappClick}
        className="mt-4 flex items-center justify-center gap-2 w-full rounded-lg bg-green-600 text-white font-medium py-2.5 hover:bg-green-700"
      >
        WhatsApp ilə göndər
      </a>
      {sent && <p className="mt-2 text-sm text-green-600 text-center">Göndərildi</p>}

      <button
        onClick={() => navigate('/')}
        className="mt-3 w-full rounded-lg border border-gray-300 text-gray-700 font-medium py-2.5 hover:bg-gray-50"
      >
        Yeni rezerv
      </button>
    </div>
  )
}

export default Confirmation
