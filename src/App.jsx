import { Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { Analytics as VercelAnalytics } from '@vercel/analytics/react'
import { useAuth }      from './context/AuthContext'
import AppLayout        from './components/layout/AppLayout'
import LoginPage        from './pages/LoginPage'
import { ENV_ERRORS }   from './lib/supabase'

// Lazy-load all heavy page components — each chunk downloads only when first visited
const Dashboard           = lazy(() => import('./pages/admin/Dashboard'))
const Students            = lazy(() => import('./pages/admin/Students'))
const MarksEntry          = lazy(() => import('./pages/admin/MarksEntry'))
const Results             = lazy(() => import('./pages/admin/Results'))
const Analytics           = lazy(() => import('./pages/admin/Analytics'))
const AuditTrail          = lazy(() => import('./pages/admin/AuditTrail'))
const Settings            = lazy(() => import('./pages/admin/Settings'))
const Users               = lazy(() => import('./pages/admin/Users'))
const StudentPortal       = lazy(() => import('./pages/portal/StudentPortal'))
const SuperAdminDashboard = lazy(() => import('./pages/superadmin/SuperAdminDashboard'))
const RegisterSchool      = lazy(() => import('./pages/register/RegisterSchool'))
const BulkPromotion       = lazy(() => import('./pages/admin/BulkPromotion'))
const Attendance          = lazy(() => import('./pages/admin/Attendance'))
const LandingPage         = lazy(() => import('./pages/LandingPage'))
const ResetPassword       = lazy(() => import('./pages/ResetPassword'))

// ── Env setup screen ─────────────────────────────────────────────────────────
// Rendered instead of a blank page when .env is missing or misconfigured.
// This is the #1 cause of a blank localhost screen.
function EnvErrorScreen() {
  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      background:'#0f172a', fontFamily:'monospace', padding:'2rem' }}>
      <div style={{ maxWidth:580, background:'#1e293b', border:'1.5px solid #dc2626',
        borderRadius:14, padding:'2rem', color:'#f1f5f9' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
          <span style={{ fontSize:26 }}>🔴</span>
          <span style={{ fontSize:18, fontWeight:700, color:'#fca5a5' }}>
            Missing .env Configuration
          </span>
        </div>
        <p style={{ color:'#94a3b8', marginBottom:16, fontSize:14, lineHeight:1.6 }}>
          The app cannot start because Supabase environment variables are not set.
          The blank page you see is caused by this — not a code error.
        </p>
        <div style={{ background:'#0f172a', borderRadius:8, padding:'1rem', marginBottom:20 }}>
          {ENV_ERRORS.map((e, i) => (
            <div key={i} style={{ color:'#fca5a5', fontSize:13, marginBottom:5 }}>• {e}</div>
          ))}
        </div>
        <div style={{ borderTop:'1px solid #334155', paddingTop:16 }}>
          <p style={{ color:'#7dd3fc', fontSize:13, fontWeight:700, marginBottom:10 }}>
            How to fix — 3 steps:
          </p>
          <ol style={{ color:'#94a3b8', fontSize:13, paddingLeft:18, lineHeight:2 }}>
            <li>
              In your project root, copy{' '}
              <code style={{ color:'#a5f3fc', background:'#0f172a', padding:'1px 5px', borderRadius:4 }}>
                .env.example
              </code>{' '}
              →{' '}
              <code style={{ color:'#a5f3fc', background:'#0f172a', padding:'1px 5px', borderRadius:4 }}>
                .env
              </code>
            </li>
            <li>
              Open Supabase Dashboard → your project →{' '}
              <strong style={{ color:'#f1f5f9' }}>Project Settings → API</strong>
            </li>
            <li>
              Fill in{' '}
              <code style={{ color:'#a5f3fc', background:'#0f172a', padding:'1px 5px', borderRadius:4 }}>
                VITE_SUPABASE_URL
              </code>{' '}
              and{' '}
              <code style={{ color:'#a5f3fc', background:'#0f172a', padding:'1px 5px', borderRadius:4 }}>
                VITE_SUPABASE_ANON_KEY
              </code>
              , then restart:{' '}
              <code style={{ color:'#a5f3fc', background:'#0f172a', padding:'1px 5px', borderRadius:4 }}>
                npm run dev
              </code>
            </li>
          </ol>
        </div>
        <div style={{ marginTop:16, padding:'10px 14px', background:'#1a2744',
          borderRadius:8, border:'1px solid #1e3a5f' }}>
          <p style={{ color:'#93c5fd', fontSize:12, margin:0 }}>
            Set <code style={{ color:'#a5f3fc', background:'#0f172a', padding:'1px 5px', borderRadius:4 }}>
              VITE_SUPABASE_URL
            </code> and <code style={{ color:'#a5f3fc', background:'#0f172a', padding:'1px 5px', borderRadius:4 }}>
              VITE_SUPABASE_ANON_KEY
            </code> in your hosting provider's environment settings.
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Full-screen spinner ───────────────────────────────────────
function PageLoader() {
  return (
    <div className="flex h-screen items-center justify-center bg-surface-50 dark:bg-gray-950">
      <div className="h-10 w-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

// ── Route guard ───────────────────────────────────────────────
function Guard({ children, role }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-surface-50 dark:bg-gray-950">
      <div className="h-10 w-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!user)                              return <Navigate to="/login" replace />
  if (role && user.role !== role)         return <Navigate to="/dashboard" replace />
  return children
}

export default function App() {
  // Show setup screen immediately if .env is missing — prevents the blank white page
  if (ENV_ERRORS.length > 0) return <EnvErrorScreen />

  return (
    <>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Landing page — public */}
          <Route path="/home" element={<LandingPage />} />

          {/* Public */}
          <Route path="/login"          element={<LoginPage />} />
          <Route path="/portal"         element={<StudentPortal />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Platform-level (no school session required) */}
          <Route path="/register"   element={<RegisterSchool />} />
          <Route path="/superadmin" element={<SuperAdminDashboard />} />

          {/* Authenticated app shell */}
          <Route path="/" element={<Guard><AppLayout /></Guard>}>
            <Route index            element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="students"  element={<Students />} />
            <Route path="marks"     element={<MarksEntry />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="attendance"    element={<Attendance />} />
            <Route path="promotion"     element={<Guard role="admin"><BulkPromotion /></Guard>} />

            {/* Admin-only routes — Guard blocks teachers from direct URL access */}
            <Route path="audit"    element={<Guard role="admin"><AuditTrail /></Guard>} />
            <Route path="users"    element={<Guard role="admin"><Users /></Guard>} />
            <Route path="settings" element={<Guard role="admin"><Settings /></Guard>} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <VercelAnalytics />
    </>
  )
}