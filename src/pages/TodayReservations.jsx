import { useCallback, useEffect, useState } from 'react'
import {
  getReservationsByDate,
  subscribeToReservations,
  cancelReservation,
  deleteReservation,
  markWhatsappSent,
} from '../lib/reservations'
import { formatPhoneForDisplay } from '../lib/phone'
import { todayIsoDate } from '../lib/date'
import DatePicker from '../components/DatePicker'
import EditReservationForm from '../components/EditReservationForm'
import { buildReservationMessage, buildWaMeLink } from '../lib/whatsapp'

const STATUS_LABEL = {
  confirmed: 'Təsdiqlənib',
  cancelled: 'Ləğv edilib',
  completed: 'Tamamlanıb',
  no_show: 'Gəlmədi',
}

const WHATSAPP_STATUS_LABEL = {
  pending: 'WhatsApp göndərilməyib',
  sent: 'WhatsApp göndərildi',
  failed: 'WhatsApp xətası',
}

function TodayReservations() {
  const today = todayIsoDate()
  const [selectedDate, setSelectedDate] = useState(today)
  const [nameQuery, setNameQuery] = useState('')
  const [reservations, setReservations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cancellingId, setCancellingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [awaitingAction, setAwaitingAction] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    getReservationsByDate(selectedDate)
      .then(setReservations)
      .catch(() => setError('Rezervlər yüklənərkən xəta baş verdi'))
      .finally(() => setLoading(false))
  }, [selectedDate])

  useEffect(() => {
    load()
    const unsubscribe = subscribeToReservations(selectedDate, load)
    return unsubscribe
  }, [selectedDate, load])

  const filteredReservations = reservations.filter((r) => {
    if (!nameQuery.trim()) return true
    return r.customer?.full_name?.toLowerCase().includes(nameQuery.trim().toLowerCase())
  })

  async function handleCancel(reservation) {
    const confirmed = window.confirm(
      `${reservation.customer?.full_name} — ${reservation.time.slice(0, 5)} rezervini ləğv etmək istədiyinizə əminsiniz?`,
    )
    if (!confirmed) return

    setCancellingId(reservation.id)
    try {
      await cancelReservation(reservation.id)
      load()
    } catch {
      setError('Rezerv ləğv edilərkən xəta baş verdi')
    } finally {
      setCancellingId(null)
    }
  }

  async function handleDelete(reservation) {
    const confirmed = window.confirm(
      `${reservation.customer?.full_name} — ${reservation.time.slice(0, 5)} rezervini bazadan tam silmək istədiyinizə əminsiniz? Bu geri qaytarıla bilməz.`,
    )
    if (!confirmed) return

    setDeletingId(reservation.id)
    try {
      await deleteReservation(reservation.id)
      load()
    } catch {
      setError('Rezerv silinərkən xəta baş verdi')
    } finally {
      setDeletingId(null)
    }
  }

  function handleEditSaved(reservation, totalPrice, selectedServices, date, time) {
    setEditingId(null)
    setAwaitingAction({
      reservationId: reservation.id,
      fullName: reservation.customer?.full_name,
      phone: reservation.customer?.phone,
      services: selectedServices,
      totalPrice,
      date,
      time,
    })
    load()
  }

  async function handleResendWhatsapp() {
    if (!awaitingAction) return
    const message = buildReservationMessage({
      customerName: awaitingAction.fullName,
      date: awaitingAction.date,
      time: awaitingAction.time,
      services: awaitingAction.services,
    })
    const waLink = buildWaMeLink(awaitingAction.phone, message)
    window.open(waLink, '_blank', 'noopener,noreferrer')
    try {
      await markWhatsappSent(awaitingAction.reservationId, { status: 'sent' })
    } catch {
      // WhatsApp linki açılıb, statusun DB-də yenilənməməsi kritik deyil.
    }
    setAwaitingAction(null)
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-4">Rezervlər</h1>

      {awaitingAction && (
        <div className="mb-4 bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-3">
          <p className="text-sm text-blue-800">
            <strong>{awaitingAction.fullName}</strong> üçün rezerv yeniləndi. Növbəti addımı seçin:
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleResendWhatsapp}
              className="flex-1 rounded-lg bg-[#25D366] text-white text-sm font-semibold py-2 hover:brightness-95"
            >
              WhatsApp'dan göndər
            </button>
            <button
              onClick={() => setAwaitingAction(null)}
              className="rounded-lg border border-blue-200 text-blue-700 text-sm font-medium px-3 py-2 hover:bg-blue-100"
            >
              Bağla
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-2">
        <input
          type="text"
          value={nameQuery}
          onChange={(e) => setNameQuery(e.target.value)}
          placeholder="Ad Soyad axtar"
          className="w-full sm:flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
        />
        <div className="flex gap-3">
          <div className="flex-1 sm:w-48 sm:flex-none">
            <DatePicker value={selectedDate} onChange={setSelectedDate} />
          </div>
          {selectedDate !== today && (
            <button
              onClick={() => setSelectedDate(today)}
              className="shrink-0 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium px-3 py-2 hover:bg-gray-100"
            >
              Bugün
            </button>
          )}
        </div>
      </div>

      {loading && <p className="text-gray-500">Yüklənir...</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {!loading && filteredReservations.length === 0 && (
        <p className="text-gray-500">
          {nameQuery.trim() ? 'Bu axtarışa uyğun rezerv tapılmadı.' : 'Seçilmiş tarix üçün rezerv yoxdur.'}
        </p>
      )}

      <div className="space-y-3">
        {filteredReservations.map((r) =>
          editingId === r.id ? (
            <div key={r.id} className="bg-white rounded-xl border border-gray-200">
              <EditReservationForm
                reservation={r}
                onSaved={(totalPrice, selectedServices, date, time) =>
                  handleEditSaved(r, totalPrice, selectedServices, date, time)
                }
                onCancel={() => setEditingId(null)}
              />
            </div>
          ) : (
            <div key={r.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-900">{r.time.slice(0, 5)}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                  {STATUS_LABEL[r.status] || r.status}
                </span>
              </div>
              <div className="mt-1 text-sm text-gray-700">{r.customer?.full_name}</div>
              <div className="text-sm text-gray-500">{formatPhoneForDisplay(r.customer?.phone)}</div>
              <div className="mt-2 text-sm text-gray-600">
                {r.reservation_services.map((rs) => rs.service?.name).join(', ')}
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  {WHATSAPP_STATUS_LABEL[r.whatsapp_status] || ''}
                </span>
                <span className="font-medium text-gray-900">{r.total_price} AZN</span>
              </div>

              {r.status === 'confirmed' && (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => setEditingId(r.id)}
                    className="flex-1 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium py-1.5 hover:bg-gray-50"
                  >
                    Redaktə et
                  </button>
                  <button
                    onClick={() => handleCancel(r)}
                    disabled={cancellingId === r.id}
                    className="flex-1 rounded-lg border border-red-200 text-red-600 text-sm font-medium py-1.5 hover:bg-red-50 disabled:opacity-50"
                  >
                    {cancellingId === r.id ? 'Ləğv edilir...' : 'Ləğv et'}
                  </button>
                </div>
              )}

              {r.status === 'cancelled' && (
                <button
                  onClick={() => handleDelete(r)}
                  disabled={deletingId === r.id}
                  className="mt-3 w-full rounded-lg border border-red-200 text-red-600 text-sm font-medium py-1.5 hover:bg-red-50 disabled:opacity-50"
                >
                  {deletingId === r.id ? 'Silinir...' : 'Sil'}
                </button>
              )}
            </div>
          ),
        )}
      </div>
    </div>
  )
}

export default TodayReservations
