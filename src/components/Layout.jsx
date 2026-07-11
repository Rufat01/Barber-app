import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'

const NAV_ITEMS = [
  { to: '/', label: 'Yeni rezerv', end: true },
  { to: '/bugunku-rezervler', label: 'Bugünkü rezervlər' },
  { to: '/musterilerim', label: 'Müştərilərim' },
  { to: '/xidmetlerim', label: 'Xidmətlərim' },
]

const linkClass = ({ isActive }) =>
  `block px-3 py-2.5 rounded-lg text-sm font-medium ${
    isActive ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100'
  }`

function Layout() {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const menuRef = useRef(null)

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-2xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2">
          <span className="text-base sm:text-lg font-bold text-gray-900">BarberApp</span>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-label="Menyu"
              aria-expanded={open}
              className="flex items-center justify-center w-9 h-9 rounded-lg text-gray-600 hover:bg-gray-100"
            >
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
              </svg>
            </button>

            {open && (
              <nav className="absolute right-0 mt-2 w-56 bg-white rounded-xl border border-gray-200 shadow-lg p-1.5 z-20">
                {NAV_ITEMS.map((item) => (
                  <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}>
                    {item.label}
                  </NavLink>
                ))}
              </nav>
            )}
          </div>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout
