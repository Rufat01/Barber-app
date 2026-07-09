import { supabase } from './supabase'
import { BARBERSHOP_ID } from './constants'

const RESERVATION_SELECT = `
  id, date, time, status, total_price, whatsapp_status, whatsapp_sent_at, created_at,
  customer:customers ( id, full_name, phone ),
  reservation_services ( price_at_booking, service:services ( id, name ) )
`

/**
 * Yeni rezerv yaradır. `services` seçilmiş xidmətlərin [{ id, price }] siyahısıdır —
 * qiymət elə bu andakı (bron anındakı) qiymət kimi price_at_booking-ə yazılır.
 */
export async function createReservation({ customerId, date, time, services }) {
  const totalPrice = services.reduce((sum, s) => sum + Number(s.price), 0)

  const { data: reservation, error: reservationError } = await supabase
    .from('reservations')
    .insert({
      barbershop_id: BARBERSHOP_ID,
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
    })),
  )

  if (servicesError) throw servicesError

  return reservation
}

/** Verilmiş tarixdəki bütün rezervləri (müştəri və xidmətlərlə birgə) qaytarır. */
export async function getReservationsByDate(date) {
  const { data, error } = await supabase
    .from('reservations')
    .select(RESERVATION_SELECT)
    .eq('barbershop_id', BARBERSHOP_ID)
    .eq('date', date)
    .order('time', { ascending: true })

  if (error) throw error
  return data
}

/** Verilmiş tarixdə artıq tutulmuş (ləğv edilməmiş) saatları "HH:MM" formatında qaytarır. */
export async function getTakenTimes(date) {
  const { data, error } = await supabase
    .from('reservations')
    .select('time')
    .eq('barbershop_id', BARBERSHOP_ID)
    .eq('date', date)
    .neq('status', 'cancelled')

  if (error) throw error
  return data.map((r) => r.time.slice(0, 5))
}

/** Rezervi ləğv edir (real DB-dən silmir, sadəcə statusu "cancelled" edir). */
export async function cancelReservation(id) {
  const { error } = await supabase.from('reservations').update({ status: 'cancelled' }).eq('id', id)

  if (error) throw error
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
export function subscribeToReservations(date, onChange) {
  const channel = supabase
    .channel(`reservations-${date}`)
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
