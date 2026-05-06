import { useState, useCallback, useEffect, useRef } from 'react'
import { useReviewQueue, useApplications, useScholarships } from '../../application/hooks'
import { StatusBadge, StatCard } from '../components/shared'
import { usePortalSearch } from '../components/PortalLayout'
import { applicationApi, getStoredAuth, reviewApi } from '../../infrastructure/api'
import type { ReviewCreateRequest, ReviewUpdateRequest } from '../../domain/repositories'
import type { Review } from '../../domain/entities'
import { Button } from '../components/ui/button'

const STAGES = ['Initial', 'Secondary', 'PanelDiscussion', 'Complete']
const APPLICATION_STATUSES = ['Submitted', 'UnderReview', 'Shortlisted', 'Approved', 'Rejected']

const inputCls = 'h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring disabled:opacity-50'
const selectCls = 'h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring'

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
    setBusy(true); setErr('')
    try {
      if (mode === 'create') await onSave({ applicationId, score, comment, stage } as ReviewCreateRequest)
      else await onSave({ reviewerName: '', score, comment, stage } as ReviewUpdateRequest)
    } catch (ex: unknown) {
      setErr(ex instanceof Error ? ex.message : 'Save failed')
    } finally { setBusy(false) }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      {mode === 'create' && (
        <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
          Application
          <select className={selectCls} value={applicationId} onChange={(e) => setApplicationId(Number(e.target.value))} required>
            {applications.map((a) => <option key={a.id} value={a.id}>{a.studentName} — {a.scholarshipTitle}</option>)}
          </select>
        </label>
      )}
      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
          Score (0–100)
          <input className={inputCls} type="number" min="0" max="100" value={score} onChange={(e) => setScore(Number(e.target.value))} required />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
          Stage
          <select className={selectCls} value={stage} onChange={(e) => setStage(e.target.value)}>
            {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      </div>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
        Comment
        <textarea className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring resize-none" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Evaluation notes…" required />
      </label>
      {err && <p className="text-sm text-destructive">{err}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>{busy ? 'Saving…' : mode === 'create' ? 'Submit review' : 'Save changes'}</Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>Cancel</Button>
      </div>
    </form>
  )
}

