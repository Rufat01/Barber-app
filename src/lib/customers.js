import { supabase } from './supabase'
import { BARBERSHOP_ID } from './constants'

/**
 * Telefon nömrəsinə görə müştərini tapır, varsa məlumatlarını yeniləyir,
 * yoxdursa yeni müştəri yaradır. `phone` normalize edilmiş formatda olmalıdır (994XXXXXXXXX).
 */
export async function upsertCustomer({ fullName, phone, notes }) {
  const { data, error } = await supabase
    .from('customers')
    .upsert(
      {
        barbershop_id: BARBERSHOP_ID,
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
