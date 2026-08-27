import { cn } from '@/lib/utils'

/** Simple keyed tooltip on hover/focus. CSS-only, no positioning library. */
export function Tooltip({
  label,
  children,
  side = 'top',
  className,
}: {
  label: React.ReactNode
  children: React.ReactNode
  side?: 'top' | 'bottom'
  className?: string
}) {
  return (
    <span className={cn('group/tip relative inline-flex', className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute left-1/2 z-40 w-max max-w-[15rem] -translate-x-1/2 scale-95 rounded-lg bg-ink px-2.5 py-1.5 text-2xs font-medium leading-snug text-white opacity-0 shadow-lg transition-all duration-150 ease-snap group-hover/tip:scale-100 group-hover/tip:opacity-100 group-focus-within/tip:scale-100 group-focus-within/tip:opacity-100',
          side === 'top' ? 'bottom-[calc(100%+6px)]' : 'top-[calc(100%+6px)]',
        )}
      >
        {label}
      </span>
    </span>
  )
}
