import { useState, useCallback, useEffect, useRef } from 'react'
import { useScholarships, useApplications } from '../../application/hooks'
import { StatusBadge, formatDate, formatMoney } from '../components/shared'
import {
  applicationApi,
  getDocumentDownloadUrl,
  listApplicationDocuments,
  uploadApplicationDocument,
} from '../../infrastructure/api'
import type { ApplicationCreateRequest } from '../../domain/repositories'
import type { ApplicationDocumentSummary } from '../../domain/entities'

const DOCUMENT_TYPES = ['Transcript', 'Essay', 'Recommendation', 'ID', 'CV', 'Other']

type PendingDocumentInput = {
  key: number
  documentType: string
  file: File | null
}

type UploadDocumentInput = {
  key: number
  documentType: string
  file: File
}

function nextDocumentKey() {
  return Date.now() + Math.floor(Math.random() * 10000)
}

// ── Apply-to-scholarship form ───────────────────────────────────────────────

interface ApplyFormProps {
  scholarships: { id: number; title: string }[]
  initialScholarshipId?: number | null
  onSave: (req: ApplicationCreateRequest, documents: UploadDocumentInput[]) => Promise<void>
  onCancel: () => void
}

function ApplyForm({ scholarships, initialScholarshipId, onSave, onCancel }: ApplyFormProps) {
  const [scholarshipId, setScholarshipId] = useState<number>(initialScholarshipId ?? scholarships[0]?.id ?? 0)
  const [studentName, setStudentName] = useState('')
  const [submit, setSubmit] = useState(true)
  const [documents, setDocuments] = useState<PendingDocumentInput[]>([
    { key: nextDocumentKey(), documentType: 'Transcript', file: null },
  ])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (initialScholarshipId) {
      setScholarshipId(initialScholarshipId)
    }
  }, [initialScholarshipId])

  function updateDocument(key: number, patch: Partial<PendingDocumentInput>) {
    setDocuments((current) => current.map((doc) => (doc.key === key ? { ...doc, ...patch } : doc)))
  }

  function addDocumentRow() {
    setDocuments((current) => [...current, { key: nextDocumentKey(), documentType: 'Other', file: null }])
  }

  function removeDocumentRow(key: number) {
    setDocuments((current) => {
      if (current.length === 1) {
        return [{ key: nextDocumentKey(), documentType: 'Transcript', file: null }]
      }
      return current.filter((doc) => doc.key !== key)
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setErr('')

    try {
      const filesToUpload = documents.filter((doc): doc is UploadDocumentInput => doc.file instanceof File)
      await onSave({ scholarshipId, studentName: studentName || undefined, submit }, filesToUpload)
    } catch (ex: unknown) {
      setErr(ex instanceof Error ? ex.message : 'Failed to create application')
    } finally {
      setBusy(false)
    }
  }

  const selectedScholarship = scholarships.find((s) => s.id === scholarshipId)

  return (
    <form className="crud-form" onSubmit={handleSubmit}>
      <p className="helper-text">
        Complete this form once to create the application and upload your supporting documents together.
      </p>

      <label>Scholarship
        <select value={scholarshipId} onChange={(e) => setScholarshipId(Number(e.target.value))} required>
          {scholarships.map((s) => (
            <option key={s.id} value={s.id}>{s.title}</option>
          ))}
        </select>
      </label>

      {selectedScholarship && (
        <p className="apply-inline-note">Applying for <strong>{selectedScholarship.title}</strong></p>
      )}

      <label>Your name (optional — uses account name if blank)
        <input value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="Full name" />
      </label>

      <div className="upload-form-block">
        <div className="section-heading compact">
          <div>
            <p className="eyebrow">Supporting documents</p>
            <h3>Upload files in the same step</h3>
          </div>
          <button type="button" className="btn-ghost btn-sm" onClick={addDocumentRow}>+ Add file</button>
        </div>

        <div className="doc-upload-list">
          {documents.map((doc) => (
            <div key={doc.key} className="doc-upload-item">
              <div className="form-row">
                <label>Document type
                  <select value={doc.documentType} onChange={(e) => updateDocument(doc.key, { documentType: e.target.value })}>
                    {DOCUMENT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                  </select>
                </label>
                <label>Choose file
                  <input type="file" onChange={(e) => updateDocument(doc.key, { file: e.target.files?.[0] ?? null })} />
                </label>
              </div>
              <div className="card-actions compact-actions">
                <span className="helper-text">{doc.file ? `Selected: ${doc.file.name}` : 'No file selected yet'}</span>
                <button type="button" className="btn-ghost btn-sm" onClick={() => removeDocumentRow(doc.key)}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <label className="checkbox-row">
        <input type="checkbox" checked={submit} onChange={(e) => setSubmit(e.target.checked)} />
        Submit application immediately after upload
      </label>

      {err && <p className="form-error">{err}</p>}

      <div className="form-actions">
        <button type="submit" className="btn-primary" disabled={busy || scholarships.length === 0}>
          {busy ? 'Submitting…' : submit ? 'Apply and submit documents' : 'Save draft with documents'}
        </button>
        <button type="button" className="btn-ghost" onClick={onCancel} disabled={busy}>Cancel</button>
      </div>
    </form>
  )
}

interface DocumentPanelProps {
  applications: { id: number; scholarshipTitle: string }[]
  onUploaded: () => void
}

function DocumentPanel({ applications, onUploaded }: DocumentPanelProps) {
  const [applicationId, setApplicationId] = useState<number>(applications[0]?.id ?? 0)
  const [documentType, setDocumentType] = useState(DOCUMENT_TYPES[0])
  const [file, setFile] = useState<File | null>(null)
  const [documents, setDocuments] = useState<ApplicationDocumentSummary[]>([])
  const [loadingDocs, setLoadingDocs] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (applications.length === 0) {
      setApplicationId(0)
      setDocuments([])
      return
    }

    if (!applications.some((app) => app.id === applicationId)) {
      setApplicationId(applications[0].id)
    }
  }, [applicationId, applications])

  useEffect(() => {
    async function loadDocuments() {
      if (!applicationId) {
        setDocuments([])
        return
      }

      setLoadingDocs(true)
      setErr('')
      try {
        setDocuments(await listApplicationDocuments(applicationId))
      } catch (ex: unknown) {
        setErr(ex instanceof Error ? ex.message : 'Failed to load documents')
      } finally {
        setLoadingDocs(false)
      }
    }

    void loadDocuments()
  }, [applicationId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) {
      setErr('Choose a file to upload.')
      return
    }

    setBusy(true)
    setErr('')
    setNotice('')
    try {
      await uploadApplicationDocument(applicationId, file, documentType)
      setNotice(`${file.name} uploaded successfully.`)
      setFile(null)
      setDocuments(await listApplicationDocuments(applicationId))
      onUploaded()
    } catch (ex: unknown) {
      setErr(ex instanceof Error ? ex.message : 'Upload failed')
    } finally {
      setBusy(false)
    }
  }

  if (applications.length === 0) {
    return (
      <div className="form-card">
        <h3>Supporting documents</h3>
        <p className="helper-text">Create an application first, then upload your transcript, essay, and other files here.</p>
      </div>
    )
  }

  return (
    <div className="form-card">
      <h3>Add more supporting documents later</h3>
      <form className="crud-form" onSubmit={handleSubmit}>
        <div className="form-row">
          <label>Application
            <select value={applicationId} onChange={(e) => setApplicationId(Number(e.target.value))}>
              {applications.map((app) => (
                <option key={app.id} value={app.id}>{app.scholarshipTitle} (#{app.id})</option>
              ))}
            </select>
          </label>
          <label>Document type
            <select value={documentType} onChange={(e) => setDocumentType(e.target.value)}>
              {DOCUMENT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </label>
        </div>

        <label>Select file
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required />
        </label>

        {notice && <p className="helper-text success-text">{notice}</p>}
        {err && <p className="form-error">{err}</p>}

        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={busy || !file}>
            {busy ? 'Uploading…' : 'Upload document'}
          </button>
        </div>
      </form>

      <div className="document-section">
        <h4>Files on this application</h4>
        {loadingDocs && <p className="helper-text">Loading documents…</p>}
        {!loadingDocs && documents.length === 0 && <p className="helper-text">No files uploaded yet.</p>}
        {documents.length > 0 && (
          <ul className="document-list">
            {documents.map((doc) => (
              <li key={doc.id}>
                <span><strong>{doc.documentType}:</strong> {doc.fileName}</span>
                <a href={getDocumentDownloadUrl(doc.storagePath)} target="_blank" rel="noreferrer">Download</a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

// ── Main dashboard ─────────────────────────────────────────────────────────

export function StudentDashboard() {
  const [refreshKey, setRefreshKey] = useState(0)
  const scholarships = useScholarships()
  const applications = useApplications(refreshKey)

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), [])

  const [showForm, setShowForm] = useState(false)
  const [selectedScholarship, setSelectedScholarship] = useState<{ id: number; title: string } | null>(null)
  const [applyNotice, setApplyNotice] = useState('')
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleteErr, setDeleteErr] = useState('')
  const applyFormRef = useRef<HTMLDivElement | null>(null)

  const summary = {
    completeDocs: (applications.data ?? []).filter((a) => a.documentsComplete).length,
    shortlisted:  (applications.data ?? []).filter((a) => a.status === 'Shortlisted').length,
    pending:      (applications.data ?? []).filter((a) => a.status !== 'Approved').length,
  }

  useEffect(() => {
    if (!showForm) return

    window.requestAnimationFrame(() => {
      applyFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [showForm, selectedScholarship])

  function openApplyForm(scholarshipId?: number, title?: string) {
    setApplyNotice('')
    setDeleteId(null)
    setSelectedScholarship(scholarshipId && title ? { id: scholarshipId, title } : null)
    setShowForm(true)
  }

  async function handleCreate(req: ApplicationCreateRequest, documents: UploadDocumentInput[]) {
    const created = await applicationApi.create({ ...req, submit: false })

    for (const doc of documents) {
      await uploadApplicationDocument(created.id, doc.file, doc.documentType)
    }

    if (req.submit) {
      await applicationApi.update(created.id, { status: 'Submitted' })
    }

    setApplyNotice(
      documents.length > 0
        ? `Application created and ${documents.length} document${documents.length === 1 ? '' : 's'} uploaded.`
        : 'Application created successfully.'
    )
    setShowForm(false)
    setSelectedScholarship(null)
    refresh()
  }

  async function handleDelete(id: number) {
    setDeleteErr('')
    try {
      await applicationApi.remove(id)
      setDeleteId(null)
      refresh()
    } catch (ex: unknown) {
      setDeleteErr(ex instanceof Error ? ex.message : 'Delete failed')
    }
  }

  return (
    <div className="content-grid">
      <section id="opportunities" className="panel">
        <div className="section-heading compact">
          <div>
            <p className="eyebrow">Scholarship posting</p>
            <h2>Available opportunities</h2>
            <p className="helper-text">Click <strong>Apply now</strong> next to any scholarship and upload your documents in the same form.</p>
          </div>
        </div>

        {applyNotice && <p className="helper-text success-text">{applyNotice}</p>}

        {showForm && (
          <div ref={applyFormRef} id="apply-form" className="form-card application-form-card">
            <h3>{selectedScholarship ? `Apply for ${selectedScholarship.title}` : 'New application'}</h3>
            <ApplyForm
              scholarships={(scholarships.data ?? []).map((s) => ({ id: s.id, title: s.title }))}
              initialScholarshipId={selectedScholarship?.id}
              onSave={handleCreate}
              onCancel={() => { setShowForm(false); setSelectedScholarship(null) }}
            />
          </div>
        )}

        {scholarships.loading && <p>Loading scholarships…</p>}
        {scholarships.error  && <p style={{ color: '#b91c1c' }}>{scholarships.error}</p>}

        <div className="card-list">
          {(scholarships.data ?? []).map((item) => {
            const isClosed = item.status.toLowerCase() === 'closed'

            return (
              <article key={item.id} className="info-card">
                <div className="card-topline">
                  <h3>{item.title}</h3>
                  <StatusBadge label={item.status} />
                </div>
                <p>{item.audience}</p>
                <p><strong>Deadline:</strong> {formatDate(item.deadline)}</p>
                <p><strong>Eligibility:</strong> {item.eligibility}</p>
                <p><strong>Award:</strong> {formatMoney(item.amount)}</p>
                <div className="card-actions scholarship-action-row">
                  <span className="helper-text">Prepare your transcript, essay, and supporting files before you submit.</span>
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={isClosed}
                    onClick={() => openApplyForm(item.id, item.title)}>
                    {isClosed ? 'Closed' : 'Apply now'}
                  </button>
                </div>
              </article>
            )
          })}
        </div>

      </section>

      <section id="applications" className="panel">
        <div className="section-heading compact">
          <div>
            <p className="eyebrow">Application tracking</p>
            <h2>Your applications</h2>
          </div>
        </div>

        <div className="mini-stats">
          <div><strong>{summary.completeDocs}</strong><span>Complete document sets</span></div>
          <div><strong>{summary.shortlisted}</strong><span>Shortlisted</span></div>
          <div><strong>{summary.pending}</strong><span>In progress</span></div>
        </div>

        {applications.loading && <p>Loading applications…</p>}
        {applications.error  && <p style={{ color: '#b91c1c' }}>{applications.error}</p>}

        {deleteId !== null && (
          <div className="confirm-banner">
            <p>Withdraw application #{deleteId}? This cannot be undone.</p>
            {deleteErr && <p className="form-error">{deleteErr}</p>}
            <div className="form-actions">
              <button type="button" className="btn-danger" onClick={() => void handleDelete(deleteId)}>Yes, withdraw</button>
              <button type="button" className="btn-ghost" onClick={() => { setDeleteId(null); setDeleteErr('') }}>Cancel</button>
            </div>
          </div>
        )}

        <div className="table-wrap">
          <table>
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
              {(applications.data ?? []).map((item) => (
                <tr key={item.id}>
                  <td>{item.scholarshipTitle}</td>
                  <td><StatusBadge label={item.status} /></td>
                  <td>{item.submittedDocuments || (item.documentsComplete ? 'Uploaded' : 'Missing items')}</td>
                  <td>{item.nextStep}</td>
                  <td>
                    <button type="button" className="btn-danger btn-sm" onClick={() => { setDeleteId(item.id); setShowForm(false) }}>
                      Withdraw
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div id="documents">
          <DocumentPanel
            applications={(applications.data ?? []).map((app) => ({ id: app.id, scholarshipTitle: app.scholarshipTitle }))}
            onUploaded={refresh}
          />
        </div>
      </section>
    </div>
  )
}
