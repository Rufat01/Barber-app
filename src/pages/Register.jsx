import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { sendOtp, verifyOtp, setPassword } from '../lib/auth'
import { createBarbershop } from '../lib/barbershop'
import { useAuth } from '../components/AuthProvider'
import PhoneInput from '../components/PhoneInput'

function isOwnerConflict(err) {
  return err.code === '23505' && (err.message || '').includes('owner_user_id')
}

/** Salon adından unikal slug generasiya edir (kiçik hərf, tire ilə, təsadüfi son şəkilçi ilə). */
function slugify(name) {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9əğıöşüç]+/g, '-')
    .replace(/^-+|-+$/g, '')
  const suffix = Math.random().toString(36).slice(2, 6)
  return `${base || 'salon'}-${suffix}`
}

function Register() {
  const navigate = useNavigate()
  const { session, refreshBarbershop } = useAuth()
  // Sessiya artıq mövcuddursa (məs. OTP təsdiqindən sonra səhifə yenilənib, ya da
  // salon yaradılmadan yarımçıq qalmış qeydiyyatı davam etdirir), birbaşa salon
  // addımına keçir — email/OTP təkrar istənmir.
  const [step, setStep] = useState(session ? 'salon' : 'email') // 'email' | 'otp' | 'salon'

  // AuthProvider sessiyanı asinxron yükləyir — mount anında hələ `null` ola bilər,
  // sonra gəlsə də (yarımçıq qalmış qeydiyyatı davam etdirən istifadəçi üçün) birbaşa
  // salon addımına keçirir.
  useEffect(() => {
    if (session && step === 'email') setStep('salon')
  }, [session, step])

  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [salonName, setSalonName] = useState('')
  const [barberName, setBarberName] = useState('')
  const [ownerPhone, setOwnerPhone] = useState('')
  const [password, setPassword_] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSendOtp(e) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await sendOtp(email)
      setStep('otp')
    } catch {
      setError('Kod göndərilərkən xəta baş verdi, email ünvanını yoxlayın')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleVerifyOtp(e) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await verifyOtp({ email, token })
      setStep('salon')
    } catch {
      setError('Kod yanlışdır və ya vaxtı bitib')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCreateShop(e) {
    e.preventDefault()
    if (!salonName.trim()) {
      setError('Salonun adını daxil edin')
      return
    }
    if (!barberName.trim()) {
      setError('Öz adınızı daxil edin')
      return
    }
    if (!ownerPhone) {
      setError('Düzgün əlaqə nömrəsi daxil edin')
      return
    }
    if (password.length < 6) {
      setError('Şifrə ən azı 6 simvol olmalıdır')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      await setPassword(password)
      try {
        await createBarbershop({
          name: salonName.trim(),
          slug: slugify(salonName),
          ownerUserId: session.user.id,
          barberName: barberName.trim(),
          ownerPhone,
        })
      } catch (err) {
        // Yalnız owner_user_id toqquşmasını udur (bu email artıq bir salonun sahibidir —
        // yeni salon yaratmaq əvəzinə mövcud olana yönləndiririk). Slug toqquşması da
        // eyni '23505' kodu ilə gəldiyi üçün constraint adına görə ayırd edilməlidir,
        // əks halda əsl uğursuzluq səssizcə udulub istifadəçi salonsuz qalar.
        if (!isOwnerConflict(err)) throw err
      }
      await refreshBarbershop()
      navigate('/', { replace: true })
    } catch {
      setError('Kabinet yaradılarkən xəta baş verdi')
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <h1 className="text-xl font-bold text-gray-900 text-center">Qeydiyyat</h1>

        {step === 'email' && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-gray-900 text-white font-medium py-2.5 hover:bg-gray-800 disabled:opacity-50"
            >
              {submitting ? 'Göndərilir...' : 'Kod göndər'}
            </button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <p className="text-sm text-gray-500">
              <strong>{email}</strong> ünvanına göndərilən 6 rəqəmli kodu daxil edin.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kod</label>
              <input
                type="text"
                inputMode="numeric"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-gray-900 text-white font-medium py-2.5 hover:bg-gray-800 disabled:opacity-50"
            >
              {submitting ? 'Yoxlanılır...' : 'Təsdiqlə'}
            </button>
            <button
              type="button"
              onClick={handleSendOtp}
              disabled={submitting}
              className="w-full text-sm text-gray-500 hover:text-gray-900 underline"
            >
              Kodu yenidən göndər
            </button>
          </form>
        )}

        {step === 'salon' && (
          <form onSubmit={handleCreateShop} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Salonun adı</label>
              <input
                type="text"
                value={salonName}
                onChange={(e) => setSalonName(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sizin adınız</label>
              <input
                type="text"
                value={barberName}
                onChange={(e) => setBarberName(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
              <p className="mt-1 text-xs text-gray-400">Müştəriyə göndərilən WhatsApp mesajında görünəcək.</p>
            </div>
            <PhoneInput value={ownerPhone} onChange={setOwnerPhone} label="Əlaqə nömrəniz" required />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Şifrə</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword_(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
              <p className="mt-1 text-xs text-gray-400">Növbəti girişlərdə email + bu şifrə ilə daxil olacaqsınız.</p>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-gray-900 text-white font-medium py-2.5 hover:bg-gray-800 disabled:opacity-50"
            >
              {submitting ? 'Yaradılır...' : 'Kabineti yarat'}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-gray-500">
          Artıq hesabınız var?{' '}
          <Link to="/daxil-ol" className="text-gray-900 font-medium underline">
            Daxil olun
          </Link>
        </p>
      </div>
    </div>
  )
}

export default Register
