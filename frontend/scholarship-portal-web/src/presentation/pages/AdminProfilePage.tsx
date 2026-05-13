import { useEffect, useState } from 'react'
import { usePortalOverview, useApplications, useScholarships } from '../../application/hooks'
import { StatusBadge } from '../components/shared'
import { Button } from '../components/ui/button'
import { getAdminProfile, updateAdminProfile, type UpdateAdminProfileRequest } from '../../infrastructure/api'
import type { AdminProfile } from '../../domain/entities'

interface Form {
  department: string; title: string; officeLocation: string; phoneNumber: string
}

const EMPTY: Form = { department: '', title: '', officeLocation: '', phoneNumber: '' }

export function AdminProfilePage() {
  const overview     = usePortalOverview()
  const applications = useApplications()
  const scholarships = useScholarships()
  const [profile, setProfile] = useState<AdminProfile | null>(null)
  const [form, setForm]       = useState<Form>(EMPTY)
  const [busy, setBusy]       = useState(true)
  const [saving, setSaving]   = useState(false)
  const [err, setErr]         = useState('')
  const [ok, setOk]           = useState('')
  const [editOpen, setEditOpen] = useState(false)

  useEffect(() => {
    let active = true
    setBusy(true)
    getAdminProfile()
      .then((p) => {
        if (!active) return
        setProfile(p)
        setForm({
          department: p.department ?? '', title: p.title ?? '',
          officeLocation: p.officeLocation ?? '', phoneNumber: p.phoneNumber ?? '',
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
    const payload: UpdateAdminProfileRequest = {
      department: form.department || null, title: form.title || null,
      officeLocation: form.officeLocation || null, phoneNumber: form.phoneNumber || null,
    }
    try {
      const updated = await updateAdminProfile(payload)
      setProfile((p) => p ? { ...p, ...updated } : updated)
      setOk('Profile saved.'); setEditOpen(false)
    } catch (ex) { setErr(ex instanceof Error ? ex.message : 'Save failed') }
    finally { setSaving(false) }
  }

  if (busy) return <p className="text-sm text-muted-foreground py-8">Loading…</p>

  const apps = applications.data ?? []
  const recentDecisions = apps
    .filter((a) => a.status === 'Approved' || a.status === 'Shortlisted')
    .slice(0, 10)

  const openScholarships   = (scholarships.data ?? []).filter((s) => s.status.toLowerCase() === 'open')
  const closedScholarships = (scholarships.data ?? []).filter((s) => s.status.toLowerCase() === 'closed')

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
                {profile?.officeLocation && <span><span className="text-muted-foreground">Office:</span> {profile.officeLocation}</span>}
                {profile?.phoneNumber    && <span><span className="text-muted-foreground">Phone:</span> {profile.phoneNumber}</span>}
              </div>
            </div>
            <Button className="btn btn-outline btn-sm flex-shrink-0" onClick={() => setEditOpen((o) => !o)}>
              {editOpen ? 'Close' : 'Edit details'}
            </Button>
          </div>

          {editOpen && (
            <form className="mt-6 pt-6 border-t space-y-4" onSubmit={handleSave}>
              <div className="grid gap-4 sm:grid-cols-2">
                {([
                  ['title',         'Title',           'text'],
                  ['department',    'Department',      'text'],
                  ['officeLocation','Office location', 'text'],
                  ['phoneNumber',   'Phone',           'text'],
                ] as [keyof Form, string, string][]).map(([k, label, type]) => (
                  <div key={k} className="form-group">
                    <label className="label">{label}</label>
                    <input className="input" type={type} value={form[k]}
                      onChange={(e) => patch(k, e.target.value)} />
                  </div>
                ))}
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total students',     value: overview.data?.totalStudents      ?? '—' },
          { label: 'Open scholarships',  value: overview.data?.totalOpenScholarships ?? '—' },
          { label: 'Pending reviews',    value: overview.data?.pendingReviews     ?? '—' },
          { label: 'Published results',  value: overview.data?.publishedResults   ?? '—' },
        ].map(({ label, value }) => (
          <div key={label} className="card">
            <div className="card-content">
              <p className="stat-label">{label}</p>
              <p className="stat-value">{value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Scholarship overview</h3>
              <p className="card-description">Current state of all scholarships</p>
            </div>
          </div>
          <div className="card-content">
            {scholarships.loading && <p className="text-sm text-muted-foreground">Loading…</p>}
            {!scholarships.loading && (scholarships.data ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">No scholarships found.</p>
            )}
            {(scholarships.data ?? []).length > 0 && (
              <div className="space-y-2">
                {[
                  { label: 'Open',   items: openScholarships,   color: 'bg-green-100 text-green-700 border-green-200' },
                  { label: 'Closed', items: closedScholarships, color: 'bg-muted text-muted-foreground border-border' },
                ].map(({ label, items, color }) => (
                  items.length > 0 && (
                    <div key={label}>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">{label} ({items.length})</p>
                      {items.map((s) => (
                        <div key={s.id} className="flex items-center justify-between py-2 border-b last:border-0">
                          <span className="text-sm font-medium truncate flex-1 mr-3">{s.title}</span>
                          <span className={`text-[0.6rem] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full border flex-shrink-0 ${color}`}>
                            {label}
                          </span>
                        </div>
                      ))}
                    </div>
                  )
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Recent decisions</h3>
              <p className="card-description">Approved and shortlisted applications</p>
            </div>
          </div>
          <div className="card-content">
            {applications.loading && <p className="text-sm text-muted-foreground">Loading…</p>}
            {!applications.loading && recentDecisions.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">No decisions yet.</p>
            )}
            {recentDecisions.map((a) => (
              <div key={a.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="min-w-0 flex-1 mr-3">
                  <p className="text-sm font-medium truncate">{a.studentName}</p>
                  <p className="text-xs text-muted-foreground truncate">{a.scholarshipTitle}</p>
                </div>
                <StatusBadge label={a.status} />
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  )
}
