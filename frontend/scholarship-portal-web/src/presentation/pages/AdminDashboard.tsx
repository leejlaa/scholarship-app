import { useState, useCallback } from 'react'
import { useAnnouncements, useWorkflow, useScholarships } from '../../application/hooks'
import { formatDate, formatMoney, StatusBadge } from '../components/shared'
import { scholarshipApi } from '../../infrastructure/api'
import type { ScholarshipWriteRequest } from '../../domain/repositories'
import type { Scholarship } from '../../domain/entities'

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
  onSave: (req: ScholarshipWriteRequest) => Promise<void>
  onCancel: () => void
  submitLabel: string
}

function ScholarshipForm({ initial = EMPTY_FORM, onSave, onCancel, submitLabel }: ScholarshipFormProps) {
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
  const announcements = useAnnouncements()
  const workflow      = useWorkflow()
  const [refreshKey, setRefreshKey] = useState(0)
  const scholarships  = useScholarships(refreshKey)

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), [])

  // Form state: null = hidden, 'new' = create, Scholarship = edit
  const [editing, setEditing] = useState<null | 'new' | Scholarship>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleteErr, setDeleteErr] = useState('')

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

  function toWriteRequest(s: Scholarship): ScholarshipWriteRequest {
    return {
      title: s.title,
      audience: s.audience,
      deadline: s.deadline,
      eligibility: s.eligibility,
      amount: s.amount,
    }
  }

  return (
    <div className="content-grid">

      {/* ── Scholarship management ── */}
      <section id="scholarships" className="panel">
        <div className="section-heading compact">
          <div>
            <p className="eyebrow">Admin tools</p>
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
            <ScholarshipForm onSave={handleCreate} onCancel={() => setEditing(null)} submitLabel="Create" />
          </div>
        )}
        {editing && editing !== 'new' && (
          <div className="form-card">
            <h3>Edit — {editing.title}</h3>
            <ScholarshipForm initial={toWriteRequest(editing)} onSave={handleUpdate} onCancel={() => setEditing(null)} submitLabel="Save changes" />
          </div>
        )}

        {scholarships.loading && <p>Loading scholarships…</p>}
        {scholarships.error   && <p style={{ color: '#b91c1c' }}>{scholarships.error}</p>}

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

        <div className="card-list">
          {(scholarships.data ?? []).map((item) => (
            <article key={item.id} className="info-card">
              <div className="card-topline">
                <h3>{item.title}</h3>
                <StatusBadge label={item.status} />
              </div>
              <p>{item.audience}</p>
              <p><strong>Deadline:</strong> {formatDate(item.deadline)} · <strong>Award:</strong> {formatMoney(item.amount)}</p>
              <p><em>{item.eligibility}</em></p>
              <div className="card-actions">
                <button type="button" className="btn-ghost btn-sm"
                  onClick={() => { setEditing(item); setDeleteId(null) }}>Edit</button>
                <button type="button" className="btn-danger btn-sm"
                  onClick={() => { setDeleteId(item.id); setEditing(null) }}>Delete</button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── Announcements ── */}
      <section id="announcements" className="panel">
        <div className="section-heading compact">
          <div>
            <p className="eyebrow">Announcements and results</p>
            <h2>Admin updates</h2>
          </div>
        </div>

        {announcements.loading && <p>Loading announcements…</p>}
        {announcements.error   && <p style={{ color: '#b91c1c' }}>{announcements.error}</p>}

        <div className="card-list">
          {(announcements.data ?? []).map((item) => (
            <article key={item.id} className="info-card">
              <div className="card-topline">
                <h3>{item.title}</h3>
                <span className="category-chip">{item.category}</span>
              </div>
              <p><strong>Published:</strong> {formatDate(item.publishDate)}</p>
              <p>{item.message}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ── Workflow ── */}
      <section id="workflow" className="panel">
        <div className="section-heading compact">
          <div>
            <p className="eyebrow">Decision workflow</p>
            <h2>Release process</h2>
          </div>
        </div>

        {workflow.loading && <p>Loading workflow…</p>}
        {workflow.error   && <p style={{ color: '#b91c1c' }}>{workflow.error}</p>}

        <div className="timeline">
          {(workflow.data ?? []).map((item) => (
            <div key={item.order} className="timeline-item">
              <span>{item.order}</span>
              <div>
                <h3>{item.title}</h3>
                <p>{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
