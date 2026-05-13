import { useEffect, useState } from 'react'
import { useReviewQueue, useScholarships } from '../../application/hooks'
import { StatusBadge } from '../components/shared'
import { Button } from '../components/ui/button'
import { getReviewerProfile, updateReviewerProfile, type UpdateReviewerProfileRequest } from '../../infrastructure/api'
import type { ReviewerProfile } from '../../domain/entities'

interface Form {
  staffNumber: string; department: string; title: string; expertiseAreas: string
  officeLocation: string; phoneNumber: string; bio: string
  maxActiveReviews: string; isAvailable: boolean
}

const EMPTY: Form = {
  staffNumber: '', department: '', title: '', expertiseAreas: '',
  officeLocation: '', phoneNumber: '', bio: '', maxActiveReviews: '', isAvailable: true,
}

export function ReviewerProfilePage() {
  const reviews    = useReviewQueue()
  const scholarships = useScholarships()
  const [profile, setProfile] = useState<ReviewerProfile | null>(null)
  const [form, setForm]       = useState<Form>(EMPTY)
  const [busy, setBusy]       = useState(true)
  const [saving, setSaving]   = useState(false)
  const [err, setErr]         = useState('')
  const [ok, setOk]           = useState('')
  const [editOpen, setEditOpen] = useState(false)

  useEffect(() => {
    let active = true
    setBusy(true)
    getReviewerProfile()
      .then((p) => {
        if (!active) return
        setProfile(p)
        setForm({
          staffNumber: p.staffNumber ?? '', department: p.department ?? '',
          title: p.title ?? '', expertiseAreas: p.expertiseAreas ?? '',
          officeLocation: p.officeLocation ?? '', phoneNumber: p.phoneNumber ?? '',
          bio: p.bio ?? '', maxActiveReviews: p.maxActiveReviews?.toString() ?? '',
          isAvailable: p.isAvailable,
        })
      })
      .catch((e) => { if (active) setErr(e instanceof Error ? e.message : 'Failed to load') })
      .finally(() => { if (active) setBusy(false) })
    return () => { active = false }
  }, [])

  function patch<K extends keyof Form>(k: K, v: Form[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true); setErr(''); setOk('')
    const payload: UpdateReviewerProfileRequest = {
      staffNumber: form.staffNumber || null, department: form.department || null,
      title: form.title || null, expertiseAreas: form.expertiseAreas || null,
      officeLocation: form.officeLocation || null, phoneNumber: form.phoneNumber || null,
      bio: form.bio || null,
      maxActiveReviews: form.maxActiveReviews ? Number(form.maxActiveReviews) : null,
      isAvailable: form.isAvailable,
    }
    try {
      const updated = await updateReviewerProfile(payload)
      setProfile((p) => p ? { ...p, ...updated } : updated)
      setOk('Profile saved.'); setEditOpen(false)
    } catch (ex) { setErr(ex instanceof Error ? ex.message : 'Save failed') }
    finally { setSaving(false) }
  }

  if (busy) return <p className="text-sm text-muted-foreground py-8">Loading…</p>

  const allReviews    = reviews.data ?? []
  const myReviews     = allReviews.filter((r) => r.isMine)
  const pendingCount  = allReviews.filter((r) => !r.isMine).length
  const avgScore      = myReviews.length > 0
    ? Math.round(myReviews.reduce((s, r) => s + r.recommendedScore, 0) / myReviews.length)
    : null

  const storedAuth  = JSON.parse(localStorage.getItem('scholarship_portal_auth') ?? 'null') as { email?: string } | null
  const assignedScholarships = (scholarships.data ?? []).filter(
    (s) => s.assignedReviewerEmail === storedAuth?.email
  )

  const initials = profile?.fullName.split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() ?? '?'

  return (
    <div className="space-y-6 max-w-4xl">

      <div className="card">
        <div className="card-content">
          <div className="flex items-start gap-5">
            <div className="w-16 h-16 rounded-full bg-primary/10 text-primary text-xl font-bold flex items-center justify-center flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-foreground">{profile?.fullName}</h2>
              <p className="text-sm text-muted-foreground">{profile?.email}</p>
              <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2 text-sm">
                {profile?.title          && <span><span className="text-muted-foreground">Title:</span> {profile.title}</span>}
                {profile?.department     && <span><span className="text-muted-foreground">Dept:</span> {profile.department}</span>}
                {profile?.staffNumber    && <span><span className="text-muted-foreground">Staff #:</span> {profile.staffNumber}</span>}
                {profile?.officeLocation && <span><span className="text-muted-foreground">Office:</span> {profile.officeLocation}</span>}
              </div>
              {profile?.expertiseAreas && (
                <p className="text-sm text-muted-foreground mt-1.5">
                  <span className="font-medium text-foreground">Expertise:</span> {profile.expertiseAreas}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              <span className={`text-xs font-bold uppercase tracking-wide px-2.5 py-1 rounded-full border ${
                profile?.isAvailable
                  ? 'bg-green-100 text-green-700 border-green-200'
                  : 'bg-muted text-muted-foreground border-border'
              }`}>
                {profile?.isAvailable ? 'Available' : 'Unavailable'}
              </span>
              <Button className="btn btn-outline btn-sm" onClick={() => setEditOpen((o) => !o)}>
                {editOpen ? 'Close' : 'Edit details'}
              </Button>
            </div>
          </div>

          {editOpen && (
            <form className="mt-6 pt-6 border-t space-y-4" onSubmit={handleSave}>
              <div className="grid gap-4 sm:grid-cols-2">
                {([
                  ['staffNumber',   'Staff number',    'text'],
                  ['department',    'Department',      'text'],
                  ['title',         'Title',           'text'],
                  ['officeLocation','Office location', 'text'],
                  ['phoneNumber',   'Phone',           'text'],
                  ['maxActiveReviews','Max active reviews','number'],
                ] as [keyof Form, string, string][]).map(([k, label, type]) => (
                  <div key={k} className="form-group">
                    <label className="label">{label}</label>
                    <input className="input" type={type} value={form[k] as string}
                      onChange={(e) => patch(k, e.target.value)} />
                  </div>
                ))}
                <div className="form-group">
                  <label className="label">Available for assignments</label>
                  <select className="select" value={String(form.isAvailable)}
                    onChange={(e) => patch('isAvailable', e.target.value === 'true')}>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="label">Expertise areas</label>
                <textarea className="textarea" rows={2} value={form.expertiseAreas}
                  onChange={(e) => patch('expertiseAreas', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="label">Bio</label>
                <textarea className="textarea" rows={3} value={form.bio}
                  onChange={(e) => patch('bio', e.target.value)} />
              </div>
              {err && <div className="alert alert-error"><p className="text-sm">{err}</p></div>}
              {ok  && <div className="alert alert-success"><p className="text-sm">{ok}</p></div>}
              <Button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </Button>
            </form>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Reviews completed', value: myReviews.length },
          { label: 'Pending in queue',  value: pendingCount },
          { label: 'Average score',     value: avgScore !== null ? `${avgScore}/100` : '—' },
        ].map(({ label, value }) => (
          <div key={label} className="card">
            <div className="card-content">
              <p className="stat-label">{label}</p>
              <p className="stat-value">{value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">Assigned scholarships</h3>
            <p className="card-description">Scholarships you are responsible for reviewing</p>
          </div>
          <span className="text-sm text-muted-foreground">{assignedScholarships.length} assigned</span>
        </div>
        <div className="card-content">
          {scholarships.loading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!scholarships.loading && assignedScholarships.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">No scholarships assigned yet.</p>
          )}
          {assignedScholarships.length > 0 && (
            <div className="border rounded-lg overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Scholarship</th>
                    <th>Audience</th>
                    <th>Deadline</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {assignedScholarships.map((s) => (
                    <tr key={s.id}>
                      <td className="font-medium">{s.title}</td>
                      <td className="text-sm text-muted-foreground">{s.audience}</td>
                      <td className="text-sm">{new Date(s.deadline).toLocaleDateString()}</td>
                      <td><StatusBadge label={s.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
