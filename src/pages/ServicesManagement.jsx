import { useEffect, useState } from 'react'
import { getAllServices, createService, updateService, setServiceActive } from '../lib/services'
import { getWorkingHours, updateWorkingHours } from '../lib/barbershop'

const INTERVAL_OPTIONS = [10, 15, 20, 30, 45, 60]

function WorkingHoursForm() {
  const [openingTime, setOpeningTime] = useState('13:00')
  const [closingTime, setClosingTime] = useState('00:00')
  const [slotIntervalMinutes, setSlotIntervalMinutes] = useState(15)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    getWorkingHours()
      .then((hours) => {
        setOpeningTime(hours.openingTime)
        setClosingTime(hours.closingTime)
        setSlotIntervalMinutes(hours.slotIntervalMinutes)
      })
      .catch(() => setError('İş saatları yüklənərkən xəta baş verdi'))
      .finally(() => setLoading(false))
  }, [])

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      await updateWorkingHours({ openingTime, closingTime, slotIntervalMinutes })
      setSaved(true)
    } catch {
      setError('Yadda saxlanılarkən xəta baş verdi')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="mb-4 bg-white rounded-xl border border-gray-200 p-4">
        <p className="text-gray-500 text-sm">Yüklənir...</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSave} className="mb-4 bg-white rounded-xl border border-gray-200 p-4 space-y-3">
      <h2 className="text-sm font-bold text-gray-900">İş saatları</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Başlanğıc</label>
          <input
            type="time"
            value={openingTime}
            onChange={(e) => setOpeningTime(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Son saat</label>
          <input
            type="time"
            value={closingTime}
            onChange={(e) => setClosingTime(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">İnterval</label>
          <select
            value={slotIntervalMinutes}
            onChange={(e) => setSlotIntervalMinutes(Number(e.target.value))}
            className="w-full rounded-lg border border-gray-300 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            {INTERVAL_OPTIONS.map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes} dəq
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="text-xs text-gray-400">
        Son saat başlanğıcdan kiçik və ya bərabərdirsə (məs. 13:00 – 00:00), gecə yarısından sonra bitən iş
        günü kimi qəbul olunur.
      </p>

      {error && <p className="text-sm text-red-500">{error}</p>}
      {saved && <p className="text-sm text-green-600">Yadda saxlanıldı</p>}

      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-gray-900 text-white text-sm font-medium px-4 py-2 hover:bg-gray-800 disabled:opacity-50"
      >
        {saving ? 'Yadda saxlanılır...' : 'Yadda saxla'}
      </button>
    </form>
  )
}

function ServiceForm({ initialValues, onSubmit, onCancel, submitLabel }) {
  const [name, setName] = useState(initialValues?.name || '')
  const [price, setPrice] = useState(initialValues?.price ?? '')
  const [durationMinutes, setDurationMinutes] = useState(initialValues?.duration_minutes ?? '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Xidmətin adını daxil edin')
      return
    }
    const numericPrice = Number(price)
    if (!price || Number.isNaN(numericPrice) || numericPrice < 0) {
      setError('Düzgün qiymət daxil edin')
      return
    }

    setSaving(true)
    setError('')
    try {
      await onSubmit({
        name: name.trim(),
        price: numericPrice,
        durationMinutes: durationMinutes ? Number(durationMinutes) : null,
      })
    } catch {
      setError('Yadda saxlanılarkən xəta baş verdi')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-3 bg-gray-50 rounded-lg">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Ad</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Qiymət (AZN)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Müddət (dəq, opsional)</label>
          <input
            type="number"
            min="1"
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 rounded-lg bg-gray-900 text-white text-sm font-medium py-2 hover:bg-gray-800 disabled:opacity-50"
        >
          {saving ? 'Yadda saxlanılır...' : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-300 text-gray-700 text-sm font-medium px-4 py-2 hover:bg-gray-100"
        >
          İmtina
        </button>
      </div>
    </form>
  )
}

function ServicesManagement() {
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState(null)

  function load() {
    getAllServices()
      .then(setServices)
      .catch(() => setError('Xidmətlər yüklənərkən xəta baş verdi'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  async function handleCreate(values) {
    await createService(values)
    setCreating(false)
    load()
  }

  async function handleUpdate(id, values) {
    await updateService(id, values)
    setEditingId(null)
    load()
  }

  async function handleToggleActive(service) {
    await setServiceActive(service.id, !service.is_active)
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">Xidmətlərim</h1>
        {!creating && (
          <button
            onClick={() => setCreating(true)}
            className="rounded-lg bg-gray-900 text-white text-sm font-medium px-3 py-2 hover:bg-gray-800"
          >
            + Yeni xidmət
          </button>
        )}
      </div>

      <WorkingHoursForm />

      {creating && (
        <div className="mb-4">
          <ServiceForm
            submitLabel="Əlavə et"
            onSubmit={handleCreate}
            onCancel={() => setCreating(false)}
          />
        </div>
      )}

      {loading && <p className="text-gray-500">Yüklənir...</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {services.map((service) =>
          editingId === service.id ? (
            <div key={service.id} className="p-3">
              <ServiceForm
                initialValues={service}
                submitLabel="Yadda saxla"
                onSubmit={(values) => handleUpdate(service.id, values)}
                onCancel={() => setEditingId(null)}
              />
            </div>
          ) : (
            <div key={service.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-gray-900 wrap-break-word">{service.name}</span>
                  {!service.is_active && (
                    <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                      Deaktiv
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-500">
                  {service.price} AZN
                  {service.duration_minutes ? ` · ${service.duration_minutes} dəq` : ''}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => setEditingId(service.id)}
                  className="text-sm text-gray-600 hover:text-gray-900 px-2 py-1"
                >
                  Redaktə
                </button>
                <button
                  onClick={() => handleToggleActive(service)}
                  className="text-sm text-gray-600 hover:text-gray-900 px-2 py-1"
                >
                  {service.is_active ? 'Deaktiv et' : 'Aktiv et'}
                </button>
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  )
}

export default ServicesManagement
