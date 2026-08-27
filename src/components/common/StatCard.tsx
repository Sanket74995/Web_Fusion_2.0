import { ArrowDownRight, ArrowUpRight, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CountUp } from './Motion'

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  delta,
  tone = 'default',
  format,
  countTo,
  className,
}: {
  label: string
  value: string
  hint?: string
  icon?: LucideIcon
  /** e.g. "+12% vs last month" — sign drives the colour and arrow. */
  delta?: { value: string; positive: boolean }
  tone?: 'default' | 'primary' | 'warning' | 'danger' | 'info'
  /** When provided, the number animates up to this value on first view. */
  countTo?: number
  format?: (n: number) => string
  className?: string
}) {
  const toneRing = {
    default: 'bg-muted text-muted-foreground',
    primary: 'bg-primary-soft text-primary',
    warning: 'bg-warning-soft text-warning',
    danger: 'bg-destructive-soft text-destructive',
    info: 'bg-info-soft text-info',
  }[tone]

  return (
    <div className={cn('surface p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[0.8125rem] font-medium text-muted-foreground">{label}</p>
        {Icon && (
          <span className={cn('inline-flex size-8 items-center justify-center rounded-lg', toneRing)}>
            <Icon className="size-4" />
          </span>
        )}
      </div>
      <p className="num mt-3 text-2xl font-semibold tracking-tight">
        {countTo !== undefined ? <CountUp value={countTo} format={format} /> : value}
      </p>
      <div className="mt-1.5 flex items-center gap-2">
        {delta && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 text-xs font-medium',
              delta.positive ? 'text-primary' : 'text-destructive',
            )}
          >
            {delta.positive ? (
              <ArrowUpRight className="size-3.5" />
            ) : (
              <ArrowDownRight className="size-3.5" />
            )}
            {delta.value}
          </span>
        )}
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
    </div>
  )
}

export function ChartCard({
  title,
  hint,
  action,
  children,
  className,
  height = 260,
}: {
  title: string
  hint?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
  height?: number
}) {
  return (
    <div className={cn('surface flex flex-col p-5', className)}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
        </div>
        {action}
      </div>
      <div style={{ height }}>{children}</div>
    </div>
  )
}

/** Compact label/value row used inside summary panels. */
export function DataRow({
  label,
  value,
  hint,
  strong,
  tone,
  className,
}: {
  label: React.ReactNode
  value: React.ReactNode
  hint?: string
  strong?: boolean
  tone?: 'default' | 'primary' | 'danger' | 'muted'
  className?: string
}) {
  const valueTone = {
    default: 'text-foreground',
    primary: 'text-primary',
    danger: 'text-destructive',
    muted: 'text-muted-foreground',
  }[tone ?? 'default']
  return (
    <div className={cn('flex items-baseline justify-between gap-4 py-1.5', className)}>
      <div className="min-w-0">
        <span className={cn('text-[0.8125rem]', strong ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
          {label}
        </span>
        {hint && <p className="text-2xs text-muted-foreground">{hint}</p>}
      </div>
      <span
        className={cn(
          'num shrink-0 tabular-nums',
          strong ? 'text-[0.9375rem] font-semibold' : 'text-[0.8125rem] font-medium',
          valueTone,
        )}
      >
        {value}
      </span>
    </div>
  )
}
