import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import NewReservation from './pages/NewReservation'
import SelectServices from './pages/SelectServices'
import Confirmation from './pages/Confirmation'
import TodayReservations from './pages/TodayReservations'
import ServicesManagement from './pages/ServicesManagement'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<NewReservation />} />
          <Route path="/rezerv/xidmetler" element={<SelectServices />} />
          <Route path="/rezerv/tesdiq" element={<Confirmation />} />
          <Route path="/bugunku-rezervler" element={<TodayReservations />} />
          <Route path="/xidmetlerim" element={<ServicesManagement />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
