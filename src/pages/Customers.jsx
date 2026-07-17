import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCustomers, upsertCustomer } from '../lib/customers'
import PhoneInput from '../components/PhoneInput'
import { formatPhoneForDisplay } from '../lib/phone'
import { useAuth } from '../components/AuthProvider'
import Skeleton from '../components/Skeleton'

function AddCustomerForm({ barbershopId, onCreated, onCancel }) {
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!fullName.trim()) {
      setError('Müştərinin adını daxil edin')
      return
    }
    if (!phone) {
      setError('Düzgün telefon nömrəsi daxil edin')
      return
    }

    setSaving(true)
    setError('')
    try {
      const customer = await upsertCustomer(barbershopId, { fullName: fullName.trim(), phone })
      onCreated(customer)
    } catch {
      setError('Yadda saxlanılarkən xəta baş verdi')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-3 bg-gray-50 rounded-lg mb-4">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Ad Soyad</label>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Ad Soyad"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
        />
      </div>

      <PhoneInput value={phone} onChange={setPhone} required />

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 rounded-lg bg-gray-900 text-white text-sm font-medium py-2 hover:bg-gray-800 disabled:opacity-50"
        >
          {saving ? 'Yadda saxlanılır...' : 'Əlavə et'}
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

function Customers() {
  const navigate = useNavigate()
  const { barbershop } = useAuth()
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)

  function load() {
    getCustomers(barbershop.id)
      .then(setCustomers)
      .catch(() => setError('Müştərilər yüklənərkən xəta baş verdi'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barbershop.id])

  const filtered = useMemo(() => {
    const trimmed = query.trim().toLowerCase()
    if (!trimmed) return customers
    const digits = trimmed.replace(/\D/g, '')
    return customers.filter(
      (c) => c.full_name.toLowerCase().includes(trimmed) || (digits && c.phone.includes(digits)),
    )
  }, [customers, query])

  function handleCreated() {
    setCreating(false)
    load()
  }

  function handleBook(customer) {
    navigate('/', {
      state: { presetCustomer: { id: customer.id, full_name: customer.full_name, phone: customer.phone } },
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">Müştərilərim</h1>
        {!creating && (
          <button
            onClick={() => setCreating(true)}
            className="rounded-lg bg-gray-900 text-white text-sm font-medium px-3 py-2 hover:bg-gray-800"
          >
            + Müştəri əlavə et
          </button>
        )}
      </div>

      {creating && (
        <AddCustomerForm barbershopId={barbershop.id} onCreated={handleCreated} onCancel={() => setCreating(false)} />
      )}

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Ad və ya nömrə ilə axtar"
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-gray-400"
      />

      {error && <p className="text-sm text-red-500 mb-3">{error}</p>}

      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {loading &&
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-3">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          ))}

        {!loading && filtered.length === 0 && (
          <p className="p-4 text-gray-500 text-sm">
            {customers.length === 0 ? 'Hələ müştəri yoxdur.' : 'Bu axtarışa uyğun müştəri tapılmadı.'}
          </p>
        )}

        {!loading &&
          filtered.map((customer) => (
            <button
              key={customer.id}
              onClick={() => handleBook(customer)}
              className="w-full flex items-center justify-between gap-2 p-3 text-left hover:bg-gray-50"
            >
              <div className="min-w-0">
                <div className="text-gray-900 font-medium truncate">{customer.full_name}</div>
                <div className="text-xs text-gray-500">{formatPhoneForDisplay(customer.phone)}</div>
              </div>
              <span className="shrink-0 text-xs px-3 py-1.5 rounded-lg bg-gray-900 text-white font-medium">
                Rezerv et
              </span>
            </button>
          ))}
      </div>
    </div>
  )
}

export default Customers
