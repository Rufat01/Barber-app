import { supabase } from './supabase'

/** Rezerv formunda göstərilən aktiv xidmətlər. */
export async function getActiveServices(barbershopId) {
  const { data, error } = await supabase
    .from('services')
    .select('id, name, price, duration_minutes')
    .eq('barbershop_id', barbershopId)
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data
}

/** "Xidmətlərim" idarəetmə ekranı üçün bütün xidmətlər (aktiv + deaktiv). */
export async function getAllServices(barbershopId) {
  const { data, error } = await supabase
    .from('services')
    .select('id, name, price, duration_minutes, is_active')
    .eq('barbershop_id', barbershopId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data
}

export async function createService(barbershopId, { name, price, durationMinutes }) {
  const { data, error } = await supabase
    .from('services')
    .insert({
      barbershop_id: barbershopId,
      name,
      price,
      duration_minutes: durationMinutes || null,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateService(id, { name, price, durationMinutes }) {
  const { data, error } = await supabase
    .from('services')
    .update({ name, price, duration_minutes: durationMinutes || null })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Xidməti deaktiv edir (real DB-dən silmir), çünki keçmiş rezervlərdə
 * bu xidmətə istinad ola bilər (price_at_booking vasitəsilə tarixi qiymət qorunur).
 */
export async function setServiceActive(id, isActive) {
  const { data, error } = await supabase
    .from('services')
    .update({ is_active: isActive })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}
