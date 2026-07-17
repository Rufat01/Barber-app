import { Link, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './AuthProvider'

function ProtectedRoute() {
  const { session, barbershop, loading, signOut } = useAuth()

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">Yüklənir...</div>
  }

  if (!session) {
    return <Navigate to="/daxil-ol" replace />
  }

  if (!barbershop) {
    // Qeydiyyat yarımçıq qalıbsa (məs. salon addımına çatmadan səhifə bağlanıb) —
    // Register.jsx mövcud sessiyanı görüb birbaşa salon yaratma addımına keçir.
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-4 gap-4">
        <p className="text-gray-500 text-sm">Hesabınıza bağlı salon tapılmadı.</p>
        <div className="flex gap-2">
          <Link
            to="/qeydiyyat"
            className="rounded-lg bg-gray-900 text-white text-sm font-medium px-4 py-2 hover:bg-gray-800"
          >
            Salon yaratmağı tamamla
          </Link>
          <button
            type="button"
            onClick={signOut}
            className="rounded-lg border border-gray-300 text-gray-700 text-sm font-medium px-4 py-2 hover:bg-gray-100"
          >
            Çıxış
          </button>
        </div>
      </div>
    )
  }

  return <Outlet />
}

export default ProtectedRoute
