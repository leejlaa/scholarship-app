import { useEffect, useState } from 'react'
import { Button } from '../components/ui/button'
import {
  getReviewerProfile,
  updateReviewerProfile,
  type UpdateReviewerProfileRequest,
} from '../../infrastructure/api'

interface ReviewerProfileForm {
  staffNumber: string
  department: string
  title: string
  expertiseAreas: string
  officeLocation: string
  phoneNumber: string
  bio: string
  maxActiveReviews: string
  isAvailable: boolean
}

const EMPTY_FORM: ReviewerProfileForm = {
  staffNumber: '',
  department: '',
  title: '',
  expertiseAreas: '',
  officeLocation: '',
  phoneNumber: '',
  bio: '',
  maxActiveReviews: '',
  isAvailable: true,
}

export function ReviewerProfilePage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [form, setForm] = useState<ReviewerProfileForm>(EMPTY_FORM)
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
        const profile = await getReviewerProfile()
        if (!active) return

        setFullName(profile.fullName)
        setEmail(profile.email)
        setForm({
          staffNumber: profile.staffNumber ?? '',
          department: profile.department ?? '',
          title: profile.title ?? '',
          expertiseAreas: profile.expertiseAreas ?? '',
          officeLocation: profile.officeLocation ?? '',
          phoneNumber: profile.phoneNumber ?? '',
          bio: profile.bio ?? '',
          maxActiveReviews: profile.maxActiveReviews?.toString() ?? '',
          isAvailable: profile.isAvailable,
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

  function patch<K extends keyof ReviewerProfileForm>(key: K, value: ReviewerProfileForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)

    const payload: UpdateReviewerProfileRequest = {
      staffNumber: form.staffNumber || null,
      department: form.department || null,
      title: form.title || null,
      expertiseAreas: form.expertiseAreas || null,
      officeLocation: form.officeLocation || null,
      phoneNumber: form.phoneNumber || null,
      bio: form.bio || null,
      maxActiveReviews: form.maxActiveReviews ? Number(form.maxActiveReviews) : null,
      isAvailable: form.isAvailable,
    }

    try {
      const updated = await updateReviewerProfile(payload)
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
            <h2>Reviewer profile</h2>
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
              <input value="Reviewer" readOnly />
            </label>
            <label>Staff number
              <input value={form.staffNumber} onChange={(e) => patch('staffNumber', e.target.value)} />
            </label>
          </div>

          <div className="form-row">
            <label>Department
              <input value={form.department} onChange={(e) => patch('department', e.target.value)} />
            </label>
            <label>Title
              <input value={form.title} onChange={(e) => patch('title', e.target.value)} />
            </label>
          </div>

          <div className="form-row">
            <label>Office location
              <input value={form.officeLocation} onChange={(e) => patch('officeLocation', e.target.value)} />
            </label>
            <label>Phone number
              <input value={form.phoneNumber} onChange={(e) => patch('phoneNumber', e.target.value)} />
            </label>
          </div>

          <div className="form-row">
            <label>Max active reviews
              <input type="number" min={0} value={form.maxActiveReviews} onChange={(e) => patch('maxActiveReviews', e.target.value)} />
            </label>
            <label>Available for assignments
              <select value={String(form.isAvailable)} onChange={(e) => patch('isAvailable', e.target.value === 'true')}>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </label>
          </div>

          <label>Expertise areas
            <textarea rows={3} value={form.expertiseAreas} onChange={(e) => patch('expertiseAreas', e.target.value)} />
          </label>

          <label>Bio
            <textarea rows={3} value={form.bio} onChange={(e) => patch('bio', e.target.value)} />
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
