import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import CustomerPicker from '../components/CustomerPicker'
import DatePicker from '../components/DatePicker'
import { useAuth } from '../components/AuthProvider'
import { todayIsoDate, formatDateAzFull, nowTimeString } from '../lib/date'
import { generateTimeSlots } from '../lib/timeSlots'
import { getTakenTimes, subscribeToReservations } from '../lib/reservations'
import { getWorkingHours } from '../lib/barbershop'
import { loadReservationDraft, saveReservationDraft } from '../lib/reservationDraft'

function NewReservation() {
  const navigate = useNavigate()
  const location = useLocation()
  const { barbershop } = useAuth()
  const presetCustomer = location.state?.presetCustomer || null
  const draft = loadReservationDraft(barbershop.id)
  const initialCustomerForPicker =
    presetCustomer || (draft?.fullName ? { full_name: draft.fullName, phone: draft.phone } : null)
  const [fullName, setFullName] = useState(presetCustomer?.full_name ?? draft?.fullName ?? '')
  const [phone, setPhone] = useState(presetCustomer?.phone ?? draft?.phone ?? '')
  const [date, setDate] = useState(draft?.date || todayIsoDate())
  const [time, setTime] = useState(draft?.time || '')
  const [timeSlots, setTimeSlots] = useState([])
  const [takenTimes, setTakenTimes] = useState(new Set())
  const [error, setError] = useState('')

  // Səhifə yenidən mount olunmadan (məs. "Yeni rezerv" naviqasiya linkinə təkrar
  // klikləmə) hər təzə gəlişdə müştəri sahələrini yükləyir — presetCustomer varsa
  // ondan, yoxdursa yarımçıq qalmış localStorage qaralamasından (draft), belə ki
  // rezervasiya tamamlanmayınca doldurulmuş məlumat itməsin.
  useEffect(() => {
    const freshDraft = loadReservationDraft(barbershop.id)
    setFullName(presetCustomer?.full_name ?? freshDraft?.fullName ?? '')
    setPhone(presetCustomer?.phone ?? freshDraft?.phone ?? '')
    setDate(freshDraft?.date || todayIsoDate())
    setTime(freshDraft?.time || '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key])

  // Doldurulan sahələri rezervasiya tamamlanana qədər saxlamaq üçün hər dəyişiklikdə
  // qaralamanı yeniləyir.
  useEffect(() => {
    saveReservationDraft(barbershop.id, { fullName, phone, date, time })
  }, [barbershop.id, fullName, phone, date, time])

  useEffect(() => {
    getWorkingHours(barbershop.id)
      .then(({ openingTime, closingTime, slotIntervalMinutes }) =>
        setTimeSlots(generateTimeSlots(openingTime, closingTime, slotIntervalMinutes)),
      )
      .catch(() => setTimeSlots(generateTimeSlots()))
  }, [barbershop.id])

  const loadTakenTimes = useCallback(() => {
    getTakenTimes(barbershop.id, date, { timeSlots })
      .then((times) => setTakenTimes(new Set(times)))
      .catch(() => {})
  }, [barbershop.id, date, timeSlots])

  useEffect(() => {
    loadTakenTimes()
    const unsubscribe = subscribeToReservations(barbershop.id, date, loadTakenTimes)
    return unsubscribe
  }, [barbershop.id, date, loadTakenTimes])

  const isToday = date === todayIsoDate()
  const currentTime = nowTimeString()

  useEffect(() => {
    if (!time) return
    if (takenTimes.has(time)) {
      setTime('')
      setError('Seçdiyiniz saat artıq tutulub, başqa saat seçin')
    } else if (isToday && time < currentTime) {
      setTime('')
      setError('Seçdiyiniz saat artıq keçib, başqa saat seçin')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [takenTimes])

  function handleSubmit(e) {
    e.preventDefault()

    if (!fullName.trim()) {
      setError('Müştərinin adını daxil edin')
      return
    }
    if (!phone) {
      setError('Düzgün telefon nömrəsi daxil edin')
      return
    }
    if (!date || !time) {
      setError('Tarix və saat seçin')
      return
    }

    setError('')
    navigate('/rezerv/xidmetler', {
      state: { fullName: fullName.trim(), phone, date, time },
    })
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-4">Yeni rezerv</h1>
      <form onSubmit={handleSubmit} className="space-y-4 bg-white p-4 rounded-xl border border-gray-200">
        <CustomerPicker
          key={location.key}
          barbershopId={barbershop.id}
          fullName={fullName}
          phone={phone}
          initialCustomer={initialCustomerForPicker}
          onChange={({ fullName: nextName, phone: nextPhone }) => {
            setFullName(nextName)
            setPhone(nextPhone)
          }}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tarix <span className="text-red-500">*</span>
          </label>
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
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Saat <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-1.5 max-h-56 sm:max-h-64 overflow-y-auto p-1.5 border border-gray-200 rounded-lg">
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
                  className={`rounded-lg px-2 py-1.5 text-sm font-medium border ${
                    isDisabled
                      ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed line-through'
                      : isSelected
                        ? 'bg-gray-900 text-white border-gray-900'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {slot}
                </button>
              )
            })}
          </div>
        </div>

        {date && time && (
          <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-sm text-blue-700">
            Seçilmiş vaxt: <strong>{formatDateAzFull(date)}, saat {time}</strong> — düzgün olduğunu yoxlayın
          </div>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          className="w-full rounded-lg bg-gray-900 text-white font-medium py-2.5 hover:bg-gray-800"
        >
          Davam et
        </button>
      </form>
    </div>
  )
}

export default NewReservation
