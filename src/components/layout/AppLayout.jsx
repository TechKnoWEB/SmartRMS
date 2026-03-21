import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import SessionGuard from './SessionGuard'

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  return (
    <div className="flex h-screen overflow-hidden bg-surface-50 dark:bg-gray-950">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-64">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main key={location.pathname} className="flex-1 overflow-y-auto p-5 lg:p-6 animate-fade-in">
          <Outlet />
        </main>
      </div>
      <SessionGuard />
    </div>
  )
}
