import { useEffect, useState } from 'react'
import { Button } from '../components/ui/button'
import {
  getAdminProfile,
  updateAdminProfile,
  type UpdateAdminProfileRequest,
} from '../../infrastructure/api'

interface AdminProfileForm {
  department: string
  title: string
  officeLocation: string
  phoneNumber: string
}

const EMPTY_FORM: AdminProfileForm = {
  department: '',
  title: '',
  officeLocation: '',
  phoneNumber: '',
}

export function AdminProfilePage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [form, setForm] = useState<AdminProfileForm>(EMPTY_FORM)
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
        const profile = await getAdminProfile()
        if (!active) return

        setFullName(profile.fullName)
        setEmail(profile.email)
        setForm({
          department: profile.department ?? '',
          title: profile.title ?? '',
          officeLocation: profile.officeLocation ?? '',
          phoneNumber: profile.phoneNumber ?? '',
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

  function patch<K extends keyof AdminProfileForm>(key: K, value: AdminProfileForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)

    const payload: UpdateAdminProfileRequest = {
      department: form.department || null,
      title: form.title || null,
      officeLocation: form.officeLocation || null,
      phoneNumber: form.phoneNumber || null,
    }

    try {
      const updated = await updateAdminProfile(payload)
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
            <h2>Admin profile</h2>
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
              <input value="Admin" readOnly />
            </label>
            <label>Department
              <input value={form.department} onChange={(e) => patch('department', e.target.value)} />
            </label>
          </div>

          <div className="form-row">
            <label>Title
              <input value={form.title} onChange={(e) => patch('title', e.target.value)} />
            </label>
            <label>Office location
              <input value={form.officeLocation} onChange={(e) => patch('officeLocation', e.target.value)} />
            </label>
          </div>

          <div className="form-row">
            <label>Phone number
              <input value={form.phoneNumber} onChange={(e) => patch('phoneNumber', e.target.value)} />
            </label>
            <label>Account status
              <input value="Active" readOnly />
            </label>
          </div>

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
