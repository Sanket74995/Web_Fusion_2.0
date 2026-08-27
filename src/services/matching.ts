import type {
  MatchFactorBreakdown,
  MatchReason,
  Recommendation,
  Resource,
  User,
} from '@/types'
import { clamp } from '@/lib/utils'
import { availabilityLabel, distanceLabel, startOfDay } from '@/lib/format'

/**
 * Recommendation weights, straight from the product spec.
 * Availability dominates — a perfect resource you cannot get is worth nothing.
 */
export const WEIGHTS = {
  availability: 0.3,
  distance: 0.2,
  suitability: 0.2,
  trust: 0.15,
  condition: 0.1,
  price: 0.05,
} as const

export const WEIGHT_LABELS: { key: keyof MatchFactorBreakdown; label: string; weight: number }[] = [
  { key: 'availability', label: 'Availability', weight: WEIGHTS.availability },
  { key: 'distance', label: 'Distance', weight: WEIGHTS.distance },
  { key: 'suitability', label: 'Suitability', weight: WEIGHTS.suitability },
  { key: 'trust', label: 'Trust', weight: WEIGHTS.trust },
  { key: 'condition', label: 'Condition', weight: WEIGHTS.condition },
  { key: 'price', label: 'Price', weight: WEIGHTS.price },
]

const CONDITION_SCORE: Record<Resource['condition'], number> = {
  Excellent: 1,
  Good: 0.78,
  Fair: 0.55,
}

/** Furthest distance that still scores anything, in km. */
const MAX_DISTANCE_KM = 3

export interface MatchContext {
  startDate: string
  endDate: string
  /** Keywords from the parsed requirement, lower-cased. */
  needTags: string[]
  /** Budget for the whole requirement, per day. Null ⇒ price is neutral. */
  budgetPerDay: number | null
  /** Category the requirement slot expects, used as a suitability bonus. */
  category?: Resource['category']
}

export function availabilityScore(resource: Resource, startDate: string) {
  if (resource.availabilityStatus === 'unavailable') return 0
  const free = startOfDay(resource.availableFrom).getTime()
  const wanted = startOfDay(startDate).getTime()
  if (free <= wanted) return 1
  const daysAway = Math.round((free - wanted) / 86400000)
  if (daysAway <= 1) return 0.55
  if (daysAway <= 3) return 0.3
  return 0.05
}

export function isFreeFor(resource: Resource, startDate: string) {
  return availabilityScore(resource, startDate) === 1
}

export function suitabilityScore(resource: Resource, ctx: MatchContext) {
  if (!ctx.needTags.length) return ctx.category && resource.category === ctx.category ? 0.9 : 0.6
  const haystack = [
    resource.name.toLowerCase(),
    resource.category.toLowerCase(),
    ...resource.tags,
    ...resource.accessories.map((a) => a.toLowerCase()),
  ].join(' ')

  let hits = 0
  for (const tag of ctx.needTags) {
    if (tag.length < 3) continue
    if (haystack.includes(tag)) hits += 1
  }
  const coverage = clamp(hits / Math.max(2, Math.min(ctx.needTags.length, 5)))
  const categoryBonus = ctx.category && resource.category === ctx.category ? 0.28 : 0
  const popularity = clamp(resource.timesBorrowed / 30) * 0.12
  return clamp(coverage * 0.7 + categoryBonus + popularity)
}

export function priceScore(resource: Resource, budgetPerDay: number | null) {
  if (budgetPerDay === null) {
    // No stated budget: cheaper is mildly better.
    return clamp(1 - resource.pricePerDay / 500)
  }
  if (resource.pricePerDay <= budgetPerDay) return 1
  const over = (resource.pricePerDay - budgetPerDay) / budgetPerDay
  return clamp(1 - over)
}

export function scoreResource(resource: Resource, owner: User, ctx: MatchContext) {
  const factors: MatchFactorBreakdown = {
    availability: availabilityScore(resource, ctx.startDate),
    distance: clamp(1 - resource.distanceKm / MAX_DISTANCE_KM),
    suitability: suitabilityScore(resource, ctx),
    trust: clamp(owner.trustScore / 100),
    condition: clamp(CONDITION_SCORE[resource.condition] * 0.85 + (resource.rating / 5) * 0.15),
    price: priceScore(resource, ctx.budgetPerDay),
  }
  const raw =
    factors.availability * WEIGHTS.availability +
    factors.distance * WEIGHTS.distance +
    factors.suitability * WEIGHTS.suitability +
    factors.trust * WEIGHTS.trust +
    factors.condition * WEIGHTS.condition +
    factors.price * WEIGHTS.price

  return { factors, score: Math.min(99, Math.round(raw * 100)) }
}

export function matchReasons(
  resource: Resource,
  owner: User,
  ctx: MatchContext,
  factors: MatchFactorBreakdown,
): MatchReason[] {
  const reasons: MatchReason[] = []

  if (factors.availability === 1) {
    reasons.push({ label: availabilityLabel(resource.availableFrom), positive: true })
  } else {
    reasons.push({ label: `Free from ${availabilityLabel(resource.availableFrom).replace('Available ', '')}`, positive: false })
  }

  reasons.push({ label: distanceLabel(resource.distanceKm), positive: resource.distanceKm <= 1.2 })

  if (resource.condition === 'Excellent') reasons.push({ label: 'Excellent condition', positive: true })
  else if (resource.condition === 'Good') reasons.push({ label: 'Good condition', positive: true })

  if (owner.trustScore >= 90) reasons.push({ label: `Trusted owner · ${owner.trustScore} trust`, positive: true })
  else if (owner.rating >= 4.7) reasons.push({ label: `Highly rated owner · ${owner.rating.toFixed(1)}★`, positive: true })

  if (ctx.budgetPerDay !== null) {
    reasons.push({
      label: resource.pricePerDay <= ctx.budgetPerDay ? 'Within budget' : `₹${resource.pricePerDay}/day — over budget`,
      positive: resource.pricePerDay <= ctx.budgetPerDay,
    })
  }

  if (resource.accessories.length >= 3) {
    reasons.push({ label: `${resource.accessories.length} accessories included`, positive: true })
  }

  return reasons.slice(0, 5)
}

export function recommend(
  resources: Resource[],
  users: User[],
  ctx: MatchContext,
  opts: { limit?: number; forItem?: string; essential?: boolean } = {},
): Recommendation[] {
  const userById = new Map(users.map((u) => [u.id, u]))
  const out: Recommendation[] = []

  for (const resource of resources) {
    if (resource.approvalStatus !== 'approved') continue
    const owner = userById.get(resource.ownerId)
    if (!owner || owner.status === 'suspended') continue
    const { score, factors } = scoreResource(resource, owner, ctx)
    out.push({
      resource,
      owner,
      score,
      factors,
      reasons: matchReasons(resource, owner, ctx, factors),
      forItem: opts.forItem ?? resource.category,
      essential: opts.essential ?? true,
    })
  }

  out.sort((a, b) => b.score - a.score)
  return opts.limit ? out.slice(0, opts.limit) : out
}

/** "Not available? Try these instead." — nearest available substitutes. */
export function alternativesFor(
  resource: Resource,
  resources: Resource[],
  users: User[],
  ctx: MatchContext,
  limit = 3,
): Recommendation[] {
  const pool = resources.filter(
    (r) => r.id !== resource.id && r.category === resource.category && isFreeFor(r, ctx.startDate),
  )
  return recommend(pool, users, { ...ctx, category: resource.category }, { limit })
}
