import { useEffect, useRef, useState } from 'react'
import PhoneInput from './PhoneInput'
import { searchCustomers } from '../lib/customers'
import { formatPhoneForDisplay } from '../lib/phone'

/**
 * Rezerv formlarında müştəri seçimi üçün: əvvəlcə mövcud müştərilər arasında axtarır
 * (belə ki, təkrar müştəri üçün ad/telefon yenidən əl ilə yazılmasın), tapılmasa
 * "Yeni müştəri" rejiminə keçib adi ad/telefon inputlarını göstərir.
 * `fullName`/`phone` və `onChange({ fullName, phone, mode, query })` valideynlə idarə olunur —
 * `mode`/`query` yalnız valideyndə formu olduğu kimi (redaktə vəziyyətində) bərpa etmək üçün ötürülür.
 * `initialCustomer` verilsə (məs. "Müştərilərim" səhifəsindən keçiddə və ya əvvəllər siyahıdan seçilmiş
 * müştərinin bərpası), seçilmiş kimi başlayır. `initialMode`/`initialQuery` isə komponentin əvvəlki
 * redaktə vəziyyətini (məs. əl ilə yazılan ad/nömrə) olduğu kimi bərpa etmək üçündür.
 */
function CustomerPicker({
  barbershopId,
  fullName,
  phone,
  onChange,
  initialCustomer = null,
  initialMode = 'search',
  initialQuery = '',
}) {
  const [mode, setMode] = useState(initialMode) // 'search' | 'manual'
  const [query, setQuery] = useState(initialQuery || initialCustomer?.full_name || '')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState(initialMode === 'manual' ? null : initialCustomer)
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  useEffect(() => {
    if (mode !== 'search' || selected) return
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setResults([])
      return
    }
    setSearching(true)
    const timeout = setTimeout(() => {
      searchCustomers(barbershopId, trimmed)
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setSearching(false))
    }, 250)
    return () => clearTimeout(timeout)
  }, [query, mode, selected, barbershopId])

  // Seçilməmiş axtarış mətni özü heç bir yerdə saxlanmır, ona görə hər dəyişiklikdə
  // valideynə ötürülür ki, formu tərk edib geri qayıdanda yazılan mətn itməsin.
  useEffect(() => {
    if (mode !== 'search' || selected) return
    onChange({ fullName: '', phone: '', mode: 'search', query })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, mode, selected])

  function handleSelect(customer) {
    setSelected(customer)
    setQuery(customer.full_name)
    setOpen(false)
    onChange({ fullName: customer.full_name, phone: customer.phone, mode: 'search', query: customer.full_name })
  }

  function handleClearSelection() {
    setSelected(null)
    setQuery('')
    setResults([])
    onChange({ fullName: '', phone: '', mode: 'search', query: '' })
  }

  function switchToManual() {
    setMode('manual')
    setOpen(false)
    onChange({ fullName: query.trim(), phone: '', mode: 'manual' })
  }

  function switchToSearch() {
    setMode('search')
    setSelected(null)
    setQuery('')
    onChange({ fullName: '', phone: '', mode: 'search', query: '' })
  }

  if (mode === 'manual') {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">
            Müştərinin adı <span className="text-red-500">*</span>
          </label>
          <button
            type="button"
            onClick={switchToSearch}
            className="text-xs text-gray-500 hover:text-gray-900 underline"
          >
            Mövcud müştəridən seç
          </button>
        </div>
        <input
          type="text"
          value={fullName}
          onChange={(e) => onChange({ fullName: e.target.value, phone, mode: 'manual' })}
          placeholder="Ad Soyad"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400"
        />
        <PhoneInput value={phone} onChange={(next) => onChange({ fullName, phone: next, mode: 'manual' })} required />
      </div>
    )
  }

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Müştəri <span className="text-red-500">*</span>
      </label>

      {selected ? (
        <div className="flex items-center justify-between rounded-lg border border-gray-300 bg-gray-50 px-3 py-2">
          <div className="min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">{selected.full_name}</div>
            <div className="text-xs text-gray-500">{formatPhoneForDisplay(selected.phone)}</div>
          </div>
          <button
            type="button"
            onClick={handleClearSelection}
            className="shrink-0 text-xs text-gray-500 hover:text-gray-900 underline ml-2"
          >
            Dəyiş
          </button>
        </div>
      ) : (
        <>
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            placeholder="Ad və ya nömrə ilə axtar"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400"
          />

          {open && query.trim().length >= 2 && (
            <div className="absolute z-10 mt-1 w-full bg-white rounded-lg border border-gray-200 shadow-lg max-h-56 overflow-y-auto">
              {searching && <p className="px-3 py-2 text-sm text-gray-400">Axtarılır...</p>}
              {!searching && results.length === 0 && (
                <button
                  type="button"
                  onClick={switchToManual}
                  className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
                >
                  Nəticə tapılmadı — <span className="font-medium text-gray-900">"{query.trim()}"</span> adlı yeni
                  müştəri əlavə et
                </button>
              )}
              {!searching &&
                results.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelect(c)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center justify-between gap-2"
                  >
                    <span className="text-sm text-gray-900 truncate">{c.full_name}</span>
                    <span className="shrink-0 text-xs text-gray-500">{formatPhoneForDisplay(c.phone)}</span>
                  </button>
                ))}
            </div>
          )}
        </>
      )}

      {!selected && (
        <button
          type="button"
          onClick={switchToManual}
          className="mt-1.5 text-xs text-gray-500 hover:text-gray-900 underline"
        >
          + Yeni müştəri əlavə et
        </button>
      )}
    </div>
  )
}

export default CustomerPicker
