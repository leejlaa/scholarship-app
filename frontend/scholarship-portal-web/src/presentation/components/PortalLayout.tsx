import { createContext, useContext, useState, type ReactNode } from 'react'
import { Bell, ClipboardCheck, Compass, LayoutDashboard, LogOut, Search, Upload } from 'lucide-react'
import { NavLink, Navigate } from 'react-router-dom'
import { usePortalOverview } from '../../application/hooks'
import type { AuthResponse } from '../../domain/entities'
import { cn } from '../../lib/utils'
import { StatCard } from './shared'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'

export type Role = 'student' | 'reviewer' | 'admin'

type PortalSearchContextValue = {
  query: string
}

const PortalSearchContext = createContext<PortalSearchContextValue>({ query: '' })

export function usePortalSearch() {
  return useContext(PortalSearchContext)
}

const ROLE_SUMMARY: Record<Role, { title: string }> = {
  student: {
    title: 'Student portal',
  },
  reviewer: {
    title: 'Reviewer workspace',
  },
  admin: {
    title: 'Admin control center',
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
  ],
  admin: [
    { label: 'Scholarship management', href: '#scholarships', icon: LayoutDashboard },
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
  const [searchQuery, setSearchQuery] = useState('')
  const initials = auth.fullName
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <PortalSearchContext.Provider value={{ query: searchQuery }}>
      <div className="app-shell portal-shell">
        <div className="dashboard-shell">
        <Card className="sidebar">
          <CardHeader className="sidebar-header-block">
            <div className="sidebar-header">
              <div className="brand-mark">
                <img src="/ius-logo.png" alt="IUS logo" className="brand-logo-img" />
              </div>
              <div>
                <CardTitle className="sidebar-brand-title">Scholaship application</CardTitle>
                <p className="sidebar-subtitle">International University of Sarajevo</p>
                <p className="sidebar-meta">{ROLE_SUMMARY[activeRole].title}</p>
              </div>
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
          </CardContent>
        </Card>

        <div className="main-column">
          <Card className="top-nav top-nav-card">
            <CardContent className="top-nav-content">
              <div className="top-nav-main">
                <h1 className="page-title">Dashboard</h1>
                <p className="page-subtitle">{ROLE_SUMMARY[activeRole].title}</p>
              </div>

              <div className="top-nav-toolbar">
                <label className="top-nav-search" aria-label="Search">
                  <Search size={16} />
                  <input
                    type="text"
                    placeholder="Search scholarships, applications..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </label>

                <div className="nav-user nav-user-card">
                  <button type="button" className="nav-icon-button" aria-label="Notifications">
                    <Bell size={16} />
                    <span className="nav-dot" />
                  </button>

                  <div className="nav-avatar">{initials || 'IU'}</div>

                  <div className="nav-user-meta">
                    <strong>{auth.fullName}</strong>
                    <p>{auth.email}</p>
                  </div>

                  <Button type="button" className="logout-button" onClick={onLogout}>
                    <LogOut size={16} />
                    <span>Log out</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <section className="stats-grid">
            <StatCard label="Students" value={overview.data?.totalStudents ?? '—'} />
            <StatCard label="Open scholarships" value={overview.data?.totalOpenScholarships ?? '—'} />
            <StatCard label="Pending reviews" value={overview.data?.pendingReviews ?? '—'} />
            <StatCard label="Published results" value={overview.data?.publishedResults ?? '—'} />
          </section>

          <main className="page-content">{children}</main>
        </div>
      </div>
      </div>
    </PortalSearchContext.Provider>
  )
}
