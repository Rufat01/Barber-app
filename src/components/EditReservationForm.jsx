import { useEffect, useState } from 'react'
import DatePicker from './DatePicker'
import { getActiveServices } from '../lib/services'
import { getWorkingHours } from '../lib/barbershop'
import { generateTimeSlots } from '../lib/timeSlots'
import { getTakenTimes, updateReservation } from '../lib/reservations'
import { todayIsoDate, nowTimeString } from '../lib/date'
import Skeleton from './Skeleton'

/**
 * `reservation` PostgREST-dən gələn tam obyektdir (bax RESERVATION_SELECT).
 * `onSaved(totalPrice, selectedServices)` uğurlu yadda saxlamadan sonra çağırılır.
 */
function EditReservationForm({ reservation, onSaved, onCancel }) {
  const [date, setDate] = useState(reservation.date)
  const [time, setTime] = useState(reservation.time.slice(0, 5))
  const [services, setServices] = useState([])
  const [selectedIds, setSelectedIds] = useState(
    new Set(reservation.reservation_services.map((rs) => rs.service.id)),
  )
  const [timeSlots, setTimeSlots] = useState([])
  const [takenTimes, setTakenTimes] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([getActiveServices(), getWorkingHours()])
      .then(([activeServices, hours]) => {
        const merged = [...activeServices]
        for (const rs of reservation.reservation_services) {
          if (!merged.some((s) => s.id === rs.service.id)) {
            merged.push({ id: rs.service.id, name: rs.service.name, price: rs.price_at_booking })
          }
        }
        setServices(merged)
        setTimeSlots(generateTimeSlots(hours.openingTime, hours.closingTime, hours.slotIntervalMinutes))
      })
      .catch(() => setError('Məlumatlar yüklənərkən xəta baş verdi'))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    getTakenTimes(date, reservation.id)
      .then((times) => setTakenTimes(new Set(times)))
      .catch(() => {})
  }, [date, reservation.id])

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
  const isToday = date === todayIsoDate()
  const currentTime = nowTimeString()

  async function handleSave() {
    if (!time) {
      setError('Saat seçin')
      return
    }
    if (selectedServices.length === 0) {
      setError('Ən azı bir xidmət seçin')
      return
    }

    setSaving(true)
    setError('')
    try {
      await updateReservation(reservation.id, { date, time, services: selectedServices })
      onSaved(totalPrice, selectedServices, date, time)
    } catch (err) {
      setError(
        err.message === 'SLOT_TAKEN'
          ? 'Bu tarix və saat üçün artıq rezerv var. Başqa saat seçin.'
          : 'Yadda saxlanılarkən xəta baş verdi',
      )
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-3 bg-gray-50 rounded-lg space-y-3">
        <div>
          <Skeleton className="h-3 w-10 mb-1" />
          <Skeleton className="h-9 w-full" />
        </div>
        <div>
          <Skeleton className="h-3 w-10 mb-1" />
          <div className="grid grid-cols-4 gap-1.5 p-1.5 border border-gray-200 rounded-lg bg-white">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        </div>
        <div>
          <Skeleton className="h-3 w-16 mb-1" />
          <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-10" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-3 bg-gray-50 rounded-lg space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Tarix</label>
        <DatePicker
          value={date}
          onChange={(nextDate) => {
            setDate(nextDate)
            setTime('')
          }}
          minDate={todayIsoDate()}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Saat</label>
        <div className="grid grid-cols-4 gap-1.5 max-h-40 overflow-y-auto p-1.5 border border-gray-200 rounded-lg bg-white">
          {timeSlots.map((slot) => {
            const isPast = isToday && slot < currentTime
            const isDisabled = takenTimes.has(slot) || isPast
            const isSelected = time === slot
            return (
              <button
                key={slot}
                type="button"
                disabled={isDisabled}
                onClick={() => setTime(slot)}
                className={`rounded-lg px-1.5 py-1 text-xs font-medium border ${
                  isDisabled
                    ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed line-through'
                    : isSelected
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                }`}
              >
                {slot}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Xidmətlər</label>
        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
          {services.map((service) => (
            <label key={service.id} className="flex items-center justify-between p-2 cursor-pointer">
              <span className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedIds.has(service.id)}
                  onChange={() => toggleService(service.id)}
                  className="h-4 w-4"
                />
                <span className="text-sm text-gray-900">{service.name}</span>
              </span>
              <span className="text-xs text-gray-500">{service.price} AZN</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between text-sm font-medium">
        <span className="text-gray-700">Ümumi</span>
        <span className="text-gray-900">{totalPrice} AZN</span>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex-1 rounded-lg bg-gray-900 text-white text-sm font-medium py-2 hover:bg-gray-800 disabled:opacity-50"
        >
          {saving ? 'Yadda saxlanılır...' : 'Yadda saxla'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-300 text-gray-700 text-sm font-medium px-4 py-2 hover:bg-gray-100"
        >
          İmtina
        </button>
      </div>
    </div>
  )
}

export default EditReservationForm
