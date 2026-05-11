import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react'
import { Bell, ClipboardCheck, Compass, LayoutDashboard, LogOut, Search, Upload, X } from 'lucide-react'
import { NavLink, Navigate, useNavigate } from 'react-router-dom'
import { usePortalOverview } from '../../application/hooks'
import type { AuthResponse, PortalNotification } from '../../domain/entities'
import { cn } from '../../lib/utils'
import { StatCard } from './shared'
import { Button } from './ui/button'
import { getNotifications } from '../../infrastructure/api'

export type Role = 'student' | 'reviewer' | 'admin'

type PortalSearchContextValue = { query: string }
const PortalSearchContext = createContext<PortalSearchContextValue>({ query: '' })

export function usePortalSearch() {
  return useContext(PortalSearchContext)
}

const ROLE_SUMMARY: Record<Role, { title: string }> = {
  student:  { title: 'Student portal' },
  reviewer: { title: 'Reviewer workspace' },
  admin:    { title: 'Admin control center' },
}

const ROLE_SECTIONS: Record<Role, Array<{ label: string; to: string; icon: typeof Compass }>> = {
  student: [
    { label: 'Overview',        to: '/student',         icon: LayoutDashboard },
    { label: 'Profile details', to: '/student/profile', icon: Upload },
  ],
  reviewer: [
    { label: 'Overview',        to: '/reviewer',         icon: ClipboardCheck },
    { label: 'Profile details', to: '/reviewer/profile', icon: Upload },
  ],
  admin: [
    { label: 'Overview',        to: '/admin',         icon: LayoutDashboard },
    { label: 'Profile details', to: '/admin/profile', icon: Upload },
  ],
}

function notifTypeColor(type: string) {
  switch (type) {
    case 'scholarship': return 'bg-blue-100 text-blue-700 border-blue-200'
    case 'application': return 'bg-amber-100 text-amber-700 border-amber-200'
    case 'approval':    return 'bg-green-100 text-green-700 border-green-200'
    case 'shortlist':   return 'bg-purple-100 text-purple-700 border-purple-200'
    default:            return 'bg-muted text-muted-foreground border-border'
  }
}

function notifTypeLabel(type: string) {
  switch (type) {
    case 'scholarship': return 'New'
    case 'application': return 'Review'
    case 'approval':    return 'Approved'
    case 'shortlist':   return 'Shortlisted'
    default:            return type
  }
}

