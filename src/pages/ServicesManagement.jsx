import { useEffect, useState } from 'react'
import { getAllServices, createService, updateService, setServiceActive } from '../lib/services'
import { getWorkingHours, updateWorkingHours, updateBarbershopProfile } from '../lib/barbershop'
import { isPushSupported, isIosNonStandalone, getExistingPushSubscription, subscribeBarberToPush } from '../lib/push'
import { useAuth } from '../components/AuthProvider'
import PhoneInput from '../components/PhoneInput'
import Skeleton from '../components/Skeleton'

const INTERVAL_OPTIONS = [10, 15, 20, 30, 45, 60]

function NotificationsCard({ barbershopId }) {
  const [status, setStatus] = useState('checking') // checking | unsupported | denied | subscribed | unsubscribed
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const needsHomeScreenInstall = isIosNonStandalone()

  useEffect(() => {
    if (needsHomeScreenInstall) {
      setStatus('needs_install')
      return
    }
    if (!isPushSupported()) {
      setStatus('unsupported')
      return
    }
    if (Notification.permission === 'denied') {
      setStatus('denied')
      return
    }
    getExistingPushSubscription().then((subscription) => {
      setStatus(subscription ? 'subscribed' : 'unsubscribed')
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleEnable() {
    setLoading(true)
    setError('')
    try {
      await subscribeBarberToPush(barbershopId)
      setStatus('subscribed')
    } catch (err) {
      setStatus(err.message === 'PERMISSION_DENIED' ? 'denied' : status)
      if (err.message !== 'PERMISSION_DENIED') {
        setError('Bildirimlərə icazə verilərkən xəta baş verdi')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mb-4 bg-white rounded-xl border border-gray-200 p-4 space-y-3">
      <h2 className="text-sm font-bold text-gray-900">Bildirimlər</h2>
      <p className="text-xs text-gray-400">
        Yeni gözləyən rezerv sorğusu gələndə brauzerinizə bildiriş göndərilsin.
      </p>

      {status === 'needs_install' && (
        <p className="text-sm text-gray-600">
          iPhone-da bildirim almaq üçün: Safari-də <strong>Paylaş</strong> düyməsinə basıb{' '}
          <strong>"Ana ekrana əlavə et"</strong> seçin, sonra saytı ana ekrandan açıb bu düyməni yenidən sıxın.
        </p>
      )}
      {status === 'unsupported' && <p className="text-sm text-gray-500">Bu brauzer bildirimləri dəstəkləmir.</p>}
      {status === 'denied' && (
        <p className="text-sm text-red-500">
          Bildirimlərə icazə verilməyib. Brauzer ayarlarından bu sayt üçün icazəni dəyişə bilərsiniz.
        </p>
      )}
      {status === 'subscribed' && <p className="text-sm text-green-600">Bildirimlər aktivdir</p>}
      {status === 'unsubscribed' && (
        <button
          type="button"
          onClick={handleEnable}
          disabled={loading}
          className="rounded-lg bg-gray-900 text-white text-sm font-medium px-4 py-2 hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? 'Aktivləşdirilir...' : 'Bildirimlərə icazə ver'}
        </button>
      )}
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  )
}

function PublicBookingLink({ slug }) {
  const [copied, setCopied] = useState(false)
  const link = `${window.location.origin}/b/${slug}`

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard icazəsi olmaya bilər — istifadəçi linki əl ilə seçib kopyalaya bilər.
    }
  }

  return (
    <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
      <p className="text-xs font-medium text-gray-600 mb-1">Müştəriləriniz üçün rezerv linki</p>
      <div className="flex items-center gap-2">
        <input
          type="text"
          readOnly
          value={link}
          onFocus={(e) => e.target.select()}
          className="flex-1 min-w-0 rounded-lg border border-gray-300 px-2 py-1.5 text-xs text-gray-600 bg-white"
        />
        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 rounded-lg bg-gray-900 text-white text-xs font-medium px-3 py-1.5 hover:bg-gray-800"
        >
          {copied ? 'Kopyalandı' : 'Kopyala'}
        </button>
      </div>
    </div>
  )
}

function BarbershopProfileForm({ barbershop, onSaved }) {
  const [name, setName] = useState(barbershop.name || '')
  const [barberName, setBarberName] = useState(barbershop.barber_name || '')
  const [ownerPhone, setOwnerPhone] = useState(barbershop.owner_phone || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  async function handleSave(e) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Salonun adını daxil edin')
      return
    }
    if (!barberName.trim()) {
      setError('Öz adınızı daxil edin')
      return
    }
    if (!ownerPhone) {
      setError('Düzgün əlaqə nömrəsi daxil edin')
      return
    }

    setSaving(true)
    setError('')
    setSaved(false)
    try {
      await updateBarbershopProfile(barbershop.id, { name: name.trim(), barberName: barberName.trim(), ownerPhone })
      await onSaved()
      setSaved(true)
    } catch {
      setError('Yadda saxlanılarkən xəta baş verdi')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="mb-4 bg-white rounded-xl border border-gray-200 p-4 space-y-3">
      <h2 className="text-sm font-bold text-gray-900">Salon məlumatları</h2>
      <p className="text-xs text-gray-400">
        Bu məlumatlar müştəriyə göndərilən WhatsApp təsdiq mesajında görünür.
      </p>

      <PublicBookingLink slug={barbershop.slug} />

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Salonun adı</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Sizin adınız</label>
        <input
          type="text"
          value={barberName}
          onChange={(e) => setBarberName(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
        />
      </div>

      <PhoneInput value={ownerPhone} onChange={setOwnerPhone} label="Əlaqə nömrəniz" required />

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

function WorkingHoursForm({ barbershopId }) {
  const [openingTime, setOpeningTime] = useState('13:00')
  const [closingTime, setClosingTime] = useState('00:00')
  const [slotIntervalMinutes, setSlotIntervalMinutes] = useState(15)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    getWorkingHours(barbershopId)
      .then((hours) => {
        setOpeningTime(hours.openingTime)
        setClosingTime(hours.closingTime)
        setSlotIntervalMinutes(hours.slotIntervalMinutes)
      })
      .catch(() => setError('İş saatları yüklənərkən xəta baş verdi'))
      .finally(() => setLoading(false))
  }, [barbershopId])

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      await updateWorkingHours(barbershopId, { openingTime, closingTime, slotIntervalMinutes })
      setSaved(true)
    } catch {
      setError('Yadda saxlanılarkən xəta baş verdi')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="mb-4 bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <Skeleton className="h-4 w-24" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
        <Skeleton className="h-9 w-28" />
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
  const { barbershop, refreshBarbershop } = useAuth()
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState(null)

  function load() {
    getAllServices(barbershop.id)
      .then(setServices)
      .catch(() => setError('Xidmətlər yüklənərkən xəta baş verdi'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barbershop.id])

  async function handleCreate(values) {
    await createService(barbershop.id, values)
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

      <BarbershopProfileForm barbershop={barbershop} onSaved={refreshBarbershop} />
      <NotificationsCard barbershopId={barbershop.id} />
      <WorkingHoursForm barbershopId={barbershop.id} />

      {creating && (
        <div className="mb-4">
          <ServiceForm
            submitLabel="Əlavə et"
            onSubmit={handleCreate}
            onCancel={() => setCreating(false)}
          />
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {loading &&
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-3">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-4 w-14" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          ))}
        {!loading &&
          services.map((service) =>
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
