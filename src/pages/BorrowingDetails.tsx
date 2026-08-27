import { Link, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  Camera,
  FileText,
  MapPin,
  MessageSquare,
  Receipt,
  Scale,
  ShieldCheck,
  Star,
} from 'lucide-react'
import { useStore } from '@/store/AppStore'
import { nextAction } from '@/services/lifecycle'
import { fmtDate, fmtDateTime, inr, relativeDeadline, timeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, SectionTitle } from '@/components/ui/card'
import { Page, PageHeader } from '@/components/layout/PageShell'
import { Reveal } from '@/components/common/Motion'
import { ResourceImage } from '@/components/common/ResourceImage'
import { Avatar, RatingStars } from '@/components/common/Avatar'
import { TrustBadge, VerifiedTag } from '@/components/common/Trust'
import { StatusBadge, DisputeBadge } from '@/components/common/StatusBadge'
import { LifecycleTimeline } from '@/components/common/LifecycleTimeline'
import { SwitchToActorCard } from '@/components/common/AccountSwitcher'
import { ConditionComparison } from '@/components/common/ConditionComparison'
import { ChargeBreakdown, SettlementBreakdown } from '@/components/common/ChargeBreakdown'
import { DataRow } from '@/components/common/StatCard'
import { NotFoundPage } from './NotFound'

