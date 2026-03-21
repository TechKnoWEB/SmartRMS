// src/context/ThemeContext.jsx
// Theme is stored only in the DB (user_preferences).
// localStorage is no longer used — fixes security flag #14.
// Falls back to 'light' when not logged in.
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const { user } = useAuth()
  const [theme, setThemeState] = useState('light')
  const [loaded, setLoaded]   = useState(false)

  // Apply theme to DOM
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') root.classList.add('dark')
    else root.classList.remove('dark')
  }, [theme])

  // Load from DB when user logs in
  useEffect(() => {
    if (!user) {
      setThemeState('light')
      setLoaded(true)
      return
    }
    if (!supabase) { setLoaded(true); return }
    supabase
      .from('user_preferences')
      .select('theme')
      .eq('user_id', user.user_id)
      .single()
      .then(({ data }) => {
        if (data?.theme) setThemeState(data.theme)
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [user?.user_id])

  const setTheme = async (t) => {
    setThemeState(t)
    if (user) {
      await supabase
        .from('user_preferences')
        .upsert({ user_id: user.user_id, theme: t }, { onConflict: 'user_id' })
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themeLoaded: loaded }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
