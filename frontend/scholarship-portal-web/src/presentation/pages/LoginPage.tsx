import { useState } from 'react'
import { loginUser, registerUser } from '../../application/useCases'
import type { AuthResponse } from '../../domain/entities'
import { authApi } from '../../infrastructure/api'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'

type Props = {
  onAuthenticated: (auth: AuthResponse) => void
}

export function LoginPage({ onAuthenticated }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('Student')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true)
    setError(null)

    try {
      const auth = mode === 'login'
        ? await loginUser(authApi)({ email, password })
        : await registerUser(authApi)({ fullName, email, password, role })

      onAuthenticated(auth)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="app-shell auth-shell">
      <section className="panel auth-panel auth-panel-welcome">
        <div className="auth-copy">
          <p className="eyebrow">Scholarship Management Portal</p>
          <h1>Welcome to your scholarship workspace</h1>
          <p className="lead auth-lead">
            Sign in to manage scholarship opportunities, applications, reviews, and supporting documents from one secure platform.
          </p>

          <div className="auth-highlights">
            <div className="auth-highlight">
              <strong>Students</strong>
              <span>Apply and upload required documents in one place.</span>
            </div>
            <div className="auth-highlight">
              <strong>Reviewers</strong>
              <span>Assess submissions and post evaluation feedback efficiently.</span>
            </div>
            <div className="auth-highlight">
              <strong>Admins</strong>
              <span>Publish scholarship calls and monitor the full workflow.</span>
            </div>
          </div>
        </div>

        <Card className="auth-card">
          <CardHeader className="auth-card-header">
            <div className="auth-branding">
              <div className="brand-mark">SP</div>
              <div>
                <p className="eyebrow">Secure access</p>
                <CardTitle>{mode === 'login' ? 'Sign in' : 'Create account'}</CardTitle>
              </div>
            </div>

            <CardDescription className="auth-note">
              {mode === 'login'
                ? 'Use your account details to continue.'
                : 'Create your profile to start using the portal.'}
            </CardDescription>
          </CardHeader>

          <CardContent className="auth-card-body">
            <div className="role-switcher auth-switcher">
              <Button type="button" variant={mode === 'login' ? 'default' : 'outline'} onClick={() => setMode('login')}>Login</Button>
              <Button type="button" variant={mode === 'register' ? 'default' : 'outline'} onClick={() => setMode('register')}>Register</Button>
            </div>

            <form className="auth-form" onSubmit={handleSubmit}>
            {mode === 'register' && (
              <label className="form-field">
                <span>Full name</span>
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Amina Yusuf" required />
              </label>
            )}

            <div className="auth-grid">
              <label className="form-field">
                <span>Email</span>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </label>

              <label className="form-field">
                <span>Password</span>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </label>
            </div>

            {mode === 'register' && (
              <label className="form-field">
                <span>Role</span>
                <select value={role} onChange={(e) => setRole(e.target.value)}>
                  <option>Student</option>
                  <option>Reviewer</option>
                  <option>Admin</option>
                </select>
              </label>
            )}

            {error && <p className="auth-error">{error}</p>}

              <div className="form-actions">
                <Button type="submit" className="primary-action" disabled={busy}>
                  {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Register'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
