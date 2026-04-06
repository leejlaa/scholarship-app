import { useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import type { AuthResponse } from './domain/entities'
import { clearStoredAuth, getStoredAuth, setStoredAuth } from './infrastructure/api'
import { PortalLayout, ProtectedRoute, defaultRouteForRole, normaliseRole } from './presentation/components/PortalLayout'
import { StudentDashboard } from './presentation/pages/StudentDashboard'
import { ReviewerDashboard } from './presentation/pages/ReviewerDashboard'
import { AdminDashboard } from './presentation/pages/AdminDashboard'
import { LoginPage } from './presentation/pages/LoginPage'

export default function App() {
  const [auth, setAuth] = useState<AuthResponse | null>(() => getStoredAuth())

  function handleAuthenticated(nextAuth: AuthResponse) {
    setStoredAuth(nextAuth)
    setAuth(nextAuth)
  }

  function handleLogout() {
    clearStoredAuth()
    setAuth(null)
  }

  const homePath = auth ? defaultRouteForRole(normaliseRole(auth.role)) : '/login'

  return (
    <Routes>
      <Route path="/" element={<Navigate to={homePath} replace />} />
      <Route
        path="/login"
        element={auth ? <Navigate to={homePath} replace /> : <LoginPage onAuthenticated={handleAuthenticated} />}
      />

      <Route
        path="/student"
        element={
          <ProtectedRoute auth={auth} allowed={['student']}>
            <PortalLayout auth={auth!} activeRole="student" onLogout={handleLogout}>
              <StudentDashboard />
            </PortalLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/reviewer"
        element={
          <ProtectedRoute auth={auth} allowed={['reviewer']}>
            <PortalLayout auth={auth!} activeRole="reviewer" onLogout={handleLogout}>
              <ReviewerDashboard />
            </PortalLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <ProtectedRoute auth={auth} allowed={['admin']}>
            <PortalLayout auth={auth!} activeRole="admin" onLogout={handleLogout}>
              <AdminDashboard />
            </PortalLayout>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to={homePath} replace />} />
    </Routes>
  )
}
