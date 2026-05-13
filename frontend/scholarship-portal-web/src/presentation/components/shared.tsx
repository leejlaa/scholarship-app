import { cn } from '../../lib/utils'

export const formatMoney = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount)

export const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

function statusColors(label: string): string {
  const s = label.toLowerCase().replace(/\s+/g, '-')
  if (['open', 'approved', 'complete', 'shortlisted'].some((k) => s.includes(k)))
    return 'bg-green-100 text-green-800 border-green-200'
  if (['under-review', 'underreview', 'closes-soon', 'initial', 'secondary', 'panel'].some((k) => s.includes(k)))
    return 'bg-amber-100 text-amber-800 border-amber-200'
  if (['rejected', 'needs-documents', 'closed'].some((k) => s.includes(k)))
    return 'bg-red-100 text-red-800 border-red-200'
  if (['submitted'].some((k) => s.includes(k)))
    return 'bg-blue-100 text-blue-800 border-blue-200'
  return 'bg-muted text-muted-foreground border-border'
}

interface StatusBadgeProps {
  label: string
  variant?: 'badge' | 'pill'
}

export function StatusBadge({ label }: StatusBadgeProps) {
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold', statusColors(label))}>
      {label}
    </span>
  )
}

interface StatCardProps {
  label: string
  value: number | string
}

export function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
    </div>
  )
}
