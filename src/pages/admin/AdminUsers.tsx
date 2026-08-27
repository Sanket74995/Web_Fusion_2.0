import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Ban,
  CheckCircle2,
  Flag,
  Search,
  ShieldCheck,
  Star,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react'
import type { User } from '@/types'
import { useStore } from '@/store/AppStore'
import { isActive, isCompleted } from '@/services/analytics'
import { fmtDate, inr, num } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, SectionTitle } from '@/components/ui/card'
import { Input, SegmentedControl } from '@/components/ui/input'
import { Dialog, ConfirmDialog } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { PageHeader } from '@/components/layout/PageShell'
import { PageTransition, Reveal } from '@/components/common/Motion'
import { StatCard, DataRow } from '@/components/common/StatCard'
import { AdminTable, type Column } from '@/components/common/AdminTable'
import { Avatar, RatingStars } from '@/components/common/Avatar'
import { BadgeList, TrustScorePanel, VerifiedTag } from '@/components/common/Trust'
import { StatusBadge } from '@/components/common/StatusBadge'
import { ResourceImage } from '@/components/common/ResourceImage'

type StatusFilter = 'all' | 'active' | 'flagged' | 'suspended'
type SortKey = 'trust' | 'exchanges' | 'rating' | 'disputes' | 'recent'

const STATUS_META: Record<
  User['status'],
  { label: string; variant: 'success' | 'warning' | 'danger' }
> = {
  active: { label: 'Active', variant: 'success' },
  flagged: { label: 'Flagged', variant: 'warning' },
  suspended: { label: 'Suspended', variant: 'danger' },
}

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'trust', label: 'Trust' },
  { value: 'exchanges', label: 'Exchanges' },
  { value: 'rating', label: 'Rating' },
  { value: 'disputes', label: 'Disputes' },
  { value: 'recent', label: 'Newest' },
]

