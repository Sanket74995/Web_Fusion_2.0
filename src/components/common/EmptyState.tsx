import { PackageOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

export function EmptyState({
  icon,
  title,
  message,
  action,
  className,
  compact,
}: {
  /** Any Lucide element, e.g. <SearchX />. Sizing is applied by the wrapper. */
  icon?: React.ReactNode
  title: string
  message?: string
  action?: React.ReactNode
  className?: string
  compact?: boolean
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 text-center',
        compact ? 'px-6 py-8' : 'px-6 py-14',
        className,
      )}
    >
      <span className="mb-3 inline-flex size-11 items-center justify-center rounded-full bg-card text-muted-foreground shadow-xs [&_svg]:size-5 [&_svg]:stroke-[1.5]">
        {icon ?? <PackageOpen />}
      </span>
      <p className="text-sm font-semibold">{title}</p>
      {message && (
        <p className="mt-1 max-w-sm text-[0.8125rem] leading-relaxed text-muted-foreground">
          {message}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
