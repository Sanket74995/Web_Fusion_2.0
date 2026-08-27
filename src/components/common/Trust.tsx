import { Award, BadgeCheck, Clock, Flame, ShieldCheck, ShieldX, Zap } from 'lucide-react'
import type { BadgeKind, User } from '@/types'
import { trustBand, trustFactors } from '@/services/trust'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Progress, ScoreRing } from '@/components/ui/progress'
import { Tooltip } from '@/components/ui/tooltip'

const BADGE_ICON: Record<BadgeKind, typeof Award> = {
  'Verified Student': BadgeCheck,
  'Reliable Borrower': ShieldCheck,
  'Top Sharer': Flame,
  'Fast Responder': Zap,
  'Zero Disputes': Award,
}

export function TrustBadge({ user, className }: { user: User; className?: string }) {
  const band = trustBand(user.trustScore)
  const variant = band.tone === 'good' ? 'primary' : band.tone === 'warn' ? 'warning' : 'danger'
  return (
    <Tooltip label={`Trust score ${user.trustScore}/100 — ${band.label.toLowerCase()}`}>
      <Badge variant={variant} size="sm" className={cn('num', className)}>
        {band.tone === 'bad' ? <ShieldX /> : <ShieldCheck />}
        {user.trustScore}
      </Badge>
    </Tooltip>
  )
}

export function VerifiedTag({ user }: { user: User }) {
  if (!user.verified) {
    return (
      <Badge variant="warning" size="sm">
        <Clock />
        Unverified
      </Badge>
    )
  }
  return (
    <Badge variant="info" size="sm">
      <BadgeCheck />
      Verified student
    </Badge>
  )
}

export function BadgeList({ badges, className }: { badges: BadgeKind[]; className?: string }) {
  if (!badges.length) return null
  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {badges.map((b) => {
        const Icon = BADGE_ICON[b]
        return (
          <Badge key={b} variant="outline" size="sm">
            <Icon className="text-primary" />
            {b}
          </Badge>
        )
      })}
    </div>
  )
}

/** Full trust panel — the score plus what it is built from. */
export function TrustScorePanel({ user, className }: { user: User; className?: string }) {
  const band = trustBand(user.trustScore)
  const tone = band.tone === 'good' ? 'primary' : band.tone === 'warn' ? 'warning' : 'danger'
  const factors = trustFactors(user)
  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center gap-4">
        <ScoreRing value={user.trustScore} size={64} strokeWidth={6} tone={tone} label="trust" />
        <div>
          <p className="text-sm font-semibold">{band.label}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            Built from ratings, on-time returns, exchange history, disputes and ID verification.
          </p>
        </div>
      </div>
      <div className="space-y-3">
        {factors.map((f) => (
          <div key={f.label}>
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <span className="text-[0.8125rem] font-medium">{f.label}</span>
              <span className="num text-xs text-muted-foreground">{f.value}%</span>
            </div>
            <Progress
              value={f.value}
              size="sm"
              tone={f.value >= 75 ? 'primary' : f.value >= 50 ? 'warning' : 'danger'}
            />
            <p className="mt-1 text-2xs text-muted-foreground">{f.detail}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
