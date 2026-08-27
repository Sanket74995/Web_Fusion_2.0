import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  AlertTriangle,
  ArrowRight,
  Clock,
  Coins,
  Package,
  Receipt,
  RefreshCcw,
  RotateCcw,
  ShieldAlert,
  Users,
  Wallet,
} from 'lucide-react'
import { useStore } from '@/store/AppStore'
import {
  isOverdue,
  monthlyExchanges,
  onTimeVsLate,
  platformStats,
  transactionSeries,
} from '@/services/analytics'
import { DEFAULT_PLATFORM_FEE_RATE } from '@/services/pricing'
import { fmtDateTime, inr, inrCompact, num, relativeDeadline, timeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, SectionTitle } from '@/components/ui/card'
import { SegmentedControl } from '@/components/ui/input'
import { ConfirmDialog } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { PageHeader } from '@/components/layout/PageShell'
import { PageTransition, Reveal } from '@/components/common/Motion'
import { StatCard, ChartCard, DataRow } from '@/components/common/StatCard'
import { axisProps, CHART, ChartLegend, ChartTooltip } from '@/components/common/Charts'
import { Avatar } from '@/components/common/Avatar'
import { ResourceImage } from '@/components/common/ResourceImage'
import { StatusBadge } from '@/components/common/StatusBadge'
import { EmptyState } from '@/components/common/EmptyState'

const FEE_OPTIONS = [
  { value: '0.05', label: '5%' },
  { value: '0.1', label: '10%' },
  { value: '0.15', label: '15%' },
]

export function AdminDashboardPage() {
  const { state, getUser, getResource, setPlatformFeeRate, setResourceApproval, resetDemo } =
    useStore()
  const { toast } = useToast()
  const [confirmReset, setConfirmReset] = useState(false)

  const stats = useMemo(() => platformStats(state), [state])
  const months = useMemo(() => monthlyExchanges(state), [state])
  const money = useMemo(() => transactionSeries(state), [state])
  const punctuality = useMemo(() => onTimeVsLate(state), [state])

  const pending = state.resources.filter((r) => r.approvalStatus === 'pending').slice(0, 4)
  const overdue = state.borrowings.filter(isOverdue).slice(0, 4)
  const disputes = state.disputes.filter((d) => d.status === 'under_review').slice(0, 3)

  const recent = useMemo(
    () =>
      [...state.borrowings]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 6),
    [state.borrowings],
  )

  const feeRate = String(state.platformFeeRate)

  const approve = (id: string, name: string) => {
    setResourceApproval(id, 'approved')
    toast({ title: `${name} approved`, description: 'It is now live on Discover.', tone: 'success' })
  }

  const doReset = () => {
    resetDemo()
    setConfirmReset(false)
    toast({
      title: 'Demo data reset',
      description: 'Every user, listing and exchange is back to its seeded state.',
      tone: 'info',
    })
  }

  return (
    <PageTransition>
      <PageHeader
        eyebrow={
          <Badge variant="primary" size="sm">
            Live
          </Badge>
        }
        title="Platform overview"
        subtitle="Everything happening across CampusLoop right now — and what needs a moderator."
        actions={
          <>
            <Link to="/admin/impact" className={cn(buttonVariants({ variant: 'outline' }))}>
              Impact report
            </Link>
            <Button variant="ghost" onClick={() => setConfirmReset(true)}>
              <RotateCcw />
              Reset demo
            </Button>
          </>
        }
      />

      {/* Attention strip */}
      {(stats.pendingApprovals > 0 || stats.openDisputes > 0 || stats.overdueCount > 0) && (
        <Reveal>
          <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-warning/25 bg-warning-soft/50 px-4 py-3">
            <AlertTriangle className="size-4 shrink-0 text-warning" />
            <p className="text-[0.875rem] font-medium">
              {stats.pendingApprovals} listing{stats.pendingApprovals === 1 ? '' : 's'} to review ·{' '}
              {stats.openDisputes} open dispute{stats.openDisputes === 1 ? '' : 's'} ·{' '}
              {stats.overdueCount} overdue return{stats.overdueCount === 1 ? '' : 's'}
            </p>
            <div className="ml-auto flex flex-wrap gap-2">
              <Link
                to="/admin/resources"
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
              >
                Review listings
              </Link>
              <Link to="/admin/disputes" className={cn(buttonVariants({ size: 'sm' }))}>
                Open disputes
                <ArrowRight />
              </Link>
            </div>
          </div>
        </Reveal>
      )}

      {/* KPIs */}
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active members"
          value={num(stats.activeMembers)}
          countTo={stats.activeMembers}
          icon={Users}
          tone="primary"
          delta={{ value: `+${state.users.length} live`, positive: true }}
        />
        <StatCard
          label="Resources shared"
          value={num(stats.resourcesShared)}
          countTo={stats.resourcesShared}
          icon={Package}
          hint={`${stats.newListingsThisWeek} new this week`}
        />
        <StatCard
          label="Successful exchanges"
          value={num(stats.successfulExchanges)}
          countTo={stats.successfulExchanges}
          icon={RefreshCcw}
          tone="info"
          hint={`${stats.activeExchanges} in progress`}
        />
        <StatCard
          label="Money saved"
          value={inrCompact(stats.moneySaved)}
          countTo={stats.moneySaved}
          format={inrCompact}
          icon={Coins}
          tone="primary"
          hint="Versus buying new"
        />
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Transaction volume"
          value={inrCompact(stats.transactionVolume)}
          countTo={stats.transactionVolume}
          format={inrCompact}
          icon={Receipt}
          hint={`${inr(stats.platformFees)} in platform fees`}
        />
        <StatCard
          label="Deposits held"
          value={inr(stats.depositsHeld)}
          countTo={stats.depositsHeld}
          format={inr}
          icon={Wallet}
          tone="info"
          hint="Released after inspection"
        />
        <StatCard
          label="Overdue returns"
          value={String(stats.overdueCount)}
          icon={Clock}
          tone={stats.overdueCount > 0 ? 'warning' : 'default'}
          hint={stats.overdueCount > 0 ? 'Late fees accruing' : 'Nothing late'}
        />
        <StatCard
          label="Open disputes"
          value={String(stats.openDisputes)}
          icon={ShieldAlert}
          tone={stats.openDisputes > 0 ? 'danger' : 'default'}
          hint={stats.openDisputes > 0 ? 'Awaiting a decision' : 'All clear'}
        />
      </div>

      {/* Charts */}
      <div className="mb-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Reveal>
          <ChartCard
            title="Exchange volume"
            hint="Completed borrowings per month"
            height={260}
            action={
              <Link
                to="/admin/analytics"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                Analytics
                <ArrowRight className="size-3.5" />
              </Link>
            }
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={months} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="adminExchanges" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART.good} stopOpacity={0.26} />
                    <stop offset="100%" stopColor={CHART.good} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={CHART.grid} vertical={false} />
                <XAxis dataKey="name" {...axisProps} />
                <YAxis {...axisProps} width={44} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: CHART.grid }} />
                <Area
                  type="monotone"
                  dataKey="exchanges"
                  name="Exchanges"
                  stroke={CHART.good}
                  strokeWidth={2}
                  fill="url(#adminExchanges)"
                  animationDuration={700}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </Reveal>

        <Reveal delay={0.05}>
          <ChartCard title="Return punctuality" hint="On-time versus late returns" height={260}>
            <div className="flex h-full flex-col">
              <div className="min-h-0 flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={punctuality}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="58%"
                      outerRadius="84%"
                      paddingAngle={2}
                      stroke="none"
                      animationDuration={700}
                    >
                      {punctuality.map((slice) => (
                        <Cell key={slice.name} fill={slice.fill} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 flex items-end justify-between gap-3">
                <ChartLegend
                  items={punctuality.map((s) => ({
                    label: s.name,
                    color: s.fill,
                    value: num(s.value),
                  }))}
                />
                <span className="num text-lg font-semibold tracking-tight">
                  {stats.onTimeRate}%
                </span>
              </div>
            </div>
          </ChartCard>
        </Reveal>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Reveal>
          <ChartCard
            title="Money moving through the platform"
            hint="Charges, fees and refundable deposits"
            height={260}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={money} margin={{ top: 6, right: 6, left: -6, bottom: 0 }}>
                <CartesianGrid stroke={CHART.grid} vertical={false} />
                <XAxis dataKey="name" {...axisProps} />
                <YAxis {...axisProps} width={54} tickFormatter={(v: number) => inrCompact(v)} />
                <Tooltip content={<ChartTooltip format={inr} />} cursor={{ stroke: CHART.grid }} />
                <Area
                  type="monotone"
                  stackId="1"
                  dataKey="charges"
                  name="Borrowing charges"
                  stroke="var(--chart-1)"
                  fill="var(--chart-1)"
                  fillOpacity={0.18}
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  stackId="1"
                  dataKey="deposits"
                  name="Deposits"
                  stroke="var(--chart-2)"
                  fill="var(--chart-2)"
                  fillOpacity={0.14}
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  stackId="1"
                  dataKey="fees"
                  name="Platform fees"
                  stroke="var(--chart-3)"
                  fill="var(--chart-3)"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </Reveal>

        <Reveal delay={0.05}>
          <Card className="h-full">
            <CardContent className="pt-5">
              <SectionTitle title="Platform settings" hint="Applies to every new request" />
              <div className="mt-4">
                <p className="text-[0.8125rem] font-medium">Service fee</p>
                <p className="mt-0.5 text-2xs text-muted-foreground">
                  Charged on top of the borrowing charge. Minimum ₹5.
                </p>
                <SegmentedControl
                  className="mt-2.5"
                  value={feeRate}
                  onChange={(next) => {
                    setPlatformFeeRate(Number(next))
                    toast({
                      title: `Service fee set to ${Math.round(Number(next) * 100)}%`,
                      description: 'New borrow requests will use this rate.',
                      tone: 'info',
                    })
                  }}
                  options={FEE_OPTIONS}
                  ariaLabel="Platform service fee rate"
                />
                {state.platformFeeRate !== DEFAULT_PLATFORM_FEE_RATE && (
                  <p className="mt-2 text-2xs text-warning">
                    Changed from the {Math.round(DEFAULT_PLATFORM_FEE_RATE * 100)}% default.
                  </p>
                )}
              </div>

              <div className="mt-5 space-y-0.5 border-t border-border pt-4">
                <DataRow label="Fees collected" value={inr(stats.platformFees)} strong />
                <DataRow label="Pending approvals" value={String(stats.pendingApprovals)} />
                <DataRow label="Flagged listings" value={String(stats.flaggedResources)} />
                <DataRow
                  label="Members flagged or suspended"
                  value={String(state.users.filter((u) => u.status !== 'active').length)}
                />
              </div>
            </CardContent>
          </Card>
        </Reveal>
      </div>

      {/* Queues */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Reveal>
          <Card className="h-full">
            <CardContent className="pt-5">
              <SectionTitle
                title="Awaiting approval"
                hint={`${stats.pendingApprovals} in the queue`}
                action={
                  <Link
                    to="/admin/resources"
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    All
                    <ArrowRight className="size-3.5" />
                  </Link>
                }
              />
              {pending.length === 0 ? (
                <EmptyState compact className="mt-4" icon={<Package />} title="Queue is clear" />
              ) : (
                <ul className="mt-4 space-y-2">
                  {pending.map((r) => {
                    const owner = getUser(r.ownerId)
                    return (
                      <li
                        key={r.id}
                        className="flex items-center gap-3 rounded-xl border border-border bg-muted/25 p-2.5"
                      >
                        <ResourceImage
                          resource={r}
                          className="size-10 shrink-0"
                          rounded="rounded-lg"
                          iconClassName="size-4"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[0.8125rem] font-semibold">{r.name}</p>
                          <p className="num truncate text-2xs text-muted-foreground">
                            {owner?.name ?? 'Unknown'} · {inr(r.pricePerDay)}/day ·{' '}
                            {timeAgo(r.createdAt)}
                          </p>
                        </div>
                        <Button size="sm" onClick={() => approve(r.id, r.name)}>
                          Approve
                        </Button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </Reveal>

        <Reveal delay={0.04}>
          <Card className="h-full">
            <CardContent className="pt-5">
              <SectionTitle
                title="Overdue returns"
                hint="Late fees are accruing"
                action={
                  <Link
                    to="/admin/exchanges"
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    All
                    <ArrowRight className="size-3.5" />
                  </Link>
                }
              />
              {overdue.length === 0 ? (
                <EmptyState compact className="mt-4" icon={<Clock />} title="Nothing overdue" />
              ) : (
                <ul className="mt-4 space-y-2">
                  {overdue.map((b) => {
                    const resource = getResource(b.resourceId)
                    const borrower = getUser(b.borrowerId)
                    return (
                      <li
                        key={b.id}
                        className="flex items-center gap-3 rounded-xl border border-warning/25 bg-warning-soft/40 p-2.5"
                      >
                        {borrower && <Avatar user={borrower} size="sm" />}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[0.8125rem] font-semibold">
                            {resource?.name ?? 'Resource'}
                          </p>
                          <p className="num truncate text-2xs text-muted-foreground">
                            {borrower?.name ?? 'Borrower'} · {relativeDeadline(b.dueDate)}
                          </p>
                        </div>
                        <Badge variant="warning" size="sm">
                          Late
                        </Badge>
                      </li>
                    )
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </Reveal>

        <Reveal delay={0.08}>
          <Card className="h-full">
            <CardContent className="pt-5">
              <SectionTitle
                title="Open disputes"
                hint="Both sides submitted evidence"
                action={
                  <Link
                    to="/admin/disputes"
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    All
                    <ArrowRight className="size-3.5" />
                  </Link>
                }
              />
              {disputes.length === 0 ? (
                <EmptyState compact className="mt-4" icon={<ShieldAlert />} title="No open claims" />
              ) : (
                <ul className="mt-4 space-y-2">
                  {disputes.map((d) => {
                    const resource = getResource(d.resourceId)
                    return (
                      <li
                        key={d.id}
                        className="rounded-xl border border-destructive/20 bg-destructive-soft/40 p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="truncate text-[0.8125rem] font-semibold">{d.reason}</p>
                          <span className="num shrink-0 text-[0.8125rem] font-semibold text-destructive">
                            {inr(d.claimedAmount)}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-2xs text-muted-foreground">
                          {resource?.name ?? 'Resource'} · raised {timeAgo(d.createdAt)}
                        </p>
                        <Link
                          to="/admin/disputes"
                          className={cn(
                            buttonVariants({ variant: 'outline', size: 'sm' }),
                            'mt-2.5 w-full',
                          )}
                        >
                          Review claim
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </Reveal>
      </div>

      {/* Recent activity */}
      <Reveal delay={0.04}>
        <Card className="mt-4">
          <CardContent className="pt-5">
            <SectionTitle
              title="Latest exchanges"
              hint="Newest requests first"
              action={
                <Link
                  to="/admin/exchanges"
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  Open exchanges
                  <ArrowRight className="size-3.5" />
                </Link>
              }
            />
            {recent.length === 0 ? (
              <EmptyState compact className="mt-4" title="No exchanges yet" />
            ) : (
              <ul className="mt-4 divide-y divide-border">
                {recent.map((b) => {
                  const resource = getResource(b.resourceId)
                  const borrower = getUser(b.borrowerId)
                  const owner = getUser(b.ownerId)
                  return (
                    <li key={b.id} className="flex flex-wrap items-center gap-3 py-2.5">
                      {resource && (
                        <ResourceImage
                          resource={resource}
                          className="size-9 shrink-0"
                          rounded="rounded-lg"
                          iconClassName="size-3.5"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[0.8125rem] font-semibold">
                          {resource?.name ?? 'Resource'}
                        </p>
                        <p className="num truncate text-2xs text-muted-foreground">
                          {borrower?.name ?? '—'} ← {owner?.name ?? '—'} ·{' '}
                          {fmtDateTime(b.createdAt)}
                        </p>
                      </div>
                      <span className="num hidden shrink-0 text-[0.8125rem] font-semibold sm:block">
                        {inr(b.charges.total)}
                      </span>
                      <StatusBadge status={b.status} />
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </Reveal>

      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={doReset}
        tone="destructive"
        title="Reset all demo data?"
        confirmLabel="Reset everything"
        message="Every listing, request, payment, inspection and settlement created during this session is discarded and the seeded campus is restored. Useful right before a demo run."
      />
    </PageTransition>
  )
}
