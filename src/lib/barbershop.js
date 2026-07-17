import { supabase } from './supabase'

/**
 * Qeydiyyatdan keçən berber üçün yeni salon yaradır. RLS `with check (owner_user_id = auth.uid())`
 * şərti ilə qorunur — çağıran tərəf artıq OTP ilə təsdiqlənmiş öz sessiyasında olmalıdır.
 * `slug` unikal olmalıdır (bax 0001_init.sql) — toqquşma zamanı '23505' xətası atılır.
 */
export async function createBarbershop({ name, slug, ownerUserId, barberName, ownerPhone }) {
  const { data, error } = await supabase
    .from('barbershops')
    .insert({ name, slug, owner_user_id: ownerUserId, barber_name: barberName, owner_phone: ownerPhone })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Salonun WhatsApp mesajında görünən brendləmə məlumatlarını (ad, barber adı,
 * əlaqə nömrəsi) yeniləyir — "Xidmətlərim" səhifəsindəki ayarlar formu üçün.
 */
export async function updateBarbershopProfile(barbershopId, { name, barberName, ownerPhone }) {
  const { data, error } = await supabase
    .from('barbershops')
    .update({ name, barber_name: barberName, owner_phone: ownerPhone })
    .eq('id', barbershopId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Slug-a görə salonu tapır — ictimai (qonaq) rezervasiya portalı üçün. `public_read`
 * policy (bax 0007_public_booking.sql) sayəsində anon açardan da işləyir.
 */
export async function getBarbershopBySlug(slug) {
  const { data, error } = await supabase
    .from('barbershops')
    .select('id, name, slug, barber_name, owner_phone, opening_time, closing_time, slot_interval_minutes')
    .eq('slug', slug)
    .single()

  if (error) throw error
  return data
}

/** Salonun iş saatlarını və rezerv slot aralığını qaytarır. */
export async function getWorkingHours(barbershopId) {
  const { data, error } = await supabase
    .from('barbershops')
    .select('opening_time, closing_time, slot_interval_minutes')
    .eq('id', barbershopId)
    .single()

  if (error) throw error
  return {
    openingTime: data.opening_time.slice(0, 5),
    closingTime: data.closing_time.slice(0, 5),
    slotIntervalMinutes: data.slot_interval_minutes,
  }
}

export async function updateWorkingHours(barbershopId, { openingTime, closingTime, slotIntervalMinutes }) {
  const { error } = await supabase
    .from('barbershops')
    .update({
      opening_time: openingTime,
      closing_time: closingTime,
      slot_interval_minutes: slotIntervalMinutes,
    })
    .eq('id', barbershopId)

  if (error) throw error
}
