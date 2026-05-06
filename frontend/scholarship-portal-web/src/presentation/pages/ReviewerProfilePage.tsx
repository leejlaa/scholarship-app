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

const inputCls = 'h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring disabled:opacity-50'
const selectCls = 'h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring'

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
    return () => { active = false }
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
    return <p className="text-sm text-muted-foreground px-6 py-8">Loading profile…</p>
  }

  return (
    <div className="max-w-2xl">
      <div className="rounded-xl border bg-card p-6 flex flex-col gap-6">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">Profile details</p>
          <h2 className="text-xl font-semibold text-foreground">Reviewer profile</h2>
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
              <input className={inputCls} value="Reviewer" readOnly />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
              Staff number
              <input className={inputCls} value={form.staffNumber} onChange={(e) => patch('staffNumber', e.target.value)} />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
              Department
              <input className={inputCls} value={form.department} onChange={(e) => patch('department', e.target.value)} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
              Title
              <input className={inputCls} value={form.title} onChange={(e) => patch('title', e.target.value)} />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
              Office location
              <input className={inputCls} value={form.officeLocation} onChange={(e) => patch('officeLocation', e.target.value)} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
              Phone number
              <input className={inputCls} value={form.phoneNumber} onChange={(e) => patch('phoneNumber', e.target.value)} />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
              Max active reviews
              <input className={inputCls} type="number" min={0} value={form.maxActiveReviews} onChange={(e) => patch('maxActiveReviews', e.target.value)} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
              Available for assignments
              <select className={selectCls} value={String(form.isAvailable)} onChange={(e) => patch('isAvailable', e.target.value === 'true')}>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </label>
          </div>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
            Expertise areas
            <textarea
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring resize-none"
              rows={3}
              value={form.expertiseAreas}
              onChange={(e) => patch('expertiseAreas', e.target.value)}
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
            Bio
            <textarea
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring resize-none"
              rows={3}
              value={form.bio}
              onChange={(e) => patch('bio', e.target.value)}
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
