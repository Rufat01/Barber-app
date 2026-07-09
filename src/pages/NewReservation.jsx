import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PhoneInput from '../components/PhoneInput'
import { todayIsoDate, formatDateAzFull } from '../lib/date'
import { generateTimeSlots } from '../lib/timeSlots'
import { getTakenTimes, subscribeToReservations } from '../lib/reservations'

const TIME_SLOTS = generateTimeSlots()

function NewReservation() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [date, setDate] = useState(todayIsoDate())
  const [time, setTime] = useState('')
  const [takenTimes, setTakenTimes] = useState(new Set())
  const [error, setError] = useState('')

  const loadTakenTimes = useCallback(() => {
    getTakenTimes(date)
      .then((times) => setTakenTimes(new Set(times)))
      .catch(() => {})
  }, [date])

  useEffect(() => {
    loadTakenTimes()
    const unsubscribe = subscribeToReservations(date, loadTakenTimes)
    return unsubscribe
  }, [date, loadTakenTimes])

  useEffect(() => {
    if (time && takenTimes.has(time)) {
      setTime('')
      setError('Seçdiyiniz saat artıq tutulub, başqa saat seçin')
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
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Müştərinin adı <span className="text-red-500">*</span>
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
          <input
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value)
              setTime('')
            }}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Saat <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-4 gap-1.5 max-h-56 overflow-y-auto p-1.5 border border-gray-200 rounded-lg">
            {TIME_SLOTS.map((slot) => {
              const isTaken = takenTimes.has(slot)
              const isSelected = time === slot
              return (
                <button
                  key={slot}
                  type="button"
                  disabled={isTaken}
                  onClick={() => setTime(slot)}
                  className={`rounded-lg px-2 py-1.5 text-sm font-medium border ${
                    isTaken
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
