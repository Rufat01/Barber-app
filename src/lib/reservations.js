import { supabase } from './supabase'
import { timeToMinutes } from './timeSlots'

function reservationDurationMinutes(r) {
  const total = (r.reservation_services || []).reduce(
    (sum, rs) => sum + (rs.duration_minutes ?? rs.service?.duration_minutes ?? 0),
    0,
  )
  // Müddəti bilinməyən rezerv heç olmasa öz başlanğıc vaxtını tutur (köhnə davranışla uyğun).
  return Math.max(total, 1)
}

/** Rezerv siyahısından hər birinin tutduğu vaxt aralığını ([start, end) dəqiqə) hesablayır. */
export function computeOccupiedRanges(reservations) {
  return reservations
    .filter((r) => r.status !== 'cancelled')
    .map((r) => {
      const start = timeToMinutes(r.time.slice(0, 5))
      return { start, end: start + reservationDurationMinutes(r), reservationId: r.id }
    })
}

const RESERVATION_SELECT = `
  id, date, time, status, total_price, whatsapp_status, whatsapp_sent_at, created_at,
  customer:customers ( id, full_name, phone ),
  reservation_services ( price_at_booking, duration_minutes, service:services ( id, name, duration_minutes ) )
`

/**
 * Yeni rezerv yaradır. `services` seçilmiş xidmətlərin [{ id, price }] siyahısıdır —
 * qiymət elə bu andakı (bron anındakı) qiymət kimi price_at_booking-ə yazılır.
 */
export async function createReservation({ barbershopId, customerId, date, time, services }) {
  const totalPrice = services.reduce((sum, s) => sum + Number(s.price), 0)

  const { data: reservation, error: reservationError } = await supabase
    .from('reservations')
    .insert({
      barbershop_id: barbershopId,
      customer_id: customerId,
      date,
      time,
      status: 'confirmed',
      total_price: totalPrice,
      whatsapp_status: 'pending',
    })
    .select()
    .single()

  if (reservationError) {
    if (reservationError.code === '23505') {
      throw new Error('SLOT_TAKEN')
    }
    throw reservationError
  }

  const { error: servicesError } = await supabase.from('reservation_services').insert(
    services.map((s) => ({
      reservation_id: reservation.id,
      service_id: s.id,
      price_at_booking: s.price,
      duration_minutes: s.duration_minutes ?? null,
    })),
  )

  if (servicesError) throw servicesError

  return reservation
}

/** Verilmiş tarixdəki bütün rezervləri (müştəri və xidmətlərlə birgə) qaytarır. */
export async function getReservationsByDate(barbershopId, date) {
  const { data, error } = await supabase
    .from('reservations')
    .select(RESERVATION_SELECT)
    .eq('barbershop_id', barbershopId)
    .eq('date', date)
    .order('time', { ascending: true })

  if (error) throw error
  return data
}

/**
 * Verilmiş tarixdə artıq tutulmuş saatları "HH:MM" formatında qaytarır. Yalnız dəqiq
 * eyni saatı deyil, mövcud rezervlərin (öz xidmət müddətlərinə görə) tutduğu bütün
 * aralığı nəzərə alır — məs. 14:00-da başlayan 45 dəqiqəlik rezerv varsa, 14:30 da
 * tutulmuş sayılır (əgər `timeSlots` göndərilibsə).
 * `excludeReservationId` verilsə, həmin rezerv nəzərə alınmır (rezervi redaktə edərkən
 * onun öz vaxtı "tutulmuş" kimi göstərilməsin deyə).
 * `timeSlots` göndərilməzsə, köhnə davranış (yalnız dəqiq saat uyğunluğu) qorunur.
 */
export async function getTakenTimes(barbershopId, date, { excludeReservationId, timeSlots } = {}) {
  let query = supabase
    .from('reservations')
    .select('id, time, status, reservation_services ( duration_minutes, service:services ( duration_minutes ) )')
    .eq('barbershop_id', barbershopId)
    .eq('date', date)
    .neq('status', 'cancelled')

  if (excludeReservationId) {
    query = query.neq('id', excludeReservationId)
  }

  const { data, error } = await query
  if (error) throw error

  if (!timeSlots) {
    return data.map((r) => r.time.slice(0, 5))
  }

  const ranges = computeOccupiedRanges(data)
  return timeSlots.filter((slot) => {
    const slotMinutes = timeToMinutes(slot)
    return ranges.some((range) => slotMinutes >= range.start && slotMinutes < range.end)
  })
}

/** Rezervi ləğv edir (real DB-dən silmir, sadəcə statusu "cancelled" edir). */
export async function cancelReservation(id) {
  const { error } = await supabase.from('reservations').update({ status: 'cancelled' }).eq('id', id)

  if (error) throw error
}

/** İctimai portaldan gələn "pending" rezervi berber təsdiqləyəndə çağırılır. */
export async function confirmReservation(id) {
  const { error } = await supabase.from('reservations').update({ status: 'confirmed' }).eq('id', id)

  if (error) throw error
}

/** Ləğv edilmiş rezervi bazadan tam silir (reservation_services də cascade ilə silinir). */
export async function deleteReservation(id) {
  const { error } = await supabase.from('reservations').delete().eq('id', id)

  if (error) throw error
}

/**
 * Rezervin tarix/saat və xidmətlərini yeniləyir. `services` [{ id, name, price, duration_minutes }]
 * siyahısıdır — qiymət bu andakı (redaktə anındakı) qiymət kimi yenidən price_at_booking-ə yazılır.
 */
export async function updateReservation(id, { date, time, services }) {
  const totalPrice = services.reduce((sum, s) => sum + Number(s.price), 0)

  const { error: reservationError } = await supabase
    .from('reservations')
    .update({ date, time, total_price: totalPrice })
    .eq('id', id)

  if (reservationError) {
    if (reservationError.code === '23505') {
      throw new Error('SLOT_TAKEN')
    }
    throw reservationError
  }

  const { error: deleteError } = await supabase.from('reservation_services').delete().eq('reservation_id', id)
  if (deleteError) throw deleteError

  const { error: insertError } = await supabase.from('reservation_services').insert(
    services.map((s) => ({
      reservation_id: id,
      service_id: s.id,
      price_at_booking: s.price,
      duration_minutes: s.duration_minutes ?? null,
    })),
  )
  if (insertError) throw insertError

  return { totalPrice }
}

/** WhatsApp mesajı göndərildikdən (wa.me linki açıldıqdan) sonra statusu yeniləyir. */
export async function markWhatsappSent(reservationId, { status = 'sent', messageId = null } = {}) {
  const { error } = await supabase
    .from('reservations')
    .update({
      whatsapp_status: status,
      whatsapp_sent_at: new Date().toISOString(),
      whatsapp_message_id: messageId,
    })
    .eq('id', reservationId)

  if (error) throw error
}

/**
 * Verilmiş tarix üçün rezervlərdə real-time dəyişiklikləri dinləyir.
 * `onChange` hər hadisədə çağırılır — çağıran tərəf siyahını yenidən yükləməlidir.
 */
export function subscribeToReservations(barbershopId, date, onChange) {
  // Realtime postgres_changes bir filter şərti qəbul edir, ona görə tenant təcridi
  // filter stringində deyil, RLS-də təmin olunur (bax 0005_barber_auth_rls.sql) —
  // Supabase Realtime abunəlik zamanı client-in JWT-sinə uyğun RLS-i tətbiq edir.
  const channel = supabase
    .channel(`reservations-${barbershopId}-${date}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'reservations',
        filter: `date=eq.${date}`,
      },
      onChange,
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
