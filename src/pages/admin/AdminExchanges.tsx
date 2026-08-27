import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Clock,
  ExternalLink,
  Repeat,
  Search,
  ShieldAlert,
  Wallet,
} from 'lucide-react'
import type { Borrowing } from '@/types'
import { useStore } from '@/store/AppStore'
import { isActive, isCompleted, isOverdue, platformStats } from '@/services/analytics'
import { fmtDateTime, fmtRange, inr, inrCompact, num, relativeDeadline } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, SectionTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs } from '@/components/ui/tabs'
import { Dialog } from '@/components/ui/dialog'
import { PageHeader } from '@/components/layout/PageShell'
import { PageTransition, Reveal } from '@/components/common/Motion'
import { StatCard, DataRow } from '@/components/common/StatCard'
import { AdminTable, type Column } from '@/components/common/AdminTable'
import { Avatar } from '@/components/common/Avatar'
import { ResourceImage } from '@/components/common/ResourceImage'
import { StatusBadge } from '@/components/common/StatusBadge'
import { LifecycleTimeline } from '@/components/common/LifecycleTimeline'
import { ChargeBreakdown, SettlementBreakdown } from '@/components/common/ChargeBreakdown'
import { ConditionComparison } from '@/components/common/ConditionComparison'

type Tab = 'active' | 'overdue' | 'closing' | 'completed' | 'all'

/** Awaiting a moderator-visible closing step: returned, inspection or settlement. */
const CLOSING: Borrowing['status'][] = ['returned', 'inspection', 'settlement']

export function AdminExchangesPage() {
  const { state, getUser, getResource, getReport, getDispute } = useStore()

  const [tab, setTab] = useState<Tab>('active')
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)

  const stats = useMemo(() => platformStats(state), [state])

  const counts = useMemo(
    () => ({
      all: state.borrowings.length,
      active: state.borrowings.filter(isActive).length,
      overdue: state.borrowings.filter(isOverdue).length,
      closing: state.borrowings.filter((b) => CLOSING.includes(b.status)).length,
      completed: state.borrowings.filter(isCompleted).length,
    }),
    [state.borrowings],
  )

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return state.borrowings
      .filter((b) => {
        if (tab === 'active' && !isActive(b)) return false
        if (tab === 'overdue' && !isOverdue(b)) return false
        if (tab === 'closing' && !CLOSING.includes(b.status)) return false
        if (tab === 'completed' && !isCompleted(b)) return false
        if (!q) return true
        const resource = getResource(b.resourceId)
        const borrower = getUser(b.borrowerId)
        const owner = getUser(b.ownerId)
        return (
          (resource?.name.toLowerCase().includes(q) ?? false) ||
          (borrower?.name.toLowerCase().includes(q) ?? false) ||
          (owner?.name.toLowerCase().includes(q) ?? false) ||
          b.purpose.toLowerCase().includes(q)
        )
      })
      .sort((a, b) => {
        const aLate = isOverdue(a)
        const bLate = isOverdue(b)
        if (aLate !== bLate) return aLate ? -1 : 1
        return b.createdAt.localeCompare(a.createdAt)
      })
  }, [state.borrowings, tab, query, getResource, getUser])

  const open = openId ? state.borrowings.find((b) => b.id === openId) : undefined
  const openResource = open ? getResource(open.resourceId) : undefined
  const openBorrower = open ? getUser(open.borrowerId) : undefined
  const openOwner = open ? getUser(open.ownerId) : undefined
  const openDispute = open ? getDispute(open.disputeId) : undefined
  const beforeReport = open ? getReport(open.beforeReportId) : undefined
  const afterReport = open ? getReport(open.afterReportId) : undefined
  const openTransactions = open
    ? state.transactions.filter((t) => t.borrowingId === open.id)
    : []

  const columns: Column<Borrowing>[] = [
    {
      key: 'resource',
      header: 'Resource',
      render: (b) => {
        const resource = getResource(b.resourceId)
        return (
          <div className="flex items-center gap-3">
            {resource && (
              <ResourceImage
                resource={resource}
                className="size-10 shrink-0"
                rounded="rounded-lg"
                iconClassName="size-4"
              />
            )}
            <div className="min-w-0">
              <p className="truncate text-[0.8125rem] font-semibold">
                {resource?.name ?? 'Resource'}
              </p>
              <p className="truncate text-2xs text-muted-foreground">{b.purpose}</p>
            </div>
          </div>
        )
      },
    },
    {
      key: 'people',
      header: 'Borrower / Owner',
      hideBelow: 'md',
      render: (b) => {
        const borrower = getUser(b.borrowerId)
        const owner = getUser(b.ownerId)
        return (
          <div className="flex items-center gap-2">
            {borrower && <Avatar user={borrower} size="xs" />}
            <div className="min-w-0">
              <p className="truncate text-xs font-medium">{borrower?.name ?? '—'}</p>
              <p className="truncate text-2xs text-muted-foreground">from {owner?.name ?? '—'}</p>
            </div>
          </div>
        )
      },
    },
    {
      key: 'dates',
      header: 'Window',
      hideBelow: 'lg',
      render: (b) => (
        <div className="min-w-0">
          <p className="num truncate text-xs">{fmtRange(b.startDate, b.dueDate)}</p>
          <p
            className={cn(
              'num truncate text-2xs',
              isOverdue(b) ? 'font-semibold text-warning' : 'text-muted-foreground',
            )}
          >
            {relativeDeadline(b.dueDate)}
          </p>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: (b) => (
        <div>
          <p className="num text-[0.8125rem] font-semibold">{inr(b.charges.total)}</p>
          <p className="num text-2xs text-muted-foreground">{inr(b.charges.deposit)} held</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (b) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge status={b.status} size="sm" />
          {b.disputeId && (
            <Badge variant="danger" size="sm">
              Dispute
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'open',
      header: '',
      align: 'right',
      render: (b) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            setOpenId(b.id)
          }}
        >
          Inspect
          <ArrowRight />
        </Button>
      ),
    },
  ]

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Exchanges"
        title="Live exchange monitor"
        subtitle="Every borrowing on campus, from request to settled deposit — with the deadline that matters most on top."
        actions={
          <Link
            to="/admin/transactions"
            className={cn(buttonVariants({ variant: 'outline' }))}
          >
            <Wallet />
            Transactions
          </Link>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="In progress"
          value={String(counts.active)}
          icon={Repeat}
          tone="primary"
          hint="Requested through in-use"
        />
        <StatCard
          label="Overdue"
          value={String(counts.overdue)}
          icon={Clock}
          tone={counts.overdue > 0 ? 'warning' : 'default'}
          hint={counts.overdue > 0 ? 'Late fee accruing per started day' : 'Every return on time'}
        />
        <StatCard
          label="Awaiting close-out"
          value={String(counts.closing)}
          icon={ShieldAlert}
          tone="info"
          hint="Returned, inspection or settlement"
        />
        <StatCard
          label="Deposits held"
          value={inrCompact(stats.depositsHeld)}
          countTo={stats.depositsHeld}
          format={inrCompact}
          icon={Wallet}
          hint="Released as inspections pass"
        />
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        ariaLabel="Filter exchanges"
        className="mb-4"
        items={[
          { value: 'active', label: 'In progress', count: counts.active },
          { value: 'overdue', label: 'Overdue', count: counts.overdue },
          { value: 'closing', label: 'Closing out', count: counts.closing },
          { value: 'completed', label: 'Completed', count: counts.completed },
          { value: 'all', label: 'All', count: counts.all },
        ]}
      />

      <Reveal>
        <Card className="mb-4">
          <CardContent className="pt-5">
            <div className="relative w-full sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search resource, student or purpose"
                className="pl-9"
                aria-label="Search exchanges"
              />
            </div>
          </CardContent>
        </Card>
      </Reveal>

      <Reveal delay={0.04}>
        <AdminTable
          rows={rows}
          columns={columns}
          onRowClick={(b) => setOpenId(b.id)}
          empty={{
            title:
              tab === 'overdue'
                ? 'Nothing is overdue'
                : tab === 'closing'
                  ? 'Nothing waiting to close out'
                  : 'No exchanges match',
            message:
              tab === 'overdue'
                ? 'Every borrower is inside their return window.'
                : 'Try another tab or clear the search.',
          }}
        />
      </Reveal>

      <p className="mt-3 text-2xs text-muted-foreground">
        Showing {rows.length} of {counts.all} exchanges. Overdue rows are pinned to the top.
      </p>

      {/* Exchange detail */}
      <Dialog
        open={Boolean(open)}
        onClose={() => setOpenId(null)}
        size="xl"
        title={openResource?.name ?? 'Exchange'}
        description={
          open
            ? `${fmtRange(open.startDate, open.dueDate)} · ${open.charges.days} day${open.charges.days === 1 ? '' : 's'} · ${open.purpose}`
            : undefined
        }
        footer={
          open && (
            <>
              <Button variant="ghost" onClick={() => setOpenId(null)}>
                Close
              </Button>
              {open.disputeId && (
                <Link to="/admin/disputes" className={cn(buttonVariants({ variant: 'outline' }))}>
                  <ShieldAlert />
                  Open dispute
                </Link>
              )}
              <Link
                to={`/borrowings/${open.id}`}
                className={cn(buttonVariants({ variant: 'outline' }))}
              >
                <ExternalLink />
                Student view
              </Link>
            </>
          )
        }
      >
        {open && (
          <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={open.status} />
                {isOverdue(open) && <Badge variant="warning">{relativeDeadline(open.dueDate)}</Badge>}
                {open.disputeId && <Badge variant="danger">Disputed</Badge>}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {[
                  { role: 'Borrower', user: openBorrower },
                  { role: 'Owner', user: openOwner },
                ].map(({ role, user }) =>
                  user ? (
                    <Link
                      key={role}
                      to={`/profile/${user.id}`}
                      className="flex items-center gap-2.5 rounded-xl border border-border p-2.5 transition-colors hover:bg-muted/40"
                    >
                      <Avatar user={user} size="sm" />
                      <div className="min-w-0">
                        <p className="text-2xs uppercase tracking-wide text-muted-foreground">
                          {role}
                        </p>
                        <p className="truncate text-xs font-semibold">{user.name}</p>
                        <p className="num truncate text-2xs text-muted-foreground">
                          Trust {user.trustScore} · {user.onTimeRate}% on time
                        </p>
                      </div>
                    </Link>
                  ) : null,
                )}
              </div>

              <div className="mt-4 space-y-0.5 border-t border-border pt-3">
                <DataRow label="Pickup" value={open.pickupLocation} />
                <DataRow label="Agreed time" value={open.pickupTime} />
                {open.handoverAt && (
                  <DataRow label="Handover confirmed" value={fmtDateTime(open.handoverAt)} />
                )}
                {open.returnedAt && (
                  <DataRow label="Returned" value={fmtDateTime(open.returnedAt)} />
                )}
              </div>

              <SectionTitle title="Charges" className="mb-2.5 mt-5" />
              <ChargeBreakdown
                charges={open.charges}
                pricePerDay={openResource?.pricePerDay}
                showFormula={false}
              />

              {open.settlement && (
                <>
                  <SectionTitle title="Settlement" className="mb-2.5 mt-5" />
                  <SettlementBreakdown settlement={open.settlement} showFormula={false} />
                </>
              )}

              {openTransactions.length > 0 && (
                <>
                  <SectionTitle
                    title="Ledger"
                    hint={`${openTransactions.length} entr${openTransactions.length === 1 ? 'y' : 'ies'}`}
                    className="mb-2.5 mt-5"
                  />
                  <ul className="space-y-1.5">
                    {openTransactions.map((t) => (
                      <li
                        key={t.id}
                        className="flex items-center gap-2 rounded-lg border border-border bg-muted/25 px-3 py-2 text-xs"
                      >
                        <Badge
                          variant={t.type === 'refund' ? 'info' : t.type === 'payout' ? 'primary' : 'neutral'}
                          size="sm"
                        >
                          {t.type}
                        </Badge>
                        <span className="num truncate text-muted-foreground">
                          {t.method} · {fmtDateTime(t.createdAt)}
                        </span>
                        <span className="num ml-auto shrink-0 font-semibold">{inr(t.amount)}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {openDispute && (
                <div className="mt-5 rounded-xl border border-destructive/20 bg-destructive-soft/40 p-3.5">
                  <p className="flex items-center gap-2 text-[0.8125rem] font-semibold">
                    <ShieldAlert className="size-4 text-destructive" />
                    {openDispute.reason}
                  </p>
                  <p className="mt-1 text-2xs leading-relaxed text-muted-foreground">
                    {openDispute.description}
                  </p>
                  <p className="num mt-2 text-xs font-semibold text-destructive">
                    Claimed {inr(openDispute.claimedAmount)}
                  </p>
                </div>
              )}
            </div>

            <div>
              <SectionTitle title="Lifecycle" hint="Stamped as each step happened" className="mb-3" />
              <LifecycleTimeline borrowing={open} compact />

              {(beforeReport || afterReport) && (
                <div className="mt-5">
                  <SectionTitle
                    title="Condition record"
                    hint="What both sides signed off on"
                    className="mb-3"
                  />
                  <ConditionComparison before={beforeReport} after={afterReport} />
                </div>
              )}
            </div>
          </div>
        )}
      </Dialog>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3">
        <p className="text-2xs leading-relaxed text-muted-foreground">
          {num(stats.successfulExchanges)} exchanges completed with a {stats.onTimeRate}% on-time
          return rate — the number that keeps owners willing to lend.
        </p>
        <Link to="/admin/impact" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
          Impact report
        </Link>
      </div>
    </PageTransition>
  )
}
