import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  Clock,
  Loader2,
  Scale,
  ShieldCheck,
  Star,
  Wallet,
} from 'lucide-react'
import type { Settlement } from '@/types'
import { useStore } from '@/store/AppStore'
import { computeLateFee, computeSettlement, ownerPayout } from '@/services/pricing'
import { fmtDateTime, inr } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, SectionTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import { BORROW_FLOW_STEPS, FlowSteps, Page, PageHeader } from '@/components/layout/PageShell'
import { Reveal } from '@/components/common/Motion'
import { ResourceImage } from '@/components/common/ResourceImage'
import { Avatar } from '@/components/common/Avatar'
import { SettlementBreakdown } from '@/components/common/ChargeBreakdown'
import { ConditionComparison } from '@/components/common/ConditionComparison'
import { DataRow } from '@/components/common/StatCard'
import { DisputeBadge } from '@/components/common/StatusBadge'
import { NotFoundPage } from './NotFound'

const STEPS = ['Comparing condition reports', 'Applying late fee and deductions', 'Releasing the deposit']

export function SettlementPage() {
  const { id = '' } = useParams()
  const { getBorrowing, getResource, getUser, getReport, getDispute, settle } = useStore()
  const { toast } = useToast()
  const reduce = useReducedMotion()

  const borrowing = getBorrowing(id)
  const resource = borrowing ? getResource(borrowing.resourceId) : undefined
  const owner = borrowing ? getUser(borrowing.ownerId) : undefined

  const [step, setStep] = useState(-1)
  const [result, setResult] = useState<Settlement | undefined>(borrowing?.settlement)
  const timers = useRef<number[]>([])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  if (!borrowing || !resource || !owner) return <NotFoundPage />

  const before = getReport(borrowing.beforeReportId)
  const after = getReport(borrowing.afterReportId)
  const dispute = getDispute(borrowing.disputeId)
  const settled = result ?? borrowing.settlement

  const { hoursLate, lateFee } = computeLateFee(
    resource.pricePerDay,
    borrowing.dueDate,
    borrowing.returnedAt ?? new Date().toISOString(),
  )
  const damageDeduction =
    dispute?.status === 'resolved' ? (dispute.resolvedAmount ?? 0) : (dispute?.claimedAmount ?? 0)
  const preview =
    settled ??
    computeSettlement({ deposit: borrowing.charges.deposit, damageDeduction, lateFee, hoursLate })

  const running = step >= 0
  const payout = ownerPayout(borrowing.charges.borrowCharge, preview.lateFee, preview.damageDeduction)

  const release = () => {
    if (settled || running) return
    setStep(0)
    const tick = reduce ? 130 : 560
    STEPS.forEach((_, i) => {
      if (i === 0) return
      timers.current.push(window.setTimeout(() => setStep(i), i * tick))
    })
    timers.current.push(
      window.setTimeout(() => {
        const s = settle(borrowing.id)
        setStep(-1)
        if (!s) return
        setResult(s)
        toast({
          title: `${inr(s.refund)} refunded to your wallet`,
          description:
            s.refund === s.deposit
              ? 'Full deposit released — nothing was deducted.'
              : `${inr(s.deposit - s.refund)} was deducted and paid to the owner.`,
          tone: 'success',
        })
      }, STEPS.length * tick),
    )
  }

  return (
    <Page width="form">
      <PageHeader
        back={{ to: `/borrowings/${borrowing.id}`, label: 'Back to exchange' }}
        eyebrow={<FlowSteps steps={BORROW_FLOW_STEPS} current={6} />}
        title="Deposit settlement"
        subtitle="Security Deposit − Damage Deduction − Late Fee = Refund. Every number below comes from the condition reports and the return time."
        actions={dispute && <DisputeBadge status={dispute.status} />}
      />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          {dispute?.status === 'under_review' && !settled && (
            <Reveal>
              <Card className="border-warning/30 bg-warning-soft">
                <CardContent className="pt-5">
                  <p className="flex items-center gap-2 text-[0.9375rem] font-semibold text-warning">
                    <Scale className="size-4" />
                    A damage claim is under review
                  </p>
                  <p className="mt-1 text-[0.8125rem] leading-relaxed text-warning/90">
                    {inr(dispute.claimedAmount)} is claimed for “{dispute.reason}”. Settling now holds
                    that amount back. An admin can approve, reduce or reject the claim first.
                  </p>
                  <Link
                    to="/admin/disputes"
                    className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'mt-3.5')}
                  >
                    Open in admin review
                    <ArrowRight />
                  </Link>
                </CardContent>
              </Card>
            </Reveal>
          )}

          <Reveal delay={0.04}>
            <Card>
              <CardContent className="pt-5">
                <AnimatePresence mode="wait" initial={false}>
                  {settled ? (
                    <motion.div
                      key="done"
                      initial={{ opacity: 0, y: reduce ? 0 : 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.28 }}
                    >
                      <div className="flex flex-col items-center pb-5 pt-2 text-center">
                        <span className="relative inline-flex size-14 items-center justify-center rounded-full bg-primary-soft text-primary">
                          <span className="animate-pulse-ring absolute inset-0 rounded-full border border-primary/40" />
                          <BadgeCheck className="size-7" />
                        </span>
                        <p className="mt-3.5 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Refunded to your campus wallet
                        </p>
                        <p className="num mt-1 text-3xl font-semibold tracking-tight">
                          {inr(settled.refund)}
                        </p>
                        <p className="mt-1.5 max-w-sm text-[0.8125rem] leading-relaxed text-muted-foreground">
                          {settled.refund === settled.deposit
                            ? `The full ${inr(settled.deposit)} deposit came back — returned on time and undamaged.`
                            : `${inr(settled.deposit - settled.refund)} of the ${inr(settled.deposit)} deposit was deducted and paid to ${owner.name.split(' ')[0]}.`}
                        </p>
                        <Badge variant="outline" size="sm" className="mt-3">
                          Settled {fmtDateTime(settled.settledAt)}
                        </Badge>
                      </div>

                      <div className="border-t border-border pt-5">
                        <SectionTitle title="How that was calculated" />
                        <SettlementBreakdown settlement={settled} />
                      </div>

                      <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-5">
                        <Link
                          to={`/borrowings/${borrowing.id}/rating`}
                          className={cn(buttonVariants({ size: 'lg' }))}
                        >
                          <Star />
                          Rate this exchange
                        </Link>
                        <Link
                          to={`/borrowings/${borrowing.id}`}
                          className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}
                        >
                          View exchange
                        </Link>
                      </div>
                    </motion.div>
                  ) : running ? (
                    <motion.ul
                      key="running"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-3 py-6"
                    >
                      {STEPS.map((label, i) => {
                        const isDone = i < step
                        const isNow = i === step
                        return (
                          <li key={label} className="flex items-center gap-3">
                            <span
                              className={cn(
                                'inline-flex size-7 shrink-0 items-center justify-center rounded-full border transition-colors duration-200',
                                isDone && 'border-primary bg-primary text-primary-foreground',
                                isNow && 'border-primary text-primary',
                                !isDone && !isNow && 'border-border text-muted-foreground',
                              )}
                            >
                              {isDone ? (
                                <ShieldCheck className="size-3.5" />
                              ) : isNow ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <span className="num text-2xs">{i + 1}</span>
                              )}
                            </span>
                            <span
                              className={cn(
                                'text-[0.875rem]',
                                isDone || isNow
                                  ? 'font-medium text-foreground'
                                  : 'text-muted-foreground',
                              )}
                            >
                              {label}
                            </span>
                          </li>
                        )
                      })}
                    </motion.ul>
                  ) : (
                    <motion.div
                      key="preview"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <SectionTitle
                        title="What you will get back"
                        hint="Nothing has moved yet — this is the calculation"
                      />
                      <SettlementBreakdown settlement={preview} />
                      <Button className="mt-5 w-full" size="lg" onClick={release}>
                        <Wallet />
                        Release {inr(preview.refund)} deposit
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </Reveal>

          {(before || after) && (
            <Reveal delay={0.08}>
              <Card>
                <CardContent className="pt-5">
                  <SectionTitle
                    title="Evidence this settlement is based on"
                    hint="Handover and return, side by side"
                  />
                  <ConditionComparison before={before} after={after} />
                </CardContent>
              </Card>
            </Reveal>
          )}
        </div>

        {/* Rail */}
        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Reveal delay={0.05}>
            <Card>
              <CardContent className="pt-5">
                <div className="flex gap-3">
                  <ResourceImage
                    resource={resource}
                    className="size-16 shrink-0"
                    rounded="rounded-xl"
                    iconClassName="size-5"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-[0.875rem] font-semibold">{resource.name}</p>
                    <p className="mt-0.5 text-2xs text-muted-foreground">{borrowing.purpose}</p>
                    <p className="num text-2xs text-muted-foreground">
                      {borrowing.charges.days} day{borrowing.charges.days > 1 ? 's' : ''} ·{' '}
                      {inr(borrowing.charges.total)} paid
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-0.5 border-t border-border pt-4">
                  <DataRow
                    label="Returned"
                    value={fmtDateTime(borrowing.returnedAt ?? borrowing.dueDate)}
                  />
                  <DataRow
                    label="Against deadline"
                    value={preview.hoursLate > 0 ? `${preview.hoursLate}h late` : 'On time'}
                    tone={preview.hoursLate > 0 ? 'danger' : 'primary'}
                  />
                </div>
              </CardContent>
            </Card>
          </Reveal>

          <Reveal delay={0.08}>
            <Card>
              <CardContent className="pt-5">
                <SectionTitle title="Owner side" hint="What the exchange earned" />
                <div className="flex items-center gap-2.5">
                  <Avatar user={owner} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.8125rem] font-medium">{owner.name}</p>
                    <p className="truncate text-2xs text-muted-foreground">{owner.location}</p>
                  </div>
                </div>
                <div className="mt-4 space-y-0.5 border-t border-border pt-4">
                  <DataRow label="Borrowing charge" value={inr(borrowing.charges.borrowCharge)} />
                  <DataRow
                    label="Late fee recovered"
                    value={preview.lateFee > 0 ? inr(preview.lateFee) : inr(0)}
                    tone={preview.lateFee > 0 ? 'primary' : 'muted'}
                  />
                  <DataRow
                    label="Damage compensation"
                    value={preview.damageDeduction > 0 ? inr(preview.damageDeduction) : inr(0)}
                    tone={preview.damageDeduction > 0 ? 'primary' : 'muted'}
                  />
                  <div className="mt-1 border-t border-border pt-1">
                    <DataRow label="Owner payout" value={inr(payout)} strong />
                  </div>
                </div>
                <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-muted/60 px-2.5 py-2 text-2xs leading-relaxed text-muted-foreground">
                  <Banknote className="mt-px size-3.5 shrink-0" />
                  The {inr(borrowing.charges.platformFee)} platform fee is the only non-refundable part
                  of what you paid.
                </p>
              </CardContent>
            </Card>
          </Reveal>

          {!settled && (
            <Reveal delay={0.1}>
              <p className="flex items-start gap-1.5 rounded-xl border border-border bg-card px-3.5 py-3 text-2xs leading-relaxed text-muted-foreground">
                <Clock className="mt-px size-3.5 shrink-0" />
                In a real deployment this runs automatically within 24 hours of a passed inspection.
                Here you trigger it so the whole flow stays visible.
              </p>
            </Reveal>
          )}
        </div>
      </div>
    </Page>
  )
}
