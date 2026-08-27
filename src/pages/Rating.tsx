import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  ArrowRight,
  Compass,
  Heart,
  PartyPopper,
  Recycle,
  Send,
  Sparkles,
  Star,
  TrendingUp,
} from 'lucide-react'
import { useStore } from '@/store/AppStore'
import { estimatedRetailValue, savedByExchange } from '@/services/analytics'
import { inr } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, SectionTitle } from '@/components/ui/card'
import { Field, Textarea } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { BORROW_FLOW_STEPS, FlowSteps, Page, PageHeader } from '@/components/layout/PageShell'
import { Reveal } from '@/components/common/Motion'
import { ResourceImage } from '@/components/common/ResourceImage'
import { Avatar, RatingStars, StarInput } from '@/components/common/Avatar'
import { TrustBadge } from '@/components/common/Trust'
import { DataRow } from '@/components/common/StatCard'
import { NotFoundPage } from './NotFound'

const QUICK_TAGS = [
  'Replied fast',
  'Exactly as described',
  'Flexible on timing',
  'Handover was easy',
  'Would borrow again',
  'Well maintained',
]

export function RatingPage() {
  const { id = '' } = useParams()
  const { getBorrowing, getResource, getUser, getRating, submitRating } = useStore()
  const { toast } = useToast()
  const navigate = useNavigate()
  const reduce = useReducedMotion()

  const borrowing = getBorrowing(id)
  const resource = borrowing ? getResource(borrowing.resourceId) : undefined
  const owner = borrowing ? getUser(borrowing.ownerId) : undefined

  const [ownerRating, setOwnerRating] = useState(5)
  const [resourceRating, setResourceRating] = useState(5)
  const [exchangeRating, setExchangeRating] = useState(5)
  const [tags, setTags] = useState<string[]>([])
  const [review, setReview] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  if (!borrowing || !resource || !owner) return <NotFoundPage />

  const existing = getRating(borrowing.ratingId)
  const done = sent || Boolean(existing)
  const average = (ownerRating + resourceRating + exchangeRating) / 3
  const retail = estimatedRetailValue(resource)
  const saved = savedByExchange(resource, borrowing.charges.borrowCharge)
  // Stated assumption: one avoided purchase ≈ 1 kg CO₂ per ₹1,500 of retail value.
  const co2 = Math.max(2, Math.round(retail / 1500))

  const toggleTag = (tag: string) =>
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))

  const submit = () => {
    if (submitting || done) return
    setSubmitting(true)
    const text = [review.trim(), tags.length ? tags.join(' · ') : ''].filter(Boolean).join(' — ')
    window.setTimeout(() => {
      submitRating(borrowing.id, {
        ownerRating,
        resourceRating,
        exchangeRating,
        review: text,
      })
      setSubmitting(false)
      setSent(true)
      toast({
        title: 'Thanks — that helps the next borrower',
        description: `${owner.name.split(' ')[0]}'s trust score has been updated.`,
        tone: 'success',
      })
    }, 650)
  }

  return (
    <Page width="form">
      <PageHeader
        back={{ to: `/borrowings/${borrowing.id}`, label: 'Back to exchange' }}
        eyebrow={<FlowSteps steps={BORROW_FLOW_STEPS} current={7} />}
        title={done ? 'Exchange complete' : 'Rate this exchange'}
        subtitle={
          done
            ? 'That is the full loop — requested, agreed, paid, handed over, used, returned, inspected, settled and rated.'
            : `Ratings are what make lending to a stranger on campus feel safe. Be honest — ${owner.name.split(' ')[0]} rates you too.`
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          <AnimatePresence mode="wait" initial={false}>
            {done ? (
              <motion.div
                key="done"
                initial={{ opacity: 0, y: reduce ? 0 : 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-5"
              >
                <Card>
                  <CardContent className="pt-5">
                    <div className="flex flex-col items-center py-4 text-center">
                      <span className="relative inline-flex size-14 items-center justify-center rounded-full bg-primary-soft text-primary">
                        <span className="animate-pulse-ring absolute inset-0 rounded-full border border-primary/40" />
                        <PartyPopper className="size-7" />
                      </span>
                      <p className="mt-3.5 text-lg font-semibold tracking-tight">
                        Rating submitted
                      </p>
                      <p className="mt-1 max-w-sm text-[0.8125rem] leading-relaxed text-muted-foreground">
                        {existing?.review || 'Your feedback is now part of this listing and of'}{' '}
                        {owner.name.split(' ')[0]}&rsquo;s trust score.
                      </p>
                      <div className="mt-4">
                        <RatingStars
                          value={existing?.ownerRating ?? ownerRating}
                          size="md"
                          showValue
                        />
                      </div>
                    </div>

                    <div className="grid gap-3 border-t border-border pt-5 sm:grid-cols-3">
                      {[
                        { label: 'Owner', value: existing?.ownerRating ?? ownerRating },
                        { label: 'Resource', value: existing?.resourceRating ?? resourceRating },
                        { label: 'Exchange', value: existing?.exchangeRating ?? exchangeRating },
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
                  </CardContent>
                </Card>

                <Card className="border-primary/25 bg-primary-soft/40">
                  <CardContent className="pt-5">
                    <SectionTitle
                      title="What this one exchange did"
                      hint="Access instead of ownership, measured"
                    />
                    <div className="grid gap-3 sm:grid-cols-3">
                      {[
                        {
                          icon: TrendingUp,
                          value: inr(saved),
                          label: 'Avoided spending on a purchase',
                        },
                        {
                          icon: Recycle,
                          value: `${co2} kg`,
                          label: 'Estimated CO₂ not emitted',
                        },
                        {
                          icon: Heart,
                          value: '1',
                          label: 'New campus connection',
                        },
                      ].map((s) => (
                        <div key={s.label} className="rounded-xl border border-primary/20 bg-card p-3.5">
                          <span className="inline-flex size-8 items-center justify-center rounded-lg bg-primary-soft text-primary">
                            <s.icon className="size-4" />
                          </span>
                          <p className="num mt-2.5 text-lg font-semibold tracking-tight">{s.value}</p>
                          <p className="mt-0.5 text-2xs leading-relaxed text-muted-foreground">
                            {s.label}
                          </p>
                        </div>
                      ))}
                    </div>
                    <p className="mt-4 text-[0.8125rem] leading-relaxed text-muted-foreground">
                      Everything you needed was already on campus. That is the whole idea.
                    </p>
                  </CardContent>
                </Card>

                <div className="flex flex-wrap gap-2">
                  <Link to="/discover" className={cn(buttonVariants({ size: 'lg' }))}>
                    <Compass />
                    Borrow something else
                  </Link>
                  <Link
                    to="/impact"
                    className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}
                  >
                    <Sparkles />
                    See campus impact
                  </Link>
                  <Link
                    to="/borrowings"
                    className={cn(buttonVariants({ variant: 'ghost', size: 'lg' }))}
                  >
                    My borrowings
                  </Link>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-5"
              >
                <Card>
                  <CardContent className="space-y-5 pt-5">
                    <SectionTitle
                      title="Three quick ratings"
                      hint="Each one feeds a different part of the platform"
                    />
                    {[
                      {
                        label: `${owner.name.split(' ')[0]} as an owner`,
                        hint: 'Communication, punctuality, fairness',
                        value: ownerRating,
                        set: setOwnerRating,
                      },
                      {
                        label: `${resource.name}`,
                        hint: 'Was it as described and in the stated condition?',
                        value: resourceRating,
                        set: setResourceRating,
                      },
                      {
                        label: 'The exchange overall',
                        hint: 'Handover, return, how smooth it felt',
                        value: exchangeRating,
                        set: setExchangeRating,
                      },
                    ].map((row) => (
                      <div
                        key={row.label}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3.5"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[0.875rem] font-medium">{row.label}</p>
                          <p className="text-2xs text-muted-foreground">{row.hint}</p>
                        </div>
                        <StarInput value={row.value} onChange={row.set} label={row.label} />
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-5">
                    <SectionTitle title="What stood out?" hint="Optional — tap any that apply" />
                    <div className="flex flex-wrap gap-2">
                      {QUICK_TAGS.map((tag) => {
                        const active = tags.includes(tag)
                        return (
                          <button
                            key={tag}
                            type="button"
                            aria-pressed={active}
                            onClick={() => toggleTag(tag)}
                            className={cn(
                              'rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-150 ease-snap',
                              active
                                ? 'border-primary bg-primary-soft text-primary'
                                : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
                            )}
                          >
                            {tag}
                          </button>
                        )
                      })}
                    </div>

                    <div className="mt-5">
                      <Field
                        label="Write a review"
                        hint="Two lines is plenty. Other students read this before they request."
                      >
                        {(fieldId) => (
                          <Textarea
                            id={fieldId}
                            rows={4}
                            value={review}
                            onChange={(e) => setReview(e.target.value)}
                            placeholder={`Picked the ${resource.name} up outside ${borrowing.pickupLocation}, ${owner.name.split(' ')[0]} walked me through the settings and it worked perfectly for the shoot.`}
                          />
                        )}
                      </Field>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
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
                    <Badge variant="success" size="sm" className="mt-1.5">
                      Exchange closed
                    </Badge>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2.5 border-t border-border pt-4">
                  <Avatar user={owner} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.8125rem] font-medium">{owner.name}</p>
                    <p className="num truncate text-2xs text-muted-foreground">
                      {owner.rating.toFixed(1)} ★ · {owner.successfulExchanges} exchanges
                    </p>
                  </div>
                  <TrustBadge user={owner} />
                </div>

                {borrowing.settlement && (
                  <div className="mt-4 space-y-0.5 border-t border-border pt-4">
                    <DataRow label="Paid" value={inr(borrowing.charges.total)} />
                    <DataRow
                      label="Deposit refunded"
                      value={inr(borrowing.settlement.refund)}
                      tone="primary"
                    />
                    <div className="mt-1 border-t border-border pt-1">
                      <DataRow
                        label="Net cost of borrowing"
                        value={inr(borrowing.charges.total - borrowing.settlement.refund)}
                        strong
                        hint={`Instead of about ${inr(retail)} to buy it`}
                      />
                    </div>
                  </div>
                )}

                {!done && (
                  <>
                    <div className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 px-3.5 py-3">
                      <span className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Your average
                      </span>
                      <span className="num flex items-center gap-1 text-[0.9375rem] font-semibold">
                        <Star className="size-4 fill-accent text-accent" />
                        {average.toFixed(1)}
                      </span>
                    </div>
                    <Button
                      className="mt-4 w-full"
                      size="lg"
                      loading={submitting}
                      onClick={submit}
                    >
                      <Send />
                      Submit rating
                    </Button>
                    <button
                      type="button"
                      onClick={() => navigate(`/borrowings/${borrowing.id}`)}
                      className="mt-2 w-full text-center text-2xs text-muted-foreground transition-colors hover:text-foreground"
                    >
                      Skip for now
                    </button>
                  </>
                )}

                {done && (
                  <Link
                    to={`/profile/${owner.id}`}
                    className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'mt-5 w-full')}
                  >
                    View {owner.name.split(' ')[0]}&rsquo;s profile
                    <ArrowRight />
                  </Link>
                )}
              </CardContent>
            </Card>
          </Reveal>
        </div>
      </div>
    </Page>
  )
}
