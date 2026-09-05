// wa.me deep link generasiyası.

import { formatDateAzShort } from './date'

/** Seçilmiş xidmətlərin ümumi müddətini "X dəqiqə" formatında qaytarır. */
export function formatDuration(services) {
  const totalMinutes = services.reduce((sum, s) => sum + (Number(s.duration_minutes) || 0), 0)
  return totalMinutes > 0 ? `${totalMinutes} dəqiqə` : '-'
}

/**
 * Mesajın mətni salonun öz brendləmə məlumatlarından (bax `barbershops` cədvəli)
 * qurulur — hər salon üçün fərqli görünür, sabit qlobal mətn deyil.
 */
export function buildReservationMessage({
  customerName,
  date,
  time,
  services,
  salonName,
  barberName,
  contactPhoneDisplay,
}) {
  const serviceNames = services.map((s) => s.name).join(', ')

  return [
    `*${salonName}* sizi salamlayır.`,
    `Hörmətli ${customerName}, sizin *${barberName}* ilə *${serviceNames}* rezervasiyanız təsdiq edildi.`,
    ``,
    `* Məkan: ${salonName}`,
    `* Rezervasiya tarixi: ${formatDateAzShort(date)}, ${time}`,
    `* Rezervasiya müddəti: ${formatDuration(services)}`,
    ``,
    `Əlaqə nömrəsi: ${contactPhoneDisplay}`,
  ].join('\n')
}

/** `phone` normalize edilmiş formatda olmalıdır (994XXXXXXXXX). */
export function buildWaMeLink(phone, message) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}
