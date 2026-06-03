import { useState } from 'react'
import { Eye, EyeOff, ArrowRight } from 'lucide-react'
import { registerUser } from '../../application/useCases'
import { authApi } from '../../infrastructure/api'
import type { AuthResponse } from '../../domain/entities'
import { signInWithMicrosoft } from '../../infrastructure/auth/azureAuth'
import { Button } from '../components/ui/button'

type Props = {
  authError?: string | null
  onDismissAuthError?: () => void
  onLogin: (auth: AuthResponse) => void
}

const Field = ({ label, type = 'text', value, onChange, placeholder, required = false }: any) => (
  <label className="form-group">
    <span className="label">{label}</span>
    <input
      type={type}
      className="input"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
    />
  </label>
)

export function LoginPage({ authError, onDismissAuthError, onLogin }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [showPassword, setShowPassword] = useState(false)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginBusy, setLoginBusy] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('Student')
  const [studentNumber, setStudentNumber] = useState('')
  const [faculty, setFaculty] = useState('')
  const [department, setDepartment] = useState('')
  const [program, setProgram] = useState('')
  const [currentYear, setCurrentYear] = useState('')
  const [gpa, setGpa] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [address, setAddress] = useState('')
  const [nationality, setNationality] = useState('')
  const [personalStatement, setPersonalStatement] = useState('')
  const [staffNumber, setStaffNumber] = useState('')
  const [title, setTitle] = useState('')
  const [expertiseAreas, setExpertiseAreas] = useState('')
  const [officeLocation, setOfficeLocation] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [bio, setBio] = useState('')
  const [maxActiveReviews, setMaxActiveReviews] = useState('')
  const [isAvailable, setIsAvailable] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoginBusy(true)
    setLoginError(null)
    try {
      const result = await authApi.login({ email: loginEmail, password: loginPassword })
      onLogin(result)
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoginBusy(false)
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (mode === 'login') return

    setBusy(true)
    setError(null)
    setSuccess(null)
    try {
      await registerUser(authApi)({
            fullName, email, password, role,
            studentNumber: studentNumber || undefined,
            faculty: faculty || undefined,
            department: department || undefined,
            program: program || undefined,
            currentYear: currentYear ? Number(currentYear) : undefined,
            gpa: gpa ? Number(gpa) : undefined,
            dateOfBirth: dateOfBirth || undefined,
            address: address || undefined,
            nationality: nationality || undefined,
            personalStatement: personalStatement || undefined,
            staffNumber: staffNumber || undefined,
            title: title || undefined,
            expertiseAreas: expertiseAreas || undefined,
            officeLocation: officeLocation || undefined,
            phoneNumber: phoneNumber || undefined,
            bio: bio || undefined,
            maxActiveReviews: maxActiveReviews ? Number(maxActiveReviews) : undefined,
            isAvailable,
          })
      setMode('login')
      setSuccess('Account created. Sign in with Microsoft using the same email address.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen auth-page flex items-center justify-center p-4 sm:p-5">
      <div className={`w-full ${mode === 'register' ? 'max-w-3xl' : 'max-w-md'}`}>
        <div className={`card border-0 shadow-lg ${mode === 'register' ? 'auth-register-compact' : ''}`}>
          <div className="card-header border-0 pb-0">
            <div>
              <div className={`flex items-center gap-3 ${mode === 'register' ? 'mb-3' : 'mb-4'}`}>
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                  <img src="/ius-logo.png" alt="IUS" className="w-full h-full object-contain p-1" />
                </div>
                <span className="font-semibold text-foreground">Scholarship Portal</span>
              </div>
              <h1 className="card-title mb-1">{mode === 'login' ? 'Welcome back' : 'Create account'}</h1>
              <p className="card-description">International University of Sarajevo</p>
            </div>
          </div>

          <div className="card-content">
            <div className={`flex gap-2 ${mode === 'register' ? 'mb-4' : 'mb-6'}`}>
              <button
                onClick={() => { setMode('login'); setSuccess(null); setError(null) }}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors text-sm ${
                  mode === 'login'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}>
                Sign in
              </button>
              <button
                onClick={() => { setMode('register'); setSuccess(null); setError(null) }}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors text-sm ${
                  mode === 'register'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}>
                Register
              </button>
            </div>

            {mode === 'login' ? (
              <div className="space-y-4">
                {success && (
                  <div className="alert alert-success">
                    <p className="text-sm font-medium">{success}</p>
                  </div>
                )}
                {authError && (
                  <div className="alert alert-error">
                    <p className="text-sm font-medium">{authError}</p>
                    {onDismissAuthError && (
                      <button type="button" className="text-xs underline mt-1" onClick={onDismissAuthError}>Dismiss</button>
                    )}
                  </div>
                )}
                <Button type="button" className="w-full btn-primary" onClick={() => signInWithMicrosoft()}>
                  Sign in with Microsoft
                </Button>
                <div className="flex items-center gap-3">
                  <div className="flex-1 border-t border-border" />
                  <span className="text-xs text-muted-foreground">or</span>
                  <div className="flex-1 border-t border-border" />
                </div>
                <form onSubmit={handleLogin} className="space-y-3">
                  <div className="form-group">
                    <label className="label">Email</label>
                    <input className="input" type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder="you@example.com" required />
                  </div>
                  <div className="form-group">
                    <label className="label">Password</label>
                    <div className="relative">
                      <input
                        className="input pr-10"
                        type={showPassword ? 'text' : 'password'}
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                      />
                      <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  {loginError && <div className="alert alert-error"><p className="text-sm">{loginError}</p></div>}
                  <Button type="submit" className="w-full btn-outline" disabled={loginBusy}>
                    {loginBusy ? 'Signing in…' : 'Sign in with email'}
                  </Button>
                </form>
              </div>
            ) : (
            <form onSubmit={handleSubmit}>
              <div className="auth-register-grid">
                <section>
                  <p className="auth-register-section-title">Account</p>
                  <div className="auth-register-fields">
                    <Field label="Full name" value={fullName} onChange={(e: any) => setFullName(e.target.value)} placeholder="John Doe" required />
                    <Field label="Email" type="email" value={email} onChange={(e: any) => setEmail(e.target.value)} placeholder="you@example.com" required />
                    <label className="form-group">
                      <span className="label">Password</span>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          className="input"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </label>
                    <label className="form-group">
                      <span className="label">Role</span>
                      <select className="select" value={role} onChange={(e) => setRole(e.target.value)} required>
                        <option value="Student">Student</option>
                        <option value="Reviewer">Reviewer</option>
                        <option value="Admin">Admin</option>
                      </select>
                    </label>
                  </div>
                </section>

                <section>
                  <p className="auth-register-section-title">
                    {role === 'Student' ? 'Student profile' : role === 'Reviewer' ? 'Reviewer profile' : 'Admin profile'}
                  </p>
                  <div className="auth-register-fields">
                    {role === 'Student' && (
                      <>
                        <div className="auth-register-row">
                          <Field label="Student #" value={studentNumber} onChange={(e: any) => setStudentNumber(e.target.value)} />
                          <Field label="Faculty" value={faculty} onChange={(e: any) => setFaculty(e.target.value)} />
                        </div>
                        <div className="auth-register-row">
                          <Field label="Department" value={department} onChange={(e: any) => setDepartment(e.target.value)} />
                          <Field label="Program" value={program} onChange={(e: any) => setProgram(e.target.value)} />
                        </div>
                        <div className="auth-register-row">
                          <Field label="Year" type="number" value={currentYear} onChange={(e: any) => setCurrentYear(e.target.value)} />
                          <Field label="GPA" type="number" value={gpa} onChange={(e: any) => setGpa(e.target.value)} />
                        </div>
                        <div className="auth-register-row">
                          <Field label="DOB" type="date" value={dateOfBirth} onChange={(e: any) => setDateOfBirth(e.target.value)} />
                          <Field label="Nationality" value={nationality} onChange={(e: any) => setNationality(e.target.value)} />
                        </div>
                        <Field label="Address" value={address} onChange={(e: any) => setAddress(e.target.value)} />
                        <label className="form-group">
                          <span className="label">Statement</span>
                          <textarea className="textarea" rows={2} value={personalStatement} onChange={(e) => setPersonalStatement(e.target.value)} />
                        </label>
                      </>
                    )}

                    {role === 'Reviewer' && (
                      <>
                        <div className="auth-register-row">
                          <Field label="Staff #" value={staffNumber} onChange={(e: any) => setStaffNumber(e.target.value)} />
                          <Field label="Department" value={department} onChange={(e: any) => setDepartment(e.target.value)} />
                        </div>
                        <div className="auth-register-row">
                          <Field label="Title" value={title} onChange={(e: any) => setTitle(e.target.value)} />
                          <Field label="Office" value={officeLocation} onChange={(e: any) => setOfficeLocation(e.target.value)} />
                        </div>
                        <div className="auth-register-row">
                          <Field label="Phone" value={phoneNumber} onChange={(e: any) => setPhoneNumber(e.target.value)} />
                          <Field label="Max reviews" type="number" value={maxActiveReviews} onChange={(e: any) => setMaxActiveReviews(e.target.value)} />
                        </div>
                        <label className="form-group">
                          <span className="label">Available</span>
                          <select className="select" value={String(isAvailable)} onChange={(e) => setIsAvailable(e.target.value === 'true')}>
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                          </select>
                        </label>
                        <label className="form-group">
                          <span className="label">Expertise</span>
                          <textarea className="textarea" rows={2} value={expertiseAreas} onChange={(e) => setExpertiseAreas(e.target.value)} />
                        </label>
                        <label className="form-group">
                          <span className="label">Bio</span>
                          <textarea className="textarea" rows={2} value={bio} onChange={(e) => setBio(e.target.value)} />
                        </label>
                      </>
                    )}

                    {role === 'Admin' && (
                      <>
                        <div className="auth-register-row">
                          <Field label="Department" value={department} onChange={(e: any) => setDepartment(e.target.value)} />
                          <Field label="Title" value={title} onChange={(e: any) => setTitle(e.target.value)} />
                        </div>
                        <div className="auth-register-row">
                          <Field label="Office" value={officeLocation} onChange={(e: any) => setOfficeLocation(e.target.value)} />
                          <Field label="Phone" value={phoneNumber} onChange={(e: any) => setPhoneNumber(e.target.value)} />
                        </div>
                      </>
                    )}
                  </div>
                </section>
              </div>

              <div className="auth-register-submit border-t border-border space-y-3">
                {error && (
                  <div className="alert alert-error">
                    <p className="text-sm font-medium">{error}</p>
                  </div>
                )}

                <Button type="submit" className="w-full btn-primary" disabled={busy}>
                  {busy ? 'Please wait…' : 'Create account'}
                  {!busy && <ArrowRight size={16} />}
                </Button>
              </div>
            </form>
            )}
          </div>
        </div>

        {mode === 'login' && (
          <p className="text-center text-xs auth-page-footer mt-3">
            Don&apos;t have an account?{' '}
            <button
              type="button"
              onClick={() => { setMode('register'); setSuccess(null); setError(null) }}
              className="auth-page-link">
              Register
            </button>
          </p>
        )}

        {mode === 'register' && (
          <p className="text-center text-xs auth-page-footer mt-3">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => {
                setSuccess(null)
                setError(null)
                signInWithMicrosoft()
              }}
              className="auth-page-link">
              Sign in with Microsoft
            </button>
          </p>
        )}
      </div>
    </div>
  )
}
