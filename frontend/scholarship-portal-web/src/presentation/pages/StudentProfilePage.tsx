import { useEffect, useState } from 'react'
import { Button } from '../components/ui/button'
import {
  getStudentProfile,
  updateStudentProfile,
  type UpdateStudentProfileRequest,
} from '../../infrastructure/api'

interface StudentProfileForm {
  studentNumber: string
  faculty: string
  department: string
  program: string
  currentYear: string
  gpa: string
  phoneNumber: string
  address: string
  nationality: string
  personalStatement: string
}

const EMPTY_FORM: StudentProfileForm = {
  studentNumber: '',
  faculty: '',
  department: '',
  program: '',
  currentYear: '',
  gpa: '',
  phoneNumber: '',
  address: '',
  nationality: '',
  personalStatement: '',
}

const inputCls = 'h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring disabled:opacity-50'

export function StudentProfilePage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [form, setForm] = useState<StudentProfileForm>(EMPTY_FORM)
  const [busy, setBusy] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function load() {
      setBusy(true)
      setError(null)
      try {
        const profile = await getStudentProfile()
        if (!active) return

        setFullName(profile.fullName)
        setEmail(profile.email)
        setForm({
          studentNumber: profile.studentNumber ?? '',
          faculty: profile.faculty ?? '',
          department: profile.department ?? '',
          program: profile.program ?? '',
          currentYear: profile.currentYear?.toString() ?? '',
          gpa: profile.gpa?.toString() ?? '',
          phoneNumber: profile.phoneNumber ?? '',
          address: profile.address ?? '',
          nationality: profile.nationality ?? '',
          personalStatement: profile.personalStatement ?? '',
        })
      } catch (err) {
        if (!active) return
        setError(err instanceof Error ? err.message : 'Failed to load profile')
      } finally {
        if (active) setBusy(false)
      }
    }

    void load()
    return () => { active = false }
  }, [])

  function patch<K extends keyof StudentProfileForm>(key: K, value: StudentProfileForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)

    const payload: UpdateStudentProfileRequest = {
      studentNumber: form.studentNumber || null,
      faculty: form.faculty || null,
      department: form.department || null,
      program: form.program || null,
      currentYear: form.currentYear ? Number(form.currentYear) : null,
      gpa: form.gpa ? Number(form.gpa) : null,
      phoneNumber: form.phoneNumber || null,
      address: form.address || null,
      nationality: form.nationality || null,
      personalStatement: form.personalStatement || null,
    }

    try {
      const updated = await updateStudentProfile(payload)
      setFullName(updated.fullName)
      setEmail(updated.email)
      setSuccess('Profile updated successfully.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  if (busy) {
    return <p className="text-sm text-muted-foreground px-6 py-8">Loading profile…</p>
  }

  return (
    <div className="max-w-2xl">
      <div className="rounded-xl border bg-card p-6 flex flex-col gap-6">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">Profile details</p>
          <h2 className="text-xl font-semibold text-foreground">Student profile</h2>
        </div>

        <form className="flex flex-col gap-4" onSubmit={handleSave}>
          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
              Full name
              <input className={inputCls} value={fullName} readOnly />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
              Email
              <input className={inputCls} value={email} readOnly />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
              Role
              <input className={inputCls} value="Student" readOnly />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
              Student number
              <input className={inputCls} value={form.studentNumber} onChange={(e) => patch('studentNumber', e.target.value)} />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
              Faculty
              <input className={inputCls} value={form.faculty} onChange={(e) => patch('faculty', e.target.value)} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
              Department
              <input className={inputCls} value={form.department} onChange={(e) => patch('department', e.target.value)} />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
              Program
              <input className={inputCls} value={form.program} onChange={(e) => patch('program', e.target.value)} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
              Current year
              <input className={inputCls} type="number" min={1} value={form.currentYear} onChange={(e) => patch('currentYear', e.target.value)} />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
              GPA
              <input className={inputCls} type="number" step="0.01" min={0} max={4} value={form.gpa} onChange={(e) => patch('gpa', e.target.value)} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
              Phone number
              <input className={inputCls} value={form.phoneNumber} onChange={(e) => patch('phoneNumber', e.target.value)} />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
              Address
              <input className={inputCls} value={form.address} onChange={(e) => patch('address', e.target.value)} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
              Nationality
              <input className={inputCls} value={form.nationality} onChange={(e) => patch('nationality', e.target.value)} />
            </label>
          </div>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
            Personal statement
            <textarea
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring resize-none"
              rows={4}
              value={form.personalStatement}
              onChange={(e) => patch('personalStatement', e.target.value)}
            />
          </label>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && <p className="text-sm text-green-700">{success}</p>}

          <div>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save profile'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
