import { supabase } from './supabase'

/**
 * Telefon nömrəsinə görə müştərini tapır, varsa məlumatlarını yeniləyir,
 * yoxdursa yeni müştəri yaradır. `phone` normalize edilmiş formatda olmalıdır (994XXXXXXXXX).
 */
export async function upsertCustomer(barbershopId, { fullName, phone, notes }) {
  const { data, error } = await supabase
    .from('customers')
    .upsert(
      {
        barbershop_id: barbershopId,
        full_name: fullName,
        phone,
        notes: notes || null,
      },
      { onConflict: 'barbershop_id,phone' },
    )
    .select()
    .single()

  if (error) throw error
  return data
}

/** Salonun bütün müştəriləri, ada görə sıralı — "Müştərilərim" səhifəsi üçün. */
export async function getCustomers(barbershopId) {
  const { data, error } = await supabase
    .from('customers')
    .select('id, full_name, phone, notes, created_at')
    .eq('barbershop_id', barbershopId)
    .order('full_name', { ascending: true })

  if (error) throw error
  return data
}

/**
 * Ad və ya telefona görə müştəri axtarışı — rezerv formundakı müştəri seçimi üçün.
 * PostgREST `.or()` filterini pozmasın deyə sorğuya təsir edən simvollar təmizlənir.
 */
export async function searchCustomers(barbershopId, query, limit = 8) {
  const trimmed = query.trim().replace(/[,()%*]/g, ' ').trim()
  if (!trimmed) return []

  const digits = trimmed.replace(/\D/g, '')
  const filters = [`full_name.ilike.%${trimmed}%`]
  if (digits) filters.push(`phone.ilike.%${digits}%`)

  const { data, error } = await supabase
    .from('customers')
    .select('id, full_name, phone')
    .eq('barbershop_id', barbershopId)
    .or(filters.join(','))
    .order('full_name', { ascending: true })
    .limit(limit)

  if (error) throw error
  return data
}
