import { useEffect, useState } from 'react'
import CustomerPicker from './CustomerPicker'
import { getActiveServices } from '../lib/services'
import { upsertCustomer } from '../lib/customers'
import { createReservation } from '../lib/reservations'
import Skeleton from './Skeleton'

/**
 * Cədvəldəki boş bir saat slotundan sürətli rezerv yaratmaq üçün. `date`/`time` sabitdir
 * (klikləmiş slota uyğun), yalnız müştəri və xidmətlər daxil edilir.
 */
function QuickAddReservationForm({ date, time, onCreated, onCancel }) {
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [services, setServices] = useState([])
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getActiveServices()
      .then(setServices)
      .catch(() => setError('Xidmətlər yüklənərkən xəta baş verdi'))
      .finally(() => setLoading(false))
  }, [])

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

  async function handleSubmit() {
    if (!fullName.trim()) {
      setError('Müştərinin adını daxil edin')
      return
    }
    if (!phone) {
      setError('Düzgün telefon nömrəsi daxil edin')
      return
    }
    if (selectedServices.length === 0) {
      setError('Ən azı bir xidmət seçin')
      return
    }

    setSaving(true)
    setError('')
    try {
      const customer = await upsertCustomer({ fullName: fullName.trim(), phone })
      const reservation = await createReservation({
        customerId: customer.id,
        date,
        time,
        services: selectedServices,
      })
      onCreated(reservation, fullName.trim(), phone, selectedServices, totalPrice)
    } catch (err) {
      setError(
        err.message === 'SLOT_TAKEN'
          ? 'Bu saat üçün artıq rezerv var.'
          : 'Rezerv yaradılarkən xəta baş verdi',
      )
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-3 bg-gray-50 rounded-lg space-y-3">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-10" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-3 bg-gray-50 rounded-lg space-y-3">
      <p className="text-xs font-medium text-gray-500">{time} üçün yeni rezerv</p>

      <CustomerPicker
        fullName={fullName}
        phone={phone}
        onChange={({ fullName: nextName, phone: nextPhone }) => {
          setFullName(nextName)
          setPhone(nextPhone)
        }}
      />

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
          onClick={handleSubmit}
          disabled={saving}
          className="flex-1 rounded-lg bg-gray-900 text-white text-sm font-medium py-2 hover:bg-gray-800 disabled:opacity-50"
        >
          {saving ? 'Əlavə edilir...' : 'Əlavə et'}
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

export default QuickAddReservationForm
