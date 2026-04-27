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
import { StudentProfilePage } from './presentation/pages/StudentProfilePage'
import { ReviewerProfilePage } from './presentation/pages/ReviewerProfilePage'
import { AdminProfilePage } from './presentation/pages/AdminProfilePage'

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
            <PortalLayout auth={auth!} activeRole="student" onLogout={handleLogout} pageTitle="Dashboard">
              <StudentDashboard />
            </PortalLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/student/profile"
        element={
          <ProtectedRoute auth={auth} allowed={['student']}>
            <PortalLayout auth={auth!} activeRole="student" onLogout={handleLogout} pageTitle="Profile">
              <StudentProfilePage />
            </PortalLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/reviewer"
        element={
          <ProtectedRoute auth={auth} allowed={['reviewer']}>
            <PortalLayout auth={auth!} activeRole="reviewer" onLogout={handleLogout} pageTitle="Dashboard">
              <ReviewerDashboard />
            </PortalLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/reviewer/profile"
        element={
          <ProtectedRoute auth={auth} allowed={['reviewer']}>
            <PortalLayout auth={auth!} activeRole="reviewer" onLogout={handleLogout} pageTitle="Profile">
              <ReviewerProfilePage />
            </PortalLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <ProtectedRoute auth={auth} allowed={['admin']}>
            <PortalLayout auth={auth!} activeRole="admin" onLogout={handleLogout} pageTitle="Dashboard">
              <AdminDashboard />
            </PortalLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/profile"
        element={
          <ProtectedRoute auth={auth} allowed={['admin']}>
            <PortalLayout auth={auth!} activeRole="admin" onLogout={handleLogout} pageTitle="Profile">
              <AdminProfilePage />
            </PortalLayout>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to={homePath} replace />} />
    </Routes>
  )
}
