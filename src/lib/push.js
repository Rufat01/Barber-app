import { supabase } from './supabase'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

/** VAPID public key-i `pushManager.subscribe`-in gözlədiyi Uint8Array formatına çevirir. */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window
}

/**
 * iOS Safari yalnız sayt "Ana ekrana əlavə et" ilə quraşdırılıbsa push-a icazə verir —
 * adi Safari tab-ında (hətta icazə verilsə belə) bildirimlər çatmır. Bu, istifadəçiyə
 * "əvvəlcə ana ekrana əlavə edin" təlimatı göstərmək üçün istifadə olunur.
 */
export function isIosNonStandalone() {
  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const isStandalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches
  return isIos && !isStandalone
}

/** Berberin brauzeri artıq abunə olubsa, mövcud subscription-ı qaytarır (UI statusu üçün). */
export async function getExistingPushSubscription() {
  if (!isPushSupported()) return null
  const registration = await navigator.serviceWorker.getRegistration('/')
  if (!registration) return null
  return registration.pushManager.getSubscription()
}

async function savePushSubscription(barbershopId, subscription) {
  const json = subscription.toJSON()
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      barbershop_id: barbershopId,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    },
    { onConflict: 'endpoint' },
  )

  if (error) throw error
}

/**
 * Service worker qeydiyyatı, brauzer icazəsi və push abunəliyini bir yerdə edir,
 * sonra abunəliyi `push_subscriptions`-a saxlayır. `Notification.permission`
 * rədd edilibsə `Error('PERMISSION_DENIED')` atır.
 */
export async function subscribeBarberToPush(barbershopId) {
  if (!isPushSupported()) throw new Error('PUSH_NOT_SUPPORTED')

  const registration = await navigator.serviceWorker.register('/sw.js')
  await navigator.serviceWorker.ready

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('PERMISSION_DENIED')

  let subscription = await registration.pushManager.getSubscription()
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })
  }

  await savePushSubscription(barbershopId, subscription)
  return subscription
}
