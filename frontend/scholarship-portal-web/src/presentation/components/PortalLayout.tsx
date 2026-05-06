import { createContext, useContext, useState, type ReactNode } from 'react'
import { Bell, ClipboardCheck, Compass, LayoutDashboard, LogOut, Search, Upload } from 'lucide-react'
import { NavLink, Navigate } from 'react-router-dom'
import { usePortalOverview } from '../../application/hooks'
import type { AuthResponse } from '../../domain/entities'
import { cn } from '../../lib/utils'
import { StatCard } from './shared'
import { Button } from './ui/button'

export type Role = 'student' | 'reviewer' | 'admin'

type PortalSearchContextValue = { query: string }
const PortalSearchContext = createContext<PortalSearchContextValue>({ query: '' })

export function usePortalSearch() {
  return useContext(PortalSearchContext)
}

const ROLE_SUMMARY: Record<Role, { title: string }> = {
  student: { title: 'Student portal' },
  reviewer: { title: 'Reviewer workspace' },
  admin: { title: 'Admin control center' },
}

const ROLE_SECTIONS: Record<Role, Array<{ label: string; to: string; icon: typeof Compass }>> = {
  student: [
    { label: 'Overview', to: '/student', icon: LayoutDashboard },
    { label: 'Profile details', to: '/student/profile', icon: Upload },
  ],
  reviewer: [
    { label: 'Overview', to: '/reviewer', icon: ClipboardCheck },
    { label: 'Profile details', to: '/reviewer/profile', icon: Upload },
  ],
  admin: [
    { label: 'Overview', to: '/admin', icon: LayoutDashboard },
    { label: 'Profile details', to: '/admin/profile', icon: Upload },
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
  if (!auth) return <Navigate to="/login" replace />
  const currentRole = normaliseRole(auth.role)
  if (!allowed.includes(currentRole)) return <Navigate to={defaultRouteForRole(currentRole)} replace />
  return <>{children}</>
}

interface PortalLayoutProps {
  auth: AuthResponse
  activeRole: Role
  onLogout: () => void
  pageTitle?: string
  children: ReactNode
}

export function PortalLayout({ auth, activeRole, onLogout, pageTitle = 'Dashboard', children }: PortalLayoutProps) {
  const overview = usePortalOverview(true)
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
      <div className="flex min-h-screen bg-background">
        {/* Sidebar */}
        <aside className="w-60 flex-none border-r bg-sidebar flex flex-col h-screen sticky top-0 overflow-y-auto">
          <div className="px-4 py-5 border-b border-sidebar-border flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white overflow-hidden flex-none border border-sidebar-border">
              <img src="/ius-logo.png" alt="IUS logo" className="w-full h-full object-contain p-0.5" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm text-sidebar-foreground truncate">Scholarship App</p>
              <p className="text-xs text-muted-foreground">IUS</p>
            </div>
          </div>

          <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
            <p className="text-xs font-semibold text-muted-foreground px-2 mb-2 uppercase tracking-wide">Navigation</p>
            {ROLE_SECTIONS[activeRole].map((link) => {
              const Icon = link.icon
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                    )
                  }
                >
                  <Icon size={16} />
                  {link.label}
                </NavLink>
              )
            })}
          </nav>
        </aside>

        {/* Main area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top nav */}
          <header className="border-b bg-background px-6 py-4 flex items-center justify-between gap-4 sticky top-0 z-10">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{pageTitle}</h1>
              <p className="text-sm text-muted-foreground">{ROLE_SUMMARY[activeRole].title}</p>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 border border-input rounded-lg bg-background px-3 h-9 w-64 cursor-text">
                <Search size={14} className="text-muted-foreground flex-none" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="bg-transparent text-sm outline-none flex-1 text-foreground placeholder:text-muted-foreground"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </label>

              <button
                type="button"
                className="relative h-9 w-9 rounded-full border flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
                aria-label="Notifications"
              >
                <Bell size={16} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-destructive" />
              </button>

              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-none">
                  {initials || 'IU'}
                </div>
                <div className="hidden sm:grid leading-tight">
                  <span className="text-sm font-medium text-foreground">{auth.fullName}</span>
                  <span className="text-xs text-muted-foreground">{auth.email}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={onLogout} className="gap-1.5 ml-1">
                  <LogOut size={14} />
                  Log out
                </Button>
              </div>
            </div>
          </header>

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-4 px-6 pt-6">
            <StatCard label="Students" value={overview.data?.totalStudents ?? '—'} />
            <StatCard label="Open scholarships" value={overview.data?.totalOpenScholarships ?? '—'} />
            <StatCard label="Pending reviews" value={overview.data?.pendingReviews ?? '—'} />
            <StatCard label="Published results" value={overview.data?.publishedResults ?? '—'} />
          </div>

          <main className="flex-1 px-6 py-6">{children}</main>
        </div>
      </div>
    </PortalSearchContext.Provider>
  )
}
