import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PageTransition } from '@/components/common/Motion'

export function Container({
  children,
  className,
  width = 'default',
}: {
  children: React.ReactNode
  className?: string
  width?: 'default' | 'wide' | 'narrow' | 'form'
}) {
  const max = {
    narrow: 'max-w-3xl',
    form: 'max-w-4xl',
    default: 'max-w-7xl',
    wide: 'max-w-[95rem]',
  }[width]
  return <div className={cn('mx-auto px-4 sm:px-6 lg:px-8', max, className)}>{children}</div>
}

export function PageHeader({
  title,
  subtitle,
  back,
  actions,
  eyebrow,
  className,
}: {
  title: string
  subtitle?: React.ReactNode
  back?: { to: string; label: string }
  actions?: React.ReactNode
  eyebrow?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('mb-6', className)}>
      {back && (
        <Link
          to={back.to}
          className="mb-3 inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          {back.label}
        </Link>
      )}
      {eyebrow && <div className="mb-2">{eyebrow}</div>}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-[1.375rem] font-semibold tracking-tight sm:text-2xl">{title}</h1>
          {subtitle && (
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
}

/** Standard student page wrapper: transition + container + vertical rhythm. */
export function Page({
  children,
  className,
  width = 'default',
}: {
  children: React.ReactNode
  className?: string
  width?: 'default' | 'wide' | 'narrow' | 'form'
}) {
  return (
    <PageTransition>
      <Container width={width} className={cn('py-6 sm:py-8', className)}>
        {children}
      </Container>
    </PageTransition>
  )
}

/**
 * Step indicator for the borrowing flow. The journey is long, so every page
 * in it says where the student is and what is left.
 */
export function FlowSteps({
  steps,
  current,
  className,
}: {
  steps: string[]
  /** 0-based index of the active step. */
  current: number
  className?: string
}) {
  return (
    <ol className={cn('no-scrollbar flex items-center gap-2 overflow-x-auto pb-1', className)}>
      {steps.map((s, i) => {
        const done = i < current
        const active = i === current
        return (
          <li key={s} className="flex shrink-0 items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-2xs font-medium transition-colors',
                active && 'border-primary bg-primary text-primary-foreground',
                done && 'border-primary/25 bg-primary-soft text-primary',
                !active && !done && 'border-border bg-card text-muted-foreground',
              )}
            >
              <span className="num">{i + 1}</span>
              {s}
            </span>
            {i < steps.length - 1 && (
              <span className={cn('h-0.5 w-4 rounded-full', done ? 'bg-primary/40' : 'bg-border')} />
            )}
          </li>
        )
      })}
    </ol>
  )
}

export const BORROW_FLOW_STEPS = [
  'Request',
  'Agreement',
  'Payment',
  'Handover',
  'Return',
  'Inspection',
  'Settlement',
  'Rate',
]
