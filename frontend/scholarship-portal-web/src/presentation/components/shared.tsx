// Shared UI utilities and micro-components

import { Card, CardContent } from './ui/card'

export const formatMoney = (amount: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount)

export const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

export const toStatusClass = (value: string) =>
  value.toLowerCase().replace(/\s+/g, '-')

// ── StatusBadge ────────────────────────────────────────────────────────────
interface StatusBadgeProps {
  label: string
  variant?: 'badge' | 'pill'
}

export function StatusBadge({ label, variant = 'badge' }: StatusBadgeProps) {
  const cls = variant === 'pill' ? 'status-pill' : 'status-badge'
  return (
    <span className={`${cls} ${toStatusClass(label)}`}>{label}</span>
  )
}

// ── StatCard ───────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string
  value: number | string
}

export function StatCard({ label, value }: StatCardProps) {
  return (
    <Card className="stat-card">
      <CardContent className="stat-card-content">
        <span>{label}</span>
        <strong>{value}</strong>
      </CardContent>
    </Card>
  )
}