export function normaliseRole(role: string): Role {
  const v = role.toLowerCase()
  return v === 'reviewer' || v === 'admin' ? v : 'student'
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
  const overview  = usePortalOverview(true)
  const navigate  = useNavigate()
  const [searchQuery, setSearchQuery]     = useState('')
  const seenKey = `notif-seen-${auth.email}`
  const [notifOpen, setNotifOpen]         = useState(false)
  const [notifications, setNotifications] = useState<PortalNotification[]>([])
  const [notifLoading, setNotifLoading]   = useState(false)
  const [notifFetched, setNotifFetched]   = useState(false)
  const [seenIds, setSeenIds]             = useState<Set<number>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem(`notif-seen-${auth.email}`) ?? '[]') as number[]) }
    catch { return new Set() }
  })
  const notifRef = useRef<HTMLDivElement>(null)
  const unreadCount = notifications.filter((n) => !seenIds.has(n.id)).length

  const initials = auth.fullName
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  useEffect(() => {
    if (!notifOpen || notifFetched) return
    setNotifLoading(true)
    getNotifications()
      .then((data) => { setNotifications(data); setNotifFetched(true) })
      .catch(() => setNotifications([]))
      .finally(() => setNotifLoading(false))
  }, [notifOpen, notifFetched])

  useEffect(() => {
    if (!notifOpen || !notifFetched || notifications.length === 0) return
    setSeenIds((prev) => {
      const hasNew = notifications.some((n) => !prev.has(n.id))
      if (!hasNew) return prev
      const next = new Set([...prev, ...notifications.map((n) => n.id)])
      localStorage.setItem(seenKey, JSON.stringify([...next]))
      return next
    })
  }, [notifOpen, notifFetched, notifications, seenKey])

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false)
    }
    if (notifOpen) document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [notifOpen])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setNotifOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  function handleNotifClick(link: string) {
    setNotifOpen(false)
    navigate(link)
  }

  return (
    <PortalSearchContext.Provider value={{ query: searchQuery }}>
      <div className="flex min-h-screen bg-background">

        <aside className="w-64 flex-none border-r bg-sidebar flex flex-col h-screen sticky top-0 overflow-y-auto shrink-0">
          <div className="px-5 py-5 border-b border-sidebar-border flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white overflow-hidden flex-none border border-sidebar-border shrink-0">
              <img src="/ius-logo.png" alt="IUS" className="w-full h-full object-contain p-0.5" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm text-sidebar-foreground truncate">Scholarship Portal</p>
              <p className="text-xs mt-0.5 truncate" style={{ color: 'oklch(0.875 0.015 255 / 0.55)' }}>
                International University of Sarajevo
              </p>
            </div>
          </div>

          <nav className="flex-1 px-3 py-5 flex flex-col gap-1">
            <p className="text-[0.625rem] font-bold px-3 mb-3 uppercase tracking-widest" style={{ color: 'oklch(0.875 0.015 255 / 0.45)' }}>
              Navigation
            </p>
            {ROLE_SECTIONS[activeRole].map((link) => {
              const Icon = link.icon
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
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

          <div className="px-5 py-4 border-t border-sidebar-border">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-full bg-sidebar-primary/20 text-sidebar-primary text-xs font-bold flex items-center justify-center shrink-0">
                {initials || 'IU'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-sidebar-foreground truncate">{auth.fullName}</p>
                <p className="text-[0.625rem] truncate" style={{ color: 'oklch(0.875 0.015 255 / 0.5)' }}>{auth.email}</p>
              </div>
            </div>
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="border-b bg-card px-6 py-3.5 flex items-center justify-between gap-4 sticky top-0 z-20" style={{ boxShadow: '0 1px 0 var(--border), 0 2px 8px rgba(10,31,78,0.05)' }}>
            <div>
              <h1 className="text-xl font-bold text-foreground">{pageTitle}</h1>
              <p className="text-xs text-muted-foreground mt-0.5">{ROLE_SUMMARY[activeRole].title}</p>
            </div>

            <div className="flex items-center gap-3">
              <label className="hidden sm:flex items-center gap-2 border border-input rounded-lg bg-background px-3 h-9 w-56 lg:w-72 cursor-text">
                <Search size={14} className="text-muted-foreground flex-none" />
                <input
                  type="text"
                  placeholder="Search…"
                  className="bg-transparent text-sm outline-none flex-1 text-foreground placeholder:text-muted-foreground"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </label>

              <div className="relative" ref={notifRef}>
                <button
                  type="button"
                  onClick={() => setNotifOpen((o) => !o)}
                  className={cn(
                    'relative h-9 w-9 rounded-full border flex items-center justify-center transition-colors',
                    notifOpen
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'text-muted-foreground hover:bg-accent border-input'
                  )}
                  aria-label="Notifications"
                >
                  <Bell size={15} />
                  {!notifFetched && (
                    <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full border-2 border-card" style={{ backgroundColor: 'oklch(0.800 0.180 82)' }} />
                  )}
                  {notifFetched && unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[1.1rem] h-[1.1rem] rounded-full text-[0.6rem] font-bold flex items-center justify-center px-1 border-2 border-card" style={{ backgroundColor: 'oklch(0.800 0.180 82)', color: 'oklch(0.175 0.120 262)' }}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border bg-card overflow-hidden slide-in" style={{ boxShadow: '0 8px 30px rgba(10,31,78,0.15), 0 2px 8px rgba(10,31,78,0.08)', zIndex: 50 }}>
                    <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/50">
                      <div>
                        <span className="text-sm font-semibold text-foreground">Notifications</span>
                        {notifications.length > 0 && (
                          <span className="ml-2 text-xs text-muted-foreground">{notifications.length} item{notifications.length !== 1 ? 's' : ''}</span>
                        )}
                      </div>
                      <button onClick={() => setNotifOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors rounded p-0.5 hover:bg-muted">
                        <X size={14} />
                      </button>
                    </div>
                    <div className="max-h-[420px] overflow-y-auto divide-y divide-border">
                      {notifLoading && (
                        <p className="px-4 py-8 text-center text-sm text-muted-foreground">Loading…</p>
                      )}
                      {!notifLoading && notifications.length === 0 && (
                        <p className="px-4 py-8 text-center text-sm text-muted-foreground">No notifications.</p>
                      )}
                      {notifications.map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => handleNotifClick(n.link)}
                          className="w-full text-left px-4 py-3.5 hover:bg-muted/40 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <span className="text-sm font-semibold text-foreground leading-snug">{n.title}</span>
                            <span className={cn('text-[0.6rem] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full border flex-shrink-0 mt-0.5', notifTypeColor(n.type))}>
                              {notifTypeLabel(n.type)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">{n.message}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="hidden sm:flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-none">
                  {initials || 'IU'}
                </div>
                <div className="hidden md:grid leading-tight">
                  <span className="text-sm font-semibold text-foreground">{auth.fullName}</span>
                  <span className="text-xs text-muted-foreground">{auth.email}</span>
                </div>
              </div>

              <Button variant="ghost" size="sm" onClick={onLogout} className="gap-1.5">
                <LogOut size={14} />
                <span className="hidden sm:inline">Log out</span>
              </Button>
            </div>
          </header>

          <div className="flex-1 px-4 sm:px-6 lg:px-8 pb-10">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-6">
              <StatCard label="Students"          value={overview.data?.totalStudents ?? '—'} />
              <StatCard label="Open scholarships" value={overview.data?.totalOpenScholarships ?? '—'} />
              <StatCard label="Pending reviews"   value={overview.data?.pendingReviews ?? '—'} />
              <StatCard label="Published results" value={overview.data?.publishedResults ?? '—'} />
            </div>
            <main className="py-6">{children}</main>
          </div>
        </div>

      </div>
    </PortalSearchContext.Provider>
  )
}
