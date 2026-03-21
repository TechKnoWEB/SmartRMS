import { useState } from 'react'
import { Menu, Moon, Sun, LogOut, Bell, Search } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { useNavigate, useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/students':  'Students',
  '/marks':     'Marks Entry',
  '/results':   'Results',
  '/analytics': 'Analytics',
  '/audit':     'Audit Trail',
  '/users':     'User Management',
  '/settings':  'Settings',
}

export default function Topbar({ onMenuClick }) {
  const { logout, user } = useAuth()
  const { theme, setTheme } = useTheme()
  const navigate  = useNavigate()
  const location  = useLocation()
  const [loggingOut, setLoggingOut] = useState(false)

  const pageTitle = PAGE_TITLES[location.pathname] || 'RMS'

  const handleLogout = async () => {
    setLoggingOut(true)
    await logout()
    toast.success('Goodbye, ' + user?.name + '!')
    navigate('/login')
  }

  const isDark = theme === 'dark'

  return (
    <header className="h-14 sticky top-0 z-10 flex items-center gap-3 px-4
      bg-white/80 dark:bg-gray-900/80 backdrop-blur-md glass
      border-b border-gray-100 dark:border-gray-800">

      {/* Mobile menu button */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Page title */}
      <div className="hidden lg:block">
        <h1 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wide">
          {pageTitle}
        </h1>
      </div>

      <div className="flex-1" />

      {/* Actions */}
      <div className="flex items-center gap-1">

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          className="p-2 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark
            ? <Sun className="w-4 h-4" />
            : <Moon className="w-4 h-4" />}
        </button>

        {/* Divider */}
        <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />

        {/* Logout */}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className={clsx(
            'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150',
            'text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400',
            'hover:bg-red-50 dark:hover:bg-red-900/20',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  )
}
