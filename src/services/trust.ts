import type { User } from '@/types'
import { clamp } from '@/lib/utils'

/**
 * Trust is a lived-in number, not a formula recomputed from scratch — a member's
 * score moves as exchanges land. These are the deltas the platform applies.
 */
const DELTAS = {
  onTimeReturn: 1,
  fiveStar: 1,
  lowRating: -3,
  lateReturn: -2,
  damageConfirmed: -4,
  disputeRaisedAgainst: -2,
}

export function adjustTrust(user: User, events: Partial<Record<keyof typeof DELTAS, boolean>>) {
  let delta = 0
  for (const [key, active] of Object.entries(events)) {
    if (active) delta += DELTAS[key as keyof typeof DELTAS]
  }
  return clamp(Math.round(user.trustScore + delta), 30, 99)
}

export interface TrustFactor {
  label: string
  value: number
  detail: string
}

/** Descriptive breakdown shown on the profile — what the score is built from. */
export function trustFactors(user: User): TrustFactor[] {
  return [
    {
      label: 'Member rating',
      value: Math.round((user.rating / 5) * 100),
      detail: `${user.rating.toFixed(1)} average across ${user.ratingCount} reviews`,
    },
    {
      label: 'On-time returns',
      value: Math.round(user.onTimeRate),
      detail: `${user.onTimeRate}% of exchanges returned before the deadline`,
    },
    {
      label: 'Exchange history',
      value: Math.round(Math.min(1, user.successfulExchanges / 35) * 100),
      detail: `${user.successfulExchanges} successful exchanges completed`,
    },
    {
      label: 'Dispute record',
      value: Math.round(Math.max(0, 1 - user.disputes * 0.3) * 100),
      detail: user.disputes === 0 ? 'No disputes raised' : `${user.disputes} dispute${user.disputes > 1 ? 's' : ''} on record`,
    },
    {
      label: 'Verification',
      value: user.verified ? 100 : 40,
      detail: user.verified ? 'College ID verified' : 'College ID not yet verified',
    },
  ]
}

export function trustBand(score: number) {
  if (score >= 90) return { label: 'Highly trusted', tone: 'good' as const }
  if (score >= 75) return { label: 'Trusted', tone: 'good' as const }
  if (score >= 60) return { label: 'Building trust', tone: 'warn' as const }
  return { label: 'Low trust', tone: 'bad' as const }
}

/** Rolling average that keeps the review count honest. */
export function blendRating(current: number, count: number, incoming: number) {
  const total = current * count + incoming
  return Math.round((total / (count + 1)) * 10) / 10
}
