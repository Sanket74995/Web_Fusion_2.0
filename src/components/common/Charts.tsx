import type { TooltipProps } from 'recharts'
import { cn } from '@/lib/utils'
import { num } from '@/lib/format'

/** Shared chart theming so every graph in the product reads the same way. */
export const CHART = {
  grid: 'var(--chart-grid)',
  axis: 'var(--chart-axis)',
  good: 'var(--chart-good)',
  warn: 'var(--chart-warn)',
}

export const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--chart-6)',
]

export const axisProps = {
  stroke: CHART.axis,
  tick: { fontSize: 11, fill: CHART.axis },
  tickLine: false,
  axisLine: false,
} as const

/** Card-styled tooltip. Recharts injects active/payload/label. */
export function ChartTooltip({
  active,
  payload,
  label,
  format,
  suffix,
}: TooltipProps<number, string> & {
  format?: (n: number) => string
  suffix?: string
}) {
  if (!active || !payload?.length) return null
  const render = format ?? ((n: number) => num(Math.round(n)))
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-md">
      {label !== undefined && label !== '' && (
        <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
      )}
      <div className={cn('space-y-0.5', label !== undefined && label !== '' && 'mt-1.5')}>
        {payload.map((entry, i) => (
          <p key={i} className="flex items-center gap-2 text-xs">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ background: entry.color ?? entry.payload?.fill ?? CHART.good }}
            />
            <span className="text-muted-foreground">{entry.name}</span>
            <span className="num ml-auto font-semibold text-foreground">
              {typeof entry.value === 'number' ? render(entry.value) : entry.value}
              {suffix}
            </span>
          </p>
        ))}
      </div>
    </div>
  )
}

/** Small colour-keyed legend used under pies and stacked bars. */
export function ChartLegend({
  items,
  className,
}: {
  items: { label: string; color: string; value?: string }[]
  className?: string
}) {
  return (
    <ul className={cn('flex flex-wrap gap-x-4 gap-y-1.5', className)}>
      {items.map((item) => (
        <li key={item.label} className="inline-flex items-center gap-1.5 text-2xs">
          <span className="size-2 shrink-0 rounded-full" style={{ background: item.color }} />
          <span className="text-muted-foreground">{item.label}</span>
          {item.value && <span className="num font-semibold text-foreground">{item.value}</span>}
        </li>
      ))}
    </ul>
  )
}
