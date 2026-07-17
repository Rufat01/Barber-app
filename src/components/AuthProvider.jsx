import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { getCurrentSession, onAuthStateChange, getBarbershopForOwner, signOut as requestSignOut } from '../lib/auth'

const AuthContext = createContext(null)

/**
 * Berberin sessiyasını və ona bağlı salonu saxlayır. `ProtectedRoute` bu context-ə
 * baxıb session/salon yüklənənə qədər kabinet səhifələrini gizlədir.
 */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [barbershop, setBarbershop] = useState(null)
  const [loading, setLoading] = useState(true)
  // Qeydiyyatda salon yaradılan anda (`setPassword` → Supabase-in USER_UPDATED hadisəsi)
  // avtomatik [session] effekti də paralel bir sorğu başladır — bu sorğu salon hələ
  // yaradılmamış olanda başladığı üçün həmişə "tapılmadı" qaytarır. Əgər həmin köhnə
  // sorğu, `refreshBarbershop()`-un düzgün nəticəsindən SONRA nəticələnsə, onu boş
  // qiymətlə üstələyib səhv "salon tapılmadı" halına səbəb olur. `requestIdRef` yalnız
  // ən son başladılmış sorğunun nəticəsinin tətbiq olunmasını təmin edir.
  const requestIdRef = useRef(0)

  async function loadBarbershop(userId) {
    const requestId = ++requestIdRef.current
    setLoading(true)
    try {
      const shop = await getBarbershopForOwner(userId)
      if (requestIdRef.current === requestId) setBarbershop(shop)
    } catch {
      if (requestIdRef.current === requestId) setBarbershop(null)
    } finally {
      if (requestIdRef.current === requestId) setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    getCurrentSession().then((initialSession) => {
      if (cancelled) return
      setSession(initialSession)
      if (!initialSession) setLoading(false)
    })

    const unsubscribe = onAuthStateChange((nextSession) => {
      if (cancelled) return
      setSession(nextSession)
      if (!nextSession) {
        requestIdRef.current++
        setBarbershop(null)
        setLoading(false)
      }
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!session) return
    loadBarbershop(session.user.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

  async function signOut() {
    await requestSignOut()
    requestIdRef.current++
    setSession(null)
    setBarbershop(null)
  }

  // Qeydiyyat axınında OTP təsdiqindən sonra sessiya yaranır, amma salon hələ mövcud
  // deyil — salon yaradıldıqdan sonra Register.jsx bunu çağırıb context-i yeniləyir.
  async function refreshBarbershop() {
    if (!session) return
    await loadBarbershop(session.user.id)
  }

  return (
    <AuthContext.Provider value={{ session, barbershop, loading, signOut, refreshBarbershop }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth yalnız AuthProvider daxilində istifadə oluna bilər')
  return ctx
}
