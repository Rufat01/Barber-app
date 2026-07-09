// wa.me deep link generasiyası. Sonrakı mərhələdə WhatsApp Cloud API-yə keçiləcək,
// amma müştəriyə göndərilən mesajın forması (buildReservationMessage) dəyişməz qalacaq.

import { SALON_NAME, BARBER_NAME, SALON_CONTACT_PHONE_DISPLAY } from './constants'

const AZ_MONTHS = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun',
  'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr',
]

/** "YYYY-MM-DD" tarixini "9 İyul" formatına çevirir. */
function formatDateAz(dateStr) {
  const [, month, day] = dateStr.split('-').map(Number)
  return `${day} ${AZ_MONTHS[month - 1]}`
}

/** Seçilmiş xidmətlərin ümumi müddətini "X dəqiqə" formatında qaytarır. */
function formatDuration(services) {
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
    `* Rezervasiya tarixi: ${formatDateAz(date)}, ${time}`,
    `* Rezervasiya müddəti: ${formatDuration(services)}`,
    ``,
    `Filial ilə əlaqə üçün: ${SALON_CONTACT_PHONE_DISPLAY}`,
  ].join('\n')
}

/** `phone` normalize edilmiş formatda olmalıdır (994XXXXXXXXX). */
export function buildWaMeLink(phone, message) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}
