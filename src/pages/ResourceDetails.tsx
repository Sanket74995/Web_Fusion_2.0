import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowRight,
  CalendarRange,
  CheckCircle2,
  ClipboardList,
  Clock,
  Info,
  MapPin,
  Package,
  Repeat,
  Ruler,
  ShieldCheck,
  Sparkles,
  Star,
} from 'lucide-react'
import { useStore } from '@/store/AppStore'
import { alternativesFor, type MatchContext } from '@/services/matching'
import { computeCharges } from '@/services/pricing'
import { addDays, availabilityLabel, distanceLabel, fmtDate, inr, timeAgo, toDateInput } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, SectionTitle } from '@/components/ui/card'
import { Field, Input } from '@/components/ui/input'
import { Page, PageHeader } from '@/components/layout/PageShell'
import { Reveal } from '@/components/common/Motion'
import { ResourceImage } from '@/components/common/ResourceImage'
import { AvailabilityBadge } from '@/components/common/StatusBadge'
import { Avatar, RatingStars } from '@/components/common/Avatar'
import { TrustBadge, TrustScorePanel, VerifiedTag } from '@/components/common/Trust'
import { ChargeBreakdown } from '@/components/common/ChargeBreakdown'
import { ResourceCard } from '@/components/common/ResourceCard'
import { EmptyState } from '@/components/common/EmptyState'
import { NotFoundPage } from './NotFound'

