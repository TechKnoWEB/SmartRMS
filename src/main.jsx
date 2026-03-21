import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider }          from './context/ThemeContext'
import { SchoolProvider }         from './context/SchoolContext'
import { RootErrorBoundary }      from './components/ErrorBoundary'
import App from './App'
import './index.css'

// SchoolBridge reads the authenticated user from AuthContext and passes
// it down to SchoolProvider. Must live inside AuthProvider so useAuth() works.
function SchoolBridge({ children }) {
  const { user } = useAuth()
  return <SchoolProvider user={user}>{children}</SchoolProvider>
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/*
      RootErrorBoundary sits outside BrowserRouter intentionally — it must
      survive a crash in the router, any context provider, or App itself.
      It renders with inline styles only so it works even when Tailwind
      CSS has failed to load.
    */}
    <RootErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <SchoolBridge>
            <ThemeProvider>
              <App />
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 3500,
                  style: { fontSize: '13px', fontWeight: 600 },
                }}
              />
            </ThemeProvider>
          </SchoolBridge>
        </AuthProvider>
      </BrowserRouter>
    </RootErrorBoundary>
  </React.StrictMode>
)