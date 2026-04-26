import { useState, useCallback, useEffect, useRef } from 'react'
import { useReviewQueue, useApplications, useScholarships } from '../../application/hooks'
import { StatusBadge } from '../components/shared'
import { usePortalSearch } from '../components/PortalLayout'
import { applicationApi, getStoredAuth, reviewApi } from '../../infrastructure/api'
import type { ReviewCreateRequest, ReviewUpdateRequest } from '../../domain/repositories'
import type { Review } from '../../domain/entities'

const STAGES = ['Initial', 'Secondary', 'PanelDiscussion', 'Complete']
const APPLICATION_STATUSES = ['Submitted', 'UnderReview', 'Shortlisted', 'Approved', 'Rejected']

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
  const [applicationRefreshKey, setApplicationRefreshKey] = useState(0)
  const scholarships = useScholarships(refreshKey)
  const queue = useReviewQueue(refreshKey)
  const applications = useApplications(applicationRefreshKey)

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1)
    setApplicationRefreshKey((k) => k + 1)
  }, [])

  const [editing, setEditing] = useState<null | Review>(null)
  const [creatingForApplicationId, setCreatingForApplicationId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleteErr, setDeleteErr] = useState('')
  const [statusByApplication, setStatusByApplication] = useState<Record<number, string>>({})
  const [statusUpdateAppId, setStatusUpdateAppId] = useState<number | null>(null)
  const [statusFeedbackAppId, setStatusFeedbackAppId] = useState<number | null>(null)
  const [statusNotice, setStatusNotice] = useState('')
  const [statusErr, setStatusErr] = useState('')
  const reviewFormRef = useRef<HTMLDivElement | null>(null)

  const { query: searchQuery } = usePortalSearch()
  const normalizedQuery = searchQuery.trim().toLowerCase()
  const currentAuth = getStoredAuth()

  const filteredQueue = (queue.data ?? []).filter((item) =>
    normalizedQuery.length === 0
    || item.applicantName.toLowerCase().includes(normalizedQuery)
    || item.scholarshipTitle.toLowerCase().includes(normalizedQuery)
    || item.comment.toLowerCase().includes(normalizedQuery)
    || item.stage.toLowerCase().includes(normalizedQuery))

  const assignedScholarships = (scholarships.data ?? []).filter((s) =>
    (s.assignedReviewerEmail ?? '').toLowerCase() === (currentAuth?.email ?? '').toLowerCase())

  const assignedTitles = new Set(assignedScholarships.map((s) => s.title))

  const appOptions = (applications.data ?? [])
    .filter((a) => assignedTitles.has(a.scholarshipTitle))
    .map((a) => ({
    id: a.id,
    scholarshipTitle: a.scholarshipTitle,
    studentName: a.studentName,
    }))

  const reviewedByMeApplicationIds = new Set((queue.data ?? []).filter((r) => r.isMine).map((r) => r.applicationId))
  const unreviewedSubmissions = appOptions.filter((app) => !reviewedByMeApplicationIds.has(app.id))

  const averageScore = (queue.data?.length ?? 0) > 0
    ? Math.round((queue.data ?? []).reduce((sum, item) => sum + item.recommendedScore, 0) / (queue.data?.length ?? 1))
    : 0

  const completeStageCount = (queue.data ?? []).filter((item) => item.stage === 'Complete').length

  useEffect(() => {
    if (creatingForApplicationId === null) return

    window.requestAnimationFrame(() => {
      reviewFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [creatingForApplicationId])

  function openCreateForm(applicationId: number) {
    setEditing(null)
    setCreatingForApplicationId(applicationId)
  }

  async function handleCreate(req: ReviewCreateRequest | ReviewUpdateRequest) {
    await reviewApi.create(req as ReviewCreateRequest)
    setCreatingForApplicationId(null)
    setEditing(null)
    refresh()
  }

  async function handleUpdate(req: ReviewCreateRequest | ReviewUpdateRequest) {
    if (!editing) return
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

  function resolveCurrentApplicationStatus(applicationId: number) {
    const current = (applications.data ?? []).find((app) => app.id === applicationId)?.status
    return current ?? 'Submitted'
  }

  async function handleApplicationStatusUpdate(applicationId: number, status: string) {
    setStatusUpdateAppId(applicationId)
    setStatusFeedbackAppId(applicationId)
    setStatusNotice('')
    setStatusErr('')

    try {
      await applicationApi.update(applicationId, { status })
      setStatusNotice(`Application status updated to ${status}.`)
      refresh()
    } catch (ex: unknown) {
      setStatusErr(ex instanceof Error ? ex.message : 'Status update failed')
    } finally {
      setStatusUpdateAppId(null)
    }
  }

  return (
    <div className="content-grid reviewer-dashboard">
      <section className="reviewer-kpi-grid">
        <article className="reviewer-kpi-card">
          <p>Queue items</p>
          <strong>{queue.data?.length ?? 0}</strong>
        </article>
        <article className="reviewer-kpi-card">
          <p>Average score</p>
          <strong>{averageScore}</strong>
        </article>
        <article className="reviewer-kpi-card">
          <p>Completed stage</p>
          <strong>{completeStageCount}</strong>
        </article>
      </section>

      <div className="content-grid two-columns reviewer-workspace">
        <section id="queue" className="panel">
        <div className="section-heading compact">
          <div>
            <h2>Reviewer queue</h2>
          </div>
        </div>

        <div className="form-card">
          <h3>Unreviewed submissions</h3>
          {unreviewedSubmissions.length === 0 && <p className="helper-text">No unreviewed submissions assigned to you.</p>}
          {unreviewedSubmissions.length > 0 && (
            <div className="card-list reviewer-queue-list">
              {unreviewedSubmissions.map((submission) => (
                <article key={submission.id} className="info-card reviewer-queue-card">
                  <div className="card-topline">
                    <h3>{submission.studentName}</h3>
                    <StatusBadge label={resolveCurrentApplicationStatus(submission.id)} />
                  </div>
                  <p><strong>{submission.scholarshipTitle}</strong></p>
                  <div className="card-actions">
                    <button
                      type="button"
                      className="btn-primary btn-sm"
                      onClick={() => openCreateForm(submission.id)}>
                      Review submission
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        {creatingForApplicationId !== null && (
          <div ref={reviewFormRef} id="review-form" className="form-card">
            <h3>Submit review</h3>
            <ReviewForm
              applications={appOptions.filter((a) => a.id === creatingForApplicationId)}
              initial={{ applicationId: creatingForApplicationId, score: 70, comment: '', stage: 'Initial' }}
              onSave={handleCreate}
              onCancel={() => setCreatingForApplicationId(null)}
              mode="create"
            />
          </div>
        )}
        {editing && (
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

        {normalizedQuery.length > 0 && (
          <p className="helper-text">Showing {filteredQueue.length} review(s) for "{searchQuery}".</p>
        )}

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

        <div className="card-list reviewer-queue-list">
          {filteredQueue.length === 0 && !queue.loading && (
            <p className="helper-text">{normalizedQuery.length > 0 ? 'No reviews match your search.' : 'No reviews yet.'}</p>
          )}
          {filteredQueue.map((item) => (
            <article key={item.id} className="info-card reviewer-queue-card">
              <div className="card-topline">
                <h3>{item.applicantName}</h3>
                <span className="score-chip">{item.recommendedScore}/100</span>
              </div>
              <p>
                <strong>{item.isMine ? 'My review' : 'Other reviewer'}</strong>
                {' · '}
                {item.reviewerName}
              </p>
              <p><strong>{item.scholarshipTitle}</strong></p>
              <p>{item.comment}</p>
              <p>
                <strong>Stage: </strong>
                <StatusBadge label={item.stage} />
              </p>
              <div className="status-update-row">
                <label className="status-update-label">Application status</label>
                <div className="status-update-controls">
                  <select
                    value={statusByApplication[item.applicationId] ?? resolveCurrentApplicationStatus(item.applicationId)}
                    onChange={(e) => setStatusByApplication((prev) => ({ ...prev, [item.applicationId]: e.target.value }))}>
                    {APPLICATION_STATUSES.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn-primary btn-sm"
                    disabled={statusUpdateAppId === item.applicationId}
                    onClick={() => void handleApplicationStatusUpdate(
                      item.applicationId,
                      statusByApplication[item.applicationId] ?? resolveCurrentApplicationStatus(item.applicationId),
                    )}>
                    {statusUpdateAppId === item.applicationId ? 'Updating…' : 'Update status'}
                  </button>
                </div>
              </div>
              {statusFeedbackAppId === item.applicationId && statusNotice && <p className="helper-text success-text">{statusNotice}</p>}
              {statusFeedbackAppId === item.applicationId && statusErr && <p className="form-error">{statusErr}</p>}
              <div className="card-actions">
                {item.isMine && (
                  <>
                    <button type="button" className="btn-ghost btn-sm"
                      onClick={() => { setEditing(item); setDeleteId(null) }}>Edit</button>
                    <button type="button" className="btn-danger btn-sm"
                      onClick={() => { setDeleteId(item.id); setEditing(null) }}>Delete</button>
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
        </section>
      </div>
    </div>
  )
}

