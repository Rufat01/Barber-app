import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { getActiveServices } from '../../lib/services'
import { createPublicReservation, notifyBarberOfNewReservation } from '../../lib/publicBooking'
import { formatPhoneForDisplay } from '../../lib/phone'
import Skeleton from '../../components/Skeleton'

/**
 * `SelectServices.jsx`-in qonaq versiyası. Xidmətin müddəti burada göstərilmir/
 * dəyişdirilmir — müddət yalnız berberin idarə etdiyi bir şeydir (bax
 * `create_public_reservation` RPC-si, `services.duration_minutes`-i özü
 * server tərəfdə istifadə edir, client-dən heç bir müddət qəbul etmir).
 */
function PublicSelectServices() {
  const location = useLocation()
  const navigate = useNavigate()
  const { slug } = useParams()
  const { barbershop, fullName, phone, date, time } = location.state || {}

  const [services, setServices] = useState([])
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!barbershop || !fullName || !phone || !date || !time) {
      navigate(`/b/${slug}`, { replace: true })
      return
    }

    getActiveServices(barbershop.id)
      .then(setServices)
      .catch(() => setError('Xidmətlər yüklənərkən xəta baş verdi'))
      .finally(() => setLoading(false))
  }, [barbershop, fullName, phone, date, time, navigate, slug])

  if (!barbershop || !fullName || !phone || !date || !time) {
    return null
  }

  function toggleService(service) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(service.id)) {
        next.delete(service.id)
      } else {
        next.add(service.id)
      }
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
      const reservation = await createPublicReservation({
        barbershopId: barbershop.id,
        fullName,
        phone,
        date,
        time,
        services: selectedServices,
      })

      notifyBarberOfNewReservation({ barbershopId: barbershop.id, customerName: fullName, time }).catch(() => {})

      navigate(`/b/${slug}/tesdiq`, {
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
    } catch (err) {
      setError(
        err.message === 'SLOT_TAKEN'
          ? 'Bu tarix və saat üçün artıq rezerv var. Başqa saat seçin.'
          : 'Rezerv yaradılarkən xəta baş verdi, yenidən cəhd edin',
      )
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-gray-900 mb-1">Xidmət seçimi</h1>
      <p className="text-sm text-gray-500 mb-4">
        {fullName} · {formatPhoneForDisplay(phone)}
      </p>

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-3">
              <span className="flex items-center gap-3">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-32" />
              </span>
              <Skeleton className="h-4 w-10" />
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {services.length === 0 && <p className="p-4 text-gray-500 text-sm">Aktiv xidmət tapılmadı.</p>}
          {services.map((service) => {
            const isSelected = selectedIds.has(service.id)
            return (
              <div key={service.id} className="p-3">
                <label className="flex items-center justify-between cursor-pointer hover:bg-gray-50">
                  <span className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleService(service)}
                      className="h-4 w-4"
                    />
                    <span className="text-gray-900">{service.name}</span>
                  </span>
                  <span className="text-gray-500 text-sm">{service.price} AZN</span>
                </label>
              </div>
            )
          })}
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

export default PublicSelectServices
