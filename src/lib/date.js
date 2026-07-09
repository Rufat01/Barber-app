// Salon Bakıdadır — "bugün" bu münasibətlə hesablanır, istifadəçinin cihazının
// öz saat qurşağı ayarından asılı olmadan (yanlış konfiqurasiya edilmiş cihazlarda
// "bugün"ün səhv tarixə düşməsinin qarşısını alır).
const BUSINESS_TIMEZONE = 'Asia/Baku'

/** Salonun yerləşdiyi saat qurşağına görə bugünkü tarixi "YYYY-MM-DD" formatında qaytarır. */
export function todayIsoDate() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: BUSINESS_TIMEZONE }).format(new Date())
}

/** Salonun yerləşdiyi saat qurşağına görə hazırkı vaxtı "HH:MM" formatında qaytarır. */
export function nowTimeString() {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: BUSINESS_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date())
}

const AZ_MONTHS = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun',
  'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr',
]

/** "YYYY-MM-DD" tarixini "9 İyul" formatına çevirir (il olmadan, WhatsApp mesajı üçün). */
export function formatDateAzShort(dateStr) {
  const [, month, day] = dateStr.split('-').map(Number)
  return `${day} ${AZ_MONTHS[month - 1]}`
}

/**
 * "YYYY-MM-DD" tarixini "15 İyul 2026" formatına çevirir (il ilə birgə) — brauzerin
 * doğma tarix seçicisinin (MM/DD/YYYY kimi lokal formatlarda) yaratdığı qarışıqlığı
 * aradan qaldırmaq üçün istifadəçiyə açıq-aydın təsdiq göstərmək məqsədilə.
 */
export function formatDateAzFull(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number)
  return `${day} ${AZ_MONTHS[month - 1]} ${year}`
}
