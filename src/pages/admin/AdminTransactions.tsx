import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ArrowDownLeft, ArrowUpRight, Download, Percent, Receipt, Search, Wallet } from 'lucide-react'
import type { Transaction } from '@/types'
import { useStore } from '@/store/AppStore'
import { platformStats, transactionSeries } from '@/services/analytics'
import { fmtDateTime, inr, inrCompact, num } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, SectionTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/toast'
import { PageHeader } from '@/components/layout/PageShell'
import { PageTransition, Reveal } from '@/components/common/Motion'
import { StatCard, ChartCard, DataRow } from '@/components/common/StatCard'
import { AdminTable, type Column } from '@/components/common/AdminTable'
import { axisProps, CHART, ChartLegend, ChartTooltip } from '@/components/common/Charts'
import { ResourceImage } from '@/components/common/ResourceImage'

type Tab = 'all' | 'payment' | 'refund' | 'payout'

const TYPE_META: Record<
  Transaction['type'],
  { label: string; variant: 'neutral' | 'info' | 'primary'; icon: typeof ArrowUpRight }
> = {
  payment: { label: 'Payment', variant: 'neutral', icon: ArrowUpRight },
  refund: { label: 'Refund', variant: 'info', icon: ArrowDownLeft },
  payout: { label: 'Payout', variant: 'primary', icon: ArrowUpRight },
}

