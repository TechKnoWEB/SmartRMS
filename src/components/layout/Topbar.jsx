import { useState } from 'react'
import { Menu, Moon, Sun, LogOut, GraduationCap } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import clsx from 'clsx'

export default function Topbar({ onMenuClick, collapsed, onToggleCollapse }) {
  const { logout, user, school } = useAuth()
  const { theme, setTheme } = useTheme()
  const navigate    = useNavigate()
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    setLoggingOut(true)
    await logout()
    toast.success('Goodbye, ' + user?.name + '!')
    navigate('/login')
  }

  const isDark = theme === 'dark'

  return (
    <header className="h-14 z-40 flex items-center gap-3 px-4
      bg-white/80 dark:bg-gray-900/80 backdrop-blur-md glass
      border-b border-gray-100 dark:border-gray-800">

      {/* Mobile: open overlay sidebar */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Desktop: collapse / expand sidebar */}
      <button
        onClick={onToggleCollapse}
        className={clsx(
          'hidden lg:flex p-2 rounded-lg transition-colors',
          'text-gray-500 hover:text-gray-900 dark:hover:text-white',
          'hover:bg-gray-100 dark:hover:bg-gray-800',
          collapsed && 'text-primary-600 dark:text-primary-400'
        )}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* School branding */}
      <div className="flex items-center gap-2.5 min-w-0">
        {school?.logo_url ? (
          <img
            src={school.logo_url}
            alt="School logo"
            className="w-8 h-8 rounded-lg object-contain bg-white border border-gray-100 dark:border-gray-700 flex-shrink-0 p-0.5"
          />
        ) : (
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-sm flex-shrink-0">
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
        )}
        <div className="min-w-0 hidden sm:block">
          <p className="font-black text-sm text-gray-900 dark:text-white truncate leading-tight">
            {school?.school_name || 'School RMS'}
          </p>
          {school?.academic_session && (
            <p className="text-xs text-gray-400 truncate leading-tight">
              Session: {school.academic_session}
            </p>
          )}
        </div>
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
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
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
