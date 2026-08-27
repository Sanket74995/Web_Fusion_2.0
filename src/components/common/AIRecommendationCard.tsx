import { Link } from 'react-router-dom'
import { Check, ChevronRight, Sparkles, X } from 'lucide-react'
import type { Recommendation } from '@/types'
import { WEIGHT_LABELS } from '@/services/matching'
import { availabilityLabel, inr } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Avatar, RatingStars } from './Avatar'
import { ResourceImage } from './ResourceImage'
import { TrustBadge } from './Trust'

/** One AI pick: why it won, what it costs, and a direct path to borrow it. */
export function AIRecommendationCard({
  rec,
  rank,
  days,
  className,
  showBreakdown = false,
  onToggleBreakdown,
}: {
  rec: Recommendation
  rank?: number
  days: number
  className?: string
  showBreakdown?: boolean
  onToggleBreakdown?: () => void
}) {
  const { resource, owner } = rec
  const charge = resource.pricePerDay * days
  return (
    <div
      className={cn(
        'group flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-all duration-200 ease-snap hover:shadow-md',
        rank === 1 ? 'border-primary/35 ring-1 ring-primary/10' : 'border-border',
        className,
      )}
    >
      <div className="flex gap-4 p-4">
        <Link to={`/resource/${resource.id}`} className="shrink-0">
          <ResourceImage resource={resource} className="size-20" rounded="rounded-lg" />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {rank === 1 && (
                  <Badge variant="primary" size="sm">
                    <Sparkles />
                    Best match
                  </Badge>
                )}
                <Badge variant="neutral" size="sm">
                  {rec.forItem}
                </Badge>
              </div>
              <Link to={`/resource/${resource.id}`}>
                <h3 className="mt-1.5 truncate text-[0.9375rem] font-semibold leading-snug hover:text-primary">
                  {resource.name}
                </h3>
              </Link>
            </div>
            <div className="shrink-0 text-right">
              <p className="num text-base font-semibold">{inr(resource.pricePerDay)}</p>
              <p className="text-2xs text-muted-foreground">/day</p>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {rec.reasons.map((r) => (
              <span
                key={r.label}
                className={cn(
                  'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-2xs font-medium',
                  r.positive
                    ? 'bg-primary-soft text-primary'
                    : 'bg-warning-soft text-warning',
                )}
              >
                {r.positive ? <Check className="size-3" /> : <X className="size-3" />}
                {r.label}
              </span>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
            <Link
              to={`/profile/${owner.id}`}
              className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <Avatar user={owner} size="xs" />
              <span className="truncate">{owner.name}</span>
              <TrustBadge user={owner} />
            </Link>
            <RatingStars value={resource.rating} count={resource.ratingCount} size="xs" />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/40 px-4 py-3">
        <div className="min-w-0">
          <p className="num text-[0.8125rem] font-semibold">
            {inr(charge)} for {days} day{days > 1 ? 's' : ''}
          </p>
          <p className="text-2xs text-muted-foreground">
            + {inr(resource.deposit)} refundable deposit · {availabilityLabel(resource.availableFrom)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onToggleBreakdown && (
            <Button variant="ghost" size="sm" onClick={onToggleBreakdown} className="num">
              {rec.score}% match
              <ChevronRight
                className={cn('transition-transform duration-200', showBreakdown && 'rotate-90')}
              />
            </Button>
          )}
          <Link
            to={`/borrow/${resource.id}`}
            className={cn(buttonVariants({ size: 'sm' }), 'gap-1.5')}
          >
            Borrow this
            <ChevronRight />
          </Link>
        </div>
      </div>

      {showBreakdown && (
        <div className="border-t border-border px-4 py-3.5">
          <p className="mb-2.5 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
            How this {rec.score}% was calculated
          </p>
          <div className="grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
            {WEIGHT_LABELS.map((w) => {
              const raw = rec.factors[w.key]
              return (
                <div key={w.key}>
                  <div className="mb-1 flex items-baseline justify-between gap-2 text-2xs">
                    <span className="font-medium">
                      {w.label}
                      <span className="ml-1 text-muted-foreground">
                        {Math.round(w.weight * 100)}%
                      </span>
                    </span>
                    <span className="num text-muted-foreground">{Math.round(raw * 100)}/100</span>
                  </div>
                  <Progress
                    value={raw * 100}
                    size="sm"
                    tone={raw >= 0.75 ? 'primary' : raw >= 0.45 ? 'warning' : 'danger'}
                  />
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
