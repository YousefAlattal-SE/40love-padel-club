import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './auth'
import { AuthProvider } from './AuthContext'
import AuthBootstrapNotice from './AuthBootstrapNotice'
import Layout from './Layout'
import Home from './pages/Home'
import Book from './pages/Book'
import Login from './pages/Login'
import MyBookings from './pages/MyBookings'
import Profile from './pages/Profile'
import Register from './pages/Register'
import ClubPage from './pages/ClubPage'
import MatchmakingPage from './pages/Matchmaking'
import MyMatchmaking from './pages/MyMatchmaking'
import AdminLogin from './pages/AdminLogin'
import AdminLayout from './admin/AdminLayout'
import { AdminBookingsPage, AdminCourtsPage, AdminCustomersPage, AdminContactMessagesPage, AdminOverviewPage, AdminPricingPage } from './admin/AdminPages'
import { AdminMatchmakingPage } from './admin/AdminMatchmakingPage'
import TennisBallBackground from './TennisBallBackground'
import ScrollAnimations from './animation/ScrollAnimations'

function Protected({ children }) {
  const { user, loading, profileError, retryProfile, logout } = useAuth()
  const location = useLocation()
  if (loading) return <p className="page muted">Loading...</p>
  if (profileError) return <AuthBootstrapNotice locale={localStorage.getItem('serva-locale')} error={profileError} onRetry={retryProfile} onSignOut={logout} />
  return user ? children : <Navigate to="/login" state={{ from: location }} replace />
}

function AdminProtected() {
  const { user, loading, profileError, retryProfile, logout } = useAuth()
  const location = useLocation()
  if (loading) return <div className="admin-state-panel"><span className="admin-spinner" /><strong>Checking administrator access…</strong></div>
  if (profileError) return <AuthBootstrapNotice locale={localStorage.getItem('serva-locale')} error={profileError} onRetry={retryProfile} onSignOut={logout} />
  if (!user) return <Navigate to="/admin/login" state={{ from: location }} replace />
  if (String(user.role).toLowerCase() !== 'admin') return <Navigate to="/admin/login?unauthorized=1" state={{ from: location }} replace />
  return <AdminLayout />
}

export default function App() {
  return (
      <BrowserRouter>
        <ScrollAnimations />
        <AuthProvider>
          <div className="app-shell">
            <TennisBallBackground />
            <div className="app-route-content">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                {/* Public page hosted by the Outlet-based layout (do not pass it as ignored children). */}
                <Route element={<Layout />}>
                  <Route path="/courts" element={<ClubPage />} />
                  <Route path="/pricing" element={<ClubPage />} />
                  <Route path="/gallery" element={<ClubPage />} />
                  <Route path="/contact" element={<ClubPage />} />
                  <Route path="/matchmaking" element={<MatchmakingPage />} />
                </Route>

                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/admin" element={<AdminProtected />}>
                  <Route index element={<AdminOverviewPage />} />
                  <Route path="bookings" element={<AdminBookingsPage />} />
                  <Route path="courts" element={<AdminCourtsPage />} />
                  <Route path="matchmaking" element={<AdminMatchmakingPage />} />
                  <Route path="messages" element={<AdminContactMessagesPage />} />
                  <Route path="pricing" element={<AdminPricingPage />} />
                  <Route path="customers" element={<AdminCustomersPage />} />
                </Route>

                <Route element={<Protected><Layout /></Protected>}>
                  <Route path="/book" element={<Book />} />
                  <Route path="/bookings" element={<MyBookings />} />
                  <Route path="/my-matchmaking" element={<MyMatchmaking />} />
                  <Route path="/profile" element={<Profile />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </div>
        </AuthProvider>
      </BrowserRouter>
  )
}
