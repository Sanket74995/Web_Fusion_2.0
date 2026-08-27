import { AlertTriangle, ArrowRight, Check, X } from 'lucide-react'
import type { ConditionReport } from '@/types'
import { fmtDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from './EmptyState'

function GradeBadge({ grade }: { grade: ConditionReport['overall'] }) {
  const variant = grade === 'Excellent' ? 'primary' : grade === 'Good' ? 'info' : 'warning'
  return (
    <Badge variant={variant} size="sm">
      {grade}
    </Badge>
  )
}

function Tick({ ok }: { ok: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex size-5 shrink-0 items-center justify-center rounded-full',
        ok ? 'bg-primary-soft text-primary' : 'bg-destructive-soft text-destructive',
      )}
    >
      {ok ? <Check className="size-3" strokeWidth={3} /> : <X className="size-3" strokeWidth={3} />}
    </span>
  )
}

function ReportColumn({
  report,
  title,
  subtitle,
}: {
  report: ConditionReport
  title: string
  subtitle: string
}) {
  return (
    <div className="min-w-0 flex-1">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
            {title}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <GradeBadge grade={report.overall} />
      </div>
      <ul className="space-y-2">
        {report.checklist.map((item) => (
          <li key={item.label} className="flex items-start gap-2">
            <Tick ok={item.ok} />
            <div className="min-w-0">
              <p className="text-[0.8125rem] leading-snug">{item.label}</p>
              {item.note && <p className="text-2xs text-muted-foreground">{item.note}</p>}
            </div>
          </li>
        ))}
      </ul>
      {report.notes && (
        <p className="mt-3 rounded-lg bg-muted/60 px-2.5 py-2 text-xs leading-relaxed text-muted-foreground">
          {report.notes}
        </p>
      )}
      {report.images.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {report.images.slice(0, 4).map((src, i) => (
            <img
              key={i}
              src={src}
              alt={`${title} photo ${i + 1}`}
              className="size-14 rounded-lg border border-border object-cover"
            />
          ))}
        </div>
      )}
      <p className="num mt-3 text-2xs text-muted-foreground">
        Recorded {fmtDateTime(report.createdAt)}
      </p>
    </div>
  )
}

/** BEFORE ↔ AFTER condition, lined up row for row so changes are obvious. */
export function ConditionComparison({
  before,
  after,
  className,
}: {
  before?: ConditionReport
  after?: ConditionReport
  className?: string
}) {
  if (!before) {
    return (
      <EmptyState
        compact
        title="No condition record yet"
        message="The BEFORE report is captured at handover, and the AFTER report during inspection."
        className={className}
      />
    )
  }

  const changed =
    after &&
    before.checklist.filter((b, i) => after.checklist[i] && after.checklist[i].ok !== b.ok).length

  return (
    <div className={cn('space-y-4', className)}>
      {after && (
        <div
          className={cn(
            'flex items-start gap-2 rounded-lg px-3 py-2.5 text-xs leading-relaxed',
            changed
              ? 'bg-warning-soft text-warning'
              : 'bg-primary-soft text-primary',
          )}
        >
          {changed ? (
            <AlertTriangle className="mt-px size-4 shrink-0" />
          ) : (
            <Check className="mt-px size-4 shrink-0" />
          )}
          <span>
            {changed
              ? `${changed} checklist item${changed > 1 ? 's' : ''} changed between handover and return. Grade moved from ${before.overall} to ${after.overall}.`
              : `Every checklist item matches the handover record. Condition still ${after.overall}.`}
          </span>
        </div>
      )}

      <div className="flex flex-col gap-6 sm:flex-row sm:gap-5">
        <ReportColumn report={before} title="Before · handover" subtitle="Condition when handed over" />
        {after ? (
          <>
            <div className="hidden shrink-0 items-center sm:flex">
              <span className="inline-flex size-7 items-center justify-center rounded-full border border-border bg-card">
                <ArrowRight className="size-3.5 text-muted-foreground" />
              </span>
            </div>
            <ReportColumn report={after} title="After · return" subtitle="Condition on inspection" />
          </>
        ) : (
          <div className="flex min-w-0 flex-1 items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-4 py-8 text-center">
            <p className="text-xs leading-relaxed text-muted-foreground">
              The AFTER report appears here once the owner inspects the returned resource.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
