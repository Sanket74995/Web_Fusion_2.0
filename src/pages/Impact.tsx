import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
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
  ArrowRight,
  Coins,
  Leaf,
  Package,
  Recycle,
  Repeat,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react'
import { useStore } from '@/store/AppStore'
import {
  categoryBreakdown,
  estimatedRetailValue,
  monthlyExchanges,
  platformStats,
  popularResources,
  savedByExchange,
  VALUE_CONSUMED_PER_LOAN,
} from '@/services/analytics'
import { inr, inrCompact, num } from '@/lib/format'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, SectionTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Page, PageHeader } from '@/components/layout/PageShell'
import { CountUp, Reveal, Stagger, StaggerItem } from '@/components/common/Motion'
import { StatCard, ChartCard, DataRow } from '@/components/common/StatCard'
import {
  axisProps,
  CHART,
  CHART_COLORS,
  ChartLegend,
  ChartTooltip,
} from '@/components/common/Charts'
import { EmptyState } from '@/components/common/EmptyState'

/**
 * Stated assumption for the environmental figure: one avoided purchase saves
 * roughly 1 kg of CO₂ for every ₹1,500 of retail value that was not manufactured.
 */
const CO2_PER_RUPEE = 1 / 1500

export function ImpactPage() {
  const { state, currentUser, getResource } = useStore()

  const stats = useMemo(() => platformStats(state), [state])
  const months = useMemo(() => monthlyExchanges(state), [state])
  const categories = useMemo(() => categoryBreakdown(state), [state])
  const popular = useMemo(() => popularResources(state, 6), [state])

  /* Retail value of everything currently listed — the idle capital campus already owns. */
  const idleValue = useMemo(
    () => state.resources.reduce((sum, r) => sum + estimatedRetailValue(r), 0),
    [state.resources],
  )

  const co2 = Math.round(stats.moneySaved * CO2_PER_RUPEE)

  /* The current student's own slice of the total. */
  const mine = useMemo(() => {
    const settled = state.borrowings.filter((b) => b.settlement)
    let saved = 0
    let borrowed = 0
    for (const b of settled) {
      if (b.borrowerId !== currentUser.id) continue
      const resource = getResource(b.resourceId)
      if (!resource) continue
      borrowed += 1
      saved += savedByExchange(resource, b.charges.borrowCharge)
    }
    const shared = state.resources.filter((r) => r.ownerId === currentUser.id)
    const timesShared = shared.reduce((sum, r) => sum + r.timesBorrowed, 0)
    return { saved, borrowed, listings: shared.length, timesShared }
  }, [state.borrowings, state.resources, currentUser.id, getResource])

  const categoryLegend = categories.slice(0, 6).map((c, i) => ({
    label: c.name,
    color: CHART_COLORS[i % CHART_COLORS.length],
    value: String(c.value),
  }))

  return (
    <Page width="wide">
      <PageHeader
        eyebrow="Campus impact"
        title="What sharing has done for this campus"
        subtitle="Every borrow is a purchase that did not happen. Here is what that adds up to across TSEC."
        actions={
          <Link to="/listings/new" className={cn(buttonVariants())}>
            <Package />
            Add to the pool
          </Link>
        }
      />

      {/* Headline */}
      <Reveal>
        <div className="mb-6 overflow-hidden rounded-2xl border border-primary/20 bg-primary-soft/50 p-6 sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <Badge variant="primary" size="sm">
                <Leaf className="size-3" />
                Since launch
              </Badge>
              <p className="num mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
                <CountUp value={stats.moneySaved} format={(n) => inr(n)} />
              </p>
              <p className="mt-1.5 max-w-md text-[0.875rem] leading-relaxed text-muted-foreground">
                Money students did not have to spend, because what they needed was already on
                campus.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
              <div>
                <p className="num text-2xl font-semibold tracking-tight">
                  <CountUp value={stats.resourcesReused} />
                </p>
                <p className="text-2xs text-muted-foreground">Resources reused</p>
              </div>
              <div>
                <p className="num text-2xl font-semibold tracking-tight">
                  <CountUp value={stats.successfulExchanges} />
                </p>
                <p className="text-2xs text-muted-foreground">Successful exchanges</p>
              </div>
              <div>
                <p className="num text-2xl font-semibold tracking-tight">
                  <CountUp value={co2} /> kg
                </p>
                <p className="text-2xs text-muted-foreground">CO₂ avoided</p>
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      {/* Stat grid */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active members"
          value={num(stats.activeMembers)}
          countTo={stats.activeMembers}
          icon={Users}
          tone="primary"
          hint="Students on CampusLoop"
        />
        <StatCard
          label="Resources shared"
          value={num(stats.resourcesShared)}
          countTo={stats.resourcesShared}
          icon={Package}
          hint={`${stats.newListingsThisWeek} added this week`}
        />
        <StatCard
          label="Idle value unlocked"
          value={inrCompact(idleValue)}
          countTo={idleValue}
          format={inrCompact}
          icon={Coins}
          tone="info"
          hint="Retail value sitting in listed items"
        />
        <StatCard
          label="On-time returns"
          value={`${stats.onTimeRate}%`}
          countTo={stats.onTimeRate}
          format={(n) => `${Math.round(n)}%`}
          icon={Repeat}
          hint="Across every completed return"
        />
      </div>

      {/* Charts */}
      <div className="mb-6 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Reveal>
          <ChartCard
            title="Exchanges per month"
            hint="Borrowing is compounding as more students list what they own"
            height={280}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={months} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="impactArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART.good} stopOpacity={0.28} />
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
                  fill="url(#impactArea)"
                  animationDuration={700}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </Reveal>

        <Reveal delay={0.05}>
          <ChartCard
            title="What campus shares"
            hint="Approved listings by category"
            height={280}
          >
            {categories.length === 0 ? (
              <EmptyState compact icon={<Package />} title="No approved listings yet" />
            ) : (
              <div className="flex h-full flex-col">
                <div className="min-h-0 flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categories}
                        dataKey="value"
                        nameKey="name"
                        innerRadius="56%"
                        outerRadius="82%"
                        paddingAngle={2}
                        stroke="none"
                        animationDuration={700}
                      >
                        {categories.map((c, i) => (
                          <Cell key={c.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ChartLegend items={categoryLegend} className="mt-2" />
              </div>
            )}
          </ChartCard>
        </Reveal>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Reveal>
          <ChartCard
            title="Most borrowed on campus"
            hint="The items students would otherwise each buy separately"
            height={300}
          >
            {popular.length === 0 ? (
              <EmptyState compact icon={<Repeat />} title="No borrowing history yet" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={popular}
                  layout="vertical"
                  margin={{ top: 4, right: 12, left: 4, bottom: 0 }}
                >
                  <CartesianGrid stroke={CHART.grid} horizontal={false} />
                  <XAxis type="number" {...axisProps} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    {...axisProps}
                    width={140}
                    tick={{ fontSize: 11, fill: CHART.axis }}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--chart-grid)' }} />
                  <Bar
                    dataKey="borrows"
                    name="Times borrowed"
                    radius={[0, 6, 6, 0]}
                    barSize={16}
                    animationDuration={700}
                  >
                    {popular.map((p, i) => (
                      <Cell key={p.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </Reveal>

        <Reveal delay={0.05}>
          <Card className="h-full">
            <CardContent className="pt-5">
              <SectionTitle
                title="Your contribution"
                hint="Your slice of the campus total"
                action={
                  <Link
                    to="/profile"
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    Profile
                    <ArrowRight className="size-3.5" />
                  </Link>
                }
              />
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-border bg-muted/30 p-4">
                  <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
                    You saved
                  </p>
                  <p className="num mt-1.5 text-2xl font-semibold tracking-tight text-primary">
                    <CountUp value={mine.saved} format={(n) => inr(n)} />
                  </p>
                  <p className="mt-1 text-2xs text-muted-foreground">
                    across {mine.borrowed} completed borrow{mine.borrowed === 1 ? '' : 's'}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-muted/30 p-4">
                  <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
                    You shared
                  </p>
                  <p className="num mt-1.5 text-2xl font-semibold tracking-tight">
                    <CountUp value={mine.timesShared} />
                  </p>
                  <p className="mt-1 text-2xs text-muted-foreground">
                    loans from your {mine.listings} listing{mine.listings === 1 ? '' : 's'}
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <span className="text-[0.8125rem] font-medium">
                    Share of campus savings
                  </span>
                  <span className="num text-xs text-muted-foreground">
                    {stats.moneySaved ? ((mine.saved / stats.moneySaved) * 100).toFixed(2) : '0.00'}%
                  </span>
                </div>
                <Progress
                  value={stats.moneySaved ? Math.min(100, (mine.saved / stats.moneySaved) * 100) : 0}
                  size="sm"
                  tone="primary"
                />
                <p className="mt-2 text-2xs leading-relaxed text-muted-foreground">
                  Small on its own. That is the point — 1,248 students each avoiding one purchase is
                  what the number at the top is made of.
                </p>
              </div>

              <div className="mt-5 space-y-0.5 border-t border-border pt-4">
                <DataRow
                  label="Transaction volume"
                  value={inrCompact(stats.transactionVolume)}
                  hint="Everything routed through CampusLoop"
                />
                <DataRow
                  label="Deposits currently held"
                  value={inr(stats.depositsHeld)}
                  tone="muted"
                  hint="Released as returns pass inspection"
                />
                <DataRow
                  label="Active exchanges"
                  value={String(stats.activeExchanges)}
                  tone="primary"
                  strong
                />
              </div>
            </CardContent>
          </Card>
        </Reveal>
      </div>

      {/* The argument */}
      <Reveal>
        <section>
          <SectionTitle
            title="Why this works"
            hint="Ownership is expensive. Access is not."
          />
          <Stagger className="mt-4 grid gap-4 sm:grid-cols-3">
            {[
              {
                icon: Recycle,
                title: 'One camera, forty shoots',
                body: `A DSLR sits idle around 95% of the year. Shared, the same body covers dozens of events instead of forty students each buying one.`,
              },
              {
                icon: TrendingUp,
                title: 'Trust compounds',
                body: `Every on-time return raises a trust score, which ranks that student higher in matches. Reliability is the currency, not money.`,
              },
              {
                icon: Sparkles,
                title: 'Nothing is wasted',
                body: `A borrow consumes roughly ${Math.round(VALUE_CONSUMED_PER_LOAN * 100)}% of what a purchase would have delivered — and the resource stays on campus afterwards.`,
              },
            ].map((c) => (
              <StaggerItem key={c.title}>
                <Card className="h-full">
                  <CardContent className="pt-5">
                    <span className="inline-flex size-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
                      <c.icon className="size-4" />
                    </span>
                    <p className="mt-3 text-[0.9375rem] font-semibold">{c.title}</p>
                    <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-muted-foreground">
                      {c.body}
                    </p>
                  </CardContent>
                </Card>
              </StaggerItem>
            ))}
          </Stagger>
        </section>
      </Reveal>

      <Reveal delay={0.05}>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-ink px-6 py-5 text-white">
          <div>
            <p className="text-base font-semibold">Everything you need may already be on campus.</p>
            <p className="mt-1 text-[0.8125rem] text-white/70">
              Add one thing you are not using this week and the number at the top of this page goes
              up.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/listings/new"
              className={cn(buttonVariants({ variant: 'outline' }), 'border-white/25 bg-transparent text-white hover:bg-white/10')}
            >
              List a resource
            </Link>
            <Link
              to="/discover"
              className={cn(buttonVariants(), 'bg-white text-ink hover:bg-white/90')}
            >
              Browse what is shared
              <ArrowRight />
            </Link>
          </div>
        </div>
      </Reveal>

      <p className="mt-6 text-2xs leading-relaxed text-muted-foreground">
        Figures combine live activity in this demo with the platform's historical baseline. Retail
        values are estimated from daily rates, savings assume a single loan delivers{' '}
        {Math.round(VALUE_CONSUMED_PER_LOAN * 100)}% of a purchase's value, and CO₂ is estimated at
        1 kg per ₹1,500 of avoided manufacturing.
      </p>
    </Page>
  )
}
