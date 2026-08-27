import { clamp, cn } from '@/lib/utils'

export function Progress({
  value,
  className,
  tone = 'primary',
  size = 'md',
}: {
  /** 0–100 */
  value: number
  className?: string
  tone?: 'primary' | 'warning' | 'danger' | 'info' | 'ink'
  size?: 'sm' | 'md'
}) {
  const pct = clamp(value, 0, 100)
  const fill = {
    primary: 'bg-primary',
    warning: 'bg-warning',
    danger: 'bg-destructive',
    info: 'bg-info',
    ink: 'bg-ink',
  }[tone]
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn(
        'w-full overflow-hidden rounded-full bg-muted',
        size === 'sm' ? 'h-1.5' : 'h-2',
        className,
      )}
    >
      <div
        className={cn('h-full rounded-full transition-[width] duration-500 ease-snap', fill)}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

/** Circular score dial used for trust score and match score. */
export function ScoreRing({
  value,
  max = 100,
  size = 56,
  strokeWidth = 5,
  tone = 'primary',
  label,
  className,
}: {
  value: number
  max?: number
  size?: number
  strokeWidth?: number
  tone?: 'primary' | 'warning' | 'danger' | 'info'
  label?: string
  className?: string
}) {
  const pct = clamp(value / max, 0, 1)
  const r = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * r
  const stroke = {
    primary: 'stroke-primary',
    warning: 'stroke-warning',
    danger: 'stroke-destructive',
    info: 'stroke-info',
  }[tone]
  return (
    <div className={cn('relative inline-flex shrink-0', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={cn(stroke, 'transition-[stroke-dashoffset] duration-700 ease-snap')}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="num text-[0.8125rem] font-semibold leading-none">{Math.round(value)}</span>
        {label && <span className="mt-0.5 text-2xs text-muted-foreground">{label}</span>}
      </div>
    </div>
  )
}
