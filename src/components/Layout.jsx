import { NavLink, Outlet } from 'react-router-dom'

const linkClass = ({ isActive }) =>
  `px-3 py-2 rounded-lg text-sm font-medium ${
    isActive ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
  }`

function Layout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <span className="text-lg font-bold text-gray-900">BarberApp</span>
          <nav className="flex gap-1">
            <NavLink to="/" end className={linkClass}>
              Yeni rezerv
            </NavLink>
            <NavLink to="/bugunku-rezervler" className={linkClass}>
              Bugünkü
            </NavLink>
            <NavLink to="/xidmetlerim" className={linkClass}>
              Xidmətlərim
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout
