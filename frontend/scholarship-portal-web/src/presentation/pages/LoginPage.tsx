import { useState } from 'react'
import { loginUser, registerUser } from '../../application/useCases'
import type { AuthResponse } from '../../domain/entities'
import { authApi } from '../../infrastructure/api'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'

type Props = {
  onAuthenticated: (auth: AuthResponse) => void
}

export function LoginPage({ onAuthenticated }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true)
    setError(null)

    try {
      const auth = mode === 'login'
        ? await loginUser(authApi)({ email, password })
        : await registerUser(authApi)({
          fullName,
          email,
          password,
          role,
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
          <p className="eyebrow">Scholaship application</p>
          <h1>International University of Sarajevo</h1>
        </div>

        <Card className="auth-card">
          <CardHeader className="auth-card-header">
            <div className="auth-branding">
              <div className="brand-mark">
                <img src="/ius-logo.png" alt="IUS logo" className="brand-logo-img" />
              </div>
              <div>
                <p className="eyebrow">Secure access</p>
                <CardTitle>{mode === 'login' ? 'Sign in' : 'Create account'}</CardTitle>
              </div>
            </div>

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

            {mode === 'register' && role === 'Student' && (
              <>
                <div className="auth-grid">
                  <label className="form-field">
                    <span>Student number</span>
                    <input value={studentNumber} onChange={(e) => setStudentNumber(e.target.value)} />
                  </label>
                  <label className="form-field">
                    <span>Faculty</span>
                    <input value={faculty} onChange={(e) => setFaculty(e.target.value)} />
                  </label>
                </div>

                <div className="auth-grid">
                  <label className="form-field">
                    <span>Department</span>
                    <input value={department} onChange={(e) => setDepartment(e.target.value)} />
                  </label>
                  <label className="form-field">
                    <span>Program</span>
                    <input value={program} onChange={(e) => setProgram(e.target.value)} />
                  </label>
                </div>

                <label className="form-field">
                  <span>Current year</span>
                  <input type="number" min={1} value={currentYear} onChange={(e) => setCurrentYear(e.target.value)} />
                </label>

                <div className="auth-grid">
                  <label className="form-field">
                    <span>GPA</span>
                    <input type="number" min={0} max={4} step="0.01" value={gpa} onChange={(e) => setGpa(e.target.value)} />
                  </label>
                  <label className="form-field">
                    <span>Date of birth</span>
                    <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
                  </label>
                </div>

                <div className="auth-grid">
                  <label className="form-field">
                    <span>Address</span>
                    <input value={address} onChange={(e) => setAddress(e.target.value)} />
                  </label>
                  <label className="form-field">
                    <span>Nationality</span>
                    <input value={nationality} onChange={(e) => setNationality(e.target.value)} />
                  </label>
                </div>

                <label className="form-field">
                  <span>Personal statement</span>
                  <textarea rows={3} value={personalStatement} onChange={(e) => setPersonalStatement(e.target.value)} />
                </label>
              </>
            )}

            {mode === 'register' && role === 'Reviewer' && (
              <>
                <div className="auth-grid">
                  <label className="form-field">
                    <span>Staff number</span>
                    <input value={staffNumber} onChange={(e) => setStaffNumber(e.target.value)} />
                  </label>
                  <label className="form-field">
                    <span>Department</span>
                    <input value={department} onChange={(e) => setDepartment(e.target.value)} />
                  </label>
                </div>

                <div className="auth-grid">
                  <label className="form-field">
                    <span>Title</span>
                    <input value={title} onChange={(e) => setTitle(e.target.value)} />
                  </label>
                  <label className="form-field">
                    <span>Office location</span>
                    <input value={officeLocation} onChange={(e) => setOfficeLocation(e.target.value)} />
                  </label>
                </div>

                <label className="form-field">
                  <span>Phone number</span>
                  <input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
                </label>

                <label className="form-field">
                  <span>Expertise areas</span>
                  <textarea rows={3} value={expertiseAreas} onChange={(e) => setExpertiseAreas(e.target.value)} />
                </label>

                <div className="auth-grid">
                  <label className="form-field">
                    <span>Max active reviews</span>
                    <input type="number" min={0} value={maxActiveReviews} onChange={(e) => setMaxActiveReviews(e.target.value)} />
                  </label>
                  <label className="form-field">
                    <span>Available</span>
                    <select value={String(isAvailable)} onChange={(e) => setIsAvailable(e.target.value === 'true')}>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  </label>
                </div>

                <label className="form-field">
                  <span>Bio</span>
                  <textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
                </label>
              </>
            )}

            {mode === 'register' && role === 'Admin' && (
              <>
                <div className="auth-grid">
                  <label className="form-field">
                    <span>Department</span>
                    <input value={department} onChange={(e) => setDepartment(e.target.value)} />
                  </label>
                  <label className="form-field">
                    <span>Title</span>
                    <input value={title} onChange={(e) => setTitle(e.target.value)} />
                  </label>
                </div>

                <div className="auth-grid">
                  <label className="form-field">
                    <span>Office location</span>
                    <input value={officeLocation} onChange={(e) => setOfficeLocation(e.target.value)} />
                  </label>
                  <label className="form-field">
                    <span>Phone number</span>
                    <input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
                  </label>
                </div>
              </>
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
