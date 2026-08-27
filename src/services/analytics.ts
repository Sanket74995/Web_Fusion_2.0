import type { AppState, Borrowing, Category, PlatformBaseline, Resource } from '@/types'
import { LIFECYCLE_ORDER } from '@/types'
import { sum } from '@/lib/utils'

/* Headline figures the platform reports "since launch". */
export const PLATFORM_TARGETS = {
  members: 1248,
  resources: 387,
  exchanges: 856,
  moneySaved: 240000,
  resourcesReused: 1920,
}

/**
 * Rough retail value of a resource, inferred from its daily rate.
 * A ~40-day payback is the usual rule of thumb for casual rental pricing.
 */
export function estimatedRetailValue(resource: Resource) {
  return Math.round((resource.pricePerDay * 40) / 50) * 50
}

/**
 * What a borrower avoided spending by borrowing instead of buying.
 * Stated assumption: a single short loan consumes ~20% of the value a
 * purchase would have delivered. Shown with that caveat in the UI.
 */
export const VALUE_CONSUMED_PER_LOAN = 0.2

export function savedByExchange(resource: Resource, borrowCharge: number) {
  return Math.max(0, Math.round(estimatedRetailValue(resource) * VALUE_CONSUMED_PER_LOAN - borrowCharge))
}

export function isCompleted(b: Borrowing) {
  return b.status === 'rated' || b.status === 'settlement'
}

export function isActive(b: Borrowing) {
  return b.status === 'borrowed' || b.status === 'return_due'
}

export function isOverdue(b: Borrowing) {
  return b.status === 'return_due' || (b.status === 'borrowed' && new Date(b.dueDate).getTime() < Date.now())
}

export function isUpcoming(b: Borrowing) {
  return b.status === 'requested' || b.status === 'accepted' || b.status === 'handover'
}

/** Everything that comes only from state — no baseline added. */
export function liveTotals(
  state: Pick<AppState, 'users' | 'resources' | 'borrowings' | 'transactions'>,
) {
  const resourceById = new Map(state.resources.map((r) => [r.id, r]))
  const completed = state.borrowings.filter(isCompleted)

  const moneySaved = sum(
    completed.map((b) => {
      const r = resourceById.get(b.resourceId)
      return r ? savedByExchange(r, b.charges.borrowCharge) : 0
    }),
  )

  return {
    members: state.users.length,
    resources: state.resources.filter((r) => r.approvalStatus === 'approved').length,
    exchanges: completed.length,
    moneySaved,
    resourcesReused: sum(state.resources.map((r) => r.timesBorrowed)),
    transactionVolume: sum(
      state.transactions.filter((t) => t.type === 'payment').map((t) => t.amount),
    ),
    platformFees: sum(state.transactions.map((t) => t.platformFee)),
  }
}

/** Baseline chosen so that, at seed time, totals equal PLATFORM_TARGETS exactly. */
export function computeBaseline(
  state: Pick<AppState, 'users' | 'resources' | 'borrowings' | 'transactions'>,
): PlatformBaseline {
  const live = liveTotals(state)
  return {
    members: Math.max(0, PLATFORM_TARGETS.members - live.members),
    resources: Math.max(0, PLATFORM_TARGETS.resources - live.resources),
    exchanges: Math.max(0, PLATFORM_TARGETS.exchanges - live.exchanges),
    moneySaved: Math.max(0, PLATFORM_TARGETS.moneySaved - live.moneySaved),
    resourcesReused: Math.max(0, PLATFORM_TARGETS.resourcesReused - live.resourcesReused),
    transactionVolume: Math.round(live.transactionVolume * 17),
    platformFees: Math.round(live.platformFees * 17),
  }
}

export interface PlatformStats {
  activeMembers: number
  resourcesShared: number
  successfulExchanges: number
  moneySaved: number
  resourcesReused: number
  onTimeRate: number
  transactionVolume: number
  platformFees: number
  depositsHeld: number
  activeExchanges: number
  overdueCount: number
  openDisputes: number
  pendingApprovals: number
  flaggedResources: number
  newListingsThisWeek: number
}

export function platformStats(state: AppState): PlatformStats {
  const live = liveTotals(state)
  const b = state.baseline
  const returned = state.borrowings.filter(
    (x) => LIFECYCLE_ORDER.indexOf(x.status) >= LIFECYCLE_ORDER.indexOf('returned'),
  )
  const onTime = returned.filter((x) => !x.settlement || x.settlement.hoursLate === 0)
  const weekAgo = Date.now() - 7 * 86400000

  return {
    activeMembers: b.members + live.members,
    resourcesShared: b.resources + live.resources,
    successfulExchanges: b.exchanges + live.exchanges,
    moneySaved: b.moneySaved + live.moneySaved,
    resourcesReused: b.resourcesReused + live.resourcesReused,
    onTimeRate: returned.length ? Math.round((onTime.length / returned.length) * 100) : 100,
    transactionVolume: b.transactionVolume + live.transactionVolume,
    platformFees: b.platformFees + live.platformFees,
    depositsHeld: sum(
      state.borrowings
        .filter((x) => !x.settlement && x.transactionIds.length > 0 && x.status !== 'declined')
        .map((x) => x.charges.deposit),
    ),
    activeExchanges: state.borrowings.filter(isActive).length,
    overdueCount: state.borrowings.filter(isOverdue).length,
    openDisputes: state.disputes.filter((d) => d.status === 'under_review').length,
    pendingApprovals: state.resources.filter((r) => r.approvalStatus === 'pending').length,
    flaggedResources: state.resources.filter((r) => r.flagged).length,
    newListingsThisWeek: state.resources.filter((r) => new Date(r.createdAt).getTime() > weekAgo).length,
  }
}

