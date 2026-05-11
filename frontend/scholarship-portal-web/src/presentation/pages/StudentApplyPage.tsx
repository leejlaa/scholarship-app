import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useScholarships, useApplications } from '../../application/hooks'
import { StatusBadge, formatDate, formatMoney } from '../components/shared'
import { applicationApi, uploadApplicationDocument } from '../../infrastructure/api'
import { Button } from '../components/ui/button'
import { ArrowLeft, CheckCircle, FolderOpen } from 'lucide-react'

const DOCUMENT_TYPES = ['Transcript', 'Essay', 'Recommendation', 'ID', 'CV', 'Other']

type PendingDoc = { key: number; documentType: string; file: File | null }
type UploadDoc  = { key: number; documentType: string; file: File }

function nextKey() { return Date.now() + Math.floor(Math.random() * 10000) }

export function StudentApplyPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const scholarships = useScholarships()
  const applications = useApplications()

  const preselectedId = searchParams.get('id') ? Number(searchParams.get('id')) : null
  const [scholarshipId, setScholarshipId] = useState<number | null>(preselectedId)
  const [documents, setDocuments] = useState<PendingDoc[]>([
    { key: nextKey(), documentType: 'Transcript', file: null },
  ])
  const [submit, setSubmit] = useState(true)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const formCardRef = useRef<HTMLDivElement>(null)

  const appliedByTitle = new Map((applications.data ?? []).map((a) => [a.scholarshipTitle, a]))

  useEffect(() => {
    if (preselectedId !== null) setScholarshipId(preselectedId)
  }, [preselectedId])

  useEffect(() => {
    if (preselectedId || !scholarships.data) return
    const first = scholarships.data.find((s) => s.status.toLowerCase() === 'open')
    if (first) setScholarshipId(first.id)
  }, [scholarships.data, preselectedId])

  useEffect(() => {
    if (!scholarshipId || !formCardRef.current) return
    formCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [scholarshipId])

  const openScholarships = (scholarships.data ?? []).filter((s) => s.status.toLowerCase() === 'open')
  const selected = (scholarships.data ?? []).find((s) => s.id === scholarshipId)
  const existingApplication = selected ? appliedByTitle.get(selected.title) : undefined

  function updateDoc(key: number, patch: Partial<PendingDoc>) {
    setDocuments((d) => d.map((x) => (x.key === key ? { ...x, ...patch } : x)))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!scholarshipId) { setErr('Select a scholarship.'); return }
    if (existingApplication) { setErr('You have already applied for this scholarship.'); return }
    setBusy(true); setErr('')
    try {
      const uploads = documents.filter((d): d is UploadDoc => d.file instanceof File)
      const created = await applicationApi.create({ scholarshipId, submit: false })
      for (const doc of uploads) await uploadApplicationDocument(created.id, doc.file, doc.documentType)
      if (submit) await applicationApi.update(created.id, { status: 'Submitted' })
      setSuccessMsg(
        uploads.length > 0
          ? `Application submitted with ${uploads.length} document${uploads.length > 1 ? 's' : ''}.`
          : 'Application saved as draft.',
      )
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Submission failed')
    } finally {
      setBusy(false)
    }
  }

  if (successMsg) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="card max-w-md w-full">
          <div className="card-content py-10 text-center space-y-4">
            <CheckCircle size={48} className="mx-auto" style={{ color: 'oklch(0.595 0.14 152)' }} />
            <h2 className="card-title text-xl">{submit ? 'Application submitted!' : 'Draft saved'}</h2>
            <p className="text-sm text-muted-foreground">{successMsg}</p>
            <div className="flex gap-2 justify-center pt-2">
              <Button className="btn btn-primary" onClick={() => navigate('/student')}>Back to dashboard</Button>
              <Button className="btn btn-outline" onClick={() => { setSuccessMsg(''); setDocuments([{ key: nextKey(), documentType: 'Transcript', file: null }]) }}>Apply again</Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button className="btn btn-outline btn-sm" onClick={() => navigate('/student')}>
          <ArrowLeft size={14} /> Back
        </Button>
        <div>
          <h2 className="text-xl font-bold text-foreground">Apply for a scholarship</h2>
          <p className="text-sm text-muted-foreground">Choose a scholarship and attach your documents</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="space-y-3">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">Available</p>
          {scholarships.loading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {openScholarships.map((s) => {
            const alreadyApplied = appliedByTitle.has(s.title)
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setScholarshipId(s.id)}
                className={`w-full text-left rounded-lg border p-4 transition-all bg-card ${
                  scholarshipId === s.id
                    ? 'border-primary ring-2 ring-primary/20 shadow-sm'
                    : 'hover:border-primary/40 hover:shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <p className="text-sm font-semibold text-foreground leading-snug">{s.title}</p>
                  {alreadyApplied
                    ? <span className="text-[0.6rem] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full border flex-shrink-0 bg-green-100 text-green-700 border-green-200">Applied</span>
                    : <StatusBadge label={s.status} />
                  }
                </div>
                <p className="text-xs text-muted-foreground">{s.audience}</p>
                <div className="flex gap-3 mt-2 text-xs font-medium text-foreground">
                  <span>{formatMoney(s.amount)}</span>
                  <span className="text-muted-foreground">·</span>
                  <span>Due {formatDate(s.deadline)}</span>
                </div>
              </button>
            )
          })}
          {!scholarships.loading && openScholarships.length === 0 && (
            <p className="text-sm text-muted-foreground">No open scholarships.</p>
          )}
        </div>

        <div ref={formCardRef}>
          {selected ? (
            <div className="card">
              <div className="card-header">
                <div>
                  <h3 className="card-title">{selected.title}</h3>
                  <p className="card-description">{selected.audience}</p>
                </div>
                <StatusBadge label={selected.status} />
              </div>
              <div className="card-content space-y-6">
                <div className="rounded-lg bg-muted/50 border px-4 py-3 text-sm">
                  <span className="font-semibold">Eligibility: </span>
                  <span className="text-muted-foreground">{selected.eligibility}</span>
                </div>

                {existingApplication ? (
                  <div className="space-y-4">
                    <div className="alert alert-success flex items-start gap-3">
                      <FolderOpen size={18} className="flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold">You've already applied for this scholarship.</p>
                        <p className="text-sm mt-0.5">Application #{existingApplication.id} · Status: {existingApplication.status}</p>
                      </div>
                    </div>
                    <Button
                      className="btn btn-primary"
                      onClick={() => navigate(`/student/application/${existingApplication.id}/documents`)}
                    >
                      Manage your application
                    </Button>
                  </div>
                ) : (
                  <form className="space-y-5" onSubmit={handleSubmit}>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="label">Supporting documents</label>
                        <Button
                          type="button"
                          className="btn btn-sm btn-outline"
                          onClick={() => setDocuments((d) => [...d, { key: nextKey(), documentType: 'Other', file: null }])}
                        >
                          + Add file
                        </Button>
                      </div>
                      {documents.map((doc) => (
                        <div key={doc.key} className="rounded-lg border bg-muted/30 p-4">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="form-group">
                              <label className="label">Type</label>
                              <select className="select" value={doc.documentType} onChange={(e) => updateDoc(doc.key, { documentType: e.target.value })}>
                                {DOCUMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                              </select>
                            </div>
                            <div className="form-group">
                              <label className="label">File (PDF)</label>
                              <input type="file" accept="application/pdf" className="input" onChange={(e) => updateDoc(doc.key, { file: e.target.files?.[0] ?? null })} />
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-3">
                            <span className="text-xs text-muted-foreground">{doc.file ? `✓ ${doc.file.name}` : 'No file selected'}</span>
                            {documents.length > 1 && (
                              <Button type="button" className="btn btn-sm btn-ghost" onClick={() => setDocuments((d) => d.filter((x) => x.key !== doc.key))}>Remove</Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                      <input type="checkbox" className="rounded" checked={submit} onChange={(e) => setSubmit(e.target.checked)} />
                      Submit immediately after upload
                    </label>

                    {err && <div className="alert alert-error"><p className="text-sm">{err}</p></div>}

                    <div className="flex gap-3">
                      <Button type="submit" className="btn btn-primary flex-1" disabled={busy}>
                        {busy ? 'Processing…' : submit ? 'Submit application' : 'Save as draft'}
                      </Button>
                      <Button type="button" className="btn btn-outline" onClick={() => navigate('/student')} disabled={busy}>Cancel</Button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="card-content py-20 text-center">
                <p className="text-muted-foreground">Select a scholarship on the left to begin.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
