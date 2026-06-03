import { useEffect, useState } from 'react'
import { CheckCircle2, Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApplications } from '../../application/hooks'
import { StatusBadge } from '../components/shared'
import { Button } from '../components/ui/button'
import { getStudentProfile, updateStudentProfile, type UpdateStudentProfileRequest } from '../../infrastructure/api'
import type { StudentProfile } from '../../domain/entities'

interface Form {
  studentNumber: string; faculty: string; department: string; program: string
  currentYear: string; gpa: string; phoneNumber: string; address: string
  nationality: string; personalStatement: string
}

const EMPTY: Form = {
  studentNumber: '', faculty: '', department: '', program: '',
  currentYear: '', gpa: '', phoneNumber: '', address: '',
  nationality: '', personalStatement: '',
}

export function StudentProfilePage() {
  const navigate = useNavigate()
  const applications = useApplications()
  const [profile, setProfile] = useState<StudentProfile | null>(null)
  const [form, setForm] = useState<Form>(EMPTY)
  const [busy, setBusy] = useState(true)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')
  const [editOpen, setEditOpen] = useState(false)

  useEffect(() => {
    let active = true
    setBusy(true)
    getStudentProfile()
      .then((p) => { if (!active) return; setProfile(p); setForm({
        studentNumber: p.studentNumber ?? '', faculty: p.faculty ?? '',
        department: p.department ?? '', program: p.program ?? '',
        currentYear: p.currentYear?.toString() ?? '', gpa: p.gpa?.toString() ?? '',
        phoneNumber: p.phoneNumber ?? '', address: p.address ?? '',
        nationality: p.nationality ?? '', personalStatement: p.personalStatement ?? '',
      }) })
      .catch((e) => { if (active) setErr(e instanceof Error ? e.message : 'Failed to load') })
      .finally(() => { if (active) setBusy(false) })
    return () => { active = false }
  }, [])

  function patch<K extends keyof Form>(k: K, v: Form[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setErr(''); setOk('')
    const payload: UpdateStudentProfileRequest = {
      studentNumber: form.studentNumber || null, faculty: form.faculty || null,
      department: form.department || null, program: form.program || null,
      currentYear: form.currentYear ? Number(form.currentYear) : null,
      gpa: form.gpa ? Number(form.gpa) : null, phoneNumber: form.phoneNumber || null,
      address: form.address || null, nationality: form.nationality || null,
      personalStatement: form.personalStatement || null,
    }
    try {
      const updated = await updateStudentProfile(payload)
      setProfile((p) => p ? { ...p, ...updated } : updated)
      setOk('Profile saved.'); setEditOpen(false)
    } catch (ex) { setErr(ex instanceof Error ? ex.message : 'Save failed') }
    finally { setSaving(false) }
  }

  if (busy) return <p className="text-sm text-muted-foreground py-8">Loading…</p>

  const apps = applications.data ?? []

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
                {profile?.faculty    && <span><span className="text-muted-foreground">Faculty:</span> {profile.faculty}</span>}
                {profile?.program    && <span><span className="text-muted-foreground">Program:</span> {profile.program}</span>}
                {profile?.currentYear && <span><span className="text-muted-foreground">Year:</span> {profile.currentYear}</span>}
                {profile?.gpa        && <span><span className="text-muted-foreground">GPA:</span> {profile.gpa}</span>}
                {profile?.studentNumber && <span><span className="text-muted-foreground">Student #:</span> {profile.studentNumber}</span>}
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
                  ['studentNumber', 'Student number', 'text'],
                  ['faculty',       'Faculty',        'text'],
                  ['department',    'Department',     'text'],
                  ['program',       'Program',        'text'],
                  ['currentYear',   'Current year',   'number'],
                  ['gpa',           'GPA',            'number'],
                  ['phoneNumber',   'Phone',          'text'],
                  ['address',       'Address',        'text'],
                  ['nationality',   'Nationality',    'text'],
                ] as [keyof Form, string, string][]).map(([k, label, type]) => (
                  <div key={k} className="form-group">
                    <label className="label">{label}</label>
                    <input className="input" type={type} value={form[k] as string}
                      onChange={(e) => patch(k, e.target.value)} />
                  </div>
                ))}
              </div>
              <div className="form-group">
                <label className="label">Personal statement</label>
                <textarea className="textarea" rows={3} value={form.personalStatement}
                  onChange={(e) => patch('personalStatement', e.target.value)} />
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

      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">My applications</h3>
            <p className="card-description">All scholarship applications and their current status</p>
          </div>
          <span className="text-sm text-muted-foreground">{apps.length} total</span>
        </div>
        <div className="card-content">
          {applications.loading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!applications.loading && apps.length === 0 && (
            <div className="py-10 text-center space-y-3">
              <p className="text-sm text-muted-foreground">No applications yet.</p>
              <Button className="btn btn-primary" onClick={() => navigate('/student/apply')}>Browse scholarships</Button>
            </div>
          )}
          {apps.length > 0 && (
            <div className="border rounded-lg overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Scholarship</th>
                    <th>Status</th>
                    <th>Documents</th>
                    <th>Next step</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {apps.map((a) => (
                    <tr key={a.id}>
                      <td className="font-medium">{a.scholarshipTitle}</td>
                      <td><StatusBadge label={a.status} /></td>
                      <td>
                        {a.documentsComplete
                          ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5"><CheckCircle2 size={11} /> Complete</span>
                          : <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5"><Clock size={11} /> Pending</span>
                        }
                      </td>
                      <td className="text-sm text-muted-foreground">{a.nextStep}</td>
                      <td>
                        <Button className="btn btn-ghost btn-sm" onClick={() => navigate(`/student/application/${a.id}/documents`)}>
                          Manage
                        </Button>
                      </td>
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
