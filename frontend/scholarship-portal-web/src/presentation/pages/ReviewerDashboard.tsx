import { useState, useCallback } from 'react'
import { useReviewQueue, useApplications } from '../../application/hooks'
import { StatusBadge } from '../components/shared'
import { reviewApi } from '../../infrastructure/api'
import type { ReviewCreateRequest, ReviewUpdateRequest } from '../../domain/repositories'
import type { Review } from '../../domain/entities'

const STAGES = ['Initial', 'Secondary', 'PanelDiscussion', 'Complete']

const RUBRIC = [
  'Academic merit and GPA threshold',
  'Eligibility rules and completeness checks',
  'Leadership, service, or research impact',
  'Quality of essay and supporting documents',
  'Reviewer comment and final recommendation',
]

// ── Score form ────────────────────────────────────────────────────────────

interface ReviewFormProps {
  applications: { id: number; scholarshipTitle: string; studentName: string }[]
  initial?: { applicationId: number; score: number; comment: string; stage: string }
  onSave: (req: ReviewCreateRequest | ReviewUpdateRequest) => Promise<void>
  onCancel: () => void
  mode: 'create' | 'edit'
}

function ReviewForm({ applications, initial, onSave, onCancel, mode }: ReviewFormProps) {
  const [applicationId, setApplicationId] = useState<number>(initial?.applicationId ?? applications[0]?.id ?? 0)
  const [score, setScore] = useState<number>(initial?.score ?? 70)
  const [comment, setComment] = useState(initial?.comment ?? '')
  const [stage, setStage] = useState(initial?.stage ?? 'Initial')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setErr('')
    try {
      if (mode === 'create') {
        await onSave({ applicationId, score, comment, stage } as ReviewCreateRequest)
      } else {
        await onSave({ reviewerName: '', score, comment, stage } as ReviewUpdateRequest)
      }
    } catch (ex: unknown) {
      setErr(ex instanceof Error ? ex.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="crud-form" onSubmit={handleSubmit}>
      {mode === 'create' && (
        <label>Application
          <select value={applicationId} onChange={(e) => setApplicationId(Number(e.target.value))} required>
            {applications.map((a) => (
              <option key={a.id} value={a.id}>{a.studentName} — {a.scholarshipTitle}</option>
            ))}
          </select>
        </label>
      )}
      <div className="form-row">
        <label>Score (0–100)
          <input type="number" min="0" max="100" value={score}
            onChange={(e) => setScore(Number(e.target.value))} required />
        </label>
        <label>Stage
          <select value={stage} onChange={(e) => setStage(e.target.value)}>
            {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      </div>
      <label>Comment
        <textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)}
          placeholder="Evaluation notes…" required />
      </label>
      {err && <p className="form-error">{err}</p>}
      <div className="form-actions">
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? 'Saving…' : mode === 'create' ? 'Submit review' : 'Save changes'}
        </button>
        <button type="button" className="btn-ghost" onClick={onCancel} disabled={busy}>Cancel</button>
      </div>
    </form>
  )
}

// ── Main dashboard ─────────────────────────────────────────────────────────

export function ReviewerDashboard() {
  const [refreshKey, setRefreshKey] = useState(0)
  const queue = useReviewQueue(refreshKey)
  const applications = useApplications()

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), [])

  const [editing, setEditing] = useState<null | 'new' | Review>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleteErr, setDeleteErr] = useState('')

  const appOptions = (applications.data ?? []).map((a) => ({
    id: a.id,
    scholarshipTitle: a.scholarshipTitle,
    studentName: a.studentName,
  }))

  async function handleCreate(req: ReviewCreateRequest | ReviewUpdateRequest) {
    await reviewApi.create(req as ReviewCreateRequest)
    setEditing(null)
    refresh()
  }

  async function handleUpdate(req: ReviewCreateRequest | ReviewUpdateRequest) {
    if (!editing || editing === 'new') return
    await reviewApi.update(editing.id, req as ReviewUpdateRequest)
    setEditing(null)
    refresh()
  }

  async function handleDelete(id: number) {
    setDeleteErr('')
    try {
      await reviewApi.remove(id)
      setDeleteId(null)
      refresh()
    } catch (ex: unknown) {
      setDeleteErr(ex instanceof Error ? ex.message : 'Delete failed')
    }
  }

  return (
    <div className="content-grid two-columns">
      <section id="queue" className="panel">
        <div className="section-heading compact">
          <div>
            <p className="eyebrow">Scoring and comments</p>
            <h2>Reviewer queue</h2>
          </div>
          <button type="button" className="btn-primary" onClick={() => { setEditing('new'); setDeleteId(null) }}>
            + Add review
          </button>
        </div>

        {editing === 'new' && (
          <div className="form-card">
            <h3>Submit review</h3>
            <ReviewForm
              applications={appOptions}
              onSave={handleCreate}
              onCancel={() => setEditing(null)}
              mode="create"
            />
          </div>
        )}
        {editing && editing !== 'new' && (
          <div className="form-card">
            <h3>Edit review — {editing.applicantName}</h3>
            <ReviewForm
              applications={appOptions}
              initial={{ applicationId: editing.applicationId, score: editing.recommendedScore, comment: editing.comment, stage: editing.stage }}
              onSave={handleUpdate}
              onCancel={() => setEditing(null)}
              mode="edit"
            />
          </div>
        )}

        {queue.loading && <p>Loading review queue…</p>}
        {queue.error   && <p style={{ color: '#b91c1c' }}>{queue.error}</p>}

        {deleteId !== null && (
          <div className="confirm-banner">
            <p>Delete review #{deleteId}?</p>
            {deleteErr && <p className="form-error">{deleteErr}</p>}
            <div className="form-actions">
              <button type="button" className="btn-danger" onClick={() => void handleDelete(deleteId)}>Yes, delete</button>
              <button type="button" className="btn-ghost" onClick={() => { setDeleteId(null); setDeleteErr('') }}>Cancel</button>
            </div>
          </div>
        )}

        <div className="card-list">
          {(queue.data ?? []).map((item) => (
            <article key={item.id} className="info-card">
              <div className="card-topline">
                <h3>{item.applicantName}</h3>
                <span className="score-chip">{item.recommendedScore}/100</span>
              </div>
              <p><strong>{item.scholarshipTitle}</strong></p>
              <p>{item.comment}</p>
              <p>
                <strong>Stage: </strong>
                <StatusBadge label={item.stage} />
              </p>
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

      <section id="rubric" className="panel">
        <div className="section-heading compact">
          <div>
            <p className="eyebrow">Rubric suggestion</p>
            <h2>Review criteria</h2>
          </div>
        </div>
        <ul className="checklist">
          {RUBRIC.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </div>
  )
}

