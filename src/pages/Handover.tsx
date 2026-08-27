import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Handshake,
  MapPin,
  MessageSquare,
  QrCode,
  ShieldCheck,
  Wallet,
} from 'lucide-react'
import { isBeyond, useStore } from '@/store/AppStore'
import { fmtDateTime, inr, relativeDeadline } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, SectionTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { BORROW_FLOW_STEPS, FlowSteps, Page, PageHeader } from '@/components/layout/PageShell'
import { Reveal } from '@/components/common/Motion'
import { ResourceImage } from '@/components/common/ResourceImage'
import { Avatar } from '@/components/common/Avatar'
import { TrustBadge } from '@/components/common/Trust'
import { ConditionRecorder, emptyDraft, type ConditionDraft } from '@/components/common/ConditionRecorder'
import { ConditionComparison } from '@/components/common/ConditionComparison'
import { DataRow } from '@/components/common/StatCard'
import { NotFoundPage } from './NotFound'

export function HandoverPage() {
  const { id = '' } = useParams()
  const { getBorrowing, getResource, getUser, getReport, confirmHandover } = useStore()
  const { toast } = useToast()
  const navigate = useNavigate()

  const borrowing = getBorrowing(id)
  const resource = borrowing ? getResource(borrowing.resourceId) : undefined
  const owner = borrowing ? getUser(borrowing.ownerId) : undefined

  const [draft, setDraft] = useState<ConditionDraft>(() =>
    resource ? emptyDraft(resource.category, resource.condition) : emptyDraft('Electronics', 'Good'),
  )
  const [met, setMet] = useState(false)
  const [checked, setChecked] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  if (!borrowing || !resource || !owner) return <NotFoundPage />

  const paid = borrowing.transactionIds.length > 0
  const complete = isBeyond(borrowing.status, 'handover')
  const before = getReport(borrowing.beforeReportId)
  const ready = met && checked && paid

  const confirm = () => {
    if (!ready || submitting) return
    setSubmitting(true)
    window.setTimeout(() => {
      confirmHandover(borrowing.id, draft)
      toast({
        title: 'Handover confirmed',
        description: `${resource.name} is yours until ${fmtDateTime(borrowing.dueDate)}.`,
        tone: 'success',
      })
      navigate(`/borrowings/${borrowing.id}`)
    }, 600)
  }

  return (
    <Page width="form">
      <PageHeader
        back={{ to: `/borrowings/${borrowing.id}`, label: 'Back to exchange' }}
        eyebrow={<FlowSteps steps={BORROW_FLOW_STEPS} current={3} />}
        title={complete ? 'Handover recorded' : 'Meet and record the condition'}
        subtitle={
          complete
            ? 'The BEFORE report below is the reference the return inspection is compared against.'
            : 'Go through the resource together, tick off what is fine, flag what is not. This is the record both sides are held to.'
        }
        actions={
          <Badge variant={complete ? 'success' : 'outline'} size="sm">
            <Handshake className="size-3" />
            {complete ? 'Condition on file' : 'Step 4 of 8'}
          </Badge>
        }
      />

      {!paid && (
        <Reveal>
          <Card className="mb-6 border-warning/25 bg-warning-soft">
            <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-5">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-[0.9375rem] font-semibold text-warning">
                  <Wallet className="size-4" />
                  Payment is still pending
                </p>
                <p className="mt-1 text-[0.8125rem] leading-relaxed text-warning/90">
                  The owner will not hand the resource over until{' '}
                  {inr(borrowing.charges.total)} is paid and the deposit is held.
                </p>
              </div>
              <Link
                to={`/borrowings/${borrowing.id}/payment`}
                className={cn(buttonVariants({ size: 'sm' }))}
              >
                Pay now
                <ArrowRight />
              </Link>
            </CardContent>
          </Card>
        </Reveal>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          {/* Meeting point */}
          <Reveal>
            <Card>
              <CardContent className="pt-5">
                <SectionTitle title="Meeting point" hint="Agreed when the request was accepted" />
                <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2">
                  <div className="bg-card p-4">
                    <p className="flex items-center gap-2 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <CalendarClock className="size-3.5" />
                      When
                    </p>
                    <p className="mt-1.5 text-[0.875rem] font-semibold">
                      {fmtDateTime(borrowing.pickupTime)}
                    </p>
                    <p className="text-2xs text-muted-foreground">
                      Return by {fmtDateTime(borrowing.dueDate)} · {relativeDeadline(borrowing.dueDate)}
                    </p>
                  </div>
                  <div className="bg-card p-4">
                    <p className="flex items-center gap-2 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <MapPin className="size-3.5" />
                      Where
                    </p>
                    <p className="mt-1.5 text-[0.875rem] font-semibold">{borrowing.pickupLocation}</p>
                    <p className="text-2xs text-muted-foreground">
                      {owner.location} · look for {owner.name.split(' ')[0]}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      toast({
                        title: `Message sent to ${owner.name.split(' ')[0]}`,
                        description: 'In the real app this opens the in-app chat thread.',
                        tone: 'info',
                      })
                    }
                  >
                    <MessageSquare />
                    Message {owner.name.split(' ')[0]}
                  </Button>
                  <Badge variant="outline" size="sm">
                    <QrCode className="size-3" />
                    Exchange code {borrowing.id.slice(-4).toUpperCase()}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </Reveal>

          {/* Condition */}
          <Reveal delay={0.05}>
            <Card>
              <CardContent className="pt-5">
                {complete && before ? (
                  <>
                    <SectionTitle
                      title="Condition on file"
                      hint={`Recorded ${fmtDateTime(before.createdAt)}`}
                    />
                    <ConditionComparison before={before} />
                  </>
                ) : (
                  <ConditionRecorder draft={draft} onChange={setDraft} phase="before" />
                )}
              </CardContent>
            </Card>
          </Reveal>

          {!complete && (
            <Reveal delay={0.1}>
              <Card>
                <CardContent className="space-y-3.5 pt-5">
                  <SectionTitle title="Confirm the handover" hint="Both boxes are required" />
                  <Checkbox
                    checked={met}
                    onChange={setMet}
                    label={`I have met ${owner.name.split(' ')[0]} and received ${resource.name}`}
                    description={`Including: ${resource.accessories.join(', ')}.`}
                  />
                  <Checkbox
                    checked={checked}
                    onChange={setChecked}
                    label="The condition above is accurate and we both checked it together"
                    description="This record decides any damage claim later, so it protects you as much as the owner."
                  />
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
                    <Link
                      to={`/resource/${resource.id}`}
                      className="block truncate text-[0.875rem] font-semibold hover:text-primary"
                    >
                      {resource.name}
                    </Link>
                    <p className="mt-0.5 text-2xs text-muted-foreground">
                      Listed as {resource.condition}
                    </p>
                    <p className="num text-2xs text-muted-foreground">
                      {borrowing.charges.days} day
                      {borrowing.charges.days > 1 ? 's' : ''} · {inr(borrowing.charges.borrowCharge)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2.5 border-t border-border pt-4">
                  <Avatar user={owner} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.8125rem] font-medium">{owner.name}</p>
                    <p className="truncate text-2xs text-muted-foreground">
                      {owner.department} · {owner.onTimeRate}% on time
                    </p>
                  </div>
                  <TrustBadge user={owner} />
                </div>

                <div className="mt-4 space-y-0.5 border-t border-border pt-4">
                  <DataRow label="Paid" value={paid ? inr(borrowing.charges.total) : 'Pending'} tone={paid ? 'default' : 'danger'} />
                  <DataRow
                    label="Deposit held"
                    value={inr(borrowing.charges.deposit)}
                    tone="primary"
                    hint="Returned after inspection"
                  />
                </div>

                {complete ? (
                  <Button
                    className="mt-5 w-full"
                    size="lg"
                    onClick={() => navigate(`/borrowings/${borrowing.id}`)}
                  >
                    <CheckCircle2 />
                    View exchange
                    <ArrowRight />
                  </Button>
                ) : (
                  <>
                    <Button
                      className="mt-5 w-full"
                      size="lg"
                      disabled={!ready}
                      loading={submitting}
                      onClick={confirm}
                    >
                      <Handshake />
                      Confirm handover
                    </Button>
                    {!ready && paid && (
                      <p className="mt-2 text-center text-2xs text-muted-foreground">
                        Tick both confirmations to continue.
                      </p>
                    )}
                  </>
                )}

                <p className="mt-4 flex items-start gap-1.5 rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-2xs leading-relaxed text-muted-foreground">
                  <ShieldCheck className="mt-px size-3 shrink-0 text-primary" />
                  Once you confirm, the resource is marked as borrowed on campus and the return
                  countdown starts.
                </p>
              </CardContent>
            </Card>
          </Reveal>
        </div>
      </div>
    </Page>
  )
}
