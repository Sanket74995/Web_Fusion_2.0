import { Link } from 'react-router-dom'
import { ArrowUpRight, Heart, MapPin, Package } from 'lucide-react'
import type { Resource, User } from '@/types'
import { useStore } from '@/store/AppStore'
import { availabilityLabel, distanceLabel, inr } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Avatar, RatingStars } from './Avatar'
import { ResourceImage } from './ResourceImage'
import { AvailabilityBadge } from './StatusBadge'
import { TrustBadge } from './Trust'

export function ResourceCard({
  resource,
  owner,
  score,
  className,
  footer,
  compact,
}: {
  resource: Resource
  owner?: User
  /** AI match score, shown as a corner chip when present. */
  score?: number
  className?: string
  footer?: React.ReactNode
  compact?: boolean
}) {
  const free = resource.availabilityStatus === 'available'
  return (
    <div
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all duration-200 ease-snap hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md',
        className,
      )}
    >
      <Link to={`/resource/${resource.id}`} className="block focus-visible:outline-none">
        <div className="relative">
          <ResourceImage resource={resource} className={compact ? 'h-32' : 'h-40'} />
          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            <Badge variant="outline" size="sm" className="bg-card/90 backdrop-blur-sm">
              {resource.category}
            </Badge>
          </div>
          <div className="absolute right-3 top-3 flex items-center gap-1.5">
            {score !== undefined && (
              <Badge variant="ink" size="sm" className="num shadow-sm">
                {score}% match
              </Badge>
            )}
            <HeartButton resourceId={resource.id} />
          </div>
          {!free && (
            <div className="absolute inset-x-0 bottom-0 bg-ink/70 px-3 py-1.5 text-2xs font-medium text-white backdrop-blur-sm">
              {availabilityLabel(resource.availableFrom)}
            </div>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <Link to={`/resource/${resource.id}`} className="min-w-0 flex-1">
            <h3 className="truncate text-[0.9375rem] font-semibold leading-snug group-hover:text-primary">
              {resource.name}
            </h3>
          </Link>
          <ArrowUpRight className="mt-0.5 size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3.5" />
            {distanceLabel(resource.distanceKm)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Package className="size-3.5" />
            {resource.condition}
          </span>
        </div>

        {!compact && (
          <p className="mt-2.5 line-clamp-2 text-[0.8125rem] leading-relaxed text-muted-foreground">
            {resource.description}
          </p>
        )}

        <div className="mt-3 flex items-center justify-between gap-2">
          <div>
            <span className="num text-base font-semibold">{inr(resource.pricePerDay)}</span>
            <span className="text-xs text-muted-foreground">/day</span>
          </div>
          <RatingStars value={resource.rating} count={resource.ratingCount} size="xs" />
        </div>

        {owner && (
          <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
            <Link
              to={`/profile/${owner.id}`}
              className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <Avatar user={owner} size="xs" />
              <span className="truncate">{owner.name}</span>
            </Link>
            <div className="flex shrink-0 items-center gap-1.5">
              <TrustBadge user={owner} />
              <AvailabilityBadge resource={resource} />
            </div>
          </div>
        )}

        {footer && <div className="mt-3">{footer}</div>}
      </div>
    </div>
  )
}

/** Horizontal variant used in lists (my listings, admin, related items). */
export function ResourceRow({
  resource,
  owner,
  right,
  to,
  className,
}: {
  resource: Resource
  owner?: User
  right?: React.ReactNode
  to?: string
  className?: string
}) {
  const body = (
    <>
      <ResourceImage resource={resource} className="size-14 shrink-0" rounded="rounded-lg" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{resource.name}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {resource.category} · {inr(resource.pricePerDay)}/day
          {owner ? ` · ${owner.name}` : ''}
        </p>
      </div>
    </>
  )
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary/25',
        className,
      )}
    >
      {to ? (
        <Link to={to} className="flex min-w-0 flex-1 items-center gap-3">
          {body}
        </Link>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3">{body}</div>
      )}
      {right && <div className="shrink-0">{right}</div>}
    </div>
  )
}

function HeartButton({ resourceId }: { resourceId: string }) {
  const { toggleWishlist, isWishlisted } = useStore()
  const active = isWishlisted(resourceId)

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        toggleWishlist(resourceId)
      }}
      aria-label={active ? 'Remove from wishlist' : 'Save to wishlist'}
      className={cn(
        'inline-flex size-7 items-center justify-center rounded-full bg-card/90 shadow-sm backdrop-blur-sm transition-all duration-200 hover:scale-110',
        active ? 'text-destructive' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      <Heart className={cn('size-3.5', active && 'fill-destructive text-destructive')} />
    </button>
  )
}
