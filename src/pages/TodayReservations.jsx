import { useCallback, useEffect, useState } from 'react'
import {
  getReservationsByDate,
  subscribeToReservations,
  cancelReservation,
  confirmReservation,
  deleteReservation,
  markWhatsappSent,
  computeOccupiedRanges,
} from '../lib/reservations'
import { formatPhoneForDisplay } from '../lib/phone'
import { todayIsoDate, nowTimeString } from '../lib/date'
import { generateTimeSlots, timeToMinutes } from '../lib/timeSlots'
import { getWorkingHours } from '../lib/barbershop'
import { useAuth } from '../components/AuthProvider'
import DatePicker from '../components/DatePicker'
import EditReservationForm from '../components/EditReservationForm'
import QuickAddReservationForm from '../components/QuickAddReservationForm'
import Skeleton from '../components/Skeleton'
import { buildReservationMessage, buildWaMeLink } from '../lib/whatsapp'

const STATUS_LABEL = {
  pending: 'Təsdiq gözlənilir',
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

const STATUS_DOT_COLOR = {
  confirmed: 'bg-gray-900',
  cancelled: 'bg-red-400',
  completed: 'bg-green-500',
  no_show: 'bg-amber-400',
}

function ReservationsSkeleton() {
  return (
    <div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-3">
          <div className="w-12 sm:w-14 shrink-0 pt-0.5 flex justify-end">
            <Skeleton className="h-4 w-10" />
          </div>
          <div className="relative flex-1 pl-4 sm:pl-5 border-l-2 border-gray-100 pb-4">
            <span className="absolute -left-1 top-1.5 w-1.5 h-1.5 rounded-full bg-gray-200" />
            <div className="bg-white rounded-xl border border-gray-200 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function TodayReservations() {
  const { barbershop } = useAuth()
  const today = todayIsoDate()
  const [selectedDate, setSelectedDate] = useState(today)
  const [nameQuery, setNameQuery] = useState('')
  const [reservations, setReservations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cancellingId, setCancellingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [approvingId, setApprovingId] = useState(null)
  const [rejectingId, setRejectingId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [awaitingAction, setAwaitingAction] = useState(null)
  const [timeSlots, setTimeSlots] = useState([])
  const [addingSlot, setAddingSlot] = useState(null)

  useEffect(() => {
    getWorkingHours(barbershop.id)
      .then(({ openingTime, closingTime, slotIntervalMinutes }) =>
        setTimeSlots(generateTimeSlots(openingTime, closingTime, slotIntervalMinutes)),
      )
      .catch(() => setTimeSlots(generateTimeSlots()))
  }, [barbershop.id])

  const load = useCallback(() => {
    setLoading(true)
    getReservationsByDate(barbershop.id, selectedDate)
      .then(setReservations)
      .catch(() => setError('Rezervlər yüklənərkən xəta baş verdi'))
      .finally(() => setLoading(false))
  }, [barbershop.id, selectedDate])

  useEffect(() => {
    load()
    const unsubscribe = subscribeToReservations(barbershop.id, selectedDate, load)
    return unsubscribe
  }, [barbershop.id, selectedDate, load])

  useEffect(() => {
    setEditingId(null)
    setAddingSlot(null)
  }, [selectedDate])

  const nameFilterActive = nameQuery.trim() !== ''

  function matchesQuery(r) {
    if (!nameFilterActive) return true
    return r.customer?.full_name?.toLowerCase().includes(nameQuery.trim().toLowerCase())
  }

  // İctimai portaldan gələn "pending" rezervlər berber təsdiqləyənə qədər adi
  // cədvəldə göstərilmir — ayrıca "Gözləyən sorğular" bölməsində idarə olunur.
  // Slotu isə tutur (aşağıdakı `occupiedRanges` bütün `reservations`-a əsaslanır).
  const pendingReservations = reservations.filter((r) => r.status === 'pending')
  const scheduledReservations = reservations.filter((r) => r.status !== 'pending')

  const reservationsByTime = scheduledReservations.reduce((map, r) => {
    const key = r.time.slice(0, 5)
    if (!map[key]) map[key] = []
    map[key].push(r)
    return map
  }, {})

  // İş saatlarına uyğun bütün slotlar + (iş saatları sonradan dəyişdirilibsə) onlara
  // uyğun gəlməyən köhnə rezerv vaxtları da daxil olmaqla, xronoloji sırayla.
  const allTimes = Array.from(new Set([...timeSlots, ...Object.keys(reservationsByTime)])).sort()

  // Hər sıra ya bir rezervdir, ya da (axtarış aktiv olmayanda) boş bir iş saatı slotudur —
  // beləliklə bütün iş saatları görünür, doldurulmamış vaxtlar da daxil olmaqla.
  const rows = []
  allTimes.forEach((slot, index) => {
    const isLastSlot = index === allTimes.length - 1
    const slotReservations = (reservationsByTime[slot] || []).filter(matchesQuery)

    if (slotReservations.length === 0) {
      if (!nameFilterActive) {
        rows.push({ type: 'empty', key: slot, slot, isLast: isLastSlot })
      }
      return
    }

    slotReservations.forEach((r, i) => {
      rows.push({
        type: 'reservation',
        key: r.id,
        reservation: r,
        isLast: isLastSlot && i === slotReservations.length - 1,
      })
    })
  })

  const hasAnyMatch = rows.some((row) => row.type === 'reservation')
  const isToday = selectedDate === today
  const isPastDate = selectedDate < today
  const currentTime = nowTimeString()
  const occupiedRanges = computeOccupiedRanges(reservations)

  function isSlotOccupied(slot) {
    const slotMinutes = timeToMinutes(slot)
    return occupiedRanges.some((range) => slotMinutes >= range.start && slotMinutes < range.end)
  }

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

  async function handleApprove(reservation) {
    setApprovingId(reservation.id)
    try {
      await confirmReservation(reservation.id)
      setAwaitingAction({
        reservationId: reservation.id,
        fullName: reservation.customer?.full_name,
        phone: reservation.customer?.phone,
        services: reservation.reservation_services.map((rs) => ({
          id: rs.service?.id,
          name: rs.service?.name,
          price: rs.price_at_booking,
          duration_minutes: rs.duration_minutes ?? rs.service?.duration_minutes,
        })),
        totalPrice: reservation.total_price,
        date: reservation.date,
        time: reservation.time.slice(0, 5),
      })
      load()
    } catch {
      setError('Təsdiqləmə zamanı xəta baş verdi')
    } finally {
      setApprovingId(null)
    }
  }

  async function handleReject(reservation) {
    const confirmed = window.confirm(
      `${reservation.customer?.full_name} — ${reservation.time.slice(0, 5)} sorğusunu rədd etmək istədiyinizə əminsiniz?`,
    )
    if (!confirmed) return

    setRejectingId(reservation.id)
    try {
      await cancelReservation(reservation.id)
      load()
    } catch {
      setError('Rədd edilərkən xəta baş verdi')
    } finally {
      setRejectingId(null)
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

  function handleQuickAddCreated(reservation, fullName, phone, selectedServices, totalPrice) {
    setAddingSlot(null)
    setAwaitingAction({
      reservationId: reservation.id,
      fullName,
      phone,
      services: selectedServices,
      totalPrice,
      date: selectedDate,
      time: reservation.time.slice(0, 5),
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
      salonName: barbershop.name,
      barberName: barbershop.barber_name,
      contactPhoneDisplay: formatPhoneForDisplay(barbershop.owner_phone),
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

      {pendingReservations.length > 0 && (
        <div className="mb-4 space-y-2">
          <h2 className="text-sm font-bold text-gray-900">Gözləyən sorğular ({pendingReservations.length})</h2>
          {pendingReservations.map((r) => (
            <div key={r.id} className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium text-gray-900 truncate">{r.customer?.full_name}</div>
                  <div className="text-xs text-gray-500">{formatPhoneForDisplay(r.customer?.phone)}</div>
                </div>
                <span className="shrink-0 text-sm font-bold text-gray-900">{r.time.slice(0, 5)}</span>
              </div>
              <div className="mt-1.5 text-sm text-gray-600">
                {r.reservation_services.map((rs) => rs.service?.name).join(', ')}
              </div>
              <div className="mt-1.5 flex items-center justify-between">
                <span className="text-xs text-amber-700">Təsdiq gözlənilir</span>
                <span className="font-semibold text-gray-900">{r.total_price} AZN</span>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => handleApprove(r)}
                  disabled={approvingId === r.id}
                  className="flex-1 rounded-lg bg-gray-900 text-white text-sm font-medium py-1.5 hover:bg-gray-800 disabled:opacity-50"
                >
                  {approvingId === r.id ? 'Təsdiqlənir...' : 'Təsdiqlə'}
                </button>
                <button
                  onClick={() => handleReject(r)}
                  disabled={rejectingId === r.id}
                  className="flex-1 rounded-lg border border-red-200 text-red-600 text-sm font-medium py-1.5 hover:bg-red-50 disabled:opacity-50"
                >
                  {rejectingId === r.id ? 'Rədd edilir...' : 'Rədd et'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

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

      {error && <p className="text-sm text-red-500 mb-3">{error}</p>}

      {!loading && nameFilterActive && !hasAnyMatch && (
        <p className="text-gray-500">Bu axtarışa uyğun rezerv tapılmadı.</p>
      )}

      {loading ? (
        <ReservationsSkeleton />
      ) : (
        <div>
        {rows.map((row) => {
          if (row.type === 'empty') {
            const isPastSlot =
              isPastDate || (isToday && row.slot < currentTime) || isSlotOccupied(row.slot)

            if (addingSlot === row.slot) {
              return (
                <div key={row.key} className="flex gap-3">
                  <div className="w-12 sm:w-14 shrink-0 pt-0.5 text-right">
                    <span className="text-sm sm:text-base font-bold text-gray-900">{row.slot}</span>
                  </div>
                  <div className="relative flex-1 pl-4 sm:pl-5 border-l-2 border-gray-200 pb-4">
                    <span className="absolute -left-1.25 top-1 w-2.5 h-2.5 rounded-full ring-4 ring-gray-50 bg-blue-400" />
                    <div className="bg-white rounded-xl border border-gray-200">
                      <QuickAddReservationForm
                        barbershopId={barbershop.id}
                        date={selectedDate}
                        time={row.slot}
                        onCreated={handleQuickAddCreated}
                        onCancel={() => setAddingSlot(null)}
                      />
                    </div>
                  </div>
                </div>
              )
            }

            return (
              <div key={row.key} className="flex gap-3">
                <div className="w-12 sm:w-14 shrink-0 pt-0.5 text-right">
                  <span className="text-xs text-gray-300">{row.slot}</span>
                </div>
                <div
                  className={`relative flex-1 pl-4 sm:pl-5 border-l-2 border-gray-100 ${
                    row.isLast ? 'pb-0' : 'pb-1.5'
                  }`}
                >
                  <span className="absolute -left-1 top-1.5 w-1.5 h-1.5 rounded-full bg-gray-200" />
                  {!isPastSlot && (
                    <button
                      onClick={() => setAddingSlot(row.slot)}
                      className="w-full text-left text-xs text-gray-400 border border-dashed border-gray-200 rounded-lg px-2 py-1 hover:border-gray-300 hover:text-gray-600 hover:bg-gray-50"
                    >
                      + Əlavə et
                    </button>
                  )}
                </div>
              </div>
            )
          }

          const r = row.reservation

          if (editingId === r.id && !isPastDate) {
            return (
              <div key={row.key} className="bg-white rounded-xl border border-gray-200 mb-4">
                <EditReservationForm
                  barbershopId={barbershop.id}
                  reservation={r}
                  onSaved={(totalPrice, selectedServices, date, time) =>
                    handleEditSaved(r, totalPrice, selectedServices, date, time)
                  }
                  onCancel={() => setEditingId(null)}
                />
              </div>
            )
          }

          return (
            <div key={row.key} className="flex gap-3">
              <div className="w-12 sm:w-14 shrink-0 pt-0.5 text-right">
                <span className="text-sm sm:text-base font-bold text-gray-900">{r.time.slice(0, 5)}</span>
              </div>

              <div
                className={`relative flex-1 pl-4 sm:pl-5 border-l-2 border-gray-200 ${
                  row.isLast ? 'pb-0' : 'pb-4'
                }`}
              >
                <span
                  className={`absolute -left-1.25 top-1 w-2.5 h-2.5 rounded-full ring-4 ring-gray-50 ${
                    STATUS_DOT_COLOR[r.status] || 'bg-gray-400'
                  }`}
                />

                <div className="bg-white rounded-xl border border-gray-200 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium text-gray-900 truncate">{r.customer?.full_name}</div>
                      <div className="text-xs text-gray-500">{formatPhoneForDisplay(r.customer?.phone)}</div>
                    </div>
                    <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      {STATUS_LABEL[r.status] || r.status}
                    </span>
                  </div>

                  <div className="mt-1.5 text-sm text-gray-600">
                    {r.reservation_services.map((rs) => rs.service?.name).join(', ')}
                  </div>

                  <div className="mt-1.5 flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                      {WHATSAPP_STATUS_LABEL[r.whatsapp_status] || ''}
                    </span>
                    <span className="font-semibold text-gray-900">{r.total_price} AZN</span>
                  </div>

                  {isPastDate ? (
                    <button
                      onClick={() => handleDelete(r)}
                      disabled={deletingId === r.id}
                      className="mt-3 w-full rounded-lg border border-red-200 text-red-600 text-sm font-medium py-1.5 hover:bg-red-50 disabled:opacity-50"
                    >
                      {deletingId === r.id ? 'Silinir...' : 'Sil'}
                    </button>
                  ) : (
                    <>
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
                    </>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        </div>
      )}
    </div>
  )
}

export default TodayReservations
