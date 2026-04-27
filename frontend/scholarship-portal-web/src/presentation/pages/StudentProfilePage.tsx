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
    return () => {
      active = false
    }
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
    return <p>Loading profile…</p>
  }

  return (
    <div className="content-grid">
      <section className="form-card">
        <div className="section-heading compact">
          <div>
            <p className="eyebrow">Profile details</p>
            <h2>Student profile</h2>
          </div>
        </div>

        <form className="crud-form" onSubmit={handleSave}>
          <div className="form-row">
            <label>Full name
              <input value={fullName} readOnly />
            </label>
            <label>Email
              <input value={email} readOnly />
            </label>
          </div>

          <div className="form-row">
            <label>Role
              <input value="Student" readOnly />
            </label>
            <label>Student number
              <input value={form.studentNumber} onChange={(e) => patch('studentNumber', e.target.value)} />
            </label>
          </div>

          <div className="form-row">
            <label>Faculty
              <input value={form.faculty} onChange={(e) => patch('faculty', e.target.value)} />
            </label>
            <label>Department
              <input value={form.department} onChange={(e) => patch('department', e.target.value)} />
            </label>
          </div>

          <div className="form-row">
            <label>Program
              <input value={form.program} onChange={(e) => patch('program', e.target.value)} />
            </label>
            <label>Current year
              <input type="number" min={1} value={form.currentYear} onChange={(e) => patch('currentYear', e.target.value)} />
            </label>
          </div>

          <div className="form-row">
            <label>GPA
              <input type="number" step="0.01" min={0} max={4} value={form.gpa} onChange={(e) => patch('gpa', e.target.value)} />
            </label>
            <label>Phone number
              <input value={form.phoneNumber} onChange={(e) => patch('phoneNumber', e.target.value)} />
            </label>
          </div>

          <div className="form-row">
            <label>Address
              <input value={form.address} onChange={(e) => patch('address', e.target.value)} />
            </label>
            <label>Nationality
              <input value={form.nationality} onChange={(e) => patch('nationality', e.target.value)} />
            </label>
          </div>

          <label>Personal statement
            <textarea rows={4} value={form.personalStatement} onChange={(e) => patch('personalStatement', e.target.value)} />
          </label>

          {error && <p className="auth-error">{error}</p>}
          {success && <p className="auth-success">{success}</p>}

          <div className="form-actions">
            <Button type="submit" className="primary-action" disabled={saving}>
              {saving ? 'Saving…' : 'Save profile'}
            </Button>
          </div>
        </form>
      </section>
    </div>
  )
}
