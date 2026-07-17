// Qonaq (ictimai portal) yeni bir "pending" rezerv sorğusu yaratdıqda çağırılır —
// həmin salonun bütün push subscription-larına Web Push bildirimi göndərir.
// Service role key ilə işləyir (RLS-i keçir) — anon client birbaşa
// push_subscriptions-u oxuya bilmədiyi üçün bu addım server tərəfində olmalıdır.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webPush from 'npm:web-push@3'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT')

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY && VAPID_SUBJECT) {
  webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'METHOD_NOT_ALLOWED' }, 405)
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_SUBJECT) {
    return jsonResponse({ ok: false, error: 'MISSING_CONFIG' }, 500)
  }

  let body: { barbershopId?: string; customerName?: string; time?: string }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ ok: false, error: 'INVALID_JSON' }, 400)
  }

  const { barbershopId, customerName, time } = body
  if (!barbershopId) {
    return jsonResponse({ ok: false, error: 'INVALID_PAYLOAD' }, 400)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('barbershop_id', barbershopId)

  if (error) {
    return jsonResponse({ ok: false, error: error.message }, 500)
  }

  const payload = JSON.stringify({
    title: 'Yeni rezerv sorğusu',
    body: customerName && time ? `${customerName} — saat ${time}` : 'Yeni bir gözləyən sorğu var',
    url: '/bugunku-rezervler',
  })

  const results = await Promise.allSettled(
    (subscriptions ?? []).map(async (sub) => {
      try {
        await webPush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        )
      } catch (err) {
        const statusCode = err?.statusCode
        if (statusCode === 404 || statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id)
        }
        throw err
      }
    }),
  )

  const sent = results.filter((r) => r.status === 'fulfilled').length
  return jsonResponse({ ok: true, sent, total: results.length })
})
