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
import { ArrowRight, Coins, Leaf, Package, Recycle, Repeat, Users } from 'lucide-react'
import { useStore } from '@/store/AppStore'
import {
  categoryBreakdown,
  estimatedRetailValue,
  monthlyExchanges,
  platformStats,
  popularResources,
  VALUE_CONSUMED_PER_LOAN,
} from '@/services/analytics'
import { inr, inrCompact, num } from '@/lib/format'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, SectionTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { PageHeader } from '@/components/layout/PageShell'
import { PageTransition, CountUp, Reveal } from '@/components/common/Motion'
import { StatCard, ChartCard, DataRow } from '@/components/common/StatCard'
import {
  axisProps,
  CHART,
  CHART_COLORS,
  ChartLegend,
  ChartTooltip,
} from '@/components/common/Charts'
import { EmptyState } from '@/components/common/EmptyState'

/** Stated assumption: ~1 kg CO₂ avoided per ₹1,500 of manufacturing not needed. */
const CO2_PER_RUPEE = 1 / 1500

export function AdminImpactPage() {
  const { state } = useStore()

  const stats = useMemo(() => platformStats(state), [state])
  const months = useMemo(() => monthlyExchanges(state), [state])
  const categories = useMemo(() => categoryBreakdown(state), [state])
  const popular = useMemo(() => popularResources(state, 8), [state])

  const idleValue = useMemo(
    () => state.resources.reduce((s, r) => s + estimatedRetailValue(r), 0),
    [state.resources],
  )

  const co2 = Math.round(stats.moneySaved * CO2_PER_RUPEE)
  const reuseRate = state.resources.length
    ? Math.round(
        (state.resources.filter((r) => r.timesBorrowed > 0).length / state.resources.length) * 100,
      )
    : 0

  /* Utilisation: how hard the pool is actually working. */
  const utilisation = useMemo(() => {
    const totalBorrows = state.resources.reduce((s, r) => s + r.timesBorrowed, 0)
    const perResource = state.resources.length ? totalBorrows / state.resources.length : 0
    return { totalBorrows, perResource }
  }, [state.resources])

  const categoryLegend = categories.slice(0, 6).map((c, i) => ({
    label: c.name,
    color: CHART_COLORS[i % CHART_COLORS.length],
    value: String(c.value),
  }))

  return (
    <PageTransition>
      <PageHeader
        eyebrow={
          <Badge variant="primary" size="sm">
            <Leaf className="size-3" />
            Sustainability
          </Badge>
        }
        title="Campus impact report"
        subtitle="The case for access over ownership, measured in rupees, reuse and carbon."
        actions={
          <Link to="/impact" className={cn(buttonVariants({ variant: 'outline' }))}>
            Student-facing version
            <ArrowRight />
          </Link>
        }
      />

      <Reveal>
        <div className="mb-6 overflow-hidden rounded-2xl border border-primary/20 bg-primary-soft/50 p-6 sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-2xs font-semibold uppercase tracking-wide text-primary">
                Money not spent by students
              </p>
              <p className="num mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
                <CountUp value={stats.moneySaved} format={(n) => inr(n)} />
              </p>
              <p className="mt-1.5 max-w-md text-[0.875rem] leading-relaxed text-muted-foreground">
                Across {num(stats.successfulExchanges)} completed exchanges, at a{' '}
                {stats.onTimeRate}% on-time return rate.
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
                  <CountUp value={co2} /> kg
                </p>
                <p className="text-2xs text-muted-foreground">CO₂ avoided</p>
              </div>
              <div>
                <p className="num text-2xl font-semibold tracking-tight">{reuseRate}%</p>
                <p className="text-2xs text-muted-foreground">Listings borrowed at least once</p>
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Members reached"
          value={num(stats.activeMembers)}
          countTo={stats.activeMembers}
          icon={Users}
          tone="primary"
        />
        <StatCard
          label="Idle value in the pool"
          value={inrCompact(idleValue)}
          countTo={idleValue}
          format={inrCompact}
          icon={Coins}
          tone="info"
          hint="Retail value of listed resources"
        />
        <StatCard
          label="Loans per resource"
          value={utilisation.perResource.toFixed(1)}
          countTo={utilisation.perResource}
          format={(n) => n.toFixed(1)}
          icon={Repeat}
          hint={`${num(utilisation.totalBorrows)} loans in total`}
        />
        <StatCard
          label="Purchases avoided"
          value={num(stats.resourcesReused)}
          countTo={stats.resourcesReused}
          icon={Recycle}
          tone="primary"
          hint={`Each loan delivers ~${Math.round(VALUE_CONSUMED_PER_LOAN * 100)}% of a purchase`}
        />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Reveal>
          <ChartCard title="Exchange growth" hint="Completed exchanges per month" height={280}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={months} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="adminImpactArea" x1="0" y1="0" x2="0" y2="1">
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
                  fill="url(#adminImpactArea)"
                  animationDuration={700}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </Reveal>

        <Reveal delay={0.05}>
          <ChartCard title="What campus shares" hint="Approved listings by category" height={280}>
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

      <div className="grid gap-4 lg:grid-cols-2">
        <Reveal>
          <ChartCard
            title="Hardest working resources"
            hint="Items the campus would otherwise buy many times over"
            height={320}
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
                  <YAxis type="category" dataKey="name" {...axisProps} width={150} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--chart-grid)' }} />
                  <Bar dataKey="borrows" name="Times borrowed" radius={[0, 6, 6, 0]} barSize={16}>
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
              <SectionTitle title="Where the impact comes from" hint="Ownership is the expensive part" />
              <div className="space-y-4">
                {[
                  {
                    label: 'Listings borrowed at least once',
                    value: reuseRate,
                    caption: `${state.resources.filter((r) => r.timesBorrowed > 0).length} of ${state.resources.length} listings`,
                  },
                  {
                    label: 'On-time return rate',
                    value: stats.onTimeRate,
                    caption: 'Trust is what keeps owners lending',
                  },
                  {
                    label: 'Exchanges without a dispute',
                    value: state.borrowings.length
                      ? Math.round(
                          ((state.borrowings.length - state.disputes.length) /
                            state.borrowings.length) *
                            100,
                        )
                      : 100,
                    caption: `${state.disputes.length} claim${state.disputes.length === 1 ? '' : 's'} on record`,
                  },
                ].map((row) => (
                  <div key={row.label}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-3">
                      <span className="text-[0.8125rem] font-medium">{row.label}</span>
                      <span className="num text-xs font-semibold">{row.value}%</span>
                    </div>
                    <Progress value={row.value} size="sm" tone="primary" />
                    <p className="mt-1 text-2xs text-muted-foreground">{row.caption}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 space-y-0.5 border-t border-border pt-4">
                <DataRow label="Money saved" value={inr(stats.moneySaved)} strong tone="primary" />
                <DataRow label="Transaction volume" value={inrCompact(stats.transactionVolume)} />
                <DataRow label="Platform fees" value={inr(stats.platformFees)} tone="muted" />
                <DataRow label="CO₂ avoided" value={`${num(co2)} kg`} />
              </div>

              <p className="mt-4 text-2xs leading-relaxed text-muted-foreground">
                Retail values are estimated from daily rates. Savings assume a single loan delivers{' '}
                {Math.round(VALUE_CONSUMED_PER_LOAN * 100)}% of what buying would have, and carbon is
                estimated at 1 kg per ₹1,500 of avoided manufacturing.
              </p>
            </CardContent>
          </Card>
        </Reveal>
      </div>
    </PageTransition>
  )
}
