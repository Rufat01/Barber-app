import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PhoneInput from '../components/PhoneInput'

function todayIsoDate() {
  const now = new Date()
  const offset = now.getTimezoneOffset()
  return new Date(now.getTime() - offset * 60 * 1000).toISOString().slice(0, 10)
}

function NewReservation() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [date, setDate] = useState(todayIsoDate())
  const [time, setTime] = useState('')
  const [error, setError] = useState('')

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

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tarix <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Saat <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
          </div>
        </div>

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
