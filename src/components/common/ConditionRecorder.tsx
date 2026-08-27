import { Check, X } from 'lucide-react'
import type { Category, ChecklistItem, ConditionGrade } from '@/types'
import { CONDITION_GRADES } from '@/types'
import { checklistFor } from '@/services/checklists'
import { cn } from '@/lib/utils'
import { Field, SegmentedControl, Textarea } from '@/components/ui/input'
import { SectionTitle } from '@/components/ui/card'
import { PhotoUpload } from './PhotoUpload'

export interface ConditionDraft {
  overall: ConditionGrade
  checklist: ChecklistItem[]
  notes: string
  images: string[]
}

/** Blank draft with every checklist row for the category pre-ticked as OK. */
export function emptyDraft(category: Category, overall: ConditionGrade): ConditionDraft {
  return {
    overall,
    checklist: checklistFor(category).map((label) => ({ label, ok: true })),
    notes: '',
    images: [],
  }
}

/**
 * The BEFORE (handover) and AFTER (return) condition recorder.
 * Same labels on both sides, so `ConditionComparison` can line them up row for row.
 */
export function ConditionRecorder({
  draft,
  onChange,
  phase,
  className,
}: {
  draft: ConditionDraft
  onChange: (next: ConditionDraft) => void
  phase: 'before' | 'after'
  className?: string
}) {
  const flagged = draft.checklist.filter((c) => !c.ok)

  const setItem = (index: number, patch: Partial<ChecklistItem>) =>
    onChange({
      ...draft,
      checklist: draft.checklist.map((c, i) => (i === index ? { ...c, ...patch } : c)),
    })

  return (
    <div className={cn('space-y-5', className)}>
      <div>
        <SectionTitle
          title={phase === 'before' ? 'Condition at handover' : 'Condition on return'}
          hint={`${draft.checklist.length - flagged.length}/${draft.checklist.length} OK`}
        />
        <ul className="mt-3.5 divide-y divide-border overflow-hidden rounded-xl border border-border">
          {draft.checklist.map((item, i) => (
            <li key={item.label} className="bg-card px-3.5 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="min-w-0 truncate text-[0.875rem] font-medium">{item.label}</p>
                <div
                  role="radiogroup"
                  aria-label={item.label}
                  className="inline-flex shrink-0 gap-1 rounded-lg border border-border bg-muted/60 p-1"
                >
                  <button
                    type="button"
                    role="radio"
                    aria-checked={item.ok}
                    onClick={() => setItem(i, { ok: true, note: undefined })}
                    className={cn(
                      'inline-flex h-6 items-center gap-1 rounded-md px-2 text-2xs font-semibold transition-all duration-150 ease-snap',
                      item.ok
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <Check className="size-3" strokeWidth={3} />
                    OK
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={!item.ok}
                    onClick={() => setItem(i, { ok: false })}
                    className={cn(
                      'inline-flex h-6 items-center gap-1 rounded-md px-2 text-2xs font-semibold transition-all duration-150 ease-snap',
                      !item.ok
                        ? 'bg-destructive text-destructive-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <X className="size-3" strokeWidth={3} />
                    Issue
                  </button>
                </div>
              </div>
              {!item.ok && (
                <input
                  autoFocus
                  value={item.note ?? ''}
                  onChange={(e) => setItem(i, { note: e.target.value })}
                  placeholder="Describe the issue — it goes on the record for both sides"
                  className="mt-2.5 h-8 w-full rounded-lg border border-input bg-card px-2.5 text-xs shadow-xs transition-colors focus:border-destructive/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/20"
                />
              )}
            </li>
          ))}
        </ul>
      </div>

      <Field label="Overall grade">
        {() => (
          <SegmentedControl
            value={draft.overall}
            onChange={(overall) => onChange({ ...draft, overall })}
            options={CONDITION_GRADES.map((g) => ({ value: g, label: g }))}
            ariaLabel="Overall condition grade"
          />
        )}
      </Field>

      <Field
        label={phase === 'before' ? 'Notes for the record' : 'Inspection notes'}
        hint="Both students see these notes — be specific."
      >
        {(id) => (
          <Textarea
            id={id}
            rows={3}
            value={draft.notes}
            onChange={(e) => onChange({ ...draft, notes: e.target.value })}
            placeholder={
              phase === 'before'
                ? 'Small scuff on the base plate, everything else spotless. Battery at 100%.'
                : 'Came back clean and charged, all accessories present.'
            }
          />
        )}
      </Field>

      <PhotoUpload
        images={draft.images}
        onChange={(images) => onChange({ ...draft, images })}
        label="Condition photos"
        hint="optional but recommended"
        emptyTitle="Photograph it together"
        emptyMessage="Photos at handover and at return are what make a damage claim provable instead of a matter of opinion."
      />

      {flagged.length > 0 && (
        <div className="rounded-xl border border-warning/25 bg-warning-soft px-3.5 py-3">
          <p className="text-[0.8125rem] font-semibold text-warning">
            {flagged.length} issue{flagged.length > 1 ? 's' : ''} recorded
          </p>
          <ul className="mt-1.5 space-y-1">
            {flagged.map((f) => (
              <li key={f.label} className="text-2xs leading-relaxed text-warning/90">
                <span className="font-medium">{f.label}</span>
                {f.note ? ` — ${f.note}` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