export function ResourceDetailsPage() {
  const { id = '' } = useParams()
  const { state, getResource, getUser } = useStore()
  const navigate = useNavigate()

  const resource = getResource(id)
  const [start, setStart] = useState(() => toDateInput(new Date()))
  const [end, setEnd] = useState(() => toDateInput(addDays(new Date(), 2)))

  const owner = resource ? getUser(resource.ownerId) : undefined

  const charges = useMemo(
    () =>
      resource && end >= start
        ? computeCharges(resource, start, end, state.platformFeeRate)
        : undefined,
    [resource, start, end, state.platformFeeRate],
  )

  const alternatives = useMemo(() => {
    if (!resource) return []
    const ctx: MatchContext = {
      startDate: start,
      endDate: end,
      needTags: resource.tags,
      budgetPerDay: null,
      category: resource.category,
    }
    return alternativesFor(resource, state.resources, state.users, ctx, 3)
  }, [resource, state.resources, state.users, start, end])

  const reviews = useMemo(
    () =>
      state.ratings
        .filter((r) => r.resourceId === id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 4),
    [state.ratings, id],
  )

  const otherListings = useMemo(
    () => state.resources.filter((r) => r.ownerId === resource?.ownerId && r.id !== id).slice(0, 3),
    [state.resources, resource?.ownerId, id],
  )

  if (!resource || !owner) return <NotFoundPage />

  const isOwn = resource.ownerId === state.currentUserId
  const unavailable = resource.availabilityStatus !== 'available'
  const days = charges?.days ?? 1

  return (
    <Page>
      <PageHeader
        back={{ to: '/discover', label: 'Back to discover' }}
        eyebrow={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" size="sm">
              {resource.category}
            </Badge>
            <AvailabilityBadge resource={resource} size="sm" />
            {resource.flagged && (
              <Badge variant="danger" size="sm">
                Flagged for review
              </Badge>
            )}
            {resource.approvalStatus === 'pending' && (
              <Badge variant="warning" size="sm">
                Pending approval
              </Badge>
            )}
          </div>
        }
        title={resource.name}
        subtitle={
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-3.5" />
              {resource.location} · {distanceLabel(resource.distanceKm)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Star className="size-3.5" />
              <span className="num">{resource.rating.toFixed(1)}</span>
              <span className="num">({resource.ratingCount})</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Repeat className="size-3.5" />
              borrowed <span className="num">{resource.timesBorrowed}</span> times
            </span>
          </span>
        }
      />

      <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        {/* ── Left column ─────────────────────────────────── */}
        <div className="min-w-0 space-y-6">
          <Reveal>
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <ResourceImage resource={resource} className="h-64 sm:h-80" rounded="rounded-none" />
              <div className="grid grid-cols-3 gap-px bg-border">
                {[
                  { label: 'Condition', value: resource.condition, icon: ShieldCheck },
                  {
                    label: 'Available',
                    value: availabilityLabel(resource.availableFrom).replace('Available ', ''),
                    icon: CalendarRange,
                  },
                  { label: 'Distance', value: distanceLabel(resource.distanceKm), icon: Ruler },
                ].map((s) => (
                  <div key={s.label} className="bg-card px-3 py-3 text-center sm:px-4">
                    <s.icon className="mx-auto size-4 text-muted-foreground" />
                    <p className="mt-1.5 truncate text-[0.8125rem] font-semibold">{s.value}</p>
                    <p className="text-2xs text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.05}>
            <Card>
              <CardContent className="pt-5">
                <SectionTitle title="About this resource" />
                <p className="mt-3 whitespace-pre-line text-[0.875rem] leading-relaxed text-muted-foreground">
                  {resource.description}
                </p>

                <div className="mt-5 rounded-xl border border-border bg-muted/40 p-4">
                  <p className="flex items-center gap-2 text-[0.8125rem] font-semibold">
                    <Info className="size-3.5 text-info" />
                    Condition notes from the owner
                  </p>
                  <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-muted-foreground">
                    {resource.conditionNotes}
                  </p>
                </div>

                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                  <div>
                    <p className="flex items-center gap-2 text-[0.8125rem] font-semibold">
                      <Package className="size-3.5 text-muted-foreground" />
                      What is included
                    </p>
                    <ul className="mt-2.5 space-y-1.5">
                      {resource.accessories.map((a) => (
                        <li key={a} className="flex items-start gap-2 text-[0.8125rem] text-muted-foreground">
                          <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-primary" />
                          {a}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="flex items-center gap-2 text-[0.8125rem] font-semibold">
                      <ClipboardList className="size-3.5 text-muted-foreground" />
                      Borrowing conditions
                    </p>
                    <ul className="mt-2.5 space-y-1.5">
                      {resource.borrowingConditions.map((c) => (
                        <li key={c} className="flex items-start gap-2 text-[0.8125rem] text-muted-foreground">
                          <span className="mt-1.5 size-1 shrink-0 rounded-full bg-muted-foreground" />
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Reveal>

          <Reveal delay={0.1}>
            <Card>
              <CardContent className="pt-5">
                <SectionTitle
                  title="Reviews from borrowers"
                  hint={`${resource.ratingCount} rating${resource.ratingCount === 1 ? '' : 's'}`}
                />
                {reviews.length === 0 ? (
                  <EmptyState
                    compact
                    className="mt-3"
                    icon={<Star />}
                    title="No written reviews yet"
                    message="Be the first to borrow this and leave a review."
                  />
                ) : (
                  <ul className="mt-4 space-y-4">
                    {reviews.map((r) => {
                      const author = getUser(r.fromUserId)
                      return (
                        <li key={r.id} className="border-b border-border pb-4 last:border-0 last:pb-0">
                          <div className="flex items-center gap-2.5">
                            {author && <Avatar user={author} size="sm" />}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[0.8125rem] font-medium">
                                {author?.name ?? 'Campus member'}
                              </p>
                              <p className="text-2xs text-muted-foreground">{timeAgo(r.createdAt)}</p>
                            </div>
                            <RatingStars value={r.resourceRating} size="xs" showValue />
                          </div>
                          <p className="mt-2 text-[0.8125rem] leading-relaxed text-muted-foreground">
                            {r.review}
                          </p>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </Reveal>
        </div>

        {/* ── Right column ────────────────────────────────── */}
        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Reveal delay={0.05}>
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-baseline gap-1.5">
                  <span className="num text-[1.75rem] font-bold tracking-tight">
                    {inr(resource.pricePerDay)}
                  </span>
                  <span className="text-sm text-muted-foreground">/ day</span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-2xs text-muted-foreground">
                  {resource.pricePerHour ? (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3" />
                      <span className="num">{inr(resource.pricePerHour)}</span>/hour
                    </span>
                  ) : null}
                  <span>
                    Min charge <span className="num">{inr(resource.minCharge)}</span>
                  </span>
                  <span>
                    Deposit <span className="num">{inr(resource.deposit)}</span> refundable
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <Field label="From">
                    {(fid) => (
                      <Input
                        id={fid}
                        type="date"
                        value={start}
                        min={toDateInput(new Date())}
                        onChange={(e) => {
                          setStart(e.target.value)
                          if (e.target.value > end) setEnd(e.target.value)
                        }}
                      />
                    )}
                  </Field>
                  <Field label="Until">
                    {(fid) => (
                      <Input
                        id={fid}
                        type="date"
                        value={end}
                        min={start}
                        onChange={(e) => setEnd(e.target.value)}
                      />
                    )}
                  </Field>
                </div>

                {charges && (
                  <div className="mt-4">
                    <ChargeBreakdown charges={charges} pricePerDay={resource.pricePerDay} />
                  </div>
                )}

                <div className="mt-5 space-y-2">
                  {isOwn ? (
                    <>
                      <p className="rounded-lg border border-border bg-muted/50 px-3.5 py-2.5 text-2xs leading-relaxed text-muted-foreground">
                        This is your own listing — you cannot borrow it. Manage availability and
                        pricing from My Listings.
                      </p>
                      <Link to="/listings" className={cn(buttonVariants({ variant: 'outline' }), 'w-full')}>
                        Manage listing
                      </Link>
                    </>
                  ) : (
                    <>
                      <Button
                        className="w-full"
                        size="lg"
                        disabled={unavailable}
                        onClick={() =>
                          navigate(`/borrow/${resource.id}?start=${start}&end=${end}`)
                        }
                      >
                        {unavailable ? 'Currently unavailable' : 'Request to borrow'}
                        {!unavailable && <ArrowRight />}
                      </Button>
                      <p className="text-center text-2xs text-muted-foreground">
                        You will not be charged until {owner.name.split(' ')[0]} accepts.
                      </p>
                    </>
                  )}
                </div>

                {unavailable && (
                  <p className="mt-3 rounded-lg border border-warning/25 bg-warning-soft px-3.5 py-2.5 text-2xs leading-relaxed text-warning">
                    On loan until {fmtDate(resource.availableFrom)}. Pick one of the alternatives
                    below, or request it for a later date.
                  </p>
                )}
              </CardContent>
            </Card>
          </Reveal>

          <Reveal delay={0.1}>
            <Card>
              <CardContent className="pt-5">
                <SectionTitle title="Owner" />
                <Link
                  to={`/profile/${owner.id}`}
                  className="mt-3 flex items-center gap-3 rounded-lg transition-opacity hover:opacity-80"
                >
                  <Avatar user={owner} size="lg" />
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 truncate text-[0.875rem] font-semibold">
                      {owner.name}
                      <VerifiedTag user={owner} />
                    </p>
                    <p className="truncate text-2xs text-muted-foreground">
                      {owner.department} · Year {owner.year}
                    </p>
                    <div className="mt-1">
                      <RatingStars value={owner.rating} count={owner.ratingCount} size="xs" showValue />
                    </div>
                  </div>
                </Link>
                <div className="mt-3.5 flex items-center gap-2">
                  <TrustBadge user={owner} />
                  <span className="num text-2xs text-muted-foreground">
                    {owner.successfulExchanges} exchanges · {owner.onTimeRate}% on time
                  </span>
                </div>
                <div className="mt-4">
                  <TrustScorePanel user={owner} />
                </div>
              </CardContent>
            </Card>
          </Reveal>

          {otherListings.length > 0 && (
            <Reveal delay={0.12}>
              <Card>
                <CardContent className="pt-5">
                  <SectionTitle title={`Also from ${owner.name.split(' ')[0]}`} />
                  <ul className="mt-3 space-y-2">
                    {otherListings.map((r) => (
                      <li key={r.id}>
                        <Link
                          to={`/resource/${r.id}`}
                          className="-mx-1.5 flex items-center gap-3 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-muted"
                        >
                          <ResourceImage
                            resource={r}
                            className="size-10 shrink-0"
                            rounded="rounded-lg"
                            iconClassName="size-4"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[0.8125rem] font-medium">{r.name}</span>
                            <span className="num block text-2xs text-muted-foreground">
                              {inr(r.pricePerDay)}/day
                            </span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </Reveal>
          )}
        </div>
      </div>

      {/* ── Alternatives ──────────────────────────────────── */}
      {alternatives.length > 0 && (
        <section className="mt-12">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <Badge variant="outline" size="sm">
                  <Sparkles className="size-3" />
                  {unavailable ? 'Not available? Try these instead' : 'Similar on campus'}
                </Badge>
                <h2 className="mt-3 text-xl font-semibold tracking-tight">
                  {alternatives.length} other option{alternatives.length > 1 ? 's' : ''} free for these dates
                </h2>
              </div>
              <Link
                to={`/discover?category=${encodeURIComponent(resource.category)}`}
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
              >
                All {resource.category.toLowerCase()}
              </Link>
            </div>
          </Reveal>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {alternatives.map((alt) => (
              <ResourceCard
                key={alt.resource.id}
                resource={alt.resource}
                owner={alt.owner}
                score={alt.score}
                footer={
                  <span className="num text-2xs text-muted-foreground">
                    {inr(alt.resource.pricePerDay * days)} for {days} day{days > 1 ? 's' : ''}
                  </span>
                }
              />
            ))}
          </div>
        </section>
      )}
    </Page>
  )
}
