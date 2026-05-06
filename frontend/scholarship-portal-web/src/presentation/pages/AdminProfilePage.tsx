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

const inputCls = 'h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring disabled:opacity-50'

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
    return () => { active = false }
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
    return <p className="text-sm text-muted-foreground px-6 py-8">Loading profile…</p>
  }

  return (
    <div className="max-w-2xl">
      <div className="rounded-xl border bg-card p-6 flex flex-col gap-6">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">Profile details</p>
          <h2 className="text-xl font-semibold text-foreground">Admin profile</h2>
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
              <input className={inputCls} value="Admin" readOnly />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
              Department
              <input className={inputCls} value={form.department} onChange={(e) => patch('department', e.target.value)} />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
              Title
              <input className={inputCls} value={form.title} onChange={(e) => patch('title', e.target.value)} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
              Office location
              <input className={inputCls} value={form.officeLocation} onChange={(e) => patch('officeLocation', e.target.value)} />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
              Phone number
              <input className={inputCls} value={form.phoneNumber} onChange={(e) => patch('phoneNumber', e.target.value)} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
              Account status
              <input className={inputCls} value="Active" readOnly />
            </label>
          </div>

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
