import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Activity, ArrowRight, Gauge, ShieldCheck, TrendingUp } from 'lucide-react'
import { useStore } from '@/store/AppStore'
import {
  borrowsByCategory,
  monthlyExchanges,
  onTimeVsLate,
  platformStats,
  transactionSeries,
  trustDistribution,
} from '@/services/analytics'
import { WEIGHT_LABELS } from '@/services/matching'
import { inr, inrCompact, num } from '@/lib/format'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, SectionTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/layout/PageShell'
import { PageTransition, Reveal } from '@/components/common/Motion'
import { StatCard, ChartCard, DataRow } from '@/components/common/StatCard'
import {
  axisProps,
  CHART,
  CHART_COLORS,
  ChartLegend,
  ChartTooltip,
} from '@/components/common/Charts'
import { EmptyState } from '@/components/common/EmptyState'

export function AdminAnalyticsPage() {
  const { state } = useStore()

  const stats = useMemo(() => platformStats(state), [state])
  const months = useMemo(() => monthlyExchanges(state), [state])
  const byCategory = useMemo(() => borrowsByCategory(state), [state])
  const punctuality = useMemo(() => onTimeVsLate(state), [state])
  const trust = useMemo(() => trustDistribution(state), [state])
  const money = useMemo(() => transactionSeries(state), [state])

  /* The matching weights from the brief, as a radar. */
  const weights = useMemo(
    () =>
      WEIGHT_LABELS.map((w) => ({
        factor: w.label,
        weight: Math.round(w.weight * 100),
      })),
    [],
  )

  const avgBasket = state.borrowings.length
    ? Math.round(
        state.borrowings.reduce((s, b) => s + b.charges.total, 0) / state.borrowings.length,
      )
    : 0

  const avgDays = state.borrowings.length
    ? state.borrowings.reduce((s, b) => s + b.charges.days, 0) / state.borrowings.length
    : 0

  const conversion = state.borrowings.length
    ? Math.round(
        (state.borrowings.filter((b) => b.status !== 'requested' && b.status !== 'declined').length /
          state.borrowings.length) *
          100,
      )
    : 0

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Analytics"
        title="How the platform behaves"
        subtitle="Demand, punctuality, trust distribution and the weights the recommendation engine actually uses."
        actions={
          <Link to="/admin/impact" className={cn(buttonVariants({ variant: 'outline' }))}>
            Impact report
            <ArrowRight />
          </Link>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Average transaction"
          value={inr(avgBasket)}
          countTo={avgBasket}
          format={inr}
          icon={Activity}
          tone="primary"
          hint="Charge + fee + deposit"
        />
        <StatCard
          label="Average loan length"
          value={`${avgDays.toFixed(1)} days`}
          countTo={avgDays}
          format={(n) => `${n.toFixed(1)} days`}
          icon={Gauge}
          hint="Across every request"
        />
        <StatCard
          label="Request → handover"
          value={`${conversion}%`}
          countTo={conversion}
          format={(n) => `${Math.round(n)}%`}
          icon={TrendingUp}
          tone="info"
          hint="Requests that owners accepted"
        />
        <StatCard
          label="On-time returns"
          value={`${stats.onTimeRate}%`}
          countTo={stats.onTimeRate}
          format={(n) => `${Math.round(n)}%`}
          icon={ShieldCheck}
          hint={`${punctuality[1]?.value ?? 0} late return(s) on record`}
        />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Reveal>
          <ChartCard title="Demand by category" hint="Borrow requests, not listings" height={300}>
            {byCategory.length === 0 ? (
              <EmptyState compact title="No borrowing history yet" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byCategory} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke={CHART.grid} vertical={false} />
                  <XAxis dataKey="name" {...axisProps} interval={0} angle={-18} height={48} dy={10} />
                  <YAxis {...axisProps} width={44} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--chart-grid)' }} />
                  <Bar dataKey="value" name="Requests" radius={[6, 6, 0, 0]} barSize={26}>
                    {byCategory.map((c, i) => (
                      <Cell key={c.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </Reveal>

        <Reveal delay={0.05}>
          <ChartCard
            title="Matching weights"
            hint="What the AI optimises for when it ranks a resource"
            height={300}
          >
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={weights} outerRadius="72%">
                <PolarGrid stroke={CHART.grid} />
                <PolarAngleAxis dataKey="factor" tick={{ fontSize: 11, fill: CHART.axis }} />
                <Tooltip content={<ChartTooltip suffix="%" />} />
                <Radar
                  name="Weight"
                  dataKey="weight"
                  stroke={CHART.good}
                  fill={CHART.good}
                  fillOpacity={0.22}
                  animationDuration={700}
                />
              </RadarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Reveal>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Reveal>
          <ChartCard title="Trust distribution" hint="Members grouped by trust score" height={280}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trust} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
                <CartesianGrid stroke={CHART.grid} vertical={false} />
                <XAxis dataKey="name" {...axisProps} />
                <YAxis {...axisProps} width={44} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--chart-grid)' }} />
                <Bar dataKey="members" name="Members" radius={[6, 6, 0, 0]} barSize={40}>
                  {trust.map((t, i) => (
                    <Cell key={t.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Reveal>

        <Reveal delay={0.05}>
          <ChartCard
            title="Exchanges vs fees"
            hint="Volume and revenue move together"
            height={280}
          >
            <div className="flex h-full flex-col">
              <div className="min-h-0 flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={months} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid stroke={CHART.grid} vertical={false} />
                    <XAxis dataKey="name" {...axisProps} />
                    <YAxis {...axisProps} width={44} />
                    <Tooltip content={<ChartTooltip />} cursor={{ stroke: CHART.grid }} />
                    <Line
                      type="monotone"
                      dataKey="exchanges"
                      name="Exchanges"
                      stroke={CHART.good}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      animationDuration={700}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <ChartLegend
                className="mt-2"
                items={[
                  { label: 'Exchanges', color: CHART.good, value: num(stats.successfulExchanges) },
                  {
                    label: 'Fees earned',
                    color: 'var(--chart-3)',
                    value: inrCompact(stats.platformFees),
                  },
                ]}
              />
            </div>
          </ChartCard>
        </Reveal>
      </div>

      <Reveal>
        <Card>
          <CardContent className="pt-5">
            <SectionTitle
              title="Reading the numbers"
              hint="What each figure is actually measuring"
            />
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-0.5">
                <DataRow
                  label="Successful exchanges"
                  value={num(stats.successfulExchanges)}
                  hint="Reached settlement or rating"
                  strong
                />
                <DataRow
                  label="Active exchanges"
                  value={String(stats.activeExchanges)}
                  hint="Anything between request and return"
                  tone="primary"
                />
                <DataRow
                  label="Transaction volume"
                  value={inrCompact(stats.transactionVolume)}
                  hint="Charges + fees + deposits, historical and live"
                />
                <DataRow
                  label="Platform fees"
                  value={inr(stats.platformFees)}
                  hint={`${Math.round(state.platformFeeRate * 100)}% of each borrowing charge`}
                  tone="muted"
                />
              </div>
              <div className="space-y-0.5">
                <DataRow
                  label="Deposits held"
                  value={inr(stats.depositsHeld)}
                  hint="Money in escrow across open exchanges"
                />
                <DataRow
                  label="Overdue returns"
                  value={String(stats.overdueCount)}
                  hint="Late fee applies per started day"
                  tone={stats.overdueCount ? 'danger' : 'muted'}
                />
                <DataRow
                  label="Open disputes"
                  value={String(stats.openDisputes)}
                  hint="Awaiting a moderator decision"
                  tone={stats.openDisputes ? 'danger' : 'muted'}
                />
                <DataRow
                  label="Latest month volume"
                  value={inr(
                    money.length ? money[money.length - 1].charges + money[money.length - 1].fees : 0,
                  )}
                  hint="Charges plus fees, deposits excluded"
                  strong
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </Reveal>
    </PageTransition>
  )
}
