import { useState, useCallback, useEffect, useRef } from 'react'
import { useScholarships, useApplications } from '../../application/hooks'
import { StatusBadge, formatDate, formatMoney, StatCard } from '../components/shared'
import { usePortalSearch } from '../components/PortalLayout'
import {
  applicationApi,
  getDocumentDownloadUrl,
  listApplicationDocuments,
  uploadApplicationDocument,
  openDocumentInNewTab,
} from '../../infrastructure/api'
import type { ApplicationCreateRequest } from '../../domain/repositories'
import type { ApplicationDocumentSummary } from '../../domain/entities'
import { Button } from '../components/ui/button'

const DOCUMENT_TYPES = ['Transcript', 'Essay', 'Recommendation', 'ID', 'CV', 'Other']

type PendingDocumentInput = { key: number; documentType: string; file: File | null }
type UploadDocumentInput  = { key: number; documentType: string; file: File }

function nextDocumentKey() { return Date.now() + Math.floor(Math.random() * 10000) }

interface ApplyFormProps {
  scholarships: { id: number; title: string }[]
  initialScholarshipId?: number | null
  onSave: (req: ApplicationCreateRequest, documents: UploadDocumentInput[]) => Promise<void>
  onCancel: () => void
}

function ApplyForm({ scholarships, initialScholarshipId, onSave, onCancel }: ApplyFormProps) {
  const [scholarshipId, setScholarshipId] = useState<number>(initialScholarshipId ?? scholarships[0]?.id ?? 0)
  const [submit, setSubmit] = useState(true)
  const [documents, setDocuments] = useState<PendingDocumentInput[]>([
    { key: nextDocumentKey(), documentType: 'Transcript', file: null },
  ])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (initialScholarshipId) setScholarshipId(initialScholarshipId)
  }, [initialScholarshipId])

  function updateDocument(key: number, patch: Partial<PendingDocumentInput>) {
    setDocuments((cur) => cur.map((d) => (d.key === key ? { ...d, ...patch } : d)))
  }
  function addDocumentRow() {
    setDocuments((cur) => [...cur, { key: nextDocumentKey(), documentType: 'Other', file: null }])
  }
  function removeDocumentRow(key: number) {
    setDocuments((cur) =>
      cur.length === 1 ? [{ key: nextDocumentKey(), documentType: 'Transcript', file: null }] : cur.filter((d) => d.key !== key)
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setErr('')
    try {
      const filesToUpload = documents.filter((d): d is UploadDocumentInput => d.file instanceof File)
      await onSave({ scholarshipId, submit }, filesToUpload)
    } catch (ex: unknown) {
      setErr(ex instanceof Error ? ex.message : 'Failed to create application')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="form-group">
        <label className="label">Select scholarship</label>
        <select className="select" value={scholarshipId} onChange={(e) => setScholarshipId(Number(e.target.value))} required>
          {scholarships.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
        </select>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="label">Supporting documents</label>
          <Button type="button" className="btn btn-sm btn-outline" onClick={addDocumentRow}>+ Add file</Button>
        </div>
        <div className="space-y-2">
          {documents.map((doc) => (
            <div key={doc.key} className="card">
              <div className="card-content">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="form-group">
                    <label className="label">Document type</label>
                    <select className="select" value={doc.documentType} onChange={(e) => updateDocument(doc.key, { documentType: e.target.value })}>
                      {DOCUMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="label">Choose file</label>
                    <input accept="application/pdf" type="file" className="input" onChange={(e) => updateDocument(doc.key, { file: e.target.files?.[0] ?? null })} />
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-muted-foreground">{doc.file ? `✓ ${doc.file.name}` : 'No file selected'}</span>
                  <Button type="button" className="btn btn-sm btn-ghost" onClick={() => removeDocumentRow(doc.key)}>Remove</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" className="rounded" checked={submit} onChange={(e) => setSubmit(e.target.checked)} />
        <span>Submit immediately after upload</span>
      </label>

      {err && <div className="alert alert-error"><p className="text-sm">{err}</p></div>}

      <div className="flex gap-2">
        <Button type="submit" className="btn btn-primary flex-1" disabled={busy || scholarships.length === 0}>
          {busy ? 'Processing…' : submit ? 'Apply & upload' : 'Save as draft'}
        </Button>
        <Button type="button" className="btn btn-outline flex-1" onClick={onCancel} disabled={busy}>Cancel</Button>
      </div>
    </form>
  )
}

interface DocumentPanelProps {
  applications: { id: number; scholarshipTitle: string }[]
  selectedApplicationId?: number | null
  onUploaded: () => void
}

function DocumentPanel({ applications, selectedApplicationId, onUploaded }: DocumentPanelProps) {
  const [applicationId, setApplicationId] = useState<number>(applications[0]?.id ?? 0)
  const [documentType, setDocumentType] = useState(DOCUMENT_TYPES[0])
  const [file, setFile] = useState<File | null>(null)
  const [documents, setDocuments] = useState<ApplicationDocumentSummary[]>([])
  const [loadingDocs, setLoadingDocs] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (applications.length === 0) { setApplicationId(0); setDocuments([]); return }
    if (!applications.some((a) => a.id === applicationId)) setApplicationId(applications[0].id)
  }, [applicationId, applications])

  useEffect(() => {
    if (selectedApplicationId && applications.some((a) => a.id === selectedApplicationId))
      setApplicationId(selectedApplicationId)
  }, [applications, selectedApplicationId])

  useEffect(() => {
    async function loadDocuments() {
      if (!applicationId) { setDocuments([]); return }
      setLoadingDocs(true); setErr('')
      try { setDocuments(await listApplicationDocuments(applicationId)) }
      catch (ex: unknown) { setErr(ex instanceof Error ? ex.message : 'Failed to load documents') }
      finally { setLoadingDocs(false) }
    }
    void loadDocuments()
  }, [applicationId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) { setErr('Choose a file to upload.'); return }
    // Client-side validation: only PDFs
    const fileName = file.name ?? ''
    const fileType = file.type ?? ''
    if (!(fileType.toLowerCase().includes('pdf') || fileName.toLowerCase().endsWith('.pdf'))) {
      setErr('Only PDF files are allowed.')
      return
    }
    setBusy(true); setErr(''); setNotice('')
    try {
      await uploadApplicationDocument(applicationId, file, documentType)
      setNotice(`${file.name} uploaded successfully.`)
      setFile(null)
      setDocuments(await listApplicationDocuments(applicationId))
      onUploaded()
    } catch (ex: unknown) {
      setErr(ex instanceof Error ? ex.message : 'Upload failed')
    } finally { setBusy(false) }
  }

  if (applications.length === 0) {
    return (
      <div className="card">
        <div className="card-content text-center py-8">
          <h3 className="font-semibold mb-1">No documents to manage</h3>
          <p className="text-sm text-muted-foreground">Create an application first to upload documents.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3 className="card-title">Manage documents</h3>
          <p className="card-description">Upload supporting files for your applications</p>
        </div>
      </div>
      <div className="card-content space-y-6">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="form-group">
              <label className="label">Application</label>
              <select className="select" value={applicationId} onChange={(e) => setApplicationId(Number(e.target.value))}>
                {applications.map((a) => <option key={a.id} value={a.id}>{a.scholarshipTitle}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Document type</label>
              <select className="select" value={documentType} onChange={(e) => setDocumentType(e.target.value)}>
                {DOCUMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="label">Select file</label>
            <input accept="application/pdf" type="file" className="input" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required />
          </div>

          {notice && <div className="alert alert-success"><p className="text-sm">{notice}</p></div>}
          {err && <div className="alert alert-error"><p className="text-sm">{err}</p></div>}

          <Button type="submit" className="btn btn-primary" disabled={busy || !file}>
            {busy ? 'Uploading…' : 'Upload document'}
          </Button>
        </form>

        <div className="border-t pt-6">
          <h4 className="font-semibold mb-4">Files on this application</h4>
          {loadingDocs && <p className="text-sm text-muted-foreground">Loading documents…</p>}
          {!loadingDocs && documents.length === 0 && <p className="text-sm text-muted-foreground">No files uploaded yet.</p>}
          {documents.length > 0 && (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div key={doc.id} className="document-item">
                  <div className="document-info">
                    <div className="document-icon">📄</div>
                    <div className="document-details">
                      <h4>{doc.fileName}</h4>
                      <span className="document-type">{doc.documentType}</span>
                    </div>
                  </div>
                  <div className="document-actions flex items-center gap-2">
                    <button onClick={() => void openDocumentInNewTab(doc.storagePath)} className="btn btn-sm btn-outline">View</button>
                    <a href={getDocumentDownloadUrl(doc.storagePath)} download className="btn btn-sm btn-outline">Download</a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function StudentDashboard() {
  const [refreshKey, setRefreshKey] = useState(0)
  const scholarships = useScholarships()
  const applications = useApplications(refreshKey)
  const { query: searchQuery } = usePortalSearch()
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), [])

  const [showForm, setShowForm] = useState(false)
  const [selectedScholarship, setSelectedScholarship] = useState<{ id: number; title: string } | null>(null)
  const [applyNotice, setApplyNotice] = useState('')
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleteErr, setDeleteErr] = useState('')
  const [selectedDocumentApplicationId, setSelectedDocumentApplicationId] = useState<number | null>(null)
  const applyFormRef = useRef<HTMLDivElement | null>(null)
  const documentsRef = useRef<HTMLDivElement | null>(null)

  const summary = {
    completeDocs: (applications.data ?? []).filter((a) => a.documentsComplete).length,
    shortlisted:  (applications.data ?? []).filter((a) => a.status === 'Shortlisted').length,
    pending:      (applications.data ?? []).filter((a) => a.status !== 'Approved').length,
  }
  const openScholarships   = (scholarships.data ?? []).filter((s) => s.status.toLowerCase() === 'open').length
  const totalApplications  = (applications.data ?? []).length
  const submittedApplications = (applications.data ?? []).filter((a) => a.status === 'Submitted').length
  const normalizedQuery    = searchQuery.trim().toLowerCase()
  const filteredScholarships = (scholarships.data ?? []).filter((item) =>
    normalizedQuery.length === 0
    || item.title.toLowerCase().includes(normalizedQuery)
    || item.audience.toLowerCase().includes(normalizedQuery)
    || item.eligibility.toLowerCase().includes(normalizedQuery)
    || item.status.toLowerCase().includes(normalizedQuery))
  const applicationByScholarshipTitle = new Map((applications.data ?? []).map((app) => [app.scholarshipTitle, app]))

  useEffect(() => {
    if (!showForm) return
    window.requestAnimationFrame(() => applyFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }, [showForm, selectedScholarship])

  function openApplyForm(scholarshipId?: number, title?: string) {
    setApplyNotice(''); setDeleteId(null); setSelectedDocumentApplicationId(null)
    setSelectedScholarship(scholarshipId && title ? { id: scholarshipId, title } : null)
    setShowForm(true)
  }
  function openDocuments(applicationId: number) {
    setDeleteId(null); setShowForm(false); setSelectedScholarship(null)
    setSelectedDocumentApplicationId(applicationId)
    window.requestAnimationFrame(() => documentsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  async function handleCreate(req: ApplicationCreateRequest, documents: UploadDocumentInput[]) {
    const created = await applicationApi.create({ ...req, submit: false })
    for (const doc of documents) await uploadApplicationDocument(created.id, doc.file, doc.documentType)
    if (req.submit) await applicationApi.update(created.id, { status: 'Submitted' })
    setApplyNotice(documents.length > 0 ? `Application created and ${documents.length} document${documents.length === 1 ? '' : 's'} uploaded.` : 'Application created successfully.')
    setShowForm(false); setSelectedScholarship(null); refresh()
  }

  async function handleDelete(id: number) {
    setDeleteErr('')
    try { await applicationApi.remove(id); setDeleteId(null); refresh() }
    catch (ex: unknown) { setDeleteErr(ex instanceof Error ? ex.message : 'Delete failed') }
  }

  return (
    <div className="space-y-6">
      <div className="grid-auto-fit">
        <StatCard label="Open opportunities" value={openScholarships} />
        <StatCard label="Total applications" value={totalApplications} />
        <StatCard label="Submitted" value={submittedApplications} />
        <StatCard label="Shortlisted" value={summary.shortlisted} />
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Available scholarships</h2>
            <p className="card-description">Browse and apply for scholarships</p>
          </div>
          <Button className="btn btn-primary" onClick={() => openApplyForm()}>New application</Button>
        </div>
        <div className="card-content space-y-4">
          {applyNotice && <div className="alert alert-success"><p className="text-sm">{applyNotice}</p></div>}

          {showForm && (
            <div ref={applyFormRef} className="border rounded-lg bg-muted/30 p-5 space-y-4 slide-in">
              <h3 className="font-semibold">{selectedScholarship ? `Apply for ${selectedScholarship.title}` : 'New application'}</h3>
              <ApplyForm
                scholarships={(scholarships.data ?? []).map((s) => ({ id: s.id, title: s.title }))}
                initialScholarshipId={selectedScholarship?.id}
                onSave={handleCreate}
                onCancel={() => { setShowForm(false); setSelectedScholarship(null) }}
              />
            </div>
          )}

          {scholarships.loading && <p className="text-sm text-muted-foreground">Loading scholarships…</p>}
          {scholarships.error && <p className="text-sm text-destructive">{scholarships.error}</p>}

          {!scholarships.loading && !scholarships.error && (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredScholarships.map((item) => {
                const isClosed = item.status.toLowerCase() === 'closed'
                const existingApplication = applicationByScholarshipTitle.get(item.title)
                return (
                  <div key={item.id} className="card">
                    <div className="card-header">
                      <div className="flex-1 min-w-0">
                        <h3 className="card-title truncate">{item.title}</h3>
                        <p className="card-description">{item.audience}</p>
                      </div>
                      <StatusBadge label={item.status} />
                    </div>
                    <div className="card-content space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Deadline</span>
                          <p className="font-medium">{formatDate(item.deadline)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Award</span>
                          <p className="font-medium">{formatMoney(item.amount)}</p>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">Eligibility: {item.eligibility}</p>
                    </div>
                    <div className="card-footer">
                      {existingApplication ? (
                        <>
                          <Button className="btn btn-outline flex-1" disabled>Applied</Button>
                          <Button className="btn btn-primary flex-1" onClick={() => openDocuments(existingApplication.id)}>Manage</Button>
                        </>
                      ) : (
                        <Button 
                          className="btn btn-primary w-full" 
                          disabled={isClosed} 
                          onClick={() => openApplyForm(item.id, item.title)}>
                          {isClosed ? 'Application Closed' : 'Apply Now'}
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Your applications</h2>
            <p className="card-description">Track your scholarship applications</p>
          </div>
        </div>
        <div className="card-content space-y-6">
          <div className="grid gap-3 md:grid-cols-3">
            {[
              { label: 'Complete document sets', value: summary.completeDocs },
              { label: 'Shortlisted', value: summary.shortlisted },
              { label: 'In progress', value: summary.pending },
            ].map(({ label, value }) => (
              <div key={label} className="card">
                <div className="card-content">
                  <p className="stat-label">{label}</p>
                  <p className="stat-value">{value}</p>
                </div>
              </div>
            ))}
          </div>

          {applications.loading && <p className="text-sm text-muted-foreground">Loading applications…</p>}
          {applications.error && <p className="text-sm text-destructive">{applications.error}</p>}

          {deleteId !== null && (
            <div className="alert alert-error space-y-3">
              <p className="text-sm font-medium">Withdraw application #{deleteId}?</p>
              {deleteErr && <p className="text-sm">{deleteErr}</p>}
              <div className="flex gap-2">
                <Button className="btn btn-destructive" onClick={() => void handleDelete(deleteId)}>Yes, withdraw</Button>
                <Button className="btn btn-outline" onClick={() => { setDeleteId(null); setDeleteErr('') }}>Cancel</Button>
              </div>
            </div>
          )}

          {(applications.data ?? []).length > 0 && (
            <div className="border rounded-lg overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Scholarship</th>
                    <th>Status</th>
                    <th>Documents</th>
                    <th>Next step</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(applications.data ?? []).map((item) => (
                    <tr key={item.id}>
                      <td className="font-medium">{item.scholarshipTitle}</td>
                      <td><StatusBadge label={item.status} /></td>
                      <td className="text-sm">{item.documentsComplete ? '✓ Complete' : '○ Missing'}</td>
                      <td className="text-sm text-muted-foreground">{item.nextStep}</td>
                      <td>
                        <div className="flex gap-1.5 justify-end">
                          <Button className="btn btn-ghost btn-sm" onClick={() => openDocuments(item.id)}>Edit</Button>
                          <Button className="btn btn-destructive btn-sm" onClick={() => { setDeleteId(item.id); setShowForm(false) }}>Remove</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {(applications.data ?? []).length === 0 && !applications.loading && (
            <p className="text-sm text-muted-foreground text-center py-8">No applications yet. Start by applying for a scholarship above.</p>
          )}

          <div ref={documentsRef} className="pt-4">
            <DocumentPanel
              applications={(applications.data ?? []).map((a) => ({ id: a.id, scholarshipTitle: a.scholarshipTitle }))}
              selectedApplicationId={selectedDocumentApplicationId}
              onUploaded={refresh}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
