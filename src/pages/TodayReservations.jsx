import { useCallback, useEffect, useState } from 'react'
import { getReservationsByDate, subscribeToReservations } from '../lib/reservations'
import { formatPhoneForDisplay } from '../lib/phone'

function todayIsoDate() {
  const now = new Date()
  const offset = now.getTimezoneOffset()
  return new Date(now.getTime() - offset * 60 * 1000).toISOString().slice(0, 10)
}

const STATUS_LABEL = {
  confirmed: 'Təsdiqlənib',
  cancelled: 'Ləğv edilib',
  completed: 'Tamamlanıb',
  no_show: 'Gəlmədi',
}

const WHATSAPP_STATUS_LABEL = {
  pending: 'WhatsApp göndərilməyib',
  sent: 'WhatsApp göndərildi',
  failed: 'WhatsApp xətası',
}

function TodayReservations() {
  const date = todayIsoDate()
  const [reservations, setReservations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    getReservationsByDate(date)
      .then(setReservations)
      .catch(() => setError('Rezervlər yüklənərkən xəta baş verdi'))
      .finally(() => setLoading(false))
  }, [date])

  useEffect(() => {
    load()
    const unsubscribe = subscribeToReservations(date, load)
    return unsubscribe
  }, [date, load])

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-4">Bugünkü rezervlər</h1>

      {loading && <p className="text-gray-500">Yüklənir...</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {!loading && reservations.length === 0 && (
        <p className="text-gray-500">Bu gün üçün rezerv yoxdur.</p>
      )}

      <div className="space-y-3">
        {reservations.map((r) => (
          <div key={r.id} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-gray-900">{r.time.slice(0, 5)}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                {STATUS_LABEL[r.status] || r.status}
              </span>
            </div>
            <div className="mt-1 text-sm text-gray-700">{r.customer?.full_name}</div>
            <div className="text-sm text-gray-500">{formatPhoneForDisplay(r.customer?.phone)}</div>
            <div className="mt-2 text-sm text-gray-600">
              {r.reservation_services.map((rs) => rs.service?.name).join(', ')}
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-gray-400">
                {WHATSAPP_STATUS_LABEL[r.whatsapp_status] || ''}
              </span>
              <span className="font-medium text-gray-900">{r.total_price} AZN</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default TodayReservations
