import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import DatePicker from '../../components/DatePicker'
import PhoneInput from '../../components/PhoneInput'
import { todayIsoDate, formatDateAzFull, nowTimeString } from '../../lib/date'
import { generateTimeSlots } from '../../lib/timeSlots'
import { getPublicTakenTimes } from '../../lib/publicBooking'
import { getBarbershopBySlug, getWorkingHours } from '../../lib/barbershop'

/**
 * Müştərinin özünün (hesabsız) rezerv edə bildiyi ictimai səhifə — `NewReservation.jsx`-in
 * qonaq versiyası. `barbershop` sessiyadan deyil, URL-dəki `slug`-dan yüklənir.
 */
function PublicBooking() {
  const navigate = useNavigate()
  const { slug } = useParams()
  const [barbershop, setBarbershop] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [date, setDate] = useState(todayIsoDate())
  const [time, setTime] = useState('')
  const [timeSlots, setTimeSlots] = useState([])
  const [takenTimes, setTakenTimes] = useState(new Set())
  const [error, setError] = useState('')

  useEffect(() => {
    getBarbershopBySlug(slug)
      .then(setBarbershop)
      .catch(() => setNotFound(true))
  }, [slug])

  useEffect(() => {
    if (!barbershop) return
    getWorkingHours(barbershop.id)
      .then(({ openingTime, closingTime, slotIntervalMinutes }) =>
        setTimeSlots(generateTimeSlots(openingTime, closingTime, slotIntervalMinutes)),
      )
      .catch(() => setTimeSlots(generateTimeSlots()))
  }, [barbershop])

  const loadTakenTimes = useCallback(() => {
    if (!barbershop) return
    getPublicTakenTimes(barbershop.id, date, { timeSlots })
      .then((times) => setTakenTimes(new Set(times)))
      .catch(() => {})
  }, [barbershop, date, timeSlots])

  useEffect(() => {
    loadTakenTimes()
  }, [loadTakenTimes])

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
      setError('Adınızı daxil edin')
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
    navigate(`/b/${slug}/xidmetler`, {
      state: { barbershop, fullName: fullName.trim(), phone, date, time },
    })
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-4">
        <p className="text-gray-500 text-sm">Bu linkə uyğun salon tapılmadı.</p>
      </div>
    )
  }

  if (!barbershop) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">Yüklənir...</div>
  }

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-gray-900 mb-1">{barbershop.name}</h1>
      <p className="text-sm text-gray-500 mb-4">Rezerv üçün məlumatlarınızı doldurun</p>

      <form onSubmit={handleSubmit} className="space-y-4 bg-white p-4 rounded-xl border border-gray-200">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Adınız <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Ad Soyad"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400"
          />
        </div>

        <PhoneInput value={phone} onChange={setPhone} required />

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
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 max-h-56 overflow-y-auto p-1.5 border border-gray-200 rounded-lg">
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
            Seçilmiş vaxt: <strong>{formatDateAzFull(date)}, saat {time}</strong>
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

export default PublicBooking
