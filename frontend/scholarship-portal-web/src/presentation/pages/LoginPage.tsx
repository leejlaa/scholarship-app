import { useState } from 'react'
import { loginUser, registerUser } from '../../application/useCases'
import type { AuthResponse } from '../../domain/entities'
import { authApi } from '../../infrastructure/api'
import { Button } from '../components/ui/button'

const inputCls = 'h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring disabled:opacity-50'
const selectCls = 'h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring'

type Props = { onAuthenticated: (auth: AuthResponse) => void }

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
      onAuthenticated(auth)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-4xl overflow-hidden rounded-2xl border shadow-xl flex">
        {/* Brand panel */}
        <div className="hidden md:flex flex-col justify-between bg-primary p-10 w-96 flex-none">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/10 overflow-hidden border border-white/20 flex-none">
              <img src="/ius-logo.png" alt="IUS" className="w-full h-full object-contain p-0.5" />
            </div>
            <span className="text-primary-foreground/80 text-sm font-medium">Scholarship App</span>
          </div>
          <div className="flex flex-col gap-4">
            <p className="text-primary-foreground/60 text-xs font-semibold uppercase tracking-widest">Secure portal</p>
            <h1 className="text-3xl font-bold text-primary-foreground leading-tight">
              International University of Sarajevo
            </h1>
            <p className="text-primary-foreground/70 text-sm leading-relaxed">
              Apply for scholarships, track your progress, and manage documents — all in one place.
            </p>
          </div>
          <div />
        </div>

        {/* Form panel */}
        <div className="flex-1 bg-card p-8 flex flex-col gap-5 overflow-y-auto max-h-screen">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Secure access</p>
            <h2 className="text-xl font-semibold text-foreground">
              {mode === 'login' ? 'Sign in to your account' : 'Create a new account'}
            </h2>
          </div>

          <div className="flex gap-2">
            <Button variant={mode === 'login' ? 'default' : 'outline'} onClick={() => setMode('login')}>Login</Button>
            <Button variant={mode === 'register' ? 'default' : 'outline'} onClick={() => setMode('register')}>Register</Button>
          </div>

          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            {mode === 'register' && (
              <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
                Full name
                <input className={inputCls} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Amina Yusuf" required />
              </label>
            )}

            <div className="grid grid-cols-2 gap-4">
              <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
                Email
                <input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
                Password
                <input className={inputCls} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </label>
            </div>

            {mode === 'register' && (
              <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
                Role
                <select className={selectCls} value={role} onChange={(e) => setRole(e.target.value)}>
                  <option>Student</option>
                  <option>Reviewer</option>
                  <option>Admin</option>
                </select>
              </label>
            )}

            {mode === 'register' && role === 'Student' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
                    Student number
                    <input className={inputCls} value={studentNumber} onChange={(e) => setStudentNumber(e.target.value)} />
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
                    Faculty
                    <input className={inputCls} value={faculty} onChange={(e) => setFaculty(e.target.value)} />
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
                    Department
                    <input className={inputCls} value={department} onChange={(e) => setDepartment(e.target.value)} />
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
                    Program
                    <input className={inputCls} value={program} onChange={(e) => setProgram(e.target.value)} />
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
                    Current year
                    <input className={inputCls} type="number" min={1} value={currentYear} onChange={(e) => setCurrentYear(e.target.value)} />
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
                    GPA
                    <input className={inputCls} type="number" min={0} max={4} step="0.01" value={gpa} onChange={(e) => setGpa(e.target.value)} />
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
                    Date of birth
                    <input className={inputCls} type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
                    Nationality
                    <input className={inputCls} value={nationality} onChange={(e) => setNationality(e.target.value)} />
                  </label>
                </div>
                <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
                  Address
                  <input className={inputCls} value={address} onChange={(e) => setAddress(e.target.value)} />
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
                  Personal statement
                  <textarea className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring resize-none" rows={3} value={personalStatement} onChange={(e) => setPersonalStatement(e.target.value)} />
                </label>
              </>
            )}

            {mode === 'register' && role === 'Reviewer' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
                    Staff number
                    <input className={inputCls} value={staffNumber} onChange={(e) => setStaffNumber(e.target.value)} />
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
                    Department
                    <input className={inputCls} value={department} onChange={(e) => setDepartment(e.target.value)} />
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
                    Title
                    <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} />
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
                    Office location
                    <input className={inputCls} value={officeLocation} onChange={(e) => setOfficeLocation(e.target.value)} />
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
                    Phone number
                    <input className={inputCls} value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
                    Max active reviews
                    <input className={inputCls} type="number" min={0} value={maxActiveReviews} onChange={(e) => setMaxActiveReviews(e.target.value)} />
                  </label>
                </div>
                <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
                  Available
                  <select className={selectCls} value={String(isAvailable)} onChange={(e) => setIsAvailable(e.target.value === 'true')}>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
                  Expertise areas
                  <textarea className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring resize-none" rows={3} value={expertiseAreas} onChange={(e) => setExpertiseAreas(e.target.value)} />
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
                  Bio
                  <textarea className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring resize-none" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
                </label>
              </>
            )}

            {mode === 'register' && role === 'Admin' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
                    Department
                    <input className={inputCls} value={department} onChange={(e) => setDepartment(e.target.value)} />
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
                    Title
                    <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} />
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
                    Office location
                    <input className={inputCls} value={officeLocation} onChange={(e) => setOfficeLocation(e.target.value)} />
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
                    Phone number
                    <input className={inputCls} value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
                  </label>
                </div>
              </>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Register'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
