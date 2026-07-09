import { supabase } from './supabase'
import { BARBERSHOP_ID } from './constants'

/** Salonun iş saatlarını və rezerv slot aralığını qaytarır. */
export async function getWorkingHours() {
  const { data, error } = await supabase
    .from('barbershops')
    .select('opening_time, closing_time, slot_interval_minutes')
    .eq('id', BARBERSHOP_ID)
    .single()

  if (error) throw error
  return {
    openingTime: data.opening_time.slice(0, 5),
    closingTime: data.closing_time.slice(0, 5),
    slotIntervalMinutes: data.slot_interval_minutes,
  }
}

export async function updateWorkingHours({ openingTime, closingTime, slotIntervalMinutes }) {
  const { error } = await supabase
    .from('barbershops')
    .update({
      opening_time: openingTime,
      closing_time: closingTime,
      slot_interval_minutes: slotIntervalMinutes,
    })
    .eq('id', BARBERSHOP_ID)

  if (error) throw error
}
