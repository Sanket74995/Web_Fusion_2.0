import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  MapPin,
  PackageCheck,
  Undo2,
} from 'lucide-react'
import { isBeyond, useStore } from '@/store/AppStore'
import { computeLateFee, LATE_FEE_DAY_RATE } from '@/services/pricing'
import { addDays, fmtDateTime, inr, relativeDeadline } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, SectionTitle } from '@/components/ui/card'
import { Checkbox, SegmentedControl } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { BORROW_FLOW_STEPS, FlowSteps, Page, PageHeader } from '@/components/layout/PageShell'
import { Reveal } from '@/components/common/Motion'
import { ResourceImage } from '@/components/common/ResourceImage'
import { Avatar } from '@/components/common/Avatar'
import { PhotoUpload } from '@/components/common/PhotoUpload'
import { ConditionComparison } from '@/components/common/ConditionComparison'
import { DataRow } from '@/components/common/StatCard'
import { NotFoundPage } from './NotFound'

type Timing = 'now' | 'late'

export function ReturnPage() {
  const { id = '' } = useParams()
  const { getBorrowing, getResource, getUser, getReport, confirmReturn } = useStore()
  const { toast } = useToast()
  const navigate = useNavigate()

  const borrowing = getBorrowing(id)
  const resource = borrowing ? getResource(borrowing.resourceId) : undefined
  const owner = borrowing ? getUser(borrowing.ownerId) : undefined

  const [timing, setTiming] = useState<Timing>('now')
  const [evidence, setEvidence] = useState<string[]>([])
  const [accessories, setAccessories] = useState(false)
  const [handed, setHanded] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const returnedAt = useMemo(
    () =>
      timing === 'late'
        ? addDays(borrowing?.dueDate ?? new Date(), 2).toISOString()
        : new Date().toISOString(),
    [timing, borrowing?.dueDate],
  )

  if (!borrowing || !resource || !owner) return <NotFoundPage />

  const done = isBeyond(borrowing.status, 'returned')
  const before = getReport(borrowing.beforeReportId)
  const perDay = Math.round(resource.pricePerDay * LATE_FEE_DAY_RATE)
  const { lateFee, hoursLate } = computeLateFee(resource.pricePerDay, borrowing.dueDate, returnedAt)
  const projectedRefund = Math.max(0, borrowing.charges.deposit - lateFee)
  const ready = accessories && handed

  const submit = () => {
    if (!ready || submitting) return
    setSubmitting(true)
    window.setTimeout(() => {
      confirmReturn(borrowing.id, { evidence, returnedAt })
      toast({
        title: lateFee > 0 ? `Returned late — ${inr(lateFee)} late fee` : 'Returned on time',
        description: `${owner.name.split(' ')[0]} will inspect ${resource.name} against the handover record.`,
        tone: lateFee > 0 ? 'warning' : 'success',
      })
      navigate(`/borrowings/${borrowing.id}/inspection`)
    }, 650)
  }

  if (done) {
    return (
      <Page width="form">
        <PageHeader
          back={{ to: `/borrowings/${borrowing.id}`, label: 'Back to exchange' }}
          eyebrow={<FlowSteps steps={BORROW_FLOW_STEPS} current={4} />}
          title="Already returned"
          subtitle={`${resource.name} went back to ${owner.name.split(' ')[0]} on ${fmtDateTime(borrowing.returnedAt ?? borrowing.dueDate)}.`}
        />
        <Card>
          <CardContent className="pt-5">
            <div className="flex flex-col items-center py-4 text-center">
              <span className="inline-flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary">
                <CheckCircle2 className="size-6" />
              </span>
              <p className="mt-3 text-[0.9375rem] font-semibold">Return recorded</p>
              <p className="mt-1 max-w-sm text-[0.8125rem] leading-relaxed text-muted-foreground">
                The next step is the condition inspection, where the owner compares the resource
                against the handover record.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <Link
                  to={`/borrowings/${borrowing.id}/inspection`}
                  className={cn(buttonVariants())}
                >
                  Go to inspection
                  <ArrowRight />
                </Link>
                <Link
                  to={`/borrowings/${borrowing.id}`}
                  className={cn(buttonVariants({ variant: 'outline' }))}
                >
                  View exchange
                </Link>
              </div>
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
        eyebrow={<FlowSteps steps={BORROW_FLOW_STEPS} current={4} />}
        title={`Return ${resource.name}`}
        subtitle={`Hand it back to ${owner.name.split(' ')[0]} with everything it came with. Photos here protect you if a damage claim comes up.`}
        actions={
          <Badge variant={borrowing.status === 'return_due' ? 'danger' : 'outline'} size="sm">
            <Clock className="size-3" />
            {relativeDeadline(borrowing.dueDate)}
          </Badge>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          {/* Deadline */}
          <Reveal>
            <Card
              className={cn(
                borrowing.status === 'return_due'
                  ? 'border-warning/30 bg-warning-soft'
                  : 'border-primary/25 bg-primary-soft/40',
              )}
            >
              <CardContent className="pt-5">
                <p
                  className={cn(
                    'flex items-center gap-2 text-[0.9375rem] font-semibold',
                    borrowing.status === 'return_due' ? 'text-warning' : 'text-primary',
                  )}
                >
                  {borrowing.status === 'return_due' ? (
                    <AlertTriangle className="size-4" />
                  ) : (
                    <Clock className="size-4" />
                  )}
                  Due {fmtDateTime(borrowing.dueDate)}
                </p>
                <p className="mt-1 text-[0.8125rem] leading-relaxed text-muted-foreground">
                  {borrowing.status === 'return_due'
                    ? `The deadline has passed. Every started day costs ${inr(perDay)} from your deposit.`
                    : `Return on time and the full ${inr(borrowing.charges.deposit)} deposit comes back to you.`}
                </p>
                <div className="mt-3.5 flex items-center gap-2 border-t border-current/10 pt-3.5 text-2xs text-muted-foreground">
                  <MapPin className="size-3.5" />
                  Drop off at {borrowing.pickupLocation} · {owner.location}
                </div>
              </CardContent>
            </Card>
          </Reveal>

          {/* Return timing — demo control */}
          <Reveal delay={0.05}>
            <Card>
              <CardContent className="pt-5">
                <SectionTitle
                  title="When are you returning it?"
                  hint="Switch to a late return to see the late-fee maths"
                  action={
                    <Badge variant="outline" size="sm">
                      Demo control
                    </Badge>
                  }
                />
                <SegmentedControl
                  value={timing}
                  onChange={setTiming}
                  ariaLabel="Return timing"
                  options={[
                    { value: 'now', label: 'Returning now' },
                    { value: 'late', label: '2 days late' },
                  ]}
                />
                <div className="mt-4 space-y-0.5 rounded-xl border border-border bg-muted/40 p-4">
                  <DataRow label="Returned at" value={fmtDateTime(returnedAt)} />
                  <DataRow
                    label="Late by"
                    value={hoursLate > 0 ? `${hoursLate} hours` : 'On time'}
                    tone={hoursLate > 0 ? 'danger' : 'muted'}
                  />
                  <DataRow
                    label={`Late fee (${Math.round(LATE_FEE_DAY_RATE * 100)}% of ${inr(resource.pricePerDay)}/day)`}
                    value={lateFee > 0 ? `− ${inr(lateFee)}` : inr(0)}
                    tone={lateFee > 0 ? 'danger' : 'muted'}
                  />
                  <div className="mt-1 border-t border-border pt-1">
                    <DataRow
                      label="Deposit you should get back"
                      value={inr(projectedRefund)}
                      strong
                      tone="primary"
                      hint="Before any damage deduction"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Reveal>

          {/* Evidence */}
          <Reveal delay={0.1}>
            <Card>
              <CardContent className="pt-5">
                <SectionTitle
                  title="Return evidence"
                  hint="Your proof of the condition you handed it back in"
                />
                <PhotoUpload
                  images={evidence}
                  onChange={setEvidence}
                  label="Return photos"
                  emptyTitle="Photograph it before you hand it over"
                  emptyMessage="If the owner reports damage later, these photos are what the admin compares against the handover record."
                />
              </CardContent>
            </Card>
          </Reveal>

          {/* Handover record */}
          {before && (
            <Reveal delay={0.12}>
              <Card>
                <CardContent className="pt-5">
                  <SectionTitle
                    title="What was recorded at handover"
                    hint="Match this list before you return it"
                  />
                  <ConditionComparison before={before} />
                </CardContent>
              </Card>
            </Reveal>
          )}

          {/* Confirmations */}
          <Reveal delay={0.14}>
            <Card>
              <CardContent className="space-y-3.5 pt-5">
                <SectionTitle title="Confirm the return" hint="Both boxes are required" />
                <Checkbox
                  checked={accessories}
                  onChange={setAccessories}
                  label="Everything it came with is going back"
                  description={resource.accessories.join(', ')}
                />
                <Checkbox
                  checked={handed}
                  onChange={setHanded}
                  label={`I have handed ${resource.name} back to ${owner.name.split(' ')[0]}`}
                  description="The owner then inspects it and your deposit is settled."
                />
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
                    <p className="mt-0.5 text-2xs text-muted-foreground">{borrowing.purpose}</p>
                    <p className="num text-2xs text-muted-foreground">
                      Borrowed {borrowing.charges.days} day{borrowing.charges.days > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2.5 border-t border-border pt-4">
                  <Avatar user={owner} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.8125rem] font-medium">Returning to {owner.name}</p>
                    <p className="truncate text-2xs text-muted-foreground">{owner.location}</p>
                  </div>
                </div>

                <Button
                  className="mt-5 w-full"
                  size="lg"
                  disabled={!ready}
                  loading={submitting}
                  onClick={submit}
                >
                  <Undo2 />
                  Confirm return
                </Button>
                {!ready && (
                  <p className="mt-2 text-center text-2xs text-muted-foreground">
                    Tick both confirmations to continue.
                  </p>
                )}

                <p className="mt-4 flex items-start gap-1.5 rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-2xs leading-relaxed text-muted-foreground">
                  <PackageCheck className="mt-px size-3 shrink-0 text-primary" />
                  The resource becomes available on campus again the moment you confirm — someone
                  else can already book it.
                </p>
              </CardContent>
            </Card>
          </Reveal>
        </div>
      </div>
    </Page>
  )
}
