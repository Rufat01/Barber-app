// wa.me deep link generasiyası.

import { SALON_NAME, BARBER_NAME, SALON_CONTACT_PHONE_DISPLAY } from './constants'
import { formatDateAzShort } from './date'

/** Seçilmiş xidmətlərin ümumi müddətini "X dəqiqə" formatında qaytarır. */
export function formatDuration(services) {
  const totalMinutes = services.reduce((sum, s) => sum + (Number(s.duration_minutes) || 0), 0)
  return totalMinutes > 0 ? `${totalMinutes} dəqiqə` : '-'
}

export function buildReservationMessage({ customerName, date, time, services }) {
  const serviceNames = services.map((s) => s.name).join(', ')

  return [
    `*${SALON_NAME}* sizi salamlayır.`,
    `Hörmətli ${customerName}, sizin *${BARBER_NAME}* ilə *${serviceNames}* rezervasiyanız təsdiq edildi.`,
    ``,
    `* Məkan: ${SALON_NAME}`,
    `* Rezervasiya tarixi: ${formatDateAzShort(date)}, ${time}`,
    `* Rezervasiya müddəti: ${formatDuration(services)}`,
    ``,
    `Filial ilə əlaqə üçün: ${SALON_CONTACT_PHONE_DISPLAY}`,
  ].join('\n')
}

/** `phone` normalize edilmiş formatda olmalıdır (994XXXXXXXXX). */
export function buildWaMeLink(phone, message) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}
