import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Info,
  Scale,
  ShieldAlert,
} from 'lucide-react'
import { isBeyond, useStore } from '@/store/AppStore'
import { DAMAGE_REASONS } from '@/services/checklists'
import { computeLateFee, computeSettlement } from '@/services/pricing'
import { fmtDateTime, inr } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, SectionTitle } from '@/components/ui/card'
import { Field, Input, Select, Switch, Textarea } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { BORROW_FLOW_STEPS, FlowSteps, Page, PageHeader } from '@/components/layout/PageShell'
import { Reveal } from '@/components/common/Motion'
import { ResourceImage } from '@/components/common/ResourceImage'
import { Avatar } from '@/components/common/Avatar'
import { PhotoUpload } from '@/components/common/PhotoUpload'
import { ConditionComparison } from '@/components/common/ConditionComparison'
import { ConditionRecorder, emptyDraft } from '@/components/common/ConditionRecorder'
import { SettlementBreakdown } from '@/components/common/ChargeBreakdown'
import { DataRow } from '@/components/common/StatCard'
import { NotFoundPage } from './NotFound'

export function InspectionPage() {
  const { id = '' } = useParams()
  const { getBorrowing, getResource, getUser, getReport, completeInspection } = useStore()
  const { toast } = useToast()
  const navigate = useNavigate()

  const borrowing = getBorrowing(id)
  const resource = borrowing ? getResource(borrowing.resourceId) : undefined
  const borrower = borrowing ? getUser(borrowing.borrowerId) : undefined
  const owner = borrowing ? getUser(borrowing.ownerId) : undefined

  const before = getReport(borrowing?.beforeReportId)
  const [draft, setDraft] = useState(() =>
    emptyDraft(resource?.category ?? 'Electronics', before?.overall ?? resource?.condition ?? 'Good'),
  )
  const [claiming, setClaiming] = useState(false)
  const [reason, setReason] = useState<string>(DAMAGE_REASONS[0])
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [evidence, setEvidence] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  const flagged = useMemo(() => draft.checklist.filter((c) => !c.ok), [draft.checklist])

  if (!borrowing || !resource || !borrower || !owner) return <NotFoundPage />

  const done = isBeyond(borrowing.status, 'inspection')
  const after = getReport(borrowing.afterReportId)
  const claimAmount = Math.max(0, Math.min(Number(amount) || 0, borrowing.charges.deposit))
  const { hoursLate, lateFee } = computeLateFee(
    resource.pricePerDay,
    borrowing.dueDate,
    borrowing.returnedAt ?? new Date().toISOString(),
  )
  const preview = computeSettlement({
    deposit: borrowing.charges.deposit,
    damageDeduction: claiming ? claimAmount : 0,
    lateFee,
    hoursLate,
  })
  const ready = !claiming || (claimAmount > 0 && description.trim().length >= 10)

  const submit = () => {
    if (!ready || submitting) return
    setSubmitting(true)
    window.setTimeout(() => {
      completeInspection(borrowing.id, {
        report: draft,
        damage:
          claiming && claimAmount > 0
            ? { reason, description: description.trim(), amount: claimAmount, evidence }
            : undefined,
      })
      toast({
        title: claiming && claimAmount > 0 ? 'Damage claim raised' : 'Inspection passed',
        description:
          claiming && claimAmount > 0
            ? `${inr(claimAmount)} claimed. An admin reviews the evidence before anything is deducted.`
            : 'No damage found — the deposit can be refunded in full.',
        tone: claiming && claimAmount > 0 ? 'warning' : 'success',
      })
      navigate(`/borrowings/${borrowing.id}/settlement`)
    }, 700)
  }

  if (done) {
    return (
      <Page width="form">
        <PageHeader
          back={{ to: `/borrowings/${borrowing.id}`, label: 'Back to exchange' }}
          eyebrow={<FlowSteps steps={BORROW_FLOW_STEPS} current={5} />}
          title="Inspection complete"
          subtitle={`${resource.name} was already checked against the handover record.`}
        />
        <Card>
          <CardContent className="pt-5">
            <ConditionComparison before={before} after={after} />
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                to={`/borrowings/${borrowing.id}/settlement`}
                className={cn(buttonVariants())}
              >
                Go to settlement
                <ArrowRight />
              </Link>
              <Link
                to={`/borrowings/${borrowing.id}`}
                className={cn(buttonVariants({ variant: 'outline' }))}
              >
                View exchange
              </Link>
            </div>
          </CardContent>
        </Card>
      </Page>
    )
  }

  return (
    <Page width="form">
      <PageHeader
        back={{ to: `/borrowings/${borrowing.id}`, label: 'Back to exchange' }}
        eyebrow={<FlowSteps steps={BORROW_FLOW_STEPS} current={5} />}
        title="Condition inspection"
        subtitle={`Check ${resource.name} against what was recorded at handover. This is what decides how much of the ${inr(borrowing.charges.deposit)} deposit comes back.`}
        actions={
          <Badge variant="outline" size="sm">
            <ClipboardCheck className="size-3" />
            Owner step
          </Badge>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          {/* Handover reference */}
          {before && (
            <Reveal>
              <Card>
                <CardContent className="pt-5">
                  <SectionTitle
                    title="Handover record"
                    hint={`Graded ${before.overall} · ${before.images.length} photos`}
                  />
                  <ConditionComparison before={before} />
                </CardContent>
              </Card>
            </Reveal>
          )}

          {/* After report */}
          <Reveal delay={0.05}>
            <Card>
              <CardContent className="pt-5">
                <ConditionRecorder draft={draft} onChange={setDraft} phase="after" />
              </CardContent>
            </Card>
          </Reveal>

          {/* Damage claim */}
          <Reveal delay={0.08}>
            <Card className={cn(claiming && 'border-destructive/30')}>
              <CardContent className="pt-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-[0.9375rem] font-semibold">
                      <ShieldAlert
                        className={cn('size-4', claiming ? 'text-destructive' : 'text-muted-foreground')}
                      />
                      Report damage
                    </p>
                    <p className="mt-1 text-[0.8125rem] leading-relaxed text-muted-foreground">
                      Only raise this if the resource came back worse than the handover record. An
                      admin decides the final amount — you do not deduct it yourself.
                    </p>
                  </div>
                  <Switch
                    checked={claiming}
                    onChange={setClaiming}
                    ariaLabel="Report damage on this return"
                  />
                </div>

                {flagged.length > 0 && !claiming && (
                  <p className="mt-3.5 flex items-start gap-1.5 rounded-lg border border-warning/25 bg-warning-soft px-3 py-2.5 text-2xs leading-relaxed text-warning">
                    <AlertTriangle className="mt-px size-3.5 shrink-0" />
                    You flagged {flagged.length} issue{flagged.length > 1 ? 's' : ''} above. If any of
                    them cost money to fix, raise a claim so it goes on record.
                  </p>
                )}

                {claiming && (
                  <div className="mt-4 space-y-4 border-t border-border pt-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="What went wrong">
                        {(fieldId) => (
                          <Select
                            id={fieldId}
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                          >
                            {DAMAGE_REASONS.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </Select>
                        )}
                      </Field>
                      <Field
                        label="Amount claimed"
                        hint={`Capped at the ${inr(borrowing.charges.deposit)} deposit`}
                      >
                        {(fieldId) => (
                          <Input
                            id={fieldId}
                            type="number"
                            min={0}
                            max={borrowing.charges.deposit}
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="e.g. 400"
                          />
                        )}
                      </Field>
                    </div>

                    <Field
                      label="Describe the damage"
                      hint="At least a sentence — the admin only sees what you write here."
                    >
                      {(fieldId) => (
                        <Textarea
                          id={fieldId}
                          rows={3}
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="The lens cap is missing and there is a fresh scratch across the barrel that was not there at handover."
                        />
                      )}
                    </Field>

                    <PhotoUpload
                      images={evidence}
                      onChange={setEvidence}
                      label="Damage evidence"
                      tone="danger"
                      emptyTitle="Add photos of the damage"
                      emptyMessage="Claims with photos next to the handover record get resolved much faster."
                    />

                    <p className="flex items-start gap-1.5 rounded-lg bg-muted/60 px-3 py-2.5 text-2xs leading-relaxed text-muted-foreground">
                      <Scale className="mt-px size-3.5 shrink-0" />
                      Raising a claim opens a dispute. The deposit is held until an admin reviews both
                      condition reports and sets the final deduction.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </Reveal>
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
                    <p className="mt-0.5 text-2xs text-muted-foreground">
                      Listed as {resource.condition}
                    </p>
                    <p className="num text-2xs text-muted-foreground">
                      Returned {fmtDateTime(borrowing.returnedAt ?? new Date().toISOString())}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2.5 border-t border-border pt-4">
                  <Avatar user={borrower} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.8125rem] font-medium">
                      Returned by {borrower.name}
                    </p>
                    <p className="num truncate text-2xs text-muted-foreground">
                      {borrower.successfulExchanges} exchanges · {borrower.onTimeRate}% on time
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Reveal>

          <Reveal delay={0.08}>
            <Card>
              <CardContent className="pt-5">
                <SectionTitle title="Deposit preview" hint="Updates as you fill this in" />
                <SettlementBreakdown settlement={preview} showFormula={false} />
                <div className="mt-3 space-y-0.5 border-t border-border pt-3">
                  <DataRow
                    label="Owner receives"
                    value={inr(borrowing.charges.borrowCharge + preview.lateFee + preview.damageDeduction)}
                    hint="Borrowing charge plus any confirmed deductions"
                  />
                </div>
                <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-muted/60 px-2.5 py-2 text-2xs leading-relaxed text-muted-foreground">
                  <Info className="mt-px size-3.5 shrink-0" />
                  {claiming && claimAmount > 0
                    ? 'This is the amount you are asking for. An admin can approve, reduce or reject it.'
                    : 'Nothing claimed, so the full deposit goes back after the late fee, if any.'}
                </p>

                <Button
                  className="mt-5 w-full"
                  size="lg"
                  variant={claiming && claimAmount > 0 ? 'destructive' : 'primary'}
                  disabled={!ready}
                  loading={submitting}
                  onClick={submit}
                >
                  {claiming && claimAmount > 0 ? (
                    <>
                      <ShieldAlert />
                      Raise claim for {inr(claimAmount)}
                    </>
                  ) : (
                    <>
                      <CheckCircle2 />
                      Pass inspection
                    </>
                  )}
                </Button>
                {!ready && (
                  <p className="mt-2 text-center text-2xs text-muted-foreground">
                    Add an amount and a description to raise a claim.
                  </p>
                )}
              </CardContent>
            </Card>
          </Reveal>
        </div>
      </div>
    </Page>
  )
}
