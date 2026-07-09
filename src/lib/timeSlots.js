// Salonun iş saatları: 13:00 – 24:00, hər 15 dəqiqədə bir slot.
const BUSINESS_START_MINUTES = 13 * 60
const BUSINESS_END_MINUTES = 24 * 60
const SLOT_INTERVAL_MINUTES = 15

/** İş saatları daxilində "HH:MM" formatında bütün mümkün rezerv saatlarını qaytarır. */
export function generateTimeSlots() {
  const slots = []
  for (let m = BUSINESS_START_MINUTES; m < BUSINESS_END_MINUTES; m += SLOT_INTERVAL_MINUTES) {
    const hours = String(Math.floor(m / 60)).padStart(2, '0')
    const minutes = String(m % 60).padStart(2, '0')
    slots.push(`${hours}:${minutes}`)
  }
  return slots
}
