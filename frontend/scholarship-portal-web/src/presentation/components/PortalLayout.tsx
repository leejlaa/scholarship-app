import type { ReactNode } from 'react'
import { ClipboardCheck, Compass, LayoutDashboard, LogOut, Megaphone, ShieldCheck, Upload, Workflow } from 'lucide-react'
import { NavLink, Navigate } from 'react-router-dom'
import { usePortalOverview } from '../../application/hooks'
import type { AuthResponse } from '../../domain/entities'
import { cn } from '../../lib/utils'
import { StatCard, StatusBadge } from './shared'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'

export type Role = 'student' | 'reviewer' | 'admin'

const ROLE_SUMMARY: Record<Role, { title: string; description: string }> = {
  student: {
    title: 'Student portal',
    description: 'Browse scholarships, submit applications, and upload supporting documents.',
  },
  reviewer: {
    title: 'Reviewer workspace',
    description: 'Review student applications, score submissions, and post evaluation comments.',
  },
  admin: {
    title: 'Admin control center',
    description: 'Create scholarship postings, monitor activity, and manage platform operations.',
  },
}

const ROLE_SECTIONS: Record<Role, Array<{ label: string; href: string; icon: typeof Compass }>> = {
  student: [
    { label: 'Browse opportunities', href: '#opportunities', icon: Compass },
    { label: 'My applications', href: '#applications', icon: LayoutDashboard },
    { label: 'Document uploads', href: '#documents', icon: Upload },
  ],
  reviewer: [
    { label: 'Review queue', href: '#queue', icon: ClipboardCheck },
    { label: 'Review rubric', href: '#rubric', icon: ShieldCheck },
  ],
  admin: [
    { label: 'Scholarship management', href: '#scholarships', icon: LayoutDashboard },
    { label: 'Announcements', href: '#announcements', icon: Megaphone },
    { label: 'Workflow', href: '#workflow', icon: Workflow },
  ],
}

const ROLE_FOCUS: Record<Role, string[]> = {
  student: [
    'Find the right scholarship quickly',
    'Track submissions and next steps',
    'Upload supporting documents securely',
  ],
  reviewer: [
    'Work through the pending queue',
    'Add clear, evidence-based comments',
    'Move applications through review stages',
  ],
  admin: [
    'Publish and update scholarship postings',
    'Monitor announcement activity',
    'Keep the full review workflow moving',
  ],
}

export function normaliseRole(role: string): Role {
  const value = role.toLowerCase()
  return value === 'reviewer' || value === 'admin' ? value : 'student'
}

export function defaultRouteForRole(role: Role) {
  return role === 'admin' ? '/admin' : role === 'reviewer' ? '/reviewer' : '/student'
}

interface ProtectedRouteProps {
  auth: AuthResponse | null
  allowed: Role[]
  children: ReactNode
}

export function ProtectedRoute({ auth, allowed, children }: ProtectedRouteProps) {
  if (!auth) {
    return <Navigate to="/login" replace />
  }

  const currentRole = normaliseRole(auth.role)
  if (!allowed.includes(currentRole)) {
    return <Navigate to={defaultRouteForRole(currentRole)} replace />
  }

  return <>{children}</>
}

interface PortalLayoutProps {
  auth: AuthResponse
  activeRole: Role
  onLogout: () => void
  children: ReactNode
}

export function PortalLayout({ auth, activeRole, onLogout, children }: PortalLayoutProps) {
  const overview = usePortalOverview(true)
  const currentRole = normaliseRole(auth.role)

  return (
    <div className="app-shell portal-shell">
      <div className="dashboard-shell">
        <Card className="sidebar">
          <CardHeader className="sidebar-header-block">
            <div className="sidebar-header">
              <div className="brand-mark">SP</div>
              <div>
                <CardTitle className="sidebar-brand-title">Scholarship Portal</CardTitle>
                <CardDescription>{ROLE_SUMMARY[activeRole].title}</CardDescription>
              </div>
            </div>

            <div className="sidebar-chip-row">
              <StatusBadge label={auth.role} variant="pill" />
              <span className="sidebar-subtle-pill">Secure session</span>
            </div>
          </CardHeader>

          <CardContent className="sidebar-body">
            <div className="sidebar-group">
              <p className="sidebar-title">Navigation</p>
              <NavLink to={defaultRouteForRole(currentRole)} className={({ isActive }) => cn('sidebar-link', isActive && 'active')}>
                <LayoutDashboard size={16} />
                <span>Overview</span>
              </NavLink>
              {ROLE_SECTIONS[activeRole].map((link) => {
                const Icon = link.icon
                return (
                  <a key={link.href} href={link.href} className="sidebar-link">
                    <Icon size={16} />
                    <span>{link.label}</span>
                  </a>
                )
              })}
            </div>

            <div className="sidebar-card sidebar-card-elevated">
              <p className="sidebar-title">Quick focus</p>
              <ul className="sidebar-list">
                {ROLE_FOCUS[activeRole].map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="sidebar-card">
              <p className="sidebar-title">Signed in</p>
              <p className="sidebar-meta"><strong>{auth.fullName}</strong></p>
              <p className="sidebar-meta">{auth.email}</p>
              <p className="sidebar-meta">Expires {new Date(auth.expiresAt).toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>

        <div className="main-column">
          <Card className="top-nav top-nav-card">
            <CardContent className="top-nav-content">
              <div>
                <p className="eyebrow">Role dashboard</p>
                <h1 className="page-title">{ROLE_SUMMARY[activeRole].title}</h1>
                <p className="lead">{ROLE_SUMMARY[activeRole].description}</p>
              </div>

              <div className="nav-user nav-user-card">
                <div>
                  <strong>{auth.fullName}</strong>
                  <p>{auth.email}</p>
                </div>
                <Button type="button" className="logout-button" onClick={onLogout}>
                  <LogOut size={16} />
                  <span>Log out</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          <section className="stats-grid">
            <StatCard label="Students" value={overview.data?.totalStudents ?? '—'} />
            <StatCard label="Open scholarships" value={overview.data?.totalOpenScholarships ?? '—'} />
            <StatCard label="Pending reviews" value={overview.data?.pendingReviews ?? '—'} />
            <StatCard label="Published results" value={overview.data?.publishedResults ?? '—'} />
          </section>

          <section className="hero-panel hero-panel-compact">
            <div>
              <p className="eyebrow">Professional workspace</p>
              <h2>Everything you need is organised in one place</h2>
              <p className="lead">Use the side panel to jump between your most important tasks without losing context.</p>
              <div className="pill-row">
                <span className={`status-pill ${overview.loading ? 'neutral' : overview.error ? 'closes-soon' : 'success'}`}>
                  {overview.loading ? 'Loading secured data…' : overview.error ? 'Protected API returned an error' : 'JWT authenticated'}
                </span>
                <span className="status-pill neutral">Access restricted to {activeRole}s</span>
              </div>
            </div>

            <Card className="roadmap-card roadmap-card-shell">
              <CardHeader>
                <CardTitle>Today’s focus</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="sidebar-list light-list">
                  {ROLE_FOCUS[activeRole].map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </section>

          <main className="page-content">{children}</main>
        </div>
      </div>
    </div>
  )
}
