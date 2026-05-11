import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useApplications } from '../../application/hooks'
import {
  listApplicationDocuments,
  uploadApplicationDocument,
  openDocumentInNewTab,
  getDocumentDownloadUrl,
} from '../../infrastructure/api'
import type { ApplicationDocumentSummary } from '../../domain/entities'
import { StatusBadge } from '../components/shared'
import { Button } from '../components/ui/button'
import { ArrowLeft, FileText } from 'lucide-react'

const DOCUMENT_TYPES = ['Transcript', 'Essay', 'Recommendation', 'ID', 'CV', 'Other']

export function StudentManagePage() {
  const { applicationId } = useParams<{ applicationId: string }>()
  const navigate = useNavigate()
  const appId = Number(applicationId)

  const applications = useApplications()
  const application = (applications.data ?? []).find((a) => a.id === appId)

  const [documentType, setDocumentType] = useState(DOCUMENT_TYPES[0])
  const [file, setFile] = useState<File | null>(null)
  const [documents, setDocuments] = useState<ApplicationDocumentSummary[]>([])
  const [loadingDocs, setLoadingDocs] = useState(true)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!appId) return
    setLoadingDocs(true)
    listApplicationDocuments(appId)
      .then(setDocuments)
      .catch(() => setDocuments([]))
      .finally(() => setLoadingDocs(false))
  }, [appId])

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file) { setErr('Choose a file.'); return }
    if (!file.type.includes('pdf') && !file.name.endsWith('.pdf')) { setErr('Only PDF files are allowed.'); return }
    setBusy(true); setErr(''); setNotice('')
    try {
      await uploadApplicationDocument(appId, file, documentType)
      setNotice(`${file.name} uploaded successfully.`)
      setFile(null)
      setDocuments(await listApplicationDocuments(appId))
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Upload failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button className="btn btn-outline btn-sm" onClick={() => navigate('/student')}>
          <ArrowLeft size={14} /> Back
        </Button>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold text-foreground truncate">
            {applications.loading ? 'Loading…' : (application?.scholarshipTitle ?? 'Manage documents')}
          </h2>
          {application && (
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-sm text-muted-foreground">Application #{appId}</span>
              <StatusBadge label={application.status} />
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">Upload document</h3>
            <p className="card-description">Attach additional supporting files (PDF only)</p>
          </div>
        </div>
        <div className="card-content">
          <form className="space-y-4" onSubmit={handleUpload}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="form-group">
                <label className="label">Document type</label>
                <select className="select" value={documentType} onChange={(e) => setDocumentType(e.target.value)}>
                  {DOCUMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="label">File</label>
                <input
                  type="file"
                  accept="application/pdf"
                  className="input"
                  required
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>
            {notice && <div className="alert alert-success"><p className="text-sm">{notice}</p></div>}
            {err    && <div className="alert alert-error"><p className="text-sm">{err}</p></div>}
            <Button type="submit" className="btn btn-primary" disabled={busy || !file}>
              {busy ? 'Uploading…' : 'Upload document'}
            </Button>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Uploaded files</h3>
          {!loadingDocs && (
            <span className="text-sm text-muted-foreground">{documents.length} file{documents.length !== 1 ? 's' : ''}</span>
          )}
        </div>
        <div className="card-content">
          {loadingDocs && <p className="text-sm text-muted-foreground">Loading documents…</p>}
          {!loadingDocs && documents.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">No files uploaded yet.</p>
          )}
          {documents.length > 0 && (
            <div className="document-list">
              {documents.map((doc) => (
                <div key={doc.id} className="document-item">
                  <div className="document-info">
                    <div className="document-icon"><FileText size={16} /></div>
                    <div className="document-details">
                      <h4>{doc.fileName}</h4>
                      <span className="document-type">{doc.documentType}</span>
                    </div>
                  </div>
                  <div className="document-actions">
                    <button className="btn btn-sm btn-outline" onClick={() => void openDocumentInNewTab(doc.storagePath)}>View</button>
                    <a className="btn btn-sm btn-outline" href={getDocumentDownloadUrl(doc.storagePath)} download>Download</a>
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
