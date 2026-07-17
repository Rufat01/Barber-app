import { supabase } from './supabase'
import { timeToMinutes } from './timeSlots'

/**
 * Qonaq (hesabsız) rezervasiya portalı üçün — `create_public_reservation` və
 * `public_taken_times` SECURITY DEFINER funksiyalarını çağırır (bax
 * 0007_public_booking.sql). Bu funksiyalar heç bir müştəri/rezerv identifikasiyası
 * ötürmür, ona görə owner-scoped `src/lib/reservations.js`-dən ayrıca saxlanılıb.
 */

/**
 * Verilmiş tarixdə tutulmuş saatları "HH:MM" formatında qaytarır — `timeSlots`
 * göndərilsə, xidmət müddətinə görə üst-üstə düşən slotları da daxil edir
 * (bax `src/lib/reservations.js`-dəki `getTakenTimes` ilə eyni məntiq).
 */
export async function getPublicTakenTimes(barbershopId, date, { timeSlots } = {}) {
  const { data, error } = await supabase.rpc('public_taken_times', {
    p_barbershop_id: barbershopId,
    p_date: date,
  })

  if (error) throw error

  if (!timeSlots) {
    return data.map((r) => r.slot_time.slice(0, 5))
  }

  const ranges = data.map((r) => {
    const start = timeToMinutes(r.slot_time.slice(0, 5))
    return { start, end: start + Math.max(r.duration_minutes || 0, 1) }
  })

  return timeSlots.filter((slot) => {
    const slotMinutes = timeToMinutes(slot)
    return ranges.some((range) => slotMinutes >= range.start && slotMinutes < range.end)
  })
}

/**
 * Qonaq rezervasiyası yaradır. Slot artıq tutulubsa `SLOT_TAKEN` xətası atılır
 * (mövcud `createReservation`-dakı eyni müqavilə).
 */
export async function createPublicReservation({ barbershopId, fullName, phone, date, time, services }) {
  const { data, error } = await supabase.rpc('create_public_reservation', {
    p_barbershop_id: barbershopId,
    p_full_name: fullName,
    p_phone: phone,
    p_date: date,
    p_time: time,
    p_service_ids: services.map((s) => s.id),
  })

  if (error) {
    if (error.code === '23505') throw new Error('SLOT_TAKEN')
    throw error
  }

  return { id: data }
}

/**
 * Berberə yeni "pending" sorğu üçün push bildirimi göndərməyə cəhd edir
 * (`notify-barber-new-reservation` edge function). Bildiriş yalnız bonusdur —
 * uğursuz olsa (berber hələ bildirimlərə abunə olmayıb, şəbəkə xətası s.) çağıran
 * tərəf bunu udmalıdır, rezervasiyanın özü artıq uğurla yaradılıb.
 */
export async function notifyBarberOfNewReservation({ barbershopId, customerName, time }) {
  await supabase.functions.invoke('notify-barber-new-reservation', {
    body: { barbershopId, customerName, time },
  })
}
