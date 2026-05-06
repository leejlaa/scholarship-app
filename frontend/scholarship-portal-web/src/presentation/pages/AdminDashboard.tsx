import { useState, useCallback, useEffect } from 'react'
import { useScholarships } from '../../application/hooks'
import { formatDate, formatMoney, StatusBadge, StatCard } from '../components/shared'
import { usePortalSearch } from '../components/PortalLayout'
import { assignScholarshipReviewer, listReviewers, scholarshipApi } from '../../infrastructure/api'
import type { ScholarshipWriteRequest } from '../../domain/repositories'
import type { ReviewerSummary, Scholarship } from '../../domain/entities'
import { Button } from '../components/ui/button'

const EMPTY_FORM: ScholarshipWriteRequest = { title: '', audience: '', deadline: '', eligibility: '', amount: 0 }

const inputCls = 'h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring disabled:opacity-50'
const selectCls = 'h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring'

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
    setBusy(true); setErr('')
    try {
      if (requireReviewer && !form.reviewerId) { setErr('Reviewer is required.'); setBusy(false); return }
      await onSave(form)
    } catch (ex: unknown) {
      setErr(ex instanceof Error ? ex.message : 'Save failed')
    } finally { setBusy(false) }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
          Title
          <input className={inputCls} value={form.title} onChange={(e) => set('title', e.target.value)} required />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
          Audience
          <input className={inputCls} value={form.audience} onChange={(e) => set('audience', e.target.value)} required />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
          Deadline
          <input className={inputCls} type="date" value={form.deadline} onChange={(e) => set('deadline', e.target.value)} required />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
          Award amount (USD)
          <input className={inputCls} type="number" min="0" step="100" value={form.amount} onChange={(e) => set('amount', parseFloat(e.target.value) || 0)} required />
        </label>
      </div>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
        Assigned reviewer
        <select className={selectCls} value={form.reviewerId ?? ''} onChange={(e) => set('reviewerId', e.target.value)} required={requireReviewer}>
          <option value="">Select reviewer</option>
          {reviewers.map((r) => <option key={r.id} value={r.id}>{r.fullName} ({r.email})</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
        Eligibility criteria
        <textarea className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring resize-none" rows={2} value={form.eligibility} onChange={(e) => set('eligibility', e.target.value)} required />
      </label>
      {err && <p className="text-sm text-destructive">{err}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>{busy ? 'Saving…' : submitLabel}</Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>Cancel</Button>
      </div>
    </form>
  )
}

export function AdminDashboard() {
  const [refreshKey, setRefreshKey] = useState(0)
  const scholarships = useScholarships(refreshKey)
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), [])

  const [editing, setEditing] = useState<null | 'new' | Scholarship>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleteErr, setDeleteErr] = useState('')
  const [reviewers, setReviewers] = useState<ReviewerSummary[]>([])
  const [reviewerByScholarship, setReviewerByScholarship] = useState<Record<number, string>>({})
  const [assigningScholarshipId, setAssigningScholarshipId] = useState<number | null>(null)
  const [assignErr, setAssignErr] = useState('')

  useEffect(() => {
    void listReviewers().then(setReviewers).catch(() => setReviewers([]))
  }, [])

  async function handleCreate(req: ScholarshipWriteRequest) {
    await scholarshipApi.create(req); setEditing(null); refresh()
  }
  async function handleUpdate(req: ScholarshipWriteRequest) {
    if (!editing || editing === 'new') return
    await scholarshipApi.update(editing.id, req); setEditing(null); refresh()
  }
  async function handleDelete(id: number) {
    setDeleteErr('')
    try { await scholarshipApi.remove(id); setDeleteId(null); refresh() }
    catch (ex: unknown) { setDeleteErr(ex instanceof Error ? ex.message : 'Delete failed') }
  }
  async function handleAssignReviewer(scholarship: Scholarship) {
    setAssignErr(''); setAssigningScholarshipId(scholarship.id)
    try {
      const selected = reviewerByScholarship[scholarship.id]
      await assignScholarshipReviewer(scholarship.id, selected ? selected : null)
      refresh()
    } catch (ex: unknown) {
      setAssignErr(ex instanceof Error ? ex.message : 'Reviewer assignment failed')
    } finally { setAssigningScholarshipId(null) }
  }

  function toWriteRequest(s: Scholarship): ScholarshipWriteRequest {
    return { title: s.title, audience: s.audience, deadline: s.deadline, eligibility: s.eligibility, amount: s.amount, reviewerId: s.assignedReviewerId ?? undefined }
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
    <div className="flex flex-col gap-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 max-w-lg">
        <StatCard label="Open scholarships" value={openScholarships} />
        <StatCard label="Total scholarships" value={scholarships.data?.length ?? 0} />
      </div>

      {/* Scholarship management */}
      <div className="rounded-xl border bg-card p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">Scholarship management</h2>
          <Button onClick={() => setEditing('new')}>+ New scholarship</Button>
        </div>

        {editing === 'new' && (
          <div className="rounded-lg border bg-muted/30 p-5">
            <h3 className="font-semibold text-foreground mb-4">Create scholarship</h3>
            <ScholarshipForm reviewers={reviewers} requireReviewer onSave={handleCreate} onCancel={() => setEditing(null)} submitLabel="Create" />
          </div>
        )}

        {editing && editing !== 'new' && (
          <div className="rounded-lg border bg-muted/30 p-5">
            <h3 className="font-semibold text-foreground mb-4">Edit — {editing.title}</h3>
            <ScholarshipForm initial={toWriteRequest(editing)} reviewers={reviewers} requireReviewer={false} onSave={handleUpdate} onCancel={() => setEditing(null)} submitLabel="Save changes" />
          </div>
        )}

        {scholarships.loading && <p className="text-sm text-muted-foreground">Loading scholarships…</p>}
        {scholarships.error && <p className="text-sm text-destructive">{scholarships.error}</p>}
        {normalizedQuery.length > 0 && <p className="text-sm text-muted-foreground">Showing {filteredScholarships.length} scholarship(s) for "{searchQuery}".</p>}

        {deleteId !== null && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 flex flex-col gap-3">
            <p className="text-sm text-foreground">Delete scholarship #{deleteId}? This cannot be undone.</p>
            {deleteErr && <p className="text-sm text-destructive">{deleteErr}</p>}
            <div className="flex gap-2">
              <Button variant="destructive" size="sm" onClick={() => void handleDelete(deleteId)}>Yes, delete</Button>
              <Button variant="outline" size="sm" onClick={() => { setDeleteId(null); setDeleteErr('') }}>Cancel</Button>
            </div>
          </div>
        )}

        {filteredScholarships.length === 0 && !scholarships.loading && (
          <p className="text-sm text-muted-foreground">No scholarships match your search.</p>
        )}

        <div className="grid grid-cols-2 gap-4">
          {filteredScholarships.map((item) => (
            <article key={item.id} className="rounded-xl border bg-background p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-foreground">{item.title}</h3>
                <StatusBadge label={item.status} />
              </div>
              <p className="text-sm text-muted-foreground">{item.audience}</p>
              <div className="text-sm text-foreground space-y-0.5">
                <p><span className="font-medium">Deadline:</span> {formatDate(item.deadline)} · <span className="font-medium">Award:</span> {formatMoney(item.amount)}</p>
                <p className="italic text-muted-foreground">{item.eligibility}</p>
                <p><span className="font-medium">Reviewer:</span> {item.assignedReviewerName ?? 'Unassigned'}</p>
              </div>

              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-medium text-muted-foreground">Assign reviewer</p>
                <div className="flex gap-2">
                  <select
                    className="flex-1 h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring"
                    value={reviewerByScholarship[item.id] ?? item.assignedReviewerId ?? ''}
                    onChange={(e) => setReviewerByScholarship((prev) => ({ ...prev, [item.id]: e.target.value }))}>
                    <option value="">Unassigned</option>
                    {reviewers.map((r) => <option key={r.id} value={r.id}>{r.fullName} ({r.email})</option>)}
                  </select>
                  <Button size="sm" disabled={assigningScholarshipId === item.id} onClick={() => void handleAssignReviewer(item)}>
                    {assigningScholarshipId === item.id ? 'Assigning…' : 'Assign'}
                  </Button>
                </div>
                {assignErr && <p className="text-xs text-destructive">{assignErr}</p>}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { setEditing(item); setDeleteId(null) }}>Edit</Button>
                <Button variant="destructive" size="sm" onClick={() => { setDeleteId(item.id); setEditing(null) }}>Delete</Button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  )
}