export function AdminTransactionsPage() {
  const { state, getUser, getResource } = useStore()
  const { toast } = useToast()

  const [tab, setTab] = useState<Tab>('all')
  const [query, setQuery] = useState('')

  const stats = useMemo(() => platformStats(state), [state])
  const series = useMemo(() => transactionSeries(state), [state])

  const counts = useMemo(
    () => ({
      all: state.transactions.length,
      payment: state.transactions.filter((t) => t.type === 'payment').length,
      refund: state.transactions.filter((t) => t.type === 'refund').length,
      payout: state.transactions.filter((t) => t.type === 'payout').length,
    }),
    [state.transactions],
  )

  const totals = useMemo(() => {
    let paid = 0
    let refunded = 0
    let fees = 0
    for (const t of state.transactions) {
      if (t.type === 'payment') {
        paid += t.amount
        fees += t.platformFee
      }
      if (t.type === 'refund') refunded += t.amount
    }
    const settledCharges = state.borrowings
      .filter((b) => b.settlement)
      .reduce((s, b) => s + b.charges.borrowCharge + (b.settlement?.lateFee ?? 0), 0)
    /* Owners keep the charge minus the platform's cut. */
    const payouts = Math.round(settledCharges * (1 - state.platformFeeRate))
    return { paid, refunded, fees, payouts }
  }, [state.transactions, state.borrowings, state.platformFeeRate])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return state.transactions
      .filter((t) => {
        if (tab !== 'all' && t.type !== tab) return false
        if (!q) return true
        const resource = getResource(t.resourceId)
        const borrower = getUser(t.borrowerId)
        return (
          t.id.toLowerCase().includes(q) ||
          t.method.toLowerCase().includes(q) ||
          (resource?.name.toLowerCase().includes(q) ?? false) ||
          (borrower?.name.toLowerCase().includes(q) ?? false)
        )
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [state.transactions, tab, query, getResource, getUser])

  /* Client-side CSV export — no server, the browser builds the file. */
  const exportCsv = () => {
    if (!rows.length) return
    const header = [
      'id',
      'type',
      'status',
      'created',
      'resource',
      'borrower',
      'owner',
      'borrowCharge',
      'platformFee',
      'deposit',
      'amount',
      'method',
    ]
    const lines = rows.map((t) => {
      const resource = getResource(t.resourceId)?.name ?? ''
      const borrower = getUser(t.borrowerId)?.name ?? ''
      const owner = getUser(t.ownerId)?.name ?? ''
      return [
        t.id,
        t.type,
        t.status,
        t.createdAt,
        resource,
        borrower,
        owner,
        t.borrowCharge,
        t.platformFee,
        t.deposit,
        t.amount,
        t.method,
      ]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(',')
    })
    const blob = new Blob([[header.join(','), ...lines].join('\n')], {
      type: 'text/csv;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `campusloop-transactions-${rows.length}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast({
      title: 'Ledger exported',
      description: `${rows.length} row${rows.length === 1 ? '' : 's'} written to CSV.`,
      tone: 'success',
    })
  }

  const columns: Column<Transaction>[] = [
    {
      key: 'txn',
      header: 'Transaction',
      render: (t) => {
        const meta = TYPE_META[t.type]
        const resource = getResource(t.resourceId)
        return (
          <div className="flex items-center gap-3">
            {resource ? (
              <ResourceImage
                resource={resource}
                className="size-9 shrink-0"
                rounded="rounded-lg"
                iconClassName="size-3.5"
              />
            ) : (
              <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Receipt className="size-4" />
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-[0.8125rem] font-semibold">
                {resource?.name ?? 'Resource'}
              </p>
              <p className="num truncate text-2xs text-muted-foreground">
                {meta.label} · {t.id}
              </p>
            </div>
          </div>
        )
      },
    },
    {
      key: 'people',
      header: 'Between',
      hideBelow: 'md',
      render: (t) => {
        const borrower = getUser(t.borrowerId)
        const owner = getUser(t.ownerId)
        return (
          <p className="truncate text-xs text-muted-foreground">
            {borrower?.name ?? '—'} <span className="text-muted-foreground/60">→</span>{' '}
            {owner?.name ?? '—'}
          </p>
        )
      },
    },
    {
      key: 'breakdown',
      header: 'Charge / Fee / Deposit',
      align: 'right',
      hideBelow: 'lg',
      render: (t) => (
        <p className="num text-2xs text-muted-foreground">
          {inr(t.borrowCharge)} · {inr(t.platformFee)} · {inr(t.deposit)}
        </p>
      ),
    },
    {
      key: 'method',
      header: 'Method',
      hideBelow: 'lg',
      render: (t) => <span className="text-2xs text-muted-foreground">{t.method}</span>,
    },
    {
      key: 'when',
      header: 'When',
      hideBelow: 'sm',
      render: (t) => <span className="num text-2xs text-muted-foreground">{fmtDateTime(t.createdAt)}</span>,
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: (t) => (
        <span
          className={cn(
            'num text-[0.8125rem] font-semibold',
            t.type === 'refund' && 'text-primary',
          )}
        >
          {t.type === 'refund' ? '− ' : ''}
          {inr(t.amount)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (t) => (
        <Badge
          variant={t.status === 'success' ? 'success' : t.status === 'pending' ? 'warning' : 'danger'}
          size="sm"
        >
          {t.status}
        </Badge>
      ),
    },
  ]

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Money"
        title="Transactions"
        subtitle="Every simulated payment, refund and payout — with the formula that produced it."
        actions={
          <>
            <Button variant="outline" onClick={exportCsv} disabled={!rows.length}>
              <Download />
              Export CSV
            </Button>
            <Link to="/admin/analytics" className={cn(buttonVariants())}>
              Analytics
            </Link>
          </>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Transaction volume"
          value={inrCompact(stats.transactionVolume)}
          countTo={stats.transactionVolume}
          format={inrCompact}
          icon={Receipt}
          tone="primary"
          hint={`${num(counts.all)} entries in this session`}
        />
        <StatCard
          label="Platform fees"
          value={inr(stats.platformFees)}
          countTo={stats.platformFees}
          format={inr}
          icon={Percent}
          hint={`At ${Math.round(state.platformFeeRate * 100)}% of the borrowing charge`}
        />
        <StatCard
          label="Deposits held"
          value={inr(stats.depositsHeld)}
          countTo={stats.depositsHeld}
          format={inr}
          icon={Wallet}
          tone="info"
          hint="Refundable, released after inspection"
        />
        <StatCard
          label="Refunded"
          value={inr(totals.refunded)}
          countTo={totals.refunded}
          format={inr}
          icon={ArrowDownLeft}
          hint={`${counts.refund} settlement refund${counts.refund === 1 ? '' : 's'}`}
        />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Reveal>
          <ChartCard
            title="Money by month"
            hint="Borrowing charges, refundable deposits and platform fees"
            height={280}
          >
            <div className="flex h-full flex-col">
              <div className="min-h-0 flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={series} margin={{ top: 6, right: 6, left: -6, bottom: 0 }}>
                    <CartesianGrid stroke={CHART.grid} vertical={false} />
                    <XAxis dataKey="name" {...axisProps} />
                    <YAxis {...axisProps} width={54} tickFormatter={(v: number) => inrCompact(v)} />
                    <Tooltip
                      content={<ChartTooltip format={inr} />}
                      cursor={{ fill: 'var(--chart-grid)' }}
                    />
                    <Bar
                      dataKey="charges"
                      name="Borrowing charges"
                      stackId="a"
                      fill="var(--chart-1)"
                      radius={[0, 0, 0, 0]}
                      barSize={26}
                    />
                    <Bar
                      dataKey="deposits"
                      name="Deposits"
                      stackId="a"
                      fill="var(--chart-2)"
                      barSize={26}
                    />
                    <Bar
                      dataKey="fees"
                      name="Platform fees"
                      stackId="a"
                      fill="var(--chart-3)"
                      radius={[6, 6, 0, 0]}
                      barSize={26}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <ChartLegend
                className="mt-2"
                items={[
                  { label: 'Borrowing charges', color: 'var(--chart-1)' },
                  { label: 'Deposits', color: 'var(--chart-2)' },
                  { label: 'Platform fees', color: 'var(--chart-3)' },
                ]}
              />
            </div>
          </ChartCard>
        </Reveal>

        <Reveal delay={0.05}>
          <Card className="h-full">
            <CardContent className="pt-5">
              <SectionTitle title="How a payment splits" hint="The formula from the brief" />
              <div className="rounded-xl border border-border bg-muted/30 p-3.5">
                <p className="num text-xs font-medium leading-relaxed">
                  Borrowing charge + Platform fee + Security deposit
                  <br />
                  <span className="text-muted-foreground">= Transaction amount</span>
                </p>
                <p className="num mt-3 text-xs font-medium leading-relaxed">
                  Security deposit − Damage − Late fee
                  <br />
                  <span className="text-muted-foreground">= Refund</span>
                </p>
              </div>

              <div className="mt-4 space-y-0.5">
                <DataRow
                  label="Collected this session"
                  value={inr(totals.paid)}
                  hint="Charges + fees + deposits"
                  strong
                />
                <DataRow label="Fees earned" value={inr(totals.fees)} tone="primary" />
                <DataRow label="Refunded to borrowers" value={inr(totals.refunded)} tone="muted" />
                <DataRow
                  label="Owed to owners"
                  value={inr(totals.payouts)}
                  hint="Charge minus the platform fee"
                  tone="primary"
                  strong
                />
              </div>

              <p className="mt-4 text-2xs leading-relaxed text-muted-foreground">
                Payments are simulated end to end — no gateway is contacted, nothing leaves the
                browser, and every entry above was produced by an action taken in this demo.
              </p>
            </CardContent>
          </Card>
        </Reveal>
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        ariaLabel="Filter transactions by type"
        className="mb-4"
        items={[
          { value: 'all', label: 'All', count: counts.all },
          { value: 'payment', label: 'Payments', count: counts.payment },
          { value: 'refund', label: 'Refunds', count: counts.refund },
          { value: 'payout', label: 'Payouts', count: counts.payout },
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
                placeholder="Search id, resource, student or method"
                className="pl-9"
                aria-label="Search transactions"
              />
            </div>
          </CardContent>
        </Card>
      </Reveal>

      <Reveal delay={0.04}>
        <AdminTable
          rows={rows}
          columns={columns}
          empty={{
            title: 'No transactions yet',
            message:
              'Complete a payment in the student flow and the entry appears here immediately.',
          }}
        />
      </Reveal>

      <p className="mt-3 text-2xs text-muted-foreground">
        Showing {rows.length} of {counts.all} entries created in this session. Historical volume is
        included in the totals above.
      </p>
    </PageTransition>
  )
}
