import { useState, useCallback, useEffect, useRef } from 'react'
import { useScholarships, useApplications } from '../../application/hooks'
import { StatusBadge, formatDate, formatMoney, StatCard } from '../components/shared'
import { usePortalSearch } from '../components/PortalLayout'
import {
  applicationApi,
  getDocumentDownloadUrl,
  listApplicationDocuments,
  uploadApplicationDocument,
} from '../../infrastructure/api'
import type { ApplicationCreateRequest } from '../../domain/repositories'
import type { ApplicationDocumentSummary } from '../../domain/entities'
import { Button } from '../components/ui/button'

const DOCUMENT_TYPES = ['Transcript', 'Essay', 'Recommendation', 'ID', 'CV', 'Other']

const selectCls = 'h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring'

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

  const selectedScholarship = scholarships.find((s) => s.id === scholarshipId)

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
        Scholarship
        <select className={selectCls} value={scholarshipId} onChange={(e) => setScholarshipId(Number(e.target.value))} required>
          {scholarships.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
        </select>
      </label>

      {selectedScholarship && (
        <p className="text-sm text-muted-foreground">Applying for <strong className="text-foreground">{selectedScholarship.title}</strong></p>
      )}

      <div className="rounded-lg border bg-muted/30 p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Supporting documents</p>
            <p className="text-sm font-medium text-foreground">Upload files in the same step</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addDocumentRow}>+ Add file</Button>
        </div>
        <div className="flex flex-col gap-2">
          {documents.map((doc) => (
            <div key={doc.key} className="rounded-md border bg-card p-3 flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
                  Document type
                  <select className={selectCls} value={doc.documentType} onChange={(e) => updateDocument(doc.key, { documentType: e.target.value })}>
                    {DOCUMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
                  Choose file
                  <input type="file" className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground cursor-pointer file:border-0 file:bg-transparent file:text-xs file:font-medium file:text-muted-foreground" onChange={(e) => updateDocument(doc.key, { file: e.target.files?.[0] ?? null })} />
                </label>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{doc.file ? `Selected: ${doc.file.name}` : 'No file selected yet'}</span>
                <Button type="button" variant="ghost" size="sm" onClick={() => removeDocumentRow(doc.key)}>Remove</Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
        <input type="checkbox" className="rounded border-input" checked={submit} onChange={(e) => setSubmit(e.target.checked)} />
        Submit application immediately after upload
      </label>

      {err && <p className="text-sm text-destructive">{err}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={busy || scholarships.length === 0}>
          {busy ? 'Submitting…' : submit ? 'Apply and submit documents' : 'Save draft with documents'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>Cancel</Button>
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
      <div className="rounded-xl border bg-card p-6">
        <h3 className="font-semibold text-foreground mb-1">Supporting documents</h3>
        <p className="text-sm text-muted-foreground">No applications available.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border bg-card p-6 flex flex-col gap-4">
      <h3 className="font-semibold text-foreground">Supporting documents</h3>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
            Application
            <select className={selectCls} value={applicationId} onChange={(e) => setApplicationId(Number(e.target.value))}>
              {applications.map((a) => <option key={a.id} value={a.id}>{a.scholarshipTitle} (#{a.id})</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
            Document type
            <select className={selectCls} value={documentType} onChange={(e) => setDocumentType(e.target.value)}>
              {DOCUMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
        </div>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
          Select file
          <input type="file" className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground cursor-pointer file:border-0 file:bg-transparent file:text-xs file:font-medium file:text-muted-foreground" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required />
        </label>
        {notice && <p className="text-sm text-green-700">{notice}</p>}
        {err && <p className="text-sm text-destructive">{err}</p>}
        <div>
          <Button type="submit" disabled={busy || !file}>{busy ? 'Uploading…' : 'Upload document'}</Button>
        </div>
      </form>

      <div className="rounded-lg border bg-muted/30 p-4 flex flex-col gap-2">
        <h4 className="text-sm font-semibold text-foreground">Files on this application</h4>
        {loadingDocs && <p className="text-sm text-muted-foreground">Loading documents…</p>}
        {!loadingDocs && documents.length === 0 && <p className="text-sm text-muted-foreground">No files uploaded yet.</p>}
        {documents.length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {documents.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between text-sm">
                <span className="text-foreground"><strong>{doc.documentType}:</strong> {doc.fileName}</span>
                <a href={getDocumentDownloadUrl(doc.storagePath)} target="_blank" rel="noreferrer" className="text-primary font-medium hover:underline ml-4">Download</a>
              </li>
            ))}
          </ul>
        )}
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
    <div className="flex flex-col gap-6">
      {/* KPI row */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Open scholarships" value={openScholarships} />
        <StatCard label="Total applications" value={totalApplications} />
        <StatCard label="Submitted" value={submittedApplications} />
        <StatCard label="Shortlisted" value={summary.shortlisted} />
      </div>

      {/* Opportunities */}
      <div className="rounded-xl border bg-card p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Scholarship postings</p>
            <h2 className="text-xl font-semibold text-foreground">Available opportunities</h2>
          </div>
          <Button onClick={() => openApplyForm()}>+ New application</Button>
        </div>

        {applyNotice && <p className="text-sm text-green-700">{applyNotice}</p>}

        {showForm && (
          <div ref={applyFormRef} className="rounded-lg border border-dashed bg-muted/30 p-5">
            <h3 className="font-semibold text-foreground mb-4">{selectedScholarship ? `Apply for ${selectedScholarship.title}` : 'New application'}</h3>
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
        {normalizedQuery.length > 0 && <p className="text-sm text-muted-foreground">Showing {filteredScholarships.length} result(s) for "{searchQuery}".</p>}

        <div className="grid grid-cols-2 gap-4">
          {filteredScholarships.map((item) => {
            const isClosed = item.status.toLowerCase() === 'closed'
            const existingApplication = applicationByScholarshipTitle.get(item.title)
            return (
              <article key={item.id} className="rounded-xl border bg-background p-5 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-foreground">{item.title}</h3>
                  <StatusBadge label={item.status} />
                </div>
                <p className="text-sm text-muted-foreground">{item.audience}</p>
                <div className="text-sm text-foreground space-y-0.5">
                  <p><span className="font-medium">Deadline:</span> {formatDate(item.deadline)}</p>
                  <p><span className="font-medium">Eligibility:</span> {item.eligibility}</p>
                  <p><span className="font-medium">Award:</span> {formatMoney(item.amount)}</p>
                </div>
                <div className="flex gap-2 mt-auto pt-1">
                  {existingApplication ? (
                    <>
                      <Button variant="outline" size="sm" disabled>Already applied</Button>
                      <Button size="sm" onClick={() => openDocuments(existingApplication.id)}>Edit documents</Button>
                    </>
                  ) : (
                    <Button size="sm" disabled={isClosed} onClick={() => openApplyForm(item.id, item.title)}>
                      {isClosed ? 'Closed' : 'Apply now'}
                    </Button>
                  )}
                </div>
              </article>
            )
          })}
        </div>

        {!scholarships.loading && filteredScholarships.length === 0 && (
          <p className="text-sm text-muted-foreground">No scholarships match your search.</p>
        )}
      </div>

      {/* Applications */}
      <div className="rounded-xl border bg-card p-6 flex flex-col gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Application tracking</p>
          <h2 className="text-xl font-semibold text-foreground">Your applications</h2>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Complete sets', value: summary.completeDocs },
            { label: 'Shortlisted', value: summary.shortlisted },
            { label: 'In progress', value: summary.pending },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg border bg-muted/30 p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
            </div>
          ))}
        </div>

        {applications.loading && <p className="text-sm text-muted-foreground">Loading applications…</p>}
        {applications.error && <p className="text-sm text-destructive">{applications.error}</p>}

        {deleteId !== null && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 flex flex-col gap-3">
            <p className="text-sm text-foreground">Withdraw application #{deleteId}? This cannot be undone.</p>
            {deleteErr && <p className="text-sm text-destructive">{deleteErr}</p>}
            <div className="flex gap-2">
              <Button variant="destructive" size="sm" onClick={() => void handleDelete(deleteId)}>Yes, withdraw</Button>
              <Button variant="outline" size="sm" onClick={() => { setDeleteId(null); setDeleteErr('') }}>Cancel</Button>
            </div>
          </div>
        )}

        <div className="rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Scholarship</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Documents</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Next step</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {(applications.data ?? []).map((item) => (
                <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-sm text-foreground">{item.scholarshipTitle}</td>
                  <td className="px-4 py-3"><StatusBadge label={item.status} /></td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{item.submittedDocuments || (item.documentsComplete ? 'Uploaded' : 'Missing items')}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{item.nextStep}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => openDocuments(item.id)}>Edit docs</Button>
                      <Button variant="destructive" size="sm" onClick={() => { setDeleteId(item.id); setShowForm(false) }}>Withdraw</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div ref={documentsRef}>
          <DocumentPanel
            applications={(applications.data ?? []).map((a) => ({ id: a.id, scholarshipTitle: a.scholarshipTitle }))}
            selectedApplicationId={selectedDocumentApplicationId}
            onUploaded={refresh}
          />
        </div>
      </div>
    </div>
  )
}