export function BorrowingDetailsPage() {
  const { id = '' } = useParams()
  const { state, getBorrowing, getResource, getUser, getReport, getDispute, getRating } = useStore()

  const borrowing = getBorrowing(id)
  const resource = borrowing ? getResource(borrowing.resourceId) : undefined
  const owner = borrowing ? getUser(borrowing.ownerId) : undefined
  const borrower = borrowing ? getUser(borrowing.borrowerId) : undefined

  if (!borrowing || !resource || !owner || !borrower) return <NotFoundPage />

  const before = getReport(borrowing.beforeReportId)
  const after = getReport(borrowing.afterReportId)
  const dispute = getDispute(borrowing.disputeId)
  const rating = getRating(borrowing.ratingId)
  const transactions = state.transactions
    .filter((t) => borrowing.transactionIds.includes(t.id))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))

  const action = nextAction(borrowing)
  const isBorrower = borrowing.borrowerId === state.currentUserId
  const counterparty = isBorrower ? owner : borrower
  const overdue = borrowing.status === 'return_due'

  return (
    <Page>
      <PageHeader
        back={{ to: '/borrowings', label: 'All borrowings' }}
        eyebrow={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={borrowing.status} />
            <Badge variant="outline" size="sm">
              Exchange {borrowing.id.toUpperCase()}
            </Badge>
            {!isBorrower && (
              <Badge variant="outline" size="sm">
                You are lending
              </Badge>
            )}
            {dispute && <DisputeBadge status={dispute.status} />}
          </div>
        }
        title={resource.name}
        subtitle={
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock className="size-3.5" />
              {fmtDate(borrowing.startDate)} → {fmtDateTime(borrowing.dueDate)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-3.5" />
              {borrowing.pickupLocation}
            </span>
            <span className="num">
              {borrowing.charges.days} day{borrowing.charges.days > 1 ? 's' : ''}
            </span>
          </span>
        }
        actions={
          action.urgency !== 'done' && (
            <Link
              to={action.to}
              className={cn(
                buttonVariants({ variant: action.urgency === 'primary' ? 'primary' : 'outline' }),
              )}
            >
              {action.label}
              <ArrowRight />
            </Link>
          )
        }
      />

      {overdue && (
        <Reveal>
          <Card className="mb-6 border-warning/30 bg-warning-soft">
            <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-5">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-[0.9375rem] font-semibold text-warning">
                  <AlertTriangle className="size-4" />
                  This return is overdue
                </p>
                <p className="mt-1 text-[0.8125rem] leading-relaxed text-warning/90">
                  Due {fmtDateTime(borrowing.dueDate)} — {relativeDeadline(borrowing.dueDate)}. The
                  late fee is charged from the {inr(borrowing.charges.deposit)} deposit.
                </p>
              </div>
              <Link
                to={`/borrowings/${borrowing.id}/return`}
                className={cn(buttonVariants({ size: 'sm' }))}
              >
                Return now
                <ArrowRight />
              </Link>
            </CardContent>
          </Card>
        </Reveal>
      )}

      <SwitchToActorCard borrowing={borrowing} className="mb-6" />

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="min-w-0 space-y-6">
          {/* Timeline */}
          <Reveal>
            <Card>
              <CardContent className="pt-5">
                <SectionTitle
                  title="Lifecycle"
                  hint={action.urgency === 'done' ? 'Exchange closed' : action.hint}
                />
                <LifecycleTimeline borrowing={borrowing} />
              </CardContent>
            </Card>
          </Reveal>

          {/* Condition */}
          <Reveal delay={0.05}>
            <Card>
              <CardContent className="pt-5">
                <SectionTitle
                  title="Condition record"
                  hint="Handover and return, compared row for row"
                  action={
                    before && (
                      <Badge variant="outline" size="sm">
                        <Camera className="size-3" />
                        {before.images.length + (after?.images.length ?? 0)} photos
                      </Badge>
                    )
                  }
                />
                <ConditionComparison before={before} after={after} />
              </CardContent>
            </Card>
          </Reveal>

          {/* Dispute */}
          {dispute && (
            <Reveal delay={0.08}>
              <Card className="border-destructive/25">
                <CardContent className="pt-5">
                  <SectionTitle
                    title="Damage claim"
                    hint={`Raised ${timeAgo(dispute.createdAt)}`}
                    action={<DisputeBadge status={dispute.status} />}
                  />
                  <div className="rounded-xl border border-border bg-muted/40 p-4">
                    <p className="text-[0.875rem] font-semibold">{dispute.reason}</p>
                    <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-muted-foreground">
                      {dispute.description}
                    </p>
                    <div className="mt-3 space-y-0.5 border-t border-border pt-3">
                      <DataRow label="Amount claimed" value={inr(dispute.claimedAmount)} tone="danger" />
                      {dispute.status !== 'under_review' && (
                        <DataRow
                          label="Admin decision"
                          value={inr(dispute.resolvedAmount ?? 0)}
                          hint={dispute.resolution}
                          strong
                        />
                      )}
                    </div>
                  </div>
                  {dispute.status === 'under_review' && (
                    <p className="mt-3 flex items-start gap-1.5 text-2xs leading-relaxed text-muted-foreground">
                      <Scale className="mt-px size-3.5 shrink-0" />
                      A CampusLoop admin reviews the BEFORE and AFTER reports and decides how much of
                      the deposit is deducted. Neither student decides this alone.
                    </p>
                  )}
                </CardContent>
              </Card>
            </Reveal>
          )}

          {/* Settlement */}
          {borrowing.settlement && (
            <Reveal delay={0.1}>
              <Card>
                <CardContent className="pt-5">
                  <SectionTitle
                    title="Deposit settlement"
                    hint={`Settled ${fmtDateTime(borrowing.settlement.settledAt)}`}
                  />
                  <SettlementBreakdown settlement={borrowing.settlement} />
                </CardContent>
              </Card>
            </Reveal>
          )}

          {/* Rating */}
          {rating && (
            <Reveal delay={0.12}>
              <Card>
                <CardContent className="pt-5">
                  <SectionTitle title="Your rating" hint={timeAgo(rating.createdAt)} />
                  <div className="grid gap-4 sm:grid-cols-3">
                    {[
                      { label: 'Owner', value: rating.ownerRating },
                      { label: 'Resource', value: rating.resourceRating },
                      { label: 'Exchange', value: rating.exchangeRating },
                    ].map((r) => (
                      <div key={r.label} className="rounded-xl border border-border bg-muted/40 p-3.5">
                        <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {r.label}
                        </p>
                        <div className="mt-1.5">
                          <RatingStars value={r.value} size="xs" />
                        </div>
                      </div>
                    ))}
                  </div>
                  {rating.review && (
                    <p className="mt-4 rounded-xl bg-muted/60 px-3.5 py-3 text-[0.8125rem] leading-relaxed text-muted-foreground">
                      “{rating.review}”
                    </p>
                  )}
                </CardContent>
              </Card>
            </Reveal>
          )}
        </div>

        {/* Rail */}
        <div className="space-y-4">
          <Reveal delay={0.05}>
            <Card>
              <CardContent className="pt-5">
                <Link to={`/resource/${resource.id}`} className="flex gap-3">
                  <ResourceImage
                    resource={resource}
                    className="size-16 shrink-0"
                    rounded="rounded-xl"
                    iconClassName="size-5"
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-[0.875rem] font-semibold">{resource.name}</span>
                    <span className="mt-0.5 block text-2xs text-muted-foreground">
                      {resource.category} · listed as {resource.condition}
                    </span>
                    <span className="num mt-1 block text-2xs font-medium text-primary">
                      {inr(resource.pricePerDay)}/day
                    </span>
                  </span>
                </Link>

                <div className="mt-4 border-t border-border pt-4">
                  <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {isBorrower ? 'Borrowed from' : 'Borrowed by'}
                  </p>
                  <Link to={`/profile/${counterparty.id}`} className="mt-2.5 flex items-center gap-2.5">
                    <Avatar user={counterparty} size="md" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 truncate text-[0.8125rem] font-medium">
                        {counterparty.name}
                        <VerifiedTag user={counterparty} />
                      </span>
                      <span className="num block text-2xs text-muted-foreground">
                        {counterparty.successfulExchanges} exchanges · {counterparty.onTimeRate}% on time
                      </span>
                    </span>
                    <TrustBadge user={counterparty} />
                  </Link>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      to={`/profile/${counterparty.id}`}
                      className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'flex-1')}
                    >
                      <MessageSquare />
                      View profile
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Reveal>

          <Reveal delay={0.08}>
            <Card>
              <CardContent className="pt-5">
                <SectionTitle title="Purpose" />
                <p className="text-[0.875rem] font-medium">{borrowing.purpose}</p>
                {borrowing.message && (
                  <p className="mt-2 rounded-lg bg-muted/60 px-3 py-2.5 text-2xs leading-relaxed text-muted-foreground">
                    “{borrowing.message}”
                  </p>
                )}
                <div className="mt-4 space-y-0.5 border-t border-border pt-4">
                  <DataRow label="Pickup" value={fmtDateTime(borrowing.pickupTime)} />
                  <DataRow label="Return deadline" value={fmtDateTime(borrowing.dueDate)} />
                  {borrowing.returnedAt && (
                    <DataRow label="Returned" value={fmtDateTime(borrowing.returnedAt)} />
                  )}
                </div>
              </CardContent>
            </Card>
          </Reveal>

          <Reveal delay={0.1}>
            <Card>
              <CardContent className="pt-5">
                <SectionTitle title="Money" hint="Charge, fee and deposit" />
                <ChargeBreakdown
                  charges={borrowing.charges}
                  pricePerDay={resource.pricePerDay}
                  showFormula={false}
                />

                <div className="mt-4 border-t border-border pt-4">
                  <p className="flex items-center gap-2 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <Receipt className="size-3.5" />
                    Transactions
                  </p>
                  {transactions.length === 0 ? (
                    <p className="mt-2 text-2xs text-muted-foreground">
                      Nothing charged yet — payment happens after the owner accepts.
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {transactions.map((t) => (
                        <li
                          key={t.id}
                          className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-2xs font-semibold">
                              {t.type === 'payment' ? 'Payment' : t.type === 'refund' ? 'Deposit refund' : 'Owner payout'}
                            </span>
                            <span className="num block text-2xs text-muted-foreground">
                              {t.method} · {fmtDate(t.createdAt)}
                            </span>
                          </span>
                          <span
                            className={cn(
                              'num shrink-0 text-[0.8125rem] font-semibold',
                              t.type === 'refund' ? 'text-primary' : 'text-foreground',
                            )}
                          >
                            {t.type === 'refund' ? '+' : ''}
                            {inr(t.amount)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </CardContent>
            </Card>
          </Reveal>

          <Reveal delay={0.12}>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="flex items-center gap-2 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
                <FileText className="size-3.5" />
                Agreement
              </p>
              <p className="mt-2 text-2xs leading-relaxed text-muted-foreground">
                Signed terms, deposit rules and the late-fee policy for this exchange.
              </p>
              <Link
                to={`/borrowings/${borrowing.id}/agreement`}
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'mt-3 w-full')}
              >
                <ShieldCheck />
                View agreement
              </Link>
            </div>
          </Reveal>

          {borrowing.status === 'settlement' && (
            <Reveal delay={0.14}>
              <Link
                to={`/borrowings/${borrowing.id}/rating`}
                className={cn(buttonVariants({ size: 'lg' }), 'w-full')}
              >
                <Star />
                Rate this exchange
              </Link>
            </Reveal>
          )}
        </div>
      </div>
    </Page>
  )
}