export function AdminUsersPage() {
  const { state, getResource, setUserStatus } = useStore()
  const { toast } = useToast()

  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [sort, setSort] = useState<SortKey>('trust')
  const [openId, setOpenId] = useState<string | null>(null)
  const [suspendId, setSuspendId] = useState<string | null>(null)

  const counts = useMemo(
    () => ({
      all: state.users.length,
      active: state.users.filter((u) => u.status === 'active').length,
      flagged: state.users.filter((u) => u.status === 'flagged').length,
      suspended: state.users.filter((u) => u.status === 'suspended').length,
    }),
    [state.users],
  )

  const avgTrust = useMemo(
    () =>
      state.users.length
        ? Math.round(state.users.reduce((s, u) => s + u.trustScore, 0) / state.users.length)
        : 0,
    [state.users],
  )

  const verifiedShare = useMemo(
    () =>
      state.users.length
        ? Math.round((state.users.filter((u) => u.verified).length / state.users.length) * 100)
        : 0,
    [state.users],
  )

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = state.users.filter((u) => {
      if (status !== 'all' && u.status !== status) return false
      if (!q) return true
      return (
        u.name.toLowerCase().includes(q) ||
        u.department.toLowerCase().includes(q) ||
        u.location.toLowerCase().includes(q)
      )
    })
    const sorted = [...filtered]
    sorted.sort((a, b) => {
      if (sort === 'trust') return b.trustScore - a.trustScore
      if (sort === 'exchanges') return b.successfulExchanges - a.successfulExchanges
      if (sort === 'rating') return b.rating - a.rating
      if (sort === 'disputes') return b.disputes - a.disputes
      return b.joinedAt.localeCompare(a.joinedAt)
    })
    return sorted
  }, [state.users, query, status, sort])

  /* Per-member activity, derived rather than stored. */
  const activity = useMemo(() => {
    const map = new Map<
      string,
      { listings: number; borrowed: number; lent: number; active: number; earned: number }
    >()
    for (const u of state.users) {
      map.set(u.id, { listings: 0, borrowed: 0, lent: 0, active: 0, earned: 0 })
    }
    for (const r of state.resources) {
      const entry = map.get(r.ownerId)
      if (entry) entry.listings += 1
    }
    for (const b of state.borrowings) {
      const borrower = map.get(b.borrowerId)
      const owner = map.get(b.ownerId)
      if (borrower) {
        if (isCompleted(b)) borrower.borrowed += 1
        if (isActive(b)) borrower.active += 1
      }
      if (owner) {
        if (isCompleted(b)) {
          owner.lent += 1
          owner.earned += b.charges.borrowCharge + (b.settlement?.lateFee ?? 0)
        }
        if (isActive(b)) owner.active += 1
      }
    }
    return map
  }, [state.users, state.resources, state.borrowings])

  const openUser = openId ? state.users.find((u) => u.id === openId) : undefined
  const suspendUser = suspendId ? state.users.find((u) => u.id === suspendId) : undefined

  const changeStatus = (user: User, next: User['status']) => {
    setUserStatus(user.id, next)
    toast({
      title:
        next === 'active'
          ? `${user.name} reinstated`
          : next === 'flagged'
            ? `${user.name} flagged for review`
            : `${user.name} suspended`,
      description:
        next === 'suspended'
          ? 'They can no longer request or list resources.'
          : next === 'flagged'
            ? 'Their exchanges will be watched more closely.'
            : 'Full access restored.',
      tone: next === 'active' ? 'success' : next === 'flagged' ? 'warning' : 'error',
    })
  }

  const columns: Column<User>[] = [
    {
      key: 'member',
      header: 'Member',
      render: (u) => (
        <div className="flex items-center gap-3">
          <Avatar user={u} size="sm" />
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 truncate text-[0.8125rem] font-semibold">
              {u.name}
              {u.verified && <VerifiedTag user={u} />}
            </p>
            <p className="truncate text-2xs text-muted-foreground">
              {u.department} · {u.year} · {u.location}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'trust',
      header: 'Trust',
      align: 'right',
      render: (u) => (
        <span
          className={cn(
            'num text-[0.8125rem] font-semibold',
            u.trustScore >= 85 ? 'text-primary' : u.trustScore < 65 ? 'text-warning' : '',
          )}
        >
          {u.trustScore}
        </span>
      ),
    },
    {
      key: 'rating',
      header: 'Rating',
      hideBelow: 'md',
      render: (u) => <RatingStars value={u.rating} count={u.ratingCount} size="xs" showValue />,
    },
    {
      key: 'exchanges',
      header: 'Exchanges',
      align: 'right',
      hideBelow: 'sm',
      render: (u) => <span className="num text-[0.8125rem]">{u.successfulExchanges}</span>,
    },
    {
      key: 'onTime',
      header: 'On time',
      align: 'right',
      hideBelow: 'lg',
      render: (u) => <span className="num text-[0.8125rem]">{u.onTimeRate}%</span>,
    },
    {
      key: 'listings',
      header: 'Listings',
      align: 'right',
      hideBelow: 'lg',
      render: (u) => (
        <span className="num text-[0.8125rem]">{activity.get(u.id)?.listings ?? 0}</span>
      ),
    },
    {
      key: 'disputes',
      header: 'Disputes',
      align: 'right',
      hideBelow: 'md',
      render: (u) =>
        u.disputes > 0 ? (
          <Badge variant="danger" size="sm">
            {u.disputes}
          </Badge>
        ) : (
          <span className="num text-[0.8125rem] text-muted-foreground">0</span>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (u) => (
        <Badge variant={STATUS_META[u.status].variant} size="sm">
          {STATUS_META[u.status].label}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (u) => (
        <div className="flex justify-end gap-1.5">
          {u.status === 'active' ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                changeStatus(u, 'flagged')
              }}
            >
              <Flag />
              Flag
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                changeStatus(u, 'active')
              }}
            >
              <CheckCircle2 />
              Reinstate
            </Button>
          )}
          {u.status !== 'suspended' && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:bg-destructive-soft hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation()
                setSuspendId(u.id)
              }}
            >
              <Ban />
              Suspend
            </Button>
          )}
        </div>
      ),
    },
  ]

  const openActivity = openUser ? activity.get(openUser.id) : undefined
  const openListings = openUser
    ? state.resources.filter((r) => r.ownerId === openUser.id).slice(0, 4)
    : []
  const openBorrowings = openUser
    ? [...state.borrowings]
        .filter((b) => b.borrowerId === openUser.id || b.ownerId === openUser.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 5)
    : []

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Members"
        title="Community"
        subtitle="Trust is the only collateral on this platform. Flag or suspend anyone who breaks it."
        actions={
          <Link
            to="/admin/exchanges"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            View exchanges
            <ArrowRight className="size-3.5" />
          </Link>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Members"
          value={num(counts.all)}
          countTo={counts.all}
          icon={Users}
          tone="primary"
          hint={`${counts.active} in good standing`}
        />
        <StatCard
          label="Average trust score"
          value={String(avgTrust)}
          countTo={avgTrust}
          icon={TrendingUp}
          hint="Across every member"
        />
        <StatCard
          label="Verified students"
          value={`${verifiedShare}%`}
          countTo={verifiedShare}
          format={(n) => `${Math.round(n)}%`}
          icon={ShieldCheck}
          tone="info"
          hint="College ID confirmed"
        />
        <StatCard
          label="Needs attention"
          value={String(counts.flagged + counts.suspended)}
          icon={Flag}
          tone={counts.flagged + counts.suspended > 0 ? 'warning' : 'default'}
          hint={`${counts.flagged} flagged · ${counts.suspended} suspended`}
        />
      </div>

      <Reveal>
        <Card className="mb-4">
          <CardContent className="flex flex-col gap-3 pt-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, department or block"
                className="pl-9"
                aria-label="Search members"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <SegmentedControl
                value={status}
                onChange={setStatus}
                ariaLabel="Filter by status"
                size="sm"
                options={[
                  { value: 'all', label: `All ${counts.all}` },
                  { value: 'active', label: `Active ${counts.active}` },
                  { value: 'flagged', label: `Flagged ${counts.flagged}` },
                  { value: 'suspended', label: `Suspended ${counts.suspended}` },
                ]}
              />
              <SegmentedControl
                value={sort}
                onChange={setSort}
                ariaLabel="Sort members"
                size="sm"
                options={SORT_OPTIONS}
              />
            </div>
          </CardContent>
        </Card>
      </Reveal>

      <Reveal delay={0.04}>
        <AdminTable
          rows={rows}
          columns={columns}
          onRowClick={(u) => setOpenId(u.id)}
          empty={{
            title: 'No members match',
            message: 'Try a different search term or clear the status filter.',
          }}
        />
      </Reveal>

      <p className="mt-3 text-2xs text-muted-foreground">
        Showing {rows.length} of {counts.all} members. Click a row for the full trust breakdown.
      </p>

      {/* Member detail */}
      <Dialog
        open={Boolean(openUser)}
        onClose={() => setOpenId(null)}
        size="lg"
        title={openUser ? openUser.name : ''}
        description={
          openUser ? `${openUser.department} · ${openUser.year} · joined ${fmtDate(openUser.joinedAt)}` : undefined
        }
        footer={
          openUser && (
            <>
              <Button variant="ghost" onClick={() => setOpenId(null)}>
                Close
              </Button>
              {openUser.status === 'active' ? (
                <Button variant="outline" onClick={() => changeStatus(openUser, 'flagged')}>
                  <Flag />
                  Flag member
                </Button>
              ) : (
                <Button variant="outline" onClick={() => changeStatus(openUser, 'active')}>
                  <UserCheck />
                  Reinstate
                </Button>
              )}
              {openUser.status !== 'suspended' && (
                <Button variant="destructive" onClick={() => setSuspendId(openUser.id)}>
                  <Ban />
                  Suspend
                </Button>
              )}
            </>
          )
        }
      >
        {openUser && (
          <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
            <div>
              <div className="flex items-center gap-3">
                <Avatar user={openUser} size="lg" />
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-[0.9375rem] font-semibold">
                    {openUser.name}
                    <Badge variant={STATUS_META[openUser.status].variant} size="sm">
                      {STATUS_META[openUser.status].label}
                    </Badge>
                  </p>
                  <RatingStars
                    value={openUser.rating}
                    count={openUser.ratingCount}
                    size="sm"
                    showValue
                    className="mt-1"
                  />
                </div>
              </div>

              {openUser.bio && (
                <p className="mt-3 text-[0.8125rem] leading-relaxed text-muted-foreground">
                  {openUser.bio}
                </p>
              )}

              <BadgeList badges={openUser.badges} className="mt-3" />

              <div className="mt-4 space-y-0.5 border-t border-border pt-3">
                <DataRow label="Completed exchanges" value={String(openUser.successfulExchanges)} />
                <DataRow label="On-time returns" value={`${openUser.onTimeRate}%`} />
                <DataRow label="Listings" value={String(openActivity?.listings ?? 0)} />
                <DataRow label="Active right now" value={String(openActivity?.active ?? 0)} />
                <DataRow
                  label="Earned from sharing"
                  value={inr(openActivity?.earned ?? 0)}
                  tone="primary"
                  strong
                />
                <DataRow
                  label="Disputes"
                  value={String(openUser.disputes)}
                  tone={openUser.disputes > 0 ? 'danger' : 'muted'}
                />
              </div>

              {openBorrowings.length > 0 && (
                <div className="mt-4">
                  <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Recent exchanges
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {openBorrowings.map((b) => {
                      const resource = getResource(b.resourceId)
                      return (
                        <li key={b.id} className="flex items-center gap-2.5 text-xs">
                          <span className="min-w-0 flex-1 truncate">
                            {resource?.name ?? 'Resource'}
                          </span>
                          <span className="num shrink-0 text-muted-foreground">
                            {b.borrowerId === openUser.id ? 'borrowed' : 'lent'}
                          </span>
                          <StatusBadge status={b.status} size="sm" />
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </div>

            <div>
              <TrustScorePanel user={openUser} />

              <div className="mt-4">
                <SectionTitle
                  title="Their listings"
                  hint={`${openActivity?.listings ?? 0} shared with campus`}
                  className="mb-2.5"
                />
                {openListings.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-2xs text-muted-foreground">
                    Nothing listed yet — a borrower only, so far.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {openListings.map((r) => (
                      <li
                        key={r.id}
                        className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/25 p-2"
                      >
                        <ResourceImage
                          resource={r}
                          className="size-9 shrink-0"
                          rounded="rounded-md"
                          iconClassName="size-3.5"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold">{r.name}</p>
                          <p className="num truncate text-2xs text-muted-foreground">
                            {inr(r.pricePerDay)}/day · borrowed {r.timesBorrowed}×
                          </p>
                        </div>
                        {r.flagged && (
                          <Badge variant="danger" size="sm">
                            Flagged
                          </Badge>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="mt-4 flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3">
                <Star className="mt-px size-3.5 shrink-0 text-accent" />
                <p className="text-2xs leading-relaxed text-muted-foreground">
                  Suspending a member does not touch their history — completed exchanges, ratings and
                  settled deposits stay on the record.
                </p>
              </div>
            </div>
          </div>
        )}
      </Dialog>

      <ConfirmDialog
        open={Boolean(suspendUser)}
        onClose={() => setSuspendId(null)}
        onConfirm={() => {
          if (suspendUser) changeStatus(suspendUser, 'suspended')
          setSuspendId(null)
          setOpenId(null)
        }}
        tone="destructive"
        title={suspendUser ? `Suspend ${suspendUser.name}?` : 'Suspend member?'}
        confirmLabel="Suspend member"
        message="They keep their history but cannot request or list resources until reinstated. Use this for repeated damage, no-shows or unresolved disputes."
      />
    </PageTransition>
  )
}
