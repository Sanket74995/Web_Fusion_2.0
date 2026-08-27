import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BadgeCheck,
  Check,
  Clock,
  Coins,
  Eye,
  EyeOff,
  Flag,
  Inbox,
  LayoutGrid,
  Package,
  Plus,
  Repeat,
  Trash2,
  X,
} from 'lucide-react'
import type { Borrowing, Resource } from '@/types'
import { useStore } from '@/store/AppStore'
import { fmtDate, fmtDateTime, inr, timeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs } from '@/components/ui/tabs'
import { ConfirmDialog } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { Page, PageHeader } from '@/components/layout/PageShell'
import { Reveal, Stagger, StaggerItem } from '@/components/common/Motion'
import { ResourceImage } from '@/components/common/ResourceImage'
import { Avatar, RatingStars } from '@/components/common/Avatar'
import { TrustBadge } from '@/components/common/Trust'
import { ApprovalBadge, StatusBadge } from '@/components/common/StatusBadge'
import { StatCard, DataRow } from '@/components/common/StatCard'
import { EmptyState } from '@/components/common/EmptyState'
import { ChargeBreakdown } from '@/components/common/ChargeBreakdown'

type Tab = 'requests' | 'listings' | 'lending'

export function MyListingsPage() {
  const {
    state,
    currentUser,
    getResource,
    getUser,
    updateResource,
    removeResource,
    acceptRequest,
    declineRequest,
  } = useStore()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [tab, setTab] = useState<Tab>('requests')
  const [pendingDelete, setPendingDelete] = useState<Resource | undefined>()

  const listings = useMemo(
    () =>
      state.resources
        .filter((r) => r.ownerId === currentUser.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [state.resources, currentUser.id],
  )

  const lending = useMemo(
    () =>
      state.borrowings
        .filter((b) => b.ownerId === currentUser.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [state.borrowings, currentUser.id],
  )

  const requests = lending.filter((b) => b.status === 'requested')
  const active = lending.filter(
    (b) => b.status !== 'requested' && b.status !== 'declined' && b.status !== 'cancelled',
  )

  const earned = lending
    .filter((b) => b.settlement)
    .reduce((sum, b) => sum + b.charges.borrowCharge + (b.settlement?.lateFee ?? 0), 0)
  const timesShared = listings.reduce((sum, r) => sum + r.timesBorrowed, 0)
  const avgRating = listings.length
    ? listings.reduce((sum, r) => sum + r.rating, 0) / listings.length
    : 0

  const accept = (b: Borrowing) => {
    acceptRequest(b.id)
    const borrower = getUser(b.borrowerId)
    toast({
      title: 'Request accepted',
      description: `${borrower?.name.split(' ')[0] ?? 'The borrower'} can now pay and collect it.`,
      tone: 'success',
    })
  }

  const decline = (b: Borrowing) => {
    declineRequest(b.id, 'Not available for those dates')
    toast({ title: 'Request declined', description: 'The borrower has been notified.', tone: 'info' })
  }

  const toggleAvailability = (r: Resource) => {
    const next = r.availabilityStatus === 'unavailable' ? 'available' : 'unavailable'
    updateResource(r.id, { availabilityStatus: next })
    toast({
      title: next === 'available' ? `${r.name} is listed again` : `${r.name} is hidden`,
      description:
        next === 'available'
          ? 'Students can find and request it from Discover.'
          : 'It stays in your listings but nobody can request it.',
      tone: next === 'available' ? 'success' : 'info',
    })
  }

  const confirmDelete = () => {
    if (!pendingDelete) return
    removeResource(pendingDelete.id)
    toast({ title: `${pendingDelete.name} removed`, description: 'The listing is gone from Discover.', tone: 'info' })
    setPendingDelete(undefined)
  }

  return (
    <Page>
      <PageHeader
        title="My listings"
        subtitle="What you are sharing with campus, who wants it, and what it has earned you."
        actions={
          <Link to="/listings/new" className={cn(buttonVariants())}>
            <Plus />
            List a resource
          </Link>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Live listings"
          value={String(listings.length)}
          countTo={listings.length}
          icon={LayoutGrid}
          tone="primary"
          hint={`${listings.filter((r) => r.availabilityStatus === 'available').length} available now`}
        />
        <StatCard
          label="Times shared"
          value={String(timesShared)}
          countTo={timesShared}
          icon={Repeat}
          hint="Across all your resources"
        />
        <StatCard
          label="Earned"
          value={inr(earned)}
          countTo={earned}
          format={inr}
          icon={Coins}
          tone="info"
          hint="Charges from settled exchanges"
        />
        <StatCard
          label="Listing rating"
          value={avgRating ? avgRating.toFixed(1) : '—'}
          icon={BadgeCheck}
          hint={avgRating ? 'Average across your resources' : 'No ratings yet'}
        />
      </div>

      {requests.length > 0 && tab !== 'requests' && (
        <Reveal>
          <Card className="mb-6 border-primary/25 bg-primary-soft/40">
            <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-5">
              <p className="text-[0.875rem] font-medium">
                {requests.length} request{requests.length > 1 ? 's' : ''} waiting on your reply.
                Students see your response time in your trust score.
              </p>
              <Button size="sm" onClick={() => setTab('requests')}>
                Review now
                <ArrowRight />
              </Button>
            </CardContent>
          </Card>
        </Reveal>
      )}

      <Tabs
        value={tab}
        onChange={setTab}
        ariaLabel="Listings sections"
        className="mb-6"
        items={[
          { value: 'requests', label: 'Requests', count: requests.length, icon: <Inbox className="size-4" /> },
          { value: 'listings', label: 'Resources', count: listings.length, icon: <Package className="size-4" /> },
          { value: 'lending', label: 'Lending out', count: active.length, icon: <Repeat className="size-4" /> },
        ]}
      />

      {tab === 'requests' &&
        (requests.length === 0 ? (
          <EmptyState
            icon={<Inbox />}
            title="No requests right now"
            message="When someone requests one of your resources it shows up here with their purpose, trust score and dates so you can decide in seconds."
            action={
              <Link to="/listings/new" className={cn(buttonVariants({ variant: 'outline' }))}>
                <Plus />
                Add another resource
              </Link>
            }
          />
        ) : (
          <Stagger className="space-y-4">
            {requests.map((b) => {
              const resource = getResource(b.resourceId)
              const borrower = getUser(b.borrowerId)
              if (!resource || !borrower) return null
              return (
                <StaggerItem key={b.id}>
                  <Card>
                    <CardContent className="pt-5">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex min-w-0 gap-3">
                          <Avatar user={borrower} size="md" />
                          <div className="min-w-0">
                            <p className="flex flex-wrap items-center gap-2 text-[0.9375rem] font-semibold">
                              {borrower.name}
                              <TrustBadge user={borrower} />
                            </p>
                            <p className="num mt-0.5 text-2xs text-muted-foreground">
                              {borrower.department} · {borrower.year} ·{' '}
                              {borrower.successfulExchanges} exchanges · {borrower.onTimeRate}% on
                              time
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" size="sm">
                          <Clock className="size-3" />
                          {timeAgo(b.createdAt)}
                        </Badge>
                      </div>

                      <div className="mt-4 grid gap-4 border-t border-border pt-4 lg:grid-cols-[1.3fr_1fr]">
                        <div className="min-w-0">
                          <Link
                            to={`/resource/${resource.id}`}
                            className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3 transition-colors hover:border-primary/25"
                          >
                            <ResourceImage
                              resource={resource}
                              className="size-12 shrink-0"
                              rounded="rounded-lg"
                              iconClassName="size-4"
                            />
                            <span className="min-w-0">
                              <span className="block truncate text-[0.875rem] font-semibold">
                                {resource.name}
                              </span>
                              <span className="num block text-2xs text-muted-foreground">
                                {fmtDate(b.startDate)} → {fmtDate(b.dueDate)} · {b.charges.days} day
                                {b.charges.days > 1 ? 's' : ''}
                              </span>
                            </span>
                          </Link>

                          <p className="mt-3 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
                            What they need it for
                          </p>
                          <p className="mt-1 text-[0.875rem] font-medium">{b.purpose}</p>
                          {b.message && (
                            <p className="mt-2 rounded-lg bg-muted/60 px-3 py-2.5 text-2xs leading-relaxed text-muted-foreground">
                              “{b.message}”
                            </p>
                          )}
                          <div className="mt-3 space-y-0.5">
                            <DataRow label="Pickup" value={fmtDateTime(b.pickupTime)} />
                            <DataRow label="Where" value={b.pickupLocation} />
                          </div>
                        </div>

                        <div className="rounded-xl border border-border bg-muted/30 p-4">
                          <ChargeBreakdown
                            charges={b.charges}
                            pricePerDay={resource.pricePerDay}
                            showFormula={false}
                          />
                          <div className="mt-3 space-y-0.5 border-t border-border pt-3">
                            <DataRow
                              label="You receive"
                              value={inr(b.charges.borrowCharge)}
                              strong
                              tone="primary"
                              hint="Deposit is held by CampusLoop, not by you"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                        <Button onClick={() => accept(b)}>
                          <Check />
                          Accept request
                        </Button>
                        <Button variant="outline" onClick={() => decline(b)}>
                          <X />
                          Decline
                        </Button>
                        <Link
                          to={`/profile/${borrower.id}`}
                          className={cn(buttonVariants({ variant: 'ghost' }))}
                        >
                          View their profile
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                </StaggerItem>
              )
            })}
          </Stagger>
        ))}

      {tab === 'listings' &&
        (listings.length === 0 ? (
          <EmptyState
            icon={<Package />}
            title="You are not sharing anything yet"
            message="Most students have something sitting unused — a tripod, a calculator, a textbook. List it once and it keeps earning while it would otherwise be idle."
            action={
              <Link to="/listings/new" className={cn(buttonVariants())}>
                <Plus />
                List your first resource
              </Link>
            }
          />
        ) : (
          <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {listings.map((r) => {
              const hidden = r.availabilityStatus === 'unavailable'
              const out = r.availabilityStatus === 'borrowed'
              return (
                <StaggerItem key={r.id}>
                  <Card className="flex h-full flex-col overflow-hidden">
                    <Link to={`/resource/${r.id}`} className="relative block">
                      <ResourceImage resource={r} className="h-32" />
                      {hidden && (
                        <span className="absolute inset-0 flex items-center justify-center bg-ink/55 text-xs font-semibold text-white backdrop-blur-[1px]">
                          Hidden from Discover
                        </span>
                      )}
                    </Link>
                    <CardContent className="flex flex-1 flex-col pt-4">
                      <div className="flex items-start justify-between gap-2">
                        <Link to={`/resource/${r.id}`} className="min-w-0">
                          <p className="truncate text-[0.9375rem] font-semibold">{r.name}</p>
                        </Link>
                        <span className="num shrink-0 text-[0.875rem] font-semibold">
                          {inr(r.pricePerDay)}
                          <span className="text-2xs font-normal text-muted-foreground">/day</span>
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <ApprovalBadge status={r.approvalStatus} />
                        {out && (
                          <Badge variant="info" size="sm">
                            Out on loan
                          </Badge>
                        )}
                        {r.flagged && (
                          <Badge variant="danger" size="sm">
                            <Flag className="size-3" />
                            Flagged
                          </Badge>
                        )}
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-2 text-2xs text-muted-foreground">
                        <span className="num inline-flex items-center gap-1">
                          <Repeat className="size-3.5" />
                          {r.timesBorrowed} times shared
                        </span>
                        <RatingStars value={r.rating} count={r.ratingCount} size="xs" />
                      </div>

                      <div className="mt-auto flex gap-1.5 border-t border-border pt-3.5">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => toggleAvailability(r)}
                        >
                          {hidden ? <Eye /> : <EyeOff />}
                          {hidden ? 'Relist' : 'Hide'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Remove ${r.name}`}
                          onClick={() => setPendingDelete(r)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </StaggerItem>
              )
            })}
          </Stagger>
        ))}

      {tab === 'lending' &&
        (active.length === 0 ? (
          <EmptyState
            icon={<Repeat />}
            title="Nothing out on loan"
            message="Accepted requests appear here so you can track handovers, returns and inspections from the lending side."
          />
        ) : (
          <Stagger className="space-y-3">
            {active.map((b) => {
              const resource = getResource(b.resourceId)
              const borrower = getUser(b.borrowerId)
              if (!resource || !borrower) return null
              return (
                <StaggerItem key={b.id}>
                  <Card>
                    <CardContent className="flex flex-wrap items-center gap-4 pt-5">
                      <ResourceImage
                        resource={resource}
                        className="size-14 shrink-0"
                        rounded="rounded-lg"
                        iconClassName="size-4"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            to={`/borrowings/${b.id}`}
                            className="truncate text-[0.9375rem] font-semibold hover:text-primary"
                          >
                            {resource.name}
                          </Link>
                          <StatusBadge status={b.status} />
                        </div>
                        <p className="num mt-1 text-2xs text-muted-foreground">
                          {borrower.name} · due {fmtDateTime(b.dueDate)} ·{' '}
                          {inr(b.charges.borrowCharge)} to you
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {b.status === 'returned' && (
                          <Link
                            to={`/borrowings/${b.id}/inspection`}
                            className={cn(buttonVariants({ size: 'sm' }))}
                          >
                            Inspect return
                            <ArrowRight />
                          </Link>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/borrowings/${b.id}`)}
                        >
                          Open
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </StaggerItem>
              )
            })}
          </Stagger>
        ))}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(undefined)}
        onConfirm={confirmDelete}
        tone="destructive"
        title={`Remove ${pendingDelete?.name ?? 'this listing'}?`}
        confirmLabel="Remove listing"
        message="It will disappear from Discover and from AI matches. Exchanges that already happened keep their history."
      />
    </Page>
  )
}
