import { Check, Clock, Loader2, X } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import type { Borrowing, LifecycleStatus } from '@/types'
import { LIFECYCLE_ORDER } from '@/types'
import { fmtDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { lifecycleIndex } from '@/store/AppStore'

const STEP_LABEL: Record<LifecycleStatus, string> = {
  requested: 'Request sent',
  accepted: 'Owner accepted',
  handover: 'Handover & condition check',
  borrowed: 'In use',
  return_due: 'Return due',
  returned: 'Returned',
  inspection: 'Condition inspection',
  settlement: 'Deposit settled',
  rated: 'Exchange rated',
  declined: 'Declined',
  cancelled: 'Cancelled',
}

const STEP_HINT: Partial<Record<LifecycleStatus, string>> = {
  requested: 'Waiting for the owner to review your dates and purpose',
  accepted: 'Pay to lock the booking, then meet for handover',
  handover: 'Both sides record the condition before the resource changes hands',
  borrowed: 'Return before the deadline to get your full deposit back',
  return_due: 'The deadline has passed — a late fee applies per started day',
  returned: 'The owner has the resource back and will inspect it',
  inspection: 'BEFORE and AFTER condition are compared side by side',
  settlement: 'Deposit − damage − late fee = your refund',
  rated: 'Ratings feed the trust score that ranks future matches',
}

export function LifecycleTimeline({
  borrowing,
  className,
  compact,
}: {
  borrowing: Borrowing
  className?: string
  compact?: boolean
}) {
  const reduce = useReducedMotion()
  const terminal = borrowing.status === 'declined' || borrowing.status === 'cancelled'
  const currentIndex = terminal ? 0 : lifecycleIndex(borrowing.status)
  const stampFor = (s: LifecycleStatus) => borrowing.timeline.find((t) => t.status === s)

  const steps = LIFECYCLE_ORDER.filter((s) => {
    // "Return due" only belongs in the story if the deadline actually passed.
    if (s !== 'return_due') return true
    return borrowing.timeline.some((t) => t.status === 'return_due') || borrowing.status === 'return_due'
  })

  return (
    <ol className={cn('relative', className)}>
      {terminal && (
        <li className="relative flex gap-4 pb-1">
          <span className="relative z-10 mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm">
            <X className="size-4" strokeWidth={2.5} />
          </span>
          <div className="min-w-0 pb-4">
            <p className="text-sm font-semibold">{STEP_LABEL[borrowing.status]}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {stampFor(borrowing.status)?.note ?? 'This request did not go ahead.'}
            </p>
          </div>
        </li>
      )}

      {steps.map((step, i) => {
        const index = lifecycleIndex(step)
        const stamp = stampFor(step)
        const done = !terminal && (index < currentIndex || Boolean(stamp && index !== currentIndex))
        const active = !terminal && index === currentIndex
        const last = i === steps.length - 1
        const state: 'done' | 'active' | 'todo' = done ? 'done' : active ? 'active' : 'todo'

        return (
          <li key={step} className="relative flex gap-4">
            {!last && (
              <span
                className={cn(
                  'absolute left-[0.8125rem] top-7 w-0.5 origin-top',
                  compact ? 'h-[calc(100%-1.75rem)]' : 'h-[calc(100%-1.75rem)]',
                  done ? 'bg-primary' : 'bg-border',
                )}
                aria-hidden
              />
            )}

            <motion.span
              className={cn(
                'relative z-10 mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                state === 'done' && 'border-primary bg-primary text-primary-foreground',
                state === 'active' && 'border-primary bg-card text-primary',
                state === 'todo' && 'border-border bg-card text-muted-foreground',
              )}
              initial={reduce ? undefined : { scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, delay: reduce ? 0 : i * 0.04, ease: [0.22, 1, 0.36, 1] }}
            >
              {state === 'done' ? (
                <Check className="size-3.5" strokeWidth={3} />
              ) : state === 'active' ? (
                <>
                  <Loader2 className="size-3.5 animate-spin-slow" />
                  <span className="absolute inset-0 -z-10 animate-pulse-ring rounded-full bg-primary/25" />
                </>
              ) : (
                <Clock className="size-3.5" />
              )}
            </motion.span>

            <div className={cn('min-w-0', last ? 'pb-0' : compact ? 'pb-4' : 'pb-6')}>
              <div className="flex flex-wrap items-baseline gap-x-2">
                <p
                  className={cn(
                    'text-sm',
                    state === 'todo' ? 'font-medium text-muted-foreground' : 'font-semibold',
                  )}
                >
                  {STEP_LABEL[step]}
                </p>
                {stamp && (
                  <span className="num text-2xs text-muted-foreground">{fmtDateTime(stamp.at)}</span>
                )}
                {active && (
                  <span className="text-2xs font-semibold uppercase tracking-wide text-primary">
                    Now
                  </span>
                )}
              </div>
              {!compact && (stamp?.note || STEP_HINT[step]) && (
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  {stamp?.note ?? STEP_HINT[step]}
                </p>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

/** Slim horizontal progress used at the top of the flow pages. */
export function LifecycleStrip({ borrowing }: { borrowing: Borrowing }) {
  const current = lifecycleIndex(borrowing.status)
  const steps: { status: LifecycleStatus; short: string }[] = [
    { status: 'requested', short: 'Request' },
    { status: 'accepted', short: 'Accepted' },
    { status: 'handover', short: 'Handover' },
    { status: 'borrowed', short: 'In use' },
    { status: 'returned', short: 'Returned' },
    { status: 'inspection', short: 'Inspection' },
    { status: 'settlement', short: 'Settlement' },
    { status: 'rated', short: 'Rated' },
  ]
  return (
    <div className="no-scrollbar flex items-center gap-1 overflow-x-auto">
      {steps.map((s, i) => {
        const index = lifecycleIndex(s.status)
        const done = index <= current
        return (
          <div key={s.status} className="flex shrink-0 items-center gap-1">
            <span
              className={cn(
                'rounded-full px-2.5 py-1 text-2xs font-medium transition-colors',
                done ? 'bg-primary-soft text-primary' : 'bg-muted text-muted-foreground',
              )}
            >
              {s.short}
            </span>
            {i < steps.length - 1 && (
              <span className={cn('h-0.5 w-3 rounded-full', done ? 'bg-primary/40' : 'bg-border')} />
            )}
          </div>
        )
      })}
    </div>
  )
}
