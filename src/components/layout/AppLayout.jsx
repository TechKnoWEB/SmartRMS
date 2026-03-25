import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import SessionGuard from './SessionGuard'
import OfflineBanner from '../ui/OfflineBanner'
import { PageErrorBoundary } from '../ErrorBoundary'

export default function AppLayout() {
  const [sidebarOpen,      setSidebarOpen]      = useState(false)   // mobile overlay
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)   // desktop icon-only
  const location = useLocation()

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-surface-50 dark:bg-gray-950">
      {/* Offline banner — fixed, sits just below the topbar */}
      <OfflineBanner />

      {/* Full-width topbar */}
      <Topbar
        onMenuClick={() => setSidebarOpen(true)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(c => !c)}
      />

      {/* Below topbar: sidebar + content */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          collapsed={sidebarCollapsed}
        />
        <PageErrorBoundary resetKey={location.pathname}>
          <main
            key={location.pathname}
            className={[
              'flex-1 overflow-y-auto p-5 lg:p-6 animate-fade-in transition-[margin] duration-300',
              sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64',
            ].join(' ')}
          >
            <Outlet />
          </main>
        </PageErrorBoundary>
      </div>

      <SessionGuard />
    </div>
  )
}
