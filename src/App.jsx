import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './components/AuthProvider'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import NewReservation from './pages/NewReservation'
import SelectServices from './pages/SelectServices'
import Confirmation from './pages/Confirmation'
import TodayReservations from './pages/TodayReservations'
import ServicesManagement from './pages/ServicesManagement'
import Customers from './pages/Customers'
import PublicBooking from './pages/public/PublicBooking'
import PublicSelectServices from './pages/public/PublicSelectServices'
import PublicConfirmation from './pages/public/PublicConfirmation'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/daxil-ol" element={<Login />} />
          <Route path="/qeydiyyat" element={<Register />} />
          <Route path="/b/:slug" element={<PublicBooking />} />
          <Route path="/b/:slug/xidmetler" element={<PublicSelectServices />} />
          <Route path="/b/:slug/tesdiq" element={<PublicConfirmation />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<NewReservation />} />
              <Route path="/rezerv/xidmetler" element={<SelectServices />} />
              <Route path="/rezerv/tesdiq" element={<Confirmation />} />
              <Route path="/bugunku-rezervler" element={<TodayReservations />} />
              <Route path="/musterilerim" element={<Customers />} />
              <Route path="/xidmetlerim" element={<ServicesManagement />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
