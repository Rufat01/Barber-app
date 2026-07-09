/**
 * İş saatları daxilində "HH:MM" formatında bütün mümkün rezerv saatlarını qaytarır.
 * `closingTime`, `openingTime`-dan kiçik və ya bərabərdirsə (məs. 13:00 – 00:00),
 * gecə yarısından sonrakı saat kimi şərh olunur (növbəti günə keçid).
 */
export function generateTimeSlots(openingTime = '13:00', closingTime = '00:00', intervalMinutes = 15) {
  const [openHours, openMinutes] = openingTime.split(':').map(Number)
  const [closeHours, closeMinutes] = closingTime.split(':').map(Number)

  const startMinutes = openHours * 60 + openMinutes
  let endMinutes = closeHours * 60 + closeMinutes
  if (endMinutes <= startMinutes) {
    endMinutes += 24 * 60
  }

  const slots = []
  for (let m = startMinutes; m < endMinutes; m += intervalMinutes) {
    const hours = String(Math.floor(m / 60) % 24).padStart(2, '0')
    const minutes = String(m % 60).padStart(2, '0')
    slots.push(`${hours}:${minutes}`)
  }
  return slots
}
