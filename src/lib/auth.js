import { supabase } from './supabase'

export async function signIn({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data.session
}

/** Qeydiyyat üçün email-ə 6 rəqəmli təsdiq kodu göndərir (hesab yoxdursa yaradır). */
export async function sendOtp(email) {
  const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })
  if (error) throw error
}

/** Email-ə göndərilən kodu təsdiqləyir — uğurlu olsa sessiya açılır (email təsdiqlənmiş sayılır). */
export async function verifyOtp({ email, token }) {
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'email' })
  if (error) throw error
  return data.session
}

/** OTP ilə təsdiqlənmiş istifadəçiyə gələcək email+şifrə girişləri üçün şifrə təyin edir. */
export async function setPassword(password) {
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw error
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session
}

export function onAuthStateChange(callback) {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => callback(session))
  return () => subscription.unsubscribe()
}

/** Sessiyanın sahib olduğu salonu tapır (RLS `owner_user_id = auth.uid()` ilə əlavə qorunur). */
export async function getBarbershopForOwner(userId) {
  const { data, error } = await supabase.from('barbershops').select('*').eq('owner_user_id', userId).single()

  if (error) throw error
  return data
}
