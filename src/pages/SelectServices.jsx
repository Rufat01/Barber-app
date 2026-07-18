import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getActiveServices } from '../lib/services'
import { upsertCustomer } from '../lib/customers'
import { createReservation } from '../lib/reservations'
import { formatPhoneForDisplay } from '../lib/phone'
import { DURATION_STEP_MINUTES, MIN_DURATION_MINUTES } from '../lib/durations'
import { useAuth } from '../components/AuthProvider'
import Skeleton from '../components/Skeleton'
import { clearReservationDraft, loadReservationDraft, saveReservationDraft } from '../lib/reservationDraft'

function SelectServices() {
  const location = useLocation()
  const navigate = useNavigate()
  const { barbershop } = useAuth()
  // Bu addıma birbaşa keçid (məs. səhifə yenilənməsi) location.state-i itirir —
  // belə halda yarımçıq qalmış qaralamadan (draft) davam edilir.
  const draft = loadReservationDraft(barbershop.id)
  const { fullName, phone, date, time } = location.state?.fullName ? location.state : draft || {}

  const [services, setServices] = useState([])
  const [selectedIds, setSelectedIds] = useState(new Set(draft?.selectedServiceIds || []))
  const [durations, setDurations] = useState(draft?.durations || {})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!fullName || !phone || !date || !time) {
      navigate('/', { replace: true })
      return
    }

    getActiveServices(barbershop.id)
      .then(setServices)
      .catch(() => setError('Xidmətlər yüklənərkən xəta baş verdi'))
      .finally(() => setLoading(false))
  }, [fullName, phone, date, time, navigate, barbershop.id])

  useEffect(() => {
    if (!fullName || !phone || !date || !time) return
    saveReservationDraft(barbershop.id, {
      fullName,
      phone,
      date,
      time,
      selectedServiceIds: Array.from(selectedIds),
      durations,
    })
  }, [barbershop.id, fullName, phone, date, time, selectedIds, durations])

  if (!fullName || !phone || !date || !time) {
    return null
  }

  function toggleService(service) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(service.id)) {
        next.delete(service.id)
      } else {
        next.add(service.id)
        setDurations((prevDurations) =>
          prevDurations[service.id] !== undefined
            ? prevDurations
            : { ...prevDurations, [service.id]: service.duration_minutes || MIN_DURATION_MINUTES },
        )
      }
      return next
    })
  }

  function adjustDuration(serviceId, delta) {
    setDurations((prev) => {
      const current = prev[serviceId] || MIN_DURATION_MINUTES
      const next = Math.max(MIN_DURATION_MINUTES, current + delta)
      return { ...prev, [serviceId]: next }
    })
  }

  const selectedServices = services
    .filter((s) => selectedIds.has(s.id))
    .map((s) => ({ ...s, duration_minutes: durations[s.id] || s.duration_minutes || MIN_DURATION_MINUTES }))
  const totalPrice = selectedServices.reduce((sum, s) => sum + Number(s.price), 0)

  async function handleConfirm() {
    if (selectedServices.length === 0) {
      setError('Ən azı bir xidmət seçin')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const customer = await upsertCustomer(barbershop.id, { fullName, phone })
      const reservation = await createReservation({
        barbershopId: barbershop.id,
        customerId: customer.id,
        date,
        time,
        services: selectedServices,
      })

      clearReservationDraft(barbershop.id)
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
    <div>
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
          {services.length === 0 && (
            <p className="p-4 text-gray-500 text-sm">
              Aktiv xidmət tapılmadı. "Xidmətlərim" bölməsindən xidmət əlavə edin.
            </p>
          )}
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

                {isSelected && (
                  <div className="mt-2 ml-7 flex items-center gap-2">
                    <span className="text-xs text-gray-400">Xidmətin müddəti:</span>
                    <button
                      type="button"
                      onClick={() => adjustDuration(service.id, -DURATION_STEP_MINUTES)}
                      className="w-6 h-6 flex items-center justify-center rounded border border-gray-300 text-gray-600 hover:bg-gray-100 text-sm leading-none"
                    >
                      −
                    </button>
                    <span className="text-xs font-medium text-gray-900 w-16 text-center">
                      {durations[service.id] || service.duration_minutes || MIN_DURATION_MINUTES} dəq
                    </span>
                    <button
                      type="button"
                      onClick={() => adjustDuration(service.id, DURATION_STEP_MINUTES)}
                      className="w-6 h-6 flex items-center justify-center rounded border border-gray-300 text-gray-600 hover:bg-gray-100 text-sm leading-none"
                    >
                      +
                    </button>
                  </div>
                )}
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

export default SelectServices
