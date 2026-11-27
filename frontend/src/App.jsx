import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes, Outlet, useOutletContext, useLocation } from 'react-router-dom'
import { useAuth } from './auth'
import { isAdminUser } from './authRouting'
import { AuthProvider } from './AuthContext'
import AuthBootstrapNotice from './AuthBootstrapNotice'
import Layout from './Layout'
import { MemberLoading } from './pages/MemberStates'
import Home from './pages/Home'
import { AdminSession } from './admin/AdminUI'
import ScrollAnimations from './animation/ScrollAnimations'

// Route-level code splitting: only the home page ships in the entry bundle.
const ClubLegal = lazy(() => import('./pages/ClubLegal'))
const Book = lazy(() => import('./pages/Book'))
const Login = lazy(() => import('./pages/Login'))
const MyBookings = lazy(() => import('./pages/MyBookings'))
const Profile = lazy(() => import('./pages/Profile'))
const Register = lazy(() => import('./pages/Register'))
const ClubPage = lazy(() => import('./pages/ClubPage'))
const MatchmakingPage = lazy(() => import('./pages/Matchmaking'))
const MyMatchmaking = lazy(() => import('./pages/MyMatchmaking'))
const AdminLogin = lazy(() => import('./pages/AdminLogin'))
const AdminLayout = lazy(() => import('./admin/AdminLayout'))
const adminPage = (name) => lazy(() => import('./admin/AdminPages').then((m) => ({ default: m[name] })))
const AdminOverviewPage = adminPage('AdminOverviewPage')
const AdminBookingsPage = adminPage('AdminBookingsPage')
const AdminCourtsPage = adminPage('AdminCourtsPage')
const AdminContactMessagesPage = adminPage('AdminContactMessagesPage')
const AdminPricingPage = adminPage('AdminPricingPage')
const AdminCustomersPage = adminPage('AdminCustomersPage')
const AdminMatchmakingPage = lazy(() => import('./admin/AdminMatchmakingPage').then((m) => ({ default: m.AdminMatchmakingPage })))

function Protected() {
  const context = useOutletContext()
  const { user, loading, profileError, retryProfile, logout } = useAuth()
  const location = useLocation()
  if (loading) return <MemberLoading label={context.locale === 'ar' ? 'جارٍ التحقق من الجلسة…' : 'Checking your session…'} />
  if (profileError) return <AuthBootstrapNotice member locale={context.locale} error={profileError} onRetry={retryProfile} onSignOut={logout} />
  return user ? <Outlet context={context} /> : <Navigate to="/login" state={{ from: location }} replace />
}

function AdminProtected() {
  const { user, loading, profileError, retryProfile, logout } = useAuth()
  const location = useLocation()
  if (loading) return <AdminSession />
  if (profileError) return <AdminSession error={profileError} onRetry={retryProfile} onSignOut={logout} />
  if (!user) return <Navigate to="/admin/login" state={{ from: location }} replace />
  if (!isAdminUser(user)) return <Navigate to="/admin/login?unauthorized=1" state={{ from: location }} replace />
  return <AdminLayout />
}

export default function App() {
  return (
      <BrowserRouter>
        <ScrollAnimations />
        <AuthProvider>
          <div className="app-shell">
            <div className="app-route-content">
              <Suspense fallback={null}>
              <Routes>
                {/* Authentication screens use their own frame so no member page shows while a role is verified. */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Public page hosted by the Outlet-based layout (do not pass it as ignored children). */}
                <Route element={<Layout />}>
                  <Route index element={<Home />} />
                  <Route path="/terms-of-service" element={<ClubLegal kind="terms" />} />
                  <Route path="/privacy-policy" element={<ClubLegal kind="privacy" />} />
                  <Route path="/courts" element={<ClubPage />} />
                  <Route path="/pricing" element={<ClubPage />} />
                  <Route path="/gallery" element={<ClubPage />} />
                  <Route path="/contact" element={<ClubPage />} />
                  <Route path="/matchmaking" element={<MatchmakingPage />} />
                  <Route element={<Protected />}>
                    <Route path="/book" element={<Book />} />
                    <Route path="/bookings" element={<MyBookings />} />
                    <Route path="/my-matchmaking" element={<MyMatchmaking />} />
                    <Route path="/profile" element={<Profile />} />
                  </Route>
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

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
              </Suspense>
            </div>
          </div>
        </AuthProvider>
      </BrowserRouter>
  )
}
