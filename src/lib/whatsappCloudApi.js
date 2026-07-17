// Meta WhatsApp Cloud API ilə avtomatik göndərmə cəhdi (Supabase Edge Function üzərindən).
// Bu funksiya HEÇ VAXT throw etmir və 8 saniyədən çox gözləmir — çağıran tərəf sadəcə
// `ok` sahəsini yoxlayıb uğursuz/vaxt bitmiş halda köhnə wa.me axışına keçməlidir.

import { supabase } from './supabase'
import { formatDateAzShort } from './date'
import { formatDuration } from './whatsapp'
import { SALON_NAME, BARBER_NAME, SALON_CONTACT_PHONE_DISPLAY } from './constants'

const TIMEOUT_MS = 8000

function timeoutFallback(ms) {
  return new Promise((resolve) => setTimeout(() => resolve({ ok: false }), ms))
}

export async function sendReservationViaCloudApi({ phone, customerName, date, time, services }) {
  const serviceNames = services.map((s) => s.name).join(', ')

  // Template body-də "{{2}}ilə" (aralarında boşluqsuz) yazılıb — dəyərin sonuna
  // boşluq əlavə edərək "Rihad Abasov ilə" düzgün görünüşünü təmin edirik.
  const bodyParams = [
    customerName,
    `${BARBER_NAME} `,
    serviceNames,
    SALON_NAME,
    `${formatDateAzShort(date)}, ${time}`,
    formatDuration(services),
    SALON_CONTACT_PHONE_DISPLAY,
  ]

  const attempt = (async () => {
    try {
      const { data, error } = await supabase.functions.invoke('send-whatsapp-cloud', {
        body: { to: phone, bodyParams },
      })

      if (error || !data?.ok) {
        return { ok: false }
      }

      return { ok: true, messageId: data.messageId ?? null }
    } catch {
      return { ok: false }
    }
  })()

  return Promise.race([attempt, timeoutFallback(TIMEOUT_MS)])
}
