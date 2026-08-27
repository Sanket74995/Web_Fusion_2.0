import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowRight,
  BellRing,
  CheckCircle2,
  FileSignature,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from 'lucide-react'
import { isBeyond, useStore } from '@/store/AppStore'
import { LATE_FEE_DAY_RATE } from '@/services/pricing'
import { fmtDateFull, fmtDateTime, inr } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, SectionTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { ConfirmDialog } from '@/components/ui/dialog'
import { BORROW_FLOW_STEPS, FlowSteps, Page, PageHeader } from '@/components/layout/PageShell'
import { Reveal } from '@/components/common/Motion'
import { ResourceImage } from '@/components/common/ResourceImage'
import { Avatar } from '@/components/common/Avatar'
import { TrustBadge } from '@/components/common/Trust'
import { ChargeBreakdown } from '@/components/common/ChargeBreakdown'
import { StatusBadge } from '@/components/common/StatusBadge'
import { NotFoundPage } from './NotFound'

export function AgreementPage() {
  const { id = '' } = useParams()
  const { getBorrowing, getResource, getUser, currentUser, acceptRequest, declineRequest } = useStore()
  const { toast } = useToast()
  const navigate = useNavigate()

  const borrowing = getBorrowing(id)
  const resource = borrowing ? getResource(borrowing.resourceId) : undefined
  const owner = borrowing ? getUser(borrowing.ownerId) : undefined

  const [reviewing, setReviewing] = useState(false)
  const [agreeConditions, setAgreeConditions] = useState(false)
  const [agreeDeposit, setAgreeDeposit] = useState(false)
  const [agreeLate, setAgreeLate] = useState(false)
  const [confirmDecline, setConfirmDecline] = useState(false)

  if (!borrowing || !resource || !owner) return <NotFoundPage />

  const accepted = isBeyond(borrowing.status, 'accepted')
  const declined = borrowing.status === 'declined' || borrowing.status === 'cancelled'
  const paid = borrowing.transactionIds.length > 0
  const signed = agreeConditions && agreeDeposit && agreeLate
  const lateFeePerDay = Math.round(resource.pricePerDay * LATE_FEE_DAY_RATE)

  const simulateOwner = (decision: 'accept' | 'decline') => {
    setReviewing(true)
    window.setTimeout(() => {
      setReviewing(false)
      if (decision === 'accept') {
        acceptRequest(borrowing.id)
        toast({
          title: `${owner.name.split(' ')[0]} accepted your request`,
          description: 'Review the agreement and pay to lock the booking.',
          tone: 'success',
        })
      } else {
        declineRequest(borrowing.id, 'Already promised to someone else for those dates')
        toast({
          title: 'Request declined',
          description: 'The resource stays available for other dates.',
          tone: 'warning',
        })
      }
    }, 900)
  }

  const CLAUSES = [
    {
      title: 'Borrowing period',
      body: `You may keep ${resource.name} from ${fmtDateFull(borrowing.startDate)} until ${fmtDateTime(borrowing.dueDate)}. Returning after the deadline adds a late fee of ${inr(lateFeePerDay)} per day (${Math.round(LATE_FEE_DAY_RATE * 100)}% of the daily rate), charged from the security deposit.`,
    },
    {
      title: 'Security deposit',
      body: `${inr(borrowing.charges.deposit)} is held for the entire period and refunded after the owner inspects the resource. Damage or missing accessories are deducted from this deposit, with photo evidence from both handover and return.`,
    },
    {
      title: 'Condition of return',
      body: 'The resource must come back in the condition recorded at handover, with every listed accessory. Both sides photograph it together at pickup and at return, so nothing is a matter of opinion.',
    },
    {
      title: 'Liability',
      body: `If the resource is lost or damaged beyond the deposit value, you remain responsible for the difference. Disputes are reviewed by a CampusLoop admin using the before/after condition reports.`,
    },
    {
      title: 'Cancellation',
      body: 'You may cancel free of charge until you pay. After payment, the charge is refundable only if the owner cannot hand the resource over.',
    },
  ]

  return (
    <Page width="form">
      <PageHeader
        back={{ to: `/borrowings/${borrowing.id}`, label: 'Back to exchange' }}
        eyebrow={<FlowSteps steps={BORROW_FLOW_STEPS} current={1} />}
        title="Borrowing agreement"
        subtitle="Both students agree to the same terms before money or property changes hands."
        actions={<StatusBadge status={borrowing.status} />}
      />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          {/* Owner response */}
          <Reveal>
            {declined ? (
              <Card className="border-destructive/25 bg-destructive-soft">
                <CardContent className="pt-5">
                  <p className="flex items-center gap-2 text-[0.9375rem] font-semibold text-destructive">
                    <XCircle className="size-4" />
                    {owner.name.split(' ')[0]} declined this request
                  </p>
                  <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-destructive/80">
                    Nothing was charged. Try different dates, or borrow one of the alternatives on the
                    resource page.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link to={`/resource/${resource.id}`} className={cn(buttonVariants({ size: 'sm' }))}>
                      See alternatives
                    </Link>
                    <Link
                      to="/discover"
                      className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
                    >
                      Back to discover
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ) : accepted ? (
              <Card className="border-primary/25 bg-primary-soft/50">
                <CardContent className="pt-5">
                  <p className="flex items-center gap-2 text-[0.9375rem] font-semibold text-primary">
                    <CheckCircle2 className="size-4" />
                    {owner.name.split(' ')[0]} accepted your request
                  </p>
                  <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-muted-foreground">
                    Pickup is set for {fmtDateTime(borrowing.pickupTime)} at {borrowing.pickupLocation}.
                    Sign the agreement below and pay to confirm.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-[0.9375rem] font-semibold">
                        {reviewing ? (
                          <Loader2 className="size-4 animate-spin text-primary" />
                        ) : (
                          <BellRing className="size-4 text-primary" />
                        )}
                        {reviewing
                          ? `${owner.name.split(' ')[0]} is reviewing your request…`
                          : `Waiting for ${owner.name.split(' ')[0]} to respond`}
                      </p>
                      <p className="mt-1.5 max-w-md text-[0.8125rem] leading-relaxed text-muted-foreground">
                        Owners see your purpose, dates and trust score. Your score of{' '}
                        <span className="num font-medium text-foreground">{currentUser.trustScore}</span>{' '}
                        and {currentUser.successfulExchanges} completed exchanges usually get a yes.
                      </p>
                    </div>
                    <Badge variant="outline" size="sm">
                      Demo control
                    </Badge>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                    <Button size="sm" loading={reviewing} onClick={() => simulateOwner('accept')}>
                      Simulate owner accepting
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={reviewing}
                      onClick={() => setConfirmDecline(true)}
                    >
                      Simulate a decline
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </Reveal>

          {/* Clauses */}
          <Reveal delay={0.05}>
            <Card>
              <CardContent className="pt-5">
                <SectionTitle
                  title="Terms of this exchange"
                  hint={`Agreement #${borrowing.id.toUpperCase()}`}
                />
                <ol className="mt-4 space-y-4">
                  {CLAUSES.map((c, i) => (
                    <li key={c.title} className="flex gap-3.5">
                      <span className="num mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-2xs font-bold text-muted-foreground">
                        {i + 1}
                      </span>
                      <div>
                        <p className="text-[0.875rem] font-semibold">{c.title}</p>
                        <p className="mt-1 text-[0.8125rem] leading-relaxed text-muted-foreground">
                          {c.body}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>

                <div className="mt-5 rounded-xl border border-border bg-muted/40 p-4">
                  <p className="flex items-center gap-2 text-[0.8125rem] font-semibold">
                    <ShieldAlert className="size-3.5 text-warning" />
                    Owner’s own conditions
                  </p>
                  <ul className="mt-2.5 space-y-1.5">
                    {resource.borrowingConditions.map((c) => (
                      <li key={c} className="flex gap-2 text-[0.8125rem] leading-relaxed text-muted-foreground">
                        <span className="mt-1.5 size-1 shrink-0 rounded-full bg-muted-foreground" />
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </Reveal>

          {/* Signature */}
          <Reveal delay={0.1}>
            <Card>
              <CardContent className="space-y-3.5 pt-5">
                <SectionTitle title="Your acceptance" hint="All three are required" />
                <Checkbox
                  checked={agreeConditions}
                  onChange={setAgreeConditions}
                  label="I accept the borrowing conditions"
                  description={`I will use ${resource.name} only as described and return every listed accessory.`}
                />
                <Checkbox
                  checked={agreeDeposit}
                  onChange={setAgreeDeposit}
                  label={`I agree to a refundable deposit of ${inr(borrowing.charges.deposit)}`}
                  description="Deductions only happen for verified damage or missing items, with photo evidence."
                />
                <Checkbox
                  checked={agreeLate}
                  onChange={setAgreeLate}
                  label={`I understand the late fee of ${inr(lateFeePerDay)} per day`}
                  description={`Returning after ${fmtDateTime(borrowing.dueDate)} reduces my refund.`}
                />
              </CardContent>
            </Card>
          </Reveal>
        </div>

        {/* Summary */}
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
                      {fmtDateFull(borrowing.startDate)} → {fmtDateFull(borrowing.dueDate)}
                    </p>
                    <p className="num mt-1 text-2xs text-muted-foreground">
                      {borrowing.charges.days} day{borrowing.charges.days > 1 ? 's' : ''} ·{' '}
                      {borrowing.purpose}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2.5 border-t border-border pt-4">
                  <Avatar user={owner} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.8125rem] font-medium">{owner.name}</p>
                    <p className="truncate text-2xs text-muted-foreground">Owner · {owner.department}</p>
                  </div>
                  <TrustBadge user={owner} />
                </div>

                <div className="mt-4 border-t border-border pt-4">
                  <ChargeBreakdown
                    charges={borrowing.charges}
                    pricePerDay={resource.pricePerDay}
                    showFormula
                  />
                </div>

                <div className="mt-5 space-y-2">
                  <Button
                    className="w-full"
                    size="lg"
                    disabled={!accepted || !signed}
                    onClick={() => navigate(`/borrowings/${borrowing.id}/payment`)}
                  >
                    <FileSignature />
                    {paid ? 'Continue to payment' : `Sign & pay ${inr(borrowing.charges.total)}`}
                    <ArrowRight />
                  </Button>
                  {!accepted && !declined && (
                    <p className="text-center text-2xs text-muted-foreground">
                      Unlocks once the owner accepts.
                    </p>
                  )}
                  {accepted && !signed && (
                    <p className="text-center text-2xs text-muted-foreground">
                      Tick all three acceptances to continue.
                    </p>
                  )}
                </div>

                <p className="mt-4 flex items-start gap-1.5 rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-2xs leading-relaxed text-muted-foreground">
                  <ShieldCheck className="mt-px size-3 shrink-0 text-primary" />
                  This is a simulated agreement for a campus prototype — no legal contract is created
                  and no real money moves.
                </p>
              </CardContent>
            </Card>
          </Reveal>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDecline}
        onClose={() => setConfirmDecline(false)}
        onConfirm={() => {
          setConfirmDecline(false)
          simulateOwner('decline')
        }}
        title="Simulate the owner declining?"
        message="This shows the decline path judges usually ask about. The request is closed and nothing is charged."
        confirmLabel="Decline the request"
        tone="destructive"
      />
    </Page>
  )
}
