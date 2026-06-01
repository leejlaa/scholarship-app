import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import './App.css'
import type { AuthResponse } from './domain/entities'
import { clearStoredAuth, getStoredAuth, setStoredAuth } from './infrastructure/api'
import { completeAzureSignIn, signOutFromMicrosoft } from './infrastructure/auth/azureAuth'
import { ensureMsalInitialized, handleMsalRedirectOnce } from './infrastructure/auth/msalInstance'
import {
  ProtectedRoute,
  RolePortalLayout,
  defaultRouteForRole,
  normaliseRole,
} from './presentation/components/PortalLayout'
import { StudentDashboard } from './presentation/pages/StudentDashboard'
import { ReviewerDashboard } from './presentation/pages/ReviewerDashboard'
import { AdminDashboard } from './presentation/pages/AdminDashboard'
import { LoginPage } from './presentation/pages/LoginPage'
import { StudentProfilePage } from './presentation/pages/StudentProfilePage'
import { ReviewerProfilePage } from './presentation/pages/ReviewerProfilePage'
import { AdminProfilePage } from './presentation/pages/AdminProfilePage'
import { StudentApplyPage } from './presentation/pages/StudentApplyPage'
import { StudentManagePage } from './presentation/pages/StudentManagePage'

export default function App() {
  const navigate = useNavigate()
  const [auth, setAuth] = useState<AuthResponse | null>(() => getStoredAuth())
  const [ready, setReady] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  function handleAuthenticated(nextAuth: AuthResponse) {
    setStoredAuth(nextAuth)
    setAuth(nextAuth)
    setAuthError(null)
  }

  function handleLogout() {
    clearStoredAuth()
    setAuth(null)
    void signOutFromMicrosoft()
  }

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        await ensureMsalInitialized()
        const redirectResult = await handleMsalRedirectOnce()
        if (cancelled) return

        if (redirectResult?.account) {
          const portalAuth = await completeAzureSignIn(redirectResult.account, redirectResult)
          if (cancelled) return

          handleAuthenticated(portalAuth)
          navigate(defaultRouteForRole(normaliseRole(portalAuth.role)), { replace: true })
        }
      } catch (err) {
        if (cancelled) return
        const message = err instanceof Error ? err.message : 'Microsoft sign-in failed.'
        if (message.includes('Redirecting to Microsoft')) return

        setAuthError(message)
        navigate('/login', { replace: true })
      } finally {
        if (!cancelled) setReady(true)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [navigate])

  if (!ready) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    )
  }

  const homePath = auth ? defaultRouteForRole(normaliseRole(auth.role)) : '/login'

  return (
    <Routes>
      <Route path="/" element={<Navigate to={homePath} replace />} />
      <Route
        path="/login"
        element={
          auth ? (
            <Navigate to={homePath} replace />
          ) : (
            <LoginPage authError={authError} onDismissAuthError={() => setAuthError(null)} />
          )
        }
      />
      <Route
        path="/auth"
        element={
          auth ? (
            <Navigate to={homePath} replace />
          ) : (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
              <p className="text-sm text-muted-foreground">Completing Microsoft sign-in…</p>
            </div>
          )
        }
      />

      <Route
        path="/student"
        element={
          <ProtectedRoute auth={auth} allowed={['student']}>
            <RolePortalLayout auth={auth!} activeRole="student" onLogout={handleLogout} />
          </ProtectedRoute>
        }>
        <Route index element={<StudentDashboard />} />
        <Route path="profile" element={<StudentProfilePage />} />
        <Route path="apply" element={<StudentApplyPage />} />
        <Route path="application/:applicationId/documents" element={<StudentManagePage />} />
      </Route>

      <Route
        path="/reviewer"
        element={
          <ProtectedRoute auth={auth} allowed={['reviewer']}>
            <RolePortalLayout auth={auth!} activeRole="reviewer" onLogout={handleLogout} />
          </ProtectedRoute>
        }>
        <Route index element={<ReviewerDashboard />} />
        <Route path="profile" element={<ReviewerProfilePage />} />
      </Route>

      <Route
        path="/admin"
        element={
          <ProtectedRoute auth={auth} allowed={['admin']}>
            <RolePortalLayout auth={auth!} activeRole="admin" onLogout={handleLogout} />
          </ProtectedRoute>
        }>
        <Route index element={<AdminDashboard />} />
        <Route path="profile" element={<AdminProfilePage />} />
      </Route>

      <Route path="*" element={<Navigate to={homePath} replace />} />
    </Routes>
  )
}
