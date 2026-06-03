import { useState, useCallback, useEffect } from 'react'
import { useScholarships } from '../../application/hooks'
import { formatDate, formatMoney, StatusBadge, StatCard } from '../components/shared'
import { usePortalSearch } from '../components/PortalLayout'
import { assignScholarshipReviewer, listReviewers, scholarshipApi } from '../../infrastructure/api'
import type { ScholarshipWriteRequest } from '../../domain/repositories'
import type { ReviewerSummary, Scholarship } from '../../domain/entities'
import { Button } from '../components/ui/button'

const EMPTY_FORM: ScholarshipWriteRequest = { title: '', audience: '', deadline: '', eligibility: '', amount: 0 }

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
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="form-group">
          <label className="label">Title</label>
          <input className="input" value={form.title} onChange={(e) => set('title', e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="label">Audience</label>
          <input className="input" value={form.audience} onChange={(e) => set('audience', e.target.value)} required />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="form-group">
          <label className="label">Deadline</label>
          <input className="input" type="date" value={form.deadline} onChange={(e) => set('deadline', e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="label">Award amount (USD)</label>
          <input className="input" type="number" min="0" step="100" value={form.amount} onChange={(e) => set('amount', parseFloat(e.target.value) || 0)} required />
        </div>
      </div>
      <div className="form-group">
        <label className="label">Assigned reviewer</label>
        <select className="select" value={form.reviewerId ?? ''} onChange={(e) => set('reviewerId', e.target.value)} required={requireReviewer}>
          <option value="">Select reviewer</option>
          {reviewers.map((r) => <option key={r.id} value={r.id}>{r.fullName} ({r.email})</option>)}
        </select>
      </div>
      <div className="form-group">
        <label className="label">Eligibility criteria</label>
        <textarea className="textarea" rows={2} value={form.eligibility} onChange={(e) => set('eligibility', e.target.value)} required />
      </div>
      {err && <div className="alert alert-error"><p className="text-sm">{err}</p></div>}
      <div className="flex gap-2">
        <Button type="submit" className="btn btn-primary flex-1" disabled={busy}>{busy ? 'Processing…' : submitLabel}</Button>
        <Button type="button" className="btn btn-outline flex-1" onClick={onCancel} disabled={busy}>Cancel</Button>
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
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Open scholarships" value={openScholarships} />
        <StatCard label="Total scholarships" value={scholarships.data?.length ?? 0} />
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Manage scholarships</h2>
            <p className="card-description">Create, edit, and assign reviewers</p>
          </div>
          <Button className="btn btn-primary" onClick={() => setEditing('new')}>New scholarship</Button>
        </div>

        <div className="card-content space-y-4">
          {editing === 'new' && (
            <div className="border rounded-lg bg-muted/30 p-5 space-y-4 slide-in">
              <h3 className="font-semibold">Create new scholarship</h3>
              <ScholarshipForm reviewers={reviewers} requireReviewer onSave={handleCreate} onCancel={() => setEditing(null)} submitLabel="Create" />
            </div>
          )}

          {editing && editing !== 'new' && (
            <div className="border rounded-lg bg-muted/30 p-5 space-y-4 slide-in">
              <h3 className="font-semibold">Edit — {editing.title}</h3>
              <ScholarshipForm initial={toWriteRequest(editing)} reviewers={reviewers} requireReviewer={false} onSave={handleUpdate} onCancel={() => setEditing(null)} submitLabel="Save changes" />
            </div>
          )}

          {scholarships.loading && <p className="text-sm text-muted-foreground text-center py-8">Loading scholarships…</p>}
          {scholarships.error && <div className="alert alert-error"><p className="text-sm">{scholarships.error}</p></div>}

          {deleteId !== null && (
            <div className="alert alert-error space-y-3">
              <p className="text-sm font-medium">Delete scholarship #{deleteId}? This cannot be undone.</p>
              {deleteErr && <p className="text-sm">{deleteErr}</p>}
              <div className="flex gap-2">
                <Button className="btn btn-destructive" onClick={() => void handleDelete(deleteId)}>Yes, delete</Button>
                <Button className="btn btn-outline" onClick={() => { setDeleteId(null); setDeleteErr('') }}>Cancel</Button>
              </div>
            </div>
          )}

          {filteredScholarships.length === 0 && !scholarships.loading && (
            <div className="py-12 text-center space-y-2">
              <p className="text-sm font-medium text-foreground">
                {normalizedQuery.length > 0 ? 'No scholarships match your search.' : 'No scholarships yet.'}
              </p>
              {normalizedQuery.length === 0 && (
                <p className="text-xs text-muted-foreground">Create your first scholarship to get started</p>
              )}
            </div>
          )}

          {filteredScholarships.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredScholarships.map((item) => (
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
                        <p className="font-medium text-sm">{formatDate(item.deadline)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Award</span>
                        <p className="font-medium text-sm">{formatMoney(item.amount)}</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{item.eligibility}</p>
                    <div className="pt-3 border-t">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Reviewer</p>
                      <div className="flex gap-2">
                        <select
                          className="select text-xs flex-1"
                          value={reviewerByScholarship[item.id] ?? item.assignedReviewerId ?? ''}
                          onChange={(e) => setReviewerByScholarship((prev) => ({ ...prev, [item.id]: e.target.value }))}>
                          <option value="">Unassigned</option>
                          {reviewers.map((r) => <option key={r.id} value={r.id}>{r.fullName}</option>)}
                        </select>
                        <Button className="btn btn-sm btn-primary" disabled={assigningScholarshipId === item.id} onClick={() => void handleAssignReviewer(item)}>
                          {assigningScholarshipId === item.id ? '...' : 'Assign'}
                        </Button>
                      </div>
                      {assignErr && <p className="text-xs text-destructive mt-1">{assignErr}</p>}
                    </div>
                  </div>
                  <div className="card-footer">
                    <Button className="btn btn-outline flex-1" onClick={() => { setEditing(item); setDeleteId(null) }}>Edit</Button>
                    <Button className="btn btn-destructive flex-1" onClick={() => { setDeleteId(item.id); setEditing(null) }}>Delete</Button>
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
