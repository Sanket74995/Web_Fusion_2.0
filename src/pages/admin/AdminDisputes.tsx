import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CheckCircle2,
  Gavel,
  ImageIcon,
  Scale,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from 'lucide-react'
import type { Dispute } from '@/types'
import { useStore } from '@/store/AppStore'
import { fmtDateTime, inr, timeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, SectionTitle } from '@/components/ui/card'
import { Field, Input, Textarea } from '@/components/ui/input'
import { Tabs } from '@/components/ui/tabs'
import { Dialog } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { PageHeader } from '@/components/layout/PageShell'
import { PageTransition, Reveal } from '@/components/common/Motion'
import { StatCard, DataRow } from '@/components/common/StatCard'
import { AdminTable, type Column } from '@/components/common/AdminTable'
import { Avatar } from '@/components/common/Avatar'
import { ResourceImage } from '@/components/common/ResourceImage'
import { DisputeBadge } from '@/components/common/StatusBadge'
import { ConditionComparison } from '@/components/common/ConditionComparison'
import { SettlementBreakdown } from '@/components/common/ChargeBreakdown'

type Tab = 'under_review' | 'resolved' | 'rejected' | 'all'

export function AdminDisputesPage() {
  const { state, getUser, getResource, getBorrowing, getReport, resolveDispute } = useStore()
  const { toast } = useToast()

  const [tab, setTab] = useState<Tab>('under_review')
  const [openId, setOpenId] = useState<string | null>(null)
  const [award, setAward] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  const counts = useMemo(
    () => ({
      all: state.disputes.length,
      under_review: state.disputes.filter((d) => d.status === 'under_review').length,
      resolved: state.disputes.filter((d) => d.status === 'resolved').length,
      rejected: state.disputes.filter((d) => d.status === 'rejected').length,
    }),
    [state.disputes],
  )

  const money = useMemo(() => {
    const claimedOpen = state.disputes
      .filter((d) => d.status === 'under_review')
      .reduce((s, d) => s + d.claimedAmount, 0)
    const awarded = state.disputes
      .filter((d) => d.status === 'resolved')
      .reduce((s, d) => s + (d.resolvedAmount ?? 0), 0)
    const claimedTotal = state.disputes.reduce((s, d) => s + d.claimedAmount, 0)
    const disputeRate = state.borrowings.length
      ? (state.disputes.length / state.borrowings.length) * 100
      : 0
    return { claimedOpen, awarded, claimedTotal, disputeRate }
  }, [state.disputes, state.borrowings])

  const rows = useMemo(
    () =>
      state.disputes
        .filter((d) => tab === 'all' || d.status === tab)
        .sort((a, b) => {
          if (a.status !== b.status) return a.status === 'under_review' ? -1 : 1
          return b.createdAt.localeCompare(a.createdAt)
        }),
    [state.disputes, tab],
  )

  const open = openId ? state.disputes.find((d) => d.id === openId) : undefined
  const openBorrowing = open ? getBorrowing(open.borrowingId) : undefined
  const openResource = open ? getResource(open.resourceId) : undefined
  const raisedBy = open ? getUser(open.raisedByUserId) : undefined
  const against = open ? getUser(open.againstUserId) : undefined
  const beforeReport = openBorrowing ? getReport(openBorrowing.beforeReportId) : undefined
  const afterReport = openBorrowing ? getReport(openBorrowing.afterReportId) : undefined
  const depositHeld = openBorrowing?.charges.deposit ?? 0

  /* Pre-fill the decision with the claim so the moderator only adjusts. */
  useEffect(() => {
    if (!open) return
    setAward(String(open.resolvedAmount ?? open.claimedAmount))
    setNote(open.resolution ?? '')
    setError('')
  }, [open])

  const closeDialog = () => setOpenId(null)

  const decide = (status: Dispute['status']) => {
    if (!open) return
    const amount = status === 'rejected' ? 0 : Math.round(Number(award) || 0)
    if (status === 'resolved' && amount <= 0) {
      setError('Enter the amount to deduct, or reject the claim instead.')
      return
    }
    if (amount > depositHeld) {
      setError(`The deposit only covers ${inr(depositHeld)}. Deduct that or less.`)
      return
    }
    if (note.trim().length < 12) {
      setError('Write a short reason — both students see this decision.')
      return
    }
    resolveDispute(open.id, { status, resolvedAmount: amount, resolution: note.trim() })
    toast({
      title: status === 'resolved' ? `Deduction of ${inr(amount)} upheld` : 'Claim rejected',
      description:
        status === 'resolved'
          ? 'Both students have been notified with your reasoning.'
          : 'No deduction recorded and no trust penalty applied.',
      tone: status === 'resolved' ? 'info' : 'success',
    })
    closeDialog()
  }

  const columns: Column<Dispute>[] = [
    {
      key: 'claim',
      header: 'Claim',
      render: (d) => {
        const resource = getResource(d.resourceId)
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
              <p className="truncate text-[0.8125rem] font-semibold">{d.reason}</p>
              <p className="truncate text-2xs text-muted-foreground">
                {resource?.name ?? 'Resource'} · raised {timeAgo(d.createdAt)}
              </p>
            </div>
          </div>
        )
      },
    },
    {
      key: 'parties',
      header: 'Raised by / against',
      hideBelow: 'md',
      render: (d) => {
        const from = getUser(d.raisedByUserId)
        const to = getUser(d.againstUserId)
        return (
          <div className="flex items-center gap-2">
            {from && <Avatar user={from} size="xs" />}
            <div className="min-w-0">
              <p className="truncate text-xs font-medium">{from?.name ?? '—'}</p>
              <p className="truncate text-2xs text-muted-foreground">against {to?.name ?? '—'}</p>
            </div>
          </div>
        )
      },
    },
    {
      key: 'evidence',
      header: 'Evidence',
      align: 'right',
      hideBelow: 'lg',
      render: (d) => (
        <span className="num inline-flex items-center gap-1 text-2xs text-muted-foreground">
          <ImageIcon className="size-3" />
          {d.evidence.length}
        </span>
      ),
    },
    {
      key: 'claimed',
      header: 'Claimed',
      align: 'right',
      render: (d) => (
        <span className="num text-[0.8125rem] font-semibold text-destructive">
          {inr(d.claimedAmount)}
        </span>
      ),
    },
    {
      key: 'awarded',
      header: 'Deducted',
      align: 'right',
      hideBelow: 'sm',
      render: (d) =>
        d.status === 'under_review' ? (
          <span className="text-2xs text-muted-foreground">Pending</span>
        ) : (
          <span className="num text-[0.8125rem] font-semibold">{inr(d.resolvedAmount ?? 0)}</span>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (d) => <DisputeBadge status={d.status} size="sm" />,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (d) => (
        <Button
          variant={d.status === 'under_review' ? 'primary' : 'ghost'}
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            setOpenId(d.id)
          }}
        >
          {d.status === 'under_review' ? (
            <>
              <Gavel />
              Review
            </>
          ) : (
            'View'
          )}
        </Button>
      ),
    },
  ]

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Disputes"
        title="Damage claims"
        subtitle="Both sides recorded the condition. Compare the reports, decide what the deposit covers, and say why."
        actions={
          counts.under_review > 0 ? (
            <Badge variant="danger">
              <ShieldAlert className="size-3" />
              {counts.under_review} awaiting a decision
            </Badge>
          ) : (
            <Badge variant="success">
              <ShieldCheck className="size-3" />
              Nothing open
            </Badge>
          )
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Open claims"
          value={String(counts.under_review)}
          icon={ShieldAlert}
          tone={counts.under_review > 0 ? 'danger' : 'default'}
          hint={counts.under_review > 0 ? `${inr(money.claimedOpen)} claimed` : 'All settled'}
        />
        <StatCard
          label="Total deducted"
          value={inr(money.awarded)}
          countTo={money.awarded}
          format={inr}
          icon={Scale}
          hint={`from ${inr(money.claimedTotal)} claimed`}
        />
        <StatCard
          label="Claims rejected"
          value={String(counts.rejected)}
          icon={XCircle}
          hint="Deposit returned in full"
        />
        <StatCard
          label="Dispute rate"
          value={`${money.disputeRate.toFixed(1)}%`}
          countTo={money.disputeRate}
          format={(n) => `${n.toFixed(1)}%`}
          icon={CheckCircle2}
          tone="primary"
          hint="Of all exchanges on the platform"
        />
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        ariaLabel="Filter disputes"
        className="mb-4"
        items={[
          { value: 'under_review', label: 'Under review', count: counts.under_review },
          { value: 'resolved', label: 'Resolved', count: counts.resolved },
          { value: 'rejected', label: 'Rejected', count: counts.rejected },
          { value: 'all', label: 'All', count: counts.all },
        ]}
      />

      <Reveal>
        <AdminTable
          rows={rows}
          columns={columns}
          onRowClick={(d) => setOpenId(d.id)}
          empty={{
            title:
              tab === 'under_review' ? 'No open disputes' : 'Nothing in this state',
            message:
              tab === 'under_review'
                ? 'Every claim has a decision on record. New claims appear the moment an owner reports damage during inspection.'
                : 'Switch tabs to see claims in another state.',
          }}
        />
      </Reveal>

      <Reveal delay={0.05}>
        <Card className="mt-6">
          <CardContent className="pt-5">
            <SectionTitle
              title="How a claim is judged"
              hint="The same three questions every time"
              className="mb-3"
            />
            <ol className="grid gap-3 sm:grid-cols-3">
              {[
                {
                  n: 1,
                  title: 'Was it there before?',
                  body: 'The BEFORE report is signed at handover. Anything ticked as fine then, and damaged now, is new.',
                },
                {
                  n: 2,
                  title: 'Is the amount fair?',
                  body: 'The deduction is capped at the deposit and should reflect repair cost, not replacement.',
                },
                {
                  n: 3,
                  title: 'Does it hold up on evidence?',
                  body: 'Photos from both phases plus the checklist. No evidence, no deduction.',
                },
              ].map((s) => (
                <li key={s.n} className="rounded-xl border border-border bg-muted/25 p-3.5">
                  <span className="num inline-flex size-6 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
                    {s.n}
                  </span>
                  <p className="mt-2 text-[0.8125rem] font-semibold">{s.title}</p>
                  <p className="mt-1 text-2xs leading-relaxed text-muted-foreground">{s.body}</p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </Reveal>

      {/* Decision dialog */}
      <Dialog
        open={Boolean(open)}
        onClose={closeDialog}
        size="xl"
        title={open ? open.reason : ''}
        description={
          open
            ? `${openResource?.name ?? 'Resource'} · raised ${fmtDateTime(open.createdAt)} · claim ${inr(open.claimedAmount)}`
            : undefined
        }
        footer={
          open && (
            <>
              <Button variant="ghost" onClick={closeDialog}>
                Close
              </Button>
              {open.status === 'under_review' ? (
                <>
                  <Button variant="outline" onClick={() => decide('rejected')}>
                    <XCircle />
                    Reject claim
                  </Button>
                  <Button onClick={() => decide('resolved')}>
                    <Gavel />
                    Uphold deduction
                  </Button>
                </>
              ) : (
                openBorrowing && (
                  <Link
                    to={`/borrowings/${openBorrowing.id}`}
                    className={cn(buttonVariants({ variant: 'outline' }))}
                  >
                    Open exchange
                  </Link>
                )
              )}
            </>
          )
        }
      >
        {open && (
          <div className="grid gap-6 lg:grid-cols-[1fr_1.05fr]">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <DisputeBadge status={open.status} />
                <Badge variant="outline">Deposit held {inr(depositHeld)}</Badge>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {[
                  { role: 'Raised by', user: raisedBy },
                  { role: 'Against', user: against },
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
                          Trust {user.trustScore} · {user.disputes} prior dispute
                          {user.disputes === 1 ? '' : 's'}
                        </p>
                      </div>
                    </Link>
                  ) : null,
                )}
              </div>

              <div className="mt-4 rounded-xl border border-destructive/20 bg-destructive-soft/40 p-3.5">
                <p className="text-2xs font-semibold uppercase tracking-wide text-destructive">
                  What the owner reported
                </p>
                <p className="mt-1.5 text-[0.8125rem] leading-relaxed">{open.description}</p>
              </div>

              {open.evidence.length > 0 && (
                <div className="mt-4">
                  <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Evidence ({open.evidence.length})
                  </p>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {open.evidence.map((src, i) => (
                      <img
                        key={i}
                        src={src}
                        alt={`Evidence ${i + 1}`}
                        className="h-24 w-full rounded-lg border border-border object-cover"
                      />
                    ))}
                  </div>
                </div>
              )}

              {openBorrowing?.settlement && (
                <div className="mt-5">
                  <SectionTitle
                    title="Settlement on record"
                    hint="What the borrower was refunded"
                    className="mb-2.5"
                  />
                  <SettlementBreakdown settlement={openBorrowing.settlement} showFormula={false} />
                </div>
              )}

              {open.status !== 'under_review' && (
                <div className="mt-5 rounded-xl border border-border bg-muted/40 p-3.5">
                  <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Decision
                  </p>
                  <p className="mt-1.5 text-[0.8125rem] leading-relaxed">
                    {open.resolution ?? 'No reasoning recorded.'}
                  </p>
                  <div className="mt-2 space-y-0.5">
                    <DataRow
                      label="Deducted from deposit"
                      value={inr(open.resolvedAmount ?? 0)}
                      strong
                      tone={open.resolvedAmount ? 'danger' : 'muted'}
                    />
                    {open.resolvedAt && (
                      <DataRow label="Decided" value={fmtDateTime(open.resolvedAt)} tone="muted" />
                    )}
                  </div>
                </div>
              )}
            </div>

            <div>
              <SectionTitle
                title="Condition: before vs after"
                hint="Both reports signed by the two students"
                className="mb-3"
              />
              <ConditionComparison before={beforeReport} after={afterReport} />

              {open.status === 'under_review' && (
                <div className="mt-5 rounded-xl border border-border bg-card p-4">
                  <SectionTitle title="Your decision" className="mb-3" />
                  <Field
                    label="Deduct from the deposit"
                    hint={`Capped at the ${inr(depositHeld)} held. Claim was ${inr(open.claimedAmount)}.`}
                    required
                  >
                    {(id) => (
                      <Input
                        id={id}
                        type="number"
                        min={0}
                        max={depositHeld}
                        value={award}
                        onChange={(e) => {
                          setAward(e.target.value)
                          setError('')
                        }}
                      />
                    )}
                  </Field>

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {[
                      { label: 'Full claim', value: open.claimedAmount },
                      { label: 'Half', value: Math.round(open.claimedAmount / 2) },
                      { label: 'Nothing', value: 0 },
                    ].map((preset) => (
                      <Button
                        key={preset.label}
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setAward(String(preset.value))
                          setError('')
                        }}
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>

                  <Field
                    label="Reasoning shown to both students"
                    hint="Reference the condition reports and the photos."
                    required
                    className="mt-4"
                  >
                    {(id) => (
                      <Textarea
                        id={id}
                        rows={3}
                        value={note}
                        onChange={(e) => {
                          setNote(e.target.value)
                          setError('')
                        }}
                        placeholder="The AFTER report shows a scratch on the lens barrel that the BEFORE checklist marked as clean. Repair quote covers…"
                      />
                    )}
                  </Field>

                  {error && (
                    <p
                      role="alert"
                      className="mt-2 text-xs font-medium text-destructive"
                    >
                      {error}
                    </p>
                  )}

                  <div className="mt-3 space-y-0.5 border-t border-border pt-3">
                    <DataRow label="Deposit held" value={inr(depositHeld)} />
                    <DataRow
                      label="Proposed deduction"
                      value={`− ${inr(Math.min(depositHeld, Math.round(Number(award) || 0)))}`}
                      tone="danger"
                    />
                    <DataRow
                      label="Returns to the borrower"
                      value={inr(Math.max(0, depositHeld - Math.round(Number(award) || 0)))}
                      strong
                      tone="primary"
                    />
                  </div>

                  <p className="mt-3 text-2xs leading-relaxed text-muted-foreground">
                    Upholding a claim records the deduction against the exchange and takes points off
                    the borrower's trust score. Rejecting closes it with no penalty either way.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </Dialog>
    </PageTransition>
  )
}
