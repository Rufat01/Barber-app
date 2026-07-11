// Meta WhatsApp Cloud API-yə rezervasiya təsdiq mesajı göndərir.
// Access token və phone_number_id yalnız bu server-side funksiyada saxlanılır
// (bax: `supabase secrets set META_WHATSAPP_TOKEN=... META_PHONE_NUMBER_ID=...`),
// brauzer koduna heç vaxt ötürülmür.
//
// Bu funksiya "template" mesaj göndərir, çünki Cloud API business-initiated
// mesajları (müştəri son 24 saatda yazmayıbsa) yalnız Meta tərəfindən təsdiqlənmiş
// template ilə qəbul edir. Template adı/dili META_TEMPLATE_NAME və META_TEMPLATE_LANG
// secret-ləri ilə, ya da hər sorğuda `templateName`/`languageCode` göndərməklə
// override edilə bilər.

const META_GRAPH_VERSION = 'v21.0'
const META_WHATSAPP_TOKEN = Deno.env.get('META_WHATSAPP_TOKEN')
const META_PHONE_NUMBER_ID = Deno.env.get('META_PHONE_NUMBER_ID')
const DEFAULT_TEMPLATE_NAME = Deno.env.get('META_TEMPLATE_NAME') ?? 'reservation_confirmation'
const DEFAULT_TEMPLATE_LANG = Deno.env.get('META_TEMPLATE_LANG') ?? 'az'

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

  if (!META_WHATSAPP_TOKEN || !META_PHONE_NUMBER_ID) {
    return jsonResponse({ ok: false, error: 'MISSING_META_CREDENTIALS' }, 500)
  }

  let body: { to?: string; bodyParams?: unknown[]; templateName?: string; languageCode?: string }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ ok: false, error: 'INVALID_JSON' }, 400)
  }

  const { to, bodyParams, templateName, languageCode } = body

  if (!to || !Array.isArray(bodyParams)) {
    return jsonResponse({ ok: false, error: 'INVALID_PAYLOAD' }, 400)
  }

  const metaPayload = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: templateName || DEFAULT_TEMPLATE_NAME,
      language: { code: languageCode || DEFAULT_TEMPLATE_LANG },
      components: [
        {
          type: 'body',
          parameters: bodyParams.map((text) => ({ type: 'text', text: String(text) })),
        },
      ],
    },
  }

  try {
    const metaResponse = await fetch(
      `https://graph.facebook.com/${META_GRAPH_VERSION}/${META_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${META_WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metaPayload),
      },
    )

    const metaData = await metaResponse.json()

    if (!metaResponse.ok) {
      return jsonResponse(
        { ok: false, error: metaData?.error?.message || 'META_API_ERROR', metaError: metaData?.error ?? null },
        502,
      )
    }

    const messageId = metaData?.messages?.[0]?.id ?? null
    return jsonResponse({ ok: true, messageId })
  } catch (err) {
    return jsonResponse({ ok: false, error: err instanceof Error ? err.message : 'UNKNOWN_ERROR' }, 502)
  }
})