export function categoryBreakdown(state: AppState) {
  const counts = new Map<Category, number>()
  for (const r of state.resources) {
    if (r.approvalStatus !== 'approved') continue
    counts.set(r.category, (counts.get(r.category) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

export function borrowsByCategory(state: AppState) {
  const resourceById = new Map(state.resources.map((r) => [r.id, r]))
  const counts = new Map<Category, number>()
  for (const b of state.borrowings) {
    const r = resourceById.get(b.resourceId)
    if (!r) continue
    counts.set(r.category, (counts.get(r.category) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Last six months of exchanges: live activity on top of a gentle baseline curve. */
export function monthlyExchanges(state: AppState) {
  const now = new Date()
  const buckets: { key: string; name: string; live: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    buckets.push({ key: `${d.getFullYear()}-${d.getMonth()}`, name: MONTH_LABELS[d.getMonth()], live: 0 })
  }
  const index = new Map(buckets.map((b, i) => [b.key, i]))
  for (const b of state.borrowings) {
    const d = new Date(b.createdAt)
    const i = index.get(`${d.getFullYear()}-${d.getMonth()}`)
    if (i !== undefined) buckets[i].live += 1
  }

  // Spread historical activity with a mild upward trend so the chart reads as growth.
  const shares = [0.11, 0.13, 0.15, 0.17, 0.21, 0.23]
  const baseline = state.baseline.exchanges
  return buckets.map((b, i) => ({
    name: b.name,
    exchanges: Math.round(baseline * shares[i] * 0.42) + b.live,
  }))
}

export function onTimeVsLate(state: AppState) {
  const returned = state.borrowings.filter(
    (x) => LIFECYCLE_ORDER.indexOf(x.status) >= LIFECYCLE_ORDER.indexOf('returned'),
  )
  const late = returned.filter((x) => x.settlement && x.settlement.hoursLate > 0).length
  const onTime = returned.length - late
  const scale = Math.max(1, Math.round(state.baseline.exchanges / Math.max(1, returned.length)))
  return [
    { name: 'On time', value: onTime * scale, fill: 'var(--chart-good)' },
    { name: 'Late', value: Math.max(1, late * scale), fill: 'var(--chart-warn)' },
  ]
}

export function popularResources(state: AppState, limit = 6) {
  return [...state.resources]
    .sort((a, b) => b.timesBorrowed - a.timesBorrowed)
    .slice(0, limit)
    .map((r) => ({
      name: r.name.length > 26 ? `${r.name.slice(0, 24)}…` : r.name,
      borrows: r.timesBorrowed,
      category: r.category,
    }))
}

/** Six-month transaction volume, split into charges, fees and deposits. */
export function transactionSeries(state: AppState) {
  const now = new Date()
  const buckets: { name: string; charges: number; fees: number; deposits: number }[] = []
  const index = new Map<string, number>()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    index.set(`${d.getFullYear()}-${d.getMonth()}`, buckets.length)
    buckets.push({ name: MONTH_LABELS[d.getMonth()], charges: 0, fees: 0, deposits: 0 })
  }
  for (const t of state.transactions) {
    if (t.type !== 'payment') continue
    const d = new Date(t.createdAt)
    const i = index.get(`${d.getFullYear()}-${d.getMonth()}`)
    if (i === undefined) continue
    buckets[i].charges += t.borrowCharge
    buckets[i].fees += t.platformFee
    buckets[i].deposits += t.deposit
  }
  const shares = [0.12, 0.14, 0.15, 0.18, 0.2, 0.21]
  const base = state.baseline.transactionVolume
  return buckets.map((b, i) => ({
    name: b.name,
    charges: b.charges + Math.round(base * shares[i] * 0.3),
    fees: b.fees + Math.round(base * shares[i] * 0.03),
    deposits: b.deposits + Math.round(base * shares[i] * 0.55),
  }))
}

/** Trust score distribution across the community. */
export function trustDistribution(state: AppState) {
  const bands = [
    { name: '90–100', min: 90, value: 0 },
    { name: '75–89', min: 75, value: 0 },
    { name: '60–74', min: 60, value: 0 },
    { name: 'Below 60', min: 0, value: 0 },
  ]
  for (const u of state.users) {
    const band = bands.find((b) => u.trustScore >= b.min)
    if (band) band.value += 1
  }
  return bands.map((b) => ({ name: b.name, members: b.value }))
}
