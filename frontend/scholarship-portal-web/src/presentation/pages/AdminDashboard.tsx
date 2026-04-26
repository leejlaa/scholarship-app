import { useState, useCallback, useEffect } from 'react'
import { useScholarships } from '../../application/hooks'
import { formatDate, formatMoney, StatusBadge } from '../components/shared'
import { usePortalSearch } from '../components/PortalLayout'
import { assignScholarshipReviewer, listReviewers, scholarshipApi } from '../../infrastructure/api'
import type { ScholarshipWriteRequest } from '../../domain/repositories'
import type { ReviewerSummary, Scholarship } from '../../domain/entities'

// ── Scholarship form ──────────────────────────────────────────────────────

const EMPTY_FORM: ScholarshipWriteRequest = {
  title: '',
  audience: '',
  deadline: '',
  eligibility: '',
  amount: 0,
}

interface ScholarshipFormProps {
  initial?: ScholarshipWriteRequest
  reviewers: ReviewerSummary[]
  requireReviewer: boolean
  onSave: (req: ScholarshipWriteRequest) => Promise<void>
  onCancel: () => void
  submitLabel: string
}

function ScholarshipForm({ initial = EMPTY_FORM, reviewers, requireReviewer, onSave, onCancel, submitLabel }: ScholarshipFormProps) {
  const [form, setForm] = useState<ScholarshipWriteRequest>(initial)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  function set(field: keyof ScholarshipWriteRequest, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setErr('')
    try {
      if (requireReviewer && !form.reviewerId) {
        setErr('Reviewer is required.')
        setBusy(false)
        return
      }

      await onSave(form)
    } catch (ex: unknown) {
      setErr(ex instanceof Error ? ex.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="crud-form" onSubmit={handleSubmit}>
      <div className="form-row">
        <label>Title
          <input value={form.title} onChange={(e) => set('title', e.target.value)} required />
        </label>
        <label>Audience
          <input value={form.audience} onChange={(e) => set('audience', e.target.value)} required />
        </label>
      </div>
      <div className="form-row">
        <label>Deadline
          <input type="date" value={form.deadline} onChange={(e) => set('deadline', e.target.value)} required />
        </label>
        <label>Award amount (USD)
          <input type="number" min="0" step="100" value={form.amount}
            onChange={(e) => set('amount', parseFloat(e.target.value) || 0)} required />
        </label>
      </div>
      <label>Assigned reviewer
        <select value={form.reviewerId ?? ''} onChange={(e) => set('reviewerId', e.target.value)} required={requireReviewer}>
          <option value="">Select reviewer</option>
          {reviewers.map((reviewer) => (
            <option key={reviewer.id} value={reviewer.id}>{reviewer.fullName} ({reviewer.email})</option>
          ))}
        </select>
      </label>
      <label>Eligibility criteria
        <textarea rows={2} value={form.eligibility} onChange={(e) => set('eligibility', e.target.value)} required />
      </label>
      {err && <p className="form-error">{err}</p>}
      <div className="form-actions">
        <button type="submit" className="btn-primary" disabled={busy}>{busy ? 'Saving…' : submitLabel}</button>
        <button type="button" className="btn-ghost" onClick={onCancel} disabled={busy}>Cancel</button>
      </div>
    </form>
  )
}

// ── Main dashboard ─────────────────────────────────────────────────────────

export function AdminDashboard() {
  const [refreshKey, setRefreshKey] = useState(0)
  const scholarships  = useScholarships(refreshKey)

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), [])

  // Form state: null = hidden, 'new' = create, Scholarship = edit
  const [editing, setEditing] = useState<null | 'new' | Scholarship>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleteErr, setDeleteErr] = useState('')
  const [reviewers, setReviewers] = useState<ReviewerSummary[]>([])
  const [reviewerByScholarship, setReviewerByScholarship] = useState<Record<number, string>>({})
  const [assigningScholarshipId, setAssigningScholarshipId] = useState<number | null>(null)
  const [assignErr, setAssignErr] = useState('')

  useEffect(() => {
    async function loadReviewers() {
      try {
        setReviewers(await listReviewers())
      } catch {
        setReviewers([])
      }
    }

    void loadReviewers()
  }, [])

  // ── handlers ──────────────────────────────────────────────────────────

  async function handleCreate(req: ScholarshipWriteRequest) {
    await scholarshipApi.create(req)
    setEditing(null)
    refresh()
  }

  async function handleUpdate(req: ScholarshipWriteRequest) {
    if (!editing || editing === 'new') return
    await scholarshipApi.update(editing.id, req)
    setEditing(null)
    refresh()
  }

  async function handleDelete(id: number) {
    setDeleteErr('')
    try {
      await scholarshipApi.remove(id)
      setDeleteId(null)
      refresh()
    } catch (ex: unknown) {
      setDeleteErr(ex instanceof Error ? ex.message : 'Delete failed')
    }
  }

  async function handleAssignReviewer(scholarship: Scholarship) {
    setAssignErr('')
    setAssigningScholarshipId(scholarship.id)

    try {
      const selected = reviewerByScholarship[scholarship.id]
      await assignScholarshipReviewer(scholarship.id, selected ? selected : null)
      refresh()
    } catch (ex: unknown) {
      setAssignErr(ex instanceof Error ? ex.message : 'Reviewer assignment failed')
    } finally {
      setAssigningScholarshipId(null)
    }
  }

  function toWriteRequest(s: Scholarship): ScholarshipWriteRequest {
    return {
      title: s.title,
      audience: s.audience,
      deadline: s.deadline,
      eligibility: s.eligibility,
      amount: s.amount,
      reviewerId: s.assignedReviewerId ?? undefined,
    }
  }

  const { query: searchQuery } = usePortalSearch()
  const normalizedQuery = searchQuery.trim().toLowerCase()

  const filteredScholarships = (scholarships.data ?? []).filter((s) =>
    normalizedQuery.length === 0
    || s.title.toLowerCase().includes(normalizedQuery)
    || s.audience.toLowerCase().includes(normalizedQuery)
    || s.eligibility.toLowerCase().includes(normalizedQuery)
    || s.status.toLowerCase().includes(normalizedQuery)
    || (s.assignedReviewerName ?? '').toLowerCase().includes(normalizedQuery))

  const openScholarships = (scholarships.data ?? []).filter((s) => s.status.toLowerCase() === 'open').length

  return (
    <div className="content-grid admin-dashboard">
      <section className="admin-kpi-grid">
        <article className="admin-kpi-card">
          <p>Open scholarships</p>
          <strong>{openScholarships}</strong>
        </article>
        <article className="admin-kpi-card">
          <p>Total scholarships</p>
          <strong>{scholarships.data?.length ?? 0}</strong>
        </article>
      </section>

      {/* ── Scholarship management ── */}
      <section id="scholarships" className="panel">
        <div className="section-heading compact">
          <div>
            <h2>Scholarship management</h2>
          </div>
          <button type="button" className="btn-primary" onClick={() => setEditing('new')}>
            + New scholarship
          </button>
        </div>

        {/* Create / Edit form */}
        {editing === 'new' && (
          <div className="form-card">
            <h3>Create scholarship</h3>
            <ScholarshipForm
              reviewers={reviewers}
              requireReviewer
              onSave={handleCreate}
              onCancel={() => setEditing(null)}
              submitLabel="Create"
            />
          </div>
        )}
        {editing && editing !== 'new' && (
          <div className="form-card">
            <h3>Edit — {editing.title}</h3>
            <ScholarshipForm
              initial={toWriteRequest(editing)}
              reviewers={reviewers}
              requireReviewer={false}
              onSave={handleUpdate}
              onCancel={() => setEditing(null)}
              submitLabel="Save changes"
            />
          </div>
        )}

        {scholarships.loading && <p>Loading scholarships…</p>}
        {scholarships.error   && <p style={{ color: '#b91c1c' }}>{scholarships.error}</p>}

        {normalizedQuery.length > 0 && (
          <p className="helper-text">Showing {filteredScholarships.length} scholarship(s) for "{searchQuery}".</p>
        )}

        {/* Confirm delete */}
        {deleteId !== null && (
          <div className="confirm-banner">
            <p>Delete scholarship #{deleteId}? This cannot be undone.</p>
            {deleteErr && <p className="form-error">{deleteErr}</p>}
            <div className="form-actions">
              <button type="button" className="btn-danger" onClick={() => void handleDelete(deleteId)}>Yes, delete</button>
              <button type="button" className="btn-ghost" onClick={() => { setDeleteId(null); setDeleteErr('') }}>Cancel</button>
            </div>
          </div>
        )}

        <div className="card-list admin-scholarship-list">
          {filteredScholarships.length === 0 && !scholarships.loading && (
            <p className="helper-text">No scholarships match your search.</p>
          )}
          {filteredScholarships.map((item) => (
            <article key={item.id} className="info-card admin-scholarship-card">
              <div className="card-topline">
                <h3>{item.title}</h3>
                <StatusBadge label={item.status} />
              </div>
              <p>{item.audience}</p>
              <p><strong>Deadline:</strong> {formatDate(item.deadline)} · <strong>Award:</strong> {formatMoney(item.amount)}</p>
              <p><em>{item.eligibility}</em></p>
              <p><strong>Assigned reviewer:</strong> {item.assignedReviewerName ?? 'Unassigned'}</p>
              <div className="status-update-row">
                <label className="status-update-label">Reviewer</label>
                <div className="status-update-controls">
                  <select
                    value={reviewerByScholarship[item.id] ?? item.assignedReviewerId ?? ''}
                    onChange={(e) => setReviewerByScholarship((prev) => ({ ...prev, [item.id]: e.target.value }))}>
                    <option value="">Unassigned</option>
                    {reviewers.map((reviewer) => (
                      <option key={reviewer.id} value={reviewer.id}>{reviewer.fullName} ({reviewer.email})</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn-primary btn-sm"
                    disabled={assigningScholarshipId === item.id}
                    onClick={() => void handleAssignReviewer(item)}>
                    {assigningScholarshipId === item.id ? 'Assigning…' : 'Assign reviewer'}
                  </button>
                </div>
              </div>
              <div className="card-actions">
                <button type="button" className="btn-ghost btn-sm"
                  onClick={() => { setEditing(item); setDeleteId(null) }}>Edit</button>
                <button type="button" className="btn-danger btn-sm"
                  onClick={() => { setDeleteId(item.id); setEditing(null) }}>Delete</button>
              </div>
              {assignErr && <p className="form-error">{assignErr}</p>}
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
