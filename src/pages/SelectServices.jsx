import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getActiveServices } from '../lib/services'
import { upsertCustomer } from '../lib/customers'
import { createReservation } from '../lib/reservations'
import { formatPhoneForDisplay } from '../lib/phone'

function SelectServices() {
  const location = useLocation()
  const navigate = useNavigate()
  const { fullName, phone, date, time } = location.state || {}

  const [services, setServices] = useState([])
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!fullName || !phone || !date || !time) {
      navigate('/', { replace: true })
      return
    }

    getActiveServices()
      .then(setServices)
      .catch(() => setError('Xidmətlər yüklənərkən xəta baş verdi'))
      .finally(() => setLoading(false))
  }, [fullName, phone, date, time, navigate])

  if (!fullName || !phone || !date || !time) {
    return null
  }

  function toggleService(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectedServices = services.filter((s) => selectedIds.has(s.id))
  const totalPrice = selectedServices.reduce((sum, s) => sum + Number(s.price), 0)

  async function handleConfirm() {
    if (selectedServices.length === 0) {
      setError('Ən azı bir xidmət seçin')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const customer = await upsertCustomer({ fullName, phone })
      const reservation = await createReservation({
        customerId: customer.id,
        date,
        time,
        services: selectedServices,
      })

      navigate('/rezerv/tesdiq', {
        state: {
          reservationId: reservation.id,
          fullName,
          phone,
          date,
          time,
          services: selectedServices,
          totalPrice,
        },
      })
    } catch {
      setError('Rezerv yaradılarkən xəta baş verdi, yenidən cəhd edin')
      setSubmitting(false)
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-1">Xidmət seçimi</h1>
      <p className="text-sm text-gray-500 mb-4">
        {fullName} · {formatPhoneForDisplay(phone)}
      </p>

      {loading ? (
        <p className="text-gray-500">Yüklənir...</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {services.length === 0 && (
            <p className="p-4 text-gray-500 text-sm">
              Aktiv xidmət tapılmadı. "Xidmətlərim" bölməsindən xidmət əlavə edin.
            </p>
          )}
          {services.map((service) => (
            <label
              key={service.id}
              className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
            >
              <span className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedIds.has(service.id)}
                  onChange={() => toggleService(service.id)}
                  className="h-4 w-4"
                />
                <span className="text-gray-900">{service.name}</span>
              </span>
              <span className="text-gray-500 text-sm">{service.price} AZN</span>
            </label>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-red-500 mt-3">{error}</p>}

      <div className="mt-4 flex items-center justify-between bg-white rounded-xl border border-gray-200 p-4">
        <span className="font-medium text-gray-700">Ümumi</span>
        <span className="text-lg font-bold text-gray-900">{totalPrice} AZN</span>
      </div>

      <button
        onClick={handleConfirm}
        disabled={submitting}
        className="w-full mt-4 rounded-lg bg-gray-900 text-white font-medium py-2.5 hover:bg-gray-800 disabled:opacity-50"
      >
        {submitting ? 'Göndərilir...' : 'Təsdiqlə'}
      </button>
    </div>
  )
}

export default SelectServices
