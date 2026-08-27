import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowRight,
  CalendarDays,
  Coins,
  Leaf,
  MapPin,
  MessageSquareQuote,
  Package,
  Repeat,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Star,
  Timer,
} from 'lucide-react'
import { useStore } from '@/store/AppStore'
import { estimatedRetailValue, savedByExchange } from '@/services/analytics'
import { fmtDateFull, inr, timeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, SectionTitle } from '@/components/ui/card'
import { Page, PageHeader } from '@/components/layout/PageShell'
import { Reveal, Stagger, StaggerItem } from '@/components/common/Motion'
import { Avatar, RatingStars } from '@/components/common/Avatar'
import { BadgeList, TrustScorePanel, VerifiedTag } from '@/components/common/Trust'
import { StatusBadge } from '@/components/common/StatusBadge'
import { ResourceCard } from '@/components/common/ResourceCard'
import { ResourceImage } from '@/components/common/ResourceImage'
import { StatCard, DataRow } from '@/components/common/StatCard'
import { EmptyState } from '@/components/common/EmptyState'

export function ProfilePage() {
  const { id } = useParams<{ id: string }>()
  const { state, currentUser, getUser, getResource } = useStore()

  const user = (id ? getUser(id) : currentUser) ?? currentUser
  const isSelf = user.id === currentUser.id

  const listings = useMemo(
    () => state.resources.filter((r) => r.ownerId === user.id),
    [state.resources, user.id],
  )

  const exchanges = useMemo(
    () =>
      state.borrowings
        .filter((b) => b.borrowerId === user.id || b.ownerId === user.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [state.borrowings, user.id],
  )

  const reviews = useMemo(
    () =>
      state.ratings
        .filter((r) => r.toUserId === user.id && r.review.trim())
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [state.ratings, user.id],
  )

  /* What sharing has actually saved this student and the people who borrowed from them. */
  const impact = useMemo(() => {
    const settled = state.borrowings.filter(
      (b) => b.settlement && (b.borrowerId === user.id || b.ownerId === user.id),
    )
    let saved = 0
    let reused = 0
    for (const b of settled) {
      const resource = getResource(b.resourceId)
      if (!resource) continue
      reused += 1
      if (b.borrowerId === user.id) saved += savedByExchange(resource, b.charges.borrowCharge)
    }
    const earned = state.borrowings
      .filter((b) => b.ownerId === user.id && b.settlement)
      .reduce((sum, b) => sum + b.charges.borrowCharge + (b.settlement?.lateFee ?? 0), 0)
    const idleValue = listings.reduce((sum, r) => sum + estimatedRetailValue(r), 0)
    return { saved, reused, earned, idleValue }
  }, [state.borrowings, user.id, getResource, listings])

  const active = exchanges.filter(
    (b) => b.status !== 'rated' && b.status !== 'declined' && b.status !== 'cancelled',
  )

  return (
    <Page>
      <PageHeader
        eyebrow={isSelf ? 'Your profile' : 'Student profile'}
        title={isSelf ? 'Your profile' : user.name}
        subtitle={
          isSelf
            ? 'How campus sees you. Trust is earned by returning things on time and describing them honestly.'
            : `${user.department} · ${user.year} · on CampusLoop since ${fmtDateFull(user.joinedAt)}`
        }
        back={id && !isSelf ? { to: '/discover', label: 'Discover' } : undefined}
        actions={
          isSelf ? (
            <Link to="/listings/new" className={cn(buttonVariants())}>
              <Package />
              List a resource
            </Link>
          ) : undefined
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0 space-y-6">
          {/* Identity */}
          <Reveal>
            <Card>
              <CardContent className="pt-5">
                <div className="flex flex-wrap items-start gap-4">
                  <Avatar user={user} size="xl" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-semibold tracking-tight">{user.name}</h2>
                      <VerifiedTag user={user} />
                      {user.status !== 'active' && (
                        <Badge variant="danger" size="sm">
                          <ShieldAlert className="size-3" />
                          {user.status === 'suspended' ? 'Suspended' : 'Flagged'}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-[0.875rem] text-muted-foreground">
                      {user.department} · {user.year}
                    </p>
                    <div className="num mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-2xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="size-3.5" />
                        {user.location}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="size-3.5" />
                        Joined {fmtDateFull(user.joinedAt)}
                      </span>
                      <RatingStars value={user.rating} count={user.ratingCount} size="xs" />
                    </div>
                    {user.bio && (
                      <p className="mt-3 max-w-prose text-[0.875rem] leading-relaxed text-muted-foreground">
                        {user.bio}
                      </p>
                    )}
                    <BadgeList badges={user.badges} className="mt-3.5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Reveal>

          {/* Track record */}
          <Reveal delay={0.05}>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Exchanges"
                value={String(user.successfulExchanges)}
                countTo={user.successfulExchanges}
                icon={Repeat}
                tone="primary"
                hint="Completed without a problem"
              />
              <StatCard
                label="On-time returns"
                value={`${user.onTimeRate}%`}
                countTo={user.onTimeRate}
                format={(n) => `${Math.round(n)}%`}
                icon={Timer}
                hint={user.onTimeRate >= 95 ? 'Excellent record' : 'Room to improve'}
              />
              <StatCard
                label="Rating"
                value={user.rating ? user.rating.toFixed(1) : '—'}
                icon={Star}
                hint={`${user.ratingCount} review${user.ratingCount === 1 ? '' : 's'}`}
              />
              <StatCard
                label="Disputes"
                value={String(user.disputes)}
                icon={user.disputes === 0 ? ShieldCheck : ShieldAlert}
                tone={user.disputes === 0 ? 'default' : 'danger'}
                hint={user.disputes === 0 ? 'Never a claim raised' : 'Resolved through the admin'}
              />
            </div>
          </Reveal>

          {/* Listings */}
          <Reveal delay={0.06}>
            <section>
              <SectionTitle
                title={isSelf ? 'What you are sharing' : `${user.name.split(' ')[0]}'s resources`}
                hint={`${listings.length} listing${listings.length === 1 ? '' : 's'} on campus`}
                action={
                  isSelf && listings.length > 0 ? (
                    <Link
                      to="/listings"
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      Manage
                      <ArrowRight className="size-3.5" />
                    </Link>
                  ) : undefined
                }
              />
              {listings.length === 0 ? (
                <EmptyState
                  compact
                  icon={<Package />}
                  title={isSelf ? 'You have not listed anything yet' : 'No listings yet'}
                  message={
                    isSelf
                      ? 'Something of yours is sitting idle right now. Listing it takes two minutes and saves another student a purchase.'
                      : 'This student borrows more than they lend — nothing listed at the moment.'
                  }
                  action={
                    isSelf ? (
                      <Link to="/listings/new" className={cn(buttonVariants({ variant: 'outline' }))}>
                        List a resource
                      </Link>
                    ) : undefined
                  }
                />
              ) : (
                <Stagger className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {listings.map((r) => (
                    <StaggerItem key={r.id}>
                      <ResourceCard resource={r} owner={user} />
                    </StaggerItem>
                  ))}
                </Stagger>
              )}
            </section>
          </Reveal>

          {/* Reviews */}
          <Reveal delay={0.06}>
            <section>
              <SectionTitle
                title="What people say"
                hint={reviews.length ? `${reviews.length} written review${reviews.length === 1 ? '' : 's'}` : undefined}
              />
              {reviews.length === 0 ? (
                <EmptyState
                  compact
                  icon={<MessageSquareQuote />}
                  title="No written reviews yet"
                  message="Reviews appear here once an exchange is completed and rated."
                />
              ) : (
                <Stagger className="mt-4 space-y-3">
                  {reviews.slice(0, 6).map((r) => {
                    const from = getUser(r.fromUserId)
                    const resource = getResource(r.resourceId)
                    return (
                      <StaggerItem key={r.id}>
                        <Card>
                          <CardContent className="pt-5">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex min-w-0 items-center gap-2.5">
                                {from && <Avatar user={from} size="sm" />}
                                <div className="min-w-0">
                                  <p className="truncate text-[0.875rem] font-semibold">
                                    {from?.name ?? 'A student'}
                                  </p>
                                  <p className="text-2xs text-muted-foreground">
                                    {resource ? `Borrowed ${resource.name}` : 'Completed exchange'} ·{' '}
                                    {timeAgo(r.createdAt)}
                                  </p>
                                </div>
                              </div>
                              <RatingStars
                                value={(r.ownerRating + r.resourceRating + r.exchangeRating) / 3}
                                size="xs"
                              />
                            </div>
                            <p className="mt-3 text-[0.875rem] leading-relaxed text-muted-foreground">
                              “{r.review}”
                            </p>
                          </CardContent>
                        </Card>
                      </StaggerItem>
                    )
                  })}
                </Stagger>
              )}
            </section>
          </Reveal>

          {/* Exchange history */}
          <Reveal delay={0.06}>
            <section>
              <SectionTitle
                title="Exchange history"
                hint={`${exchanges.length} total · ${active.length} in progress`}
              />
              {exchanges.length === 0 ? (
                <EmptyState
                  compact
                  icon={<Repeat />}
                  title="No exchanges yet"
                  message="Borrowing or lending anything will start the history here."
                />
              ) : (
                <div className="mt-4 space-y-2">
                  {exchanges.slice(0, 8).map((b) => {
                    const resource = getResource(b.resourceId)
                    if (!resource) return null
                    const asOwner = b.ownerId === user.id
                    const counterpart = getUser(asOwner ? b.borrowerId : b.ownerId)
                    return (
                      <div
                        key={b.id}
                        className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-3.5 py-3"
                      >
                        <ResourceImage
                          resource={resource}
                          className="size-10 shrink-0"
                          rounded="rounded-lg"
                          iconClassName="size-4"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {isSelf ? (
                              <Link
                                to={`/borrowings/${b.id}`}
                                className="truncate text-[0.875rem] font-semibold hover:text-primary"
                              >
                                {resource.name}
                              </Link>
                            ) : (
                              <span className="truncate text-[0.875rem] font-semibold">
                                {resource.name}
                              </span>
                            )}
                            <StatusBadge status={b.status} />
                          </div>
                          <p className="num mt-0.5 text-2xs text-muted-foreground">
                            {asOwner ? 'Lent to' : 'Borrowed from'}{' '}
                            {counterpart?.name ?? 'a student'} · {b.charges.days} day
                            {b.charges.days > 1 ? 's' : ''} · {timeAgo(b.createdAt)}
                          </p>
                        </div>
                        <span className="num shrink-0 text-[0.875rem] font-semibold">
                          {inr(b.charges.borrowCharge)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          </Reveal>
        </div>

        {/* Rail */}
        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Reveal delay={0.05}>
            <Card>
              <CardContent className="pt-5">
                <SectionTitle title="Trust score" hint="How the platform ranks reliability" />
                <TrustScorePanel user={user} className="mt-4" />
              </CardContent>
            </Card>
          </Reveal>

          <Reveal delay={0.08}>
            <Card>
              <CardContent className="pt-5">
                <p className="flex items-center gap-2 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Leaf className="size-3.5" />
                  {isSelf ? 'Your impact' : 'Their impact'}
                </p>
                <div className="mt-3 space-y-0.5">
                  <DataRow
                    label="Money not spent"
                    value={inr(impact.saved)}
                    strong
                    tone="primary"
                    hint="Versus buying what they borrowed"
                  />
                  <DataRow label="Resources reused" value={String(impact.reused)} />
                  <DataRow
                    label="Earned from sharing"
                    value={inr(impact.earned)}
                    hint="Charges from completed loans"
                  />
                  <DataRow
                    label="Idle value unlocked"
                    value={inr(impact.idleValue)}
                    hint="Retail value of everything they list"
                  />
                </div>
                <Link
                  to="/impact"
                  className={cn(buttonVariants({ variant: 'soft', size: 'sm' }), 'mt-4 w-full')}
                >
                  <Sparkles />
                  See campus impact
                </Link>
              </CardContent>
            </Card>
          </Reveal>

          {isSelf && (
            <Reveal delay={0.1}>
              <Card>
                <CardContent className="pt-5">
                  <p className="flex items-center gap-2 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <Coins className="size-3.5" />
                    Wallet
                  </p>
                  <p className="mt-2 text-2xs leading-relaxed text-muted-foreground">
                    CampusLoop simulates payments for the demo. Deposits are held against active
                    loans and released the moment a return passes inspection.
                  </p>
                  <div className="mt-3 space-y-0.5">
                    <DataRow
                      label="Deposits held"
                      value={inr(
                        active
                          .filter((b) => b.borrowerId === user.id && !b.settlement)
                          .reduce((sum, b) => sum + b.charges.deposit, 0),
                      )}
                      tone="muted"
                    />
                    <DataRow label="Active exchanges" value={String(active.length)} />
                  </div>
                  <Link
                    to="/borrowings"
                    className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'mt-4 w-full')}
                  >
                    Open my borrowings
                    <ArrowRight />
                  </Link>
                </CardContent>
              </Card>
            </Reveal>
          )}

          {!isSelf && (
            <Reveal delay={0.1}>
              <div className="rounded-xl border border-border bg-muted/40 p-4">
                <p className="text-[0.8125rem] font-medium">Borrowing from {user.name.split(' ')[0]}</p>
                <p className="mt-1.5 text-2xs leading-relaxed text-muted-foreground">
                  Every exchange is covered by a condition report at handover and at return, so
                  neither side has to take the other's word for it.
                </p>
                <Link
                  to="/discover"
                  className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'mt-3 w-full')}
                >
                  Browse their category
                </Link>
              </div>
            </Reveal>
          )}
        </div>
      </div>
    </Page>
  )
}
