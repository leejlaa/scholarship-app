import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useScholarships, useApplications } from '../../application/hooks'
import { StatusBadge, formatDate, formatMoney, StatCard } from '../components/shared'
import { usePortalSearch } from '../components/PortalLayout'
import { applicationApi } from '../../infrastructure/api'
import { Button } from '../components/ui/button'

export function StudentDashboard() {
  const navigate = useNavigate()
  const [refreshKey, setRefreshKey] = useState(0)
  const scholarships = useScholarships()
  const applications = useApplications(refreshKey)
  const { query: searchQuery } = usePortalSearch()
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), [])

  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleteErr, setDeleteErr] = useState('')

  const summary = {
    completeDocs: (applications.data ?? []).filter((a) => a.documentsComplete).length,
    shortlisted:  (applications.data ?? []).filter((a) => a.status === 'Shortlisted').length,
    pending:      (applications.data ?? []).filter((a) => a.status !== 'Approved').length,
  }
  const openScholarships      = (scholarships.data ?? []).filter((s) => s.status.toLowerCase() === 'open').length
  const totalApplications     = (applications.data ?? []).length
  const submittedApplications = (applications.data ?? []).filter((a) => a.status === 'Submitted').length

  const normalizedQuery = searchQuery.trim().toLowerCase()
  const filteredScholarships = (scholarships.data ?? []).filter((item) =>
    normalizedQuery.length === 0
    || item.title.toLowerCase().includes(normalizedQuery)
    || item.audience.toLowerCase().includes(normalizedQuery)
    || item.eligibility.toLowerCase().includes(normalizedQuery)
    || item.status.toLowerCase().includes(normalizedQuery))

  const applicationByScholarshipTitle = new Map((applications.data ?? []).map((app) => [app.scholarshipTitle, app]))

  async function handleDelete(id: number) {
    setDeleteErr('')
    try { await applicationApi.remove(id); setDeleteId(null); refresh() }
    catch (ex) { setDeleteErr(ex instanceof Error ? ex.message : 'Delete failed') }
  }

  return (
    <div className="space-y-6">
      <div className="grid-auto-fit">
        <StatCard label="Open opportunities" value={openScholarships} />
        <StatCard label="Total applications"  value={totalApplications} />
        <StatCard label="Submitted"           value={submittedApplications} />
        <StatCard label="Shortlisted"         value={summary.shortlisted} />
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Available scholarships</h2>
            <p className="card-description">Browse and apply for scholarships</p>
          </div>
          <Button className="btn btn-primary" onClick={() => navigate('/student/apply')}>New application</Button>
        </div>
        <div className="card-content space-y-4">
          {scholarships.loading && <p className="text-sm text-muted-foreground">Loading scholarships…</p>}
          {scholarships.error   && <p className="text-sm text-destructive">{scholarships.error}</p>}

          {!scholarships.loading && !scholarships.error && (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredScholarships.map((item) => {
                const isClosed = item.status.toLowerCase() === 'closed'
                const existingApplication = applicationByScholarshipTitle.get(item.title)
                return (
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
                          <p className="font-medium">{formatDate(item.deadline)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Award</span>
                          <p className="font-medium">{formatMoney(item.amount)}</p>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">Eligibility: {item.eligibility}</p>
                    </div>
                    <div className="card-footer">
                      {existingApplication ? (
                        <>
                          <Button className="btn btn-outline flex-1" disabled>Applied</Button>
                          <Button className="btn btn-primary flex-1" onClick={() => navigate(`/student/application/${existingApplication.id}/documents`)}>Manage</Button>
                        </>
                      ) : (
                        <Button
                          className="btn btn-primary w-full"
                          disabled={isClosed}
                          onClick={() => navigate(`/student/apply?id=${item.id}`)}
                        >
                          {isClosed ? 'Application Closed' : 'Apply Now'}
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Your applications</h2>
            <p className="card-description">Track your scholarship applications</p>
          </div>
        </div>
        <div className="card-content space-y-6">
          <div className="grid gap-3 md:grid-cols-3">
            {[
              { label: 'Complete document sets', value: summary.completeDocs },
              { label: 'Shortlisted',            value: summary.shortlisted },
              { label: 'In progress',            value: summary.pending },
            ].map(({ label, value }) => (
              <div key={label} className="card">
                <div className="card-content">
                  <p className="stat-label">{label}</p>
                  <p className="stat-value">{value}</p>
                </div>
              </div>
            ))}
          </div>

          {applications.loading && <p className="text-sm text-muted-foreground">Loading applications…</p>}
          {applications.error   && <p className="text-sm text-destructive">{applications.error}</p>}

          {deleteId !== null && (
            <div className="alert alert-error space-y-3">
              <p className="text-sm font-medium">Withdraw application #{deleteId}?</p>
              {deleteErr && <p className="text-sm">{deleteErr}</p>}
              <div className="flex gap-2">
                <Button className="btn btn-destructive" onClick={() => void handleDelete(deleteId)}>Yes, withdraw</Button>
                <Button className="btn btn-outline" onClick={() => { setDeleteId(null); setDeleteErr('') }}>Cancel</Button>
              </div>
            </div>
          )}

          {(applications.data ?? []).length > 0 && (
            <div className="border rounded-lg overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Scholarship</th>
                    <th>Status</th>
                    <th>Documents</th>
                    <th>Next step</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(applications.data ?? []).map((item) => (
                    <tr key={item.id}>
                      <td className="font-medium">{item.scholarshipTitle}</td>
                      <td><StatusBadge label={item.status} /></td>
                      <td className="text-sm">{item.documentsComplete ? '✓ Complete' : '○ Missing'}</td>
                      <td className="text-sm text-muted-foreground">{item.nextStep}</td>
                      <td>
                        <div className="flex gap-1.5 justify-end">
                          <Button className="btn btn-ghost btn-sm" onClick={() => navigate(`/student/application/${item.id}/documents`)}>Edit</Button>
                          <Button className="btn btn-destructive btn-sm" onClick={() => { setDeleteId(item.id) }}>Remove</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {(applications.data ?? []).length === 0 && !applications.loading && (
            <div className="py-10 text-center space-y-3">
              <p className="text-sm text-muted-foreground">No applications yet.</p>
              <Button className="btn btn-primary" onClick={() => navigate('/student/apply')}>Browse scholarships</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