export function ReviewerDashboard() {
  const [refreshKey, setRefreshKey] = useState(0)
  const [applicationRefreshKey, setApplicationRefreshKey] = useState(0)
  const scholarships = useScholarships(refreshKey)
  const queue = useReviewQueue(refreshKey)
  const applications = useApplications(applicationRefreshKey)
  const refresh = useCallback(() => { setRefreshKey((k) => k + 1); setApplicationRefreshKey((k) => k + 1) }, [])

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
    .map((a) => ({ id: a.id, scholarshipTitle: a.scholarshipTitle, studentName: a.studentName }))

  const reviewedByMeApplicationIds = new Set((queue.data ?? []).filter((r) => r.isMine).map((r) => r.applicationId))
  const unreviewedSubmissions = appOptions.filter((app) => !reviewedByMeApplicationIds.has(app.id))

  const averageScore = (queue.data?.length ?? 0) > 0
    ? Math.round((queue.data ?? []).reduce((sum, item) => sum + item.recommendedScore, 0) / (queue.data?.length ?? 1))
    : 0
  const completeStageCount = (queue.data ?? []).filter((item) => item.stage === 'Complete').length

  useEffect(() => {
    if (creatingForApplicationId === null) return
    window.requestAnimationFrame(() => reviewFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }, [creatingForApplicationId])

  function openCreateForm(applicationId: number) { setEditing(null); setCreatingForApplicationId(applicationId) }

  async function handleCreate(req: ReviewCreateRequest | ReviewUpdateRequest) {
    await reviewApi.create(req as ReviewCreateRequest)
    setCreatingForApplicationId(null); setEditing(null); refresh()
  }
  async function handleUpdate(req: ReviewCreateRequest | ReviewUpdateRequest) {
    if (!editing) return
    await reviewApi.update(editing.id, req as ReviewUpdateRequest)
    setEditing(null); refresh()
  }
  async function handleDelete(id: number) {
    setDeleteErr('')
    try { await reviewApi.remove(id); setDeleteId(null); refresh() }
    catch (ex: unknown) { setDeleteErr(ex instanceof Error ? ex.message : 'Delete failed') }
  }

  function resolveCurrentApplicationStatus(applicationId: number) {
    return (applications.data ?? []).find((a) => a.id === applicationId)?.status ?? 'Submitted'
  }

  async function handleApplicationStatusUpdate(applicationId: number, status: string) {
    setStatusUpdateAppId(applicationId); setStatusFeedbackAppId(applicationId); setStatusNotice(''); setStatusErr('')
    try {
      await applicationApi.update(applicationId, { status })
      setStatusNotice(`Application status updated to ${status}.`)
      refresh()
    } catch (ex: unknown) {
      setStatusErr(ex instanceof Error ? ex.message : 'Status update failed')
    } finally { setStatusUpdateAppId(null) }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* KPI row */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Queue items" value={queue.data?.length ?? 0} />
        <StatCard label="Average score" value={averageScore} />
        <StatCard label="Completed stage" value={completeStageCount} />
      </div>

      {/* Unreviewed submissions */}
      {unreviewedSubmissions.length > 0 && (
        <div className="rounded-xl border bg-card p-6 flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-foreground">Unreviewed submissions</h2>
          <div className="grid grid-cols-2 gap-4">
            {unreviewedSubmissions.map((submission) => (
              <article key={submission.id} className="rounded-xl border bg-background p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-foreground">{submission.studentName}</h3>
                  <StatusBadge label={resolveCurrentApplicationStatus(submission.id)} />
                </div>
                <p className="text-sm font-medium text-muted-foreground">{submission.scholarshipTitle}</p>
                <Button size="sm" onClick={() => openCreateForm(submission.id)}>Review submission</Button>
              </article>
            ))}
          </div>
        </div>
      )}

      {/* Review queue */}
      <div className="rounded-xl border bg-card p-6 flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-foreground">Reviewer queue</h2>

        {creatingForApplicationId !== null && (
          <div ref={reviewFormRef} className="rounded-lg border bg-muted/30 p-5">
            <h3 className="font-semibold text-foreground mb-4">Submit review</h3>
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
          <div className="rounded-lg border bg-muted/30 p-5">
            <h3 className="font-semibold text-foreground mb-4">Edit review — {editing.applicantName}</h3>
            <ReviewForm
              applications={appOptions}
              initial={{ applicationId: editing.applicationId, score: editing.recommendedScore, comment: editing.comment, stage: editing.stage }}
              onSave={handleUpdate}
              onCancel={() => setEditing(null)}
              mode="edit"
            />
          </div>
        )}

        {deleteId !== null && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 flex flex-col gap-3">
            <p className="text-sm text-foreground">Delete review #{deleteId}?</p>
            {deleteErr && <p className="text-sm text-destructive">{deleteErr}</p>}
            <div className="flex gap-2">
              <Button variant="destructive" size="sm" onClick={() => void handleDelete(deleteId)}>Yes, delete</Button>
              <Button variant="outline" size="sm" onClick={() => { setDeleteId(null); setDeleteErr('') }}>Cancel</Button>
            </div>
          </div>
        )}

        {queue.loading && <p className="text-sm text-muted-foreground">Loading review queue…</p>}
        {queue.error && <p className="text-sm text-destructive">{queue.error}</p>}
        {normalizedQuery.length > 0 && <p className="text-sm text-muted-foreground">Showing {filteredQueue.length} review(s) for "{searchQuery}".</p>}

        {filteredQueue.length === 0 && !queue.loading && (
          <p className="text-sm text-muted-foreground">{normalizedQuery.length > 0 ? 'No reviews match your search.' : 'No reviews yet.'}</p>
        )}

        <div className="grid grid-cols-2 gap-4">
          {filteredQueue.map((item) => (
            <article key={item.id} className="rounded-xl border bg-background p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-foreground">{item.applicantName}</h3>
                <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
                  {item.recommendedScore}/100
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">{item.isMine ? 'My review' : 'Other reviewer'}</strong> · {item.reviewerName}
              </p>
              <p className="text-sm font-medium text-foreground">{item.scholarshipTitle}</p>
              <p className="text-sm text-muted-foreground">{item.comment}</p>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">Stage:</span>
                <StatusBadge label={item.stage} />
              </div>

              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-medium text-muted-foreground">Application status</p>
                <div className="flex gap-2">
                  <select
                    className="flex-1 h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring"
                    value={statusByApplication[item.applicationId] ?? resolveCurrentApplicationStatus(item.applicationId)}
                    onChange={(e) => setStatusByApplication((prev) => ({ ...prev, [item.applicationId]: e.target.value }))}>
                    {APPLICATION_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <Button
                    size="sm"
                    disabled={statusUpdateAppId === item.applicationId}
                    onClick={() => void handleApplicationStatusUpdate(
                      item.applicationId,
                      statusByApplication[item.applicationId] ?? resolveCurrentApplicationStatus(item.applicationId),
                    )}>
                    {statusUpdateAppId === item.applicationId ? 'Updating…' : 'Update'}
                  </Button>
                </div>
                {statusFeedbackAppId === item.applicationId && statusNotice && <p className="text-xs text-green-700">{statusNotice}</p>}
                {statusFeedbackAppId === item.applicationId && statusErr && <p className="text-xs text-destructive">{statusErr}</p>}
              </div>

              {item.isMine && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setEditing(item); setDeleteId(null) }}>Edit</Button>
                  <Button variant="destructive" size="sm" onClick={() => { setDeleteId(item.id); setEditing(null) }}>Delete</Button>
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </div>
  )
}
