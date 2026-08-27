import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  AlertTriangle,
  ArrowRight,
  CalendarRange,
  Check,
  CircleSlash,
  Info,
  Loader2,
  Sparkles,
  Target,
  Wallet,
  Wand2,
} from 'lucide-react'
import { useStore } from '@/store/AppStore'
import type { NeedResult } from '@/types'
import { AI_STAGES, EXAMPLE_QUERIES, aiMode, needWindow, parseNeed, resolveNeed } from '@/services/ai'
import { inr } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/input'
import { Page, PageHeader } from '@/components/layout/PageShell'
import { Reveal } from '@/components/common/Motion'
import { AIRecommendationCard } from '@/components/common/AIRecommendationCard'
import { EmptyState } from '@/components/common/EmptyState'
import { ResourceRow } from '@/components/common/ResourceCard'

const STAGE_MS = 420

export function AIFindPage() {
  const { state } = useStore()
  const [params, setParams] = useSearchParams()
  const reduce = useReducedMotion()

  const [raw, setRaw] = useState(params.get('q') ?? '')
  const [stage, setStage] = useState(-1)
  const [result, setResult] = useState<NeedResult | null>(null)
  const [openBreakdown, setOpenBreakdown] = useState<string | null>(null)
  const timers = useRef<number[]>([])
  const ranFor = useRef<string | null>(null)

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t))
    timers.current = []
  }
  useEffect(() => clearTimers, [])

  const run = useCallback(
    async (text: string) => {
      const query = text.trim()
      if (!query) return
      clearTimers()
      setResult(null)
      setOpenBreakdown(null)
      setStage(0)
      setParams(new URLSearchParams({ q: query }), { replace: true })

      if (!reduce) {
        for (let i = 1; i < AI_STAGES.length; i++) {
          timers.current.push(window.setTimeout(() => setStage(i), i * STAGE_MS))
        }
      }

      const [need] = await Promise.all([
        parseNeed(query),
        new Promise((r) => timers.current.push(window.setTimeout(r, reduce ? 200 : AI_STAGES.length * STAGE_MS))),
      ])

      setResult(resolveNeed(need, state.resources, state.users))
      setStage(-1)
    },
    [reduce, setParams, state.resources, state.users],
  )

  /* Deep link from the landing hero: analyse immediately. */
  useEffect(() => {
    const q = params.get('q')
    if (q && ranFor.current !== q) {
      ranFor.current = q
      void run(q)
    }
  }, [params, run])

  const busy = stage >= 0
  const window_ = result ? needWindow(result.need) : null

  return (
    <Page width="wide">
      <PageHeader
        eyebrow={
          <Badge variant="primary" size="sm">
            <Sparkles className="size-3" />
            AI requirement search
          </Badge>
        }
        title="Describe the situation, not the product"
        subtitle="One sentence about what you are doing. CampusLoop works out every resource the task needs, then finds the best available match for each one."
        actions={
          <Badge variant="outline" size="sm" title={aiMode === 'api' ? 'Connected to a live model' : 'Running the on-device requirement parser'}>
            <span className={cn('size-1.5 rounded-full', aiMode === 'api' ? 'bg-primary' : 'bg-muted-foreground')} />
            {aiMode === 'api' ? 'Live model' : 'On-device engine'}
          </Badge>
        }
      />

      {/* ── Prompt ─────────────────────────────────────────── */}
      <Card className="overflow-hidden">
        <CardContent className="pt-5">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              ranFor.current = raw.trim()
              void run(raw)
            }}
          >
            <Textarea
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              rows={3}
              aria-label="Describe what you need"
              placeholder="I need to shoot a reel for my college event tomorrow. My budget is ₹500."
              className="resize-none border-0 bg-transparent px-0 text-[0.9375rem] leading-relaxed shadow-none focus-visible:ring-0"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault()
                  ranFor.current = raw.trim()
                  void run(raw)
                }
              }}
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3.5">
              <p className="text-2xs text-muted-foreground">
                Mention the date, the duration and a budget for a sharper match.
              </p>
              <Button type="submit" loading={busy} disabled={!raw.trim()}>
                <Wand2 />
                Analyse requirement
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="mt-3 flex flex-wrap gap-2">
        {EXAMPLE_QUERIES.map((q) => (
          <button
            key={q}
            type="button"
            disabled={busy}
            onClick={() => {
              setRaw(q)
              ranFor.current = q
              void run(q)
            }}
            className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors duration-150 hover:border-primary/30 hover:bg-primary-soft hover:text-primary disabled:opacity-50"
          >
            {q}
          </button>
        ))}
      </div>

      {/* ── Thinking stages ───────────────────────────────── */}
      <AnimatePresence mode="wait">
        {busy && (
          <motion.div
            key="stages"
            initial={reduce ? undefined : { opacity: 0, y: 8 }}
            animate={reduce ? undefined : { opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6"
          >
            <Card>
              <CardContent className="pt-5">
                <ol className="space-y-3">
                  {AI_STAGES.map((s, i) => {
                    const done = i < stage
                    const active = i === stage
                    return (
                      <li key={s} className="flex items-center gap-3">
                        <span
                          className={cn(
                            'inline-flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors duration-200',
                            done && 'border-primary bg-primary text-primary-foreground',
                            active && 'border-primary text-primary',
                            !done && !active && 'border-border text-muted-foreground',
                          )}
                        >
                          {done ? (
                            <Check className="size-3.5" />
                          ) : active ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <span className="num text-2xs">{i + 1}</span>
                          )}
                        </span>
                        <span
                          className={cn(
                            'text-[0.875rem] transition-colors duration-200',
                            done || active ? 'font-medium text-foreground' : 'text-muted-foreground',
                          )}
                        >
                          {s}
                        </span>
                      </li>
                    )
                  })}
                </ol>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Results ───────────────────────────────────────── */}
      {result && window_ && !busy && (
        <div className="mt-8 space-y-6">
          {/* Understanding */}
          <Reveal>
            <Card className="border-primary/25 bg-primary-soft/40">
              <CardContent className="pt-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-2xs font-semibold uppercase tracking-wide text-primary">
                      Here is what I understood
                    </p>
                    <h2 className="mt-1.5 text-lg font-semibold tracking-tight">
                      {result.need.purpose}
                    </h2>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant="outline" size="sm">
                        <CalendarRange className="size-3" />
                        {result.need.whenLabel}
                      </Badge>
                      <Badge variant="outline" size="sm" className="num">
                        {window_.days} day{window_.days > 1 ? 's' : ''}
                      </Badge>
                      {result.need.budget !== null && (
                        <Badge variant="outline" size="sm">
                          <Wallet className="size-3" />
                          <span className="num">{inr(result.need.budget)}</span> budget
                        </Badge>
                      )}
                      <Badge variant="outline" size="sm">
                        <Target className="size-3" />
                        {result.need.items.length} resources needed
                      </Badge>
                    </div>
                  </div>

                  <div className="shrink-0 rounded-xl border border-border bg-card px-4 py-3 text-right">
                    <p className="text-2xs text-muted-foreground">Essentials, {window_.days} day{window_.days > 1 ? 's' : ''}</p>
                    <p className="num mt-0.5 text-xl font-bold tracking-tight">
                      {inr(result.totalPerDay * window_.days)}
                    </p>
                    <p className="num text-2xs text-muted-foreground">
                      + {inr(result.totalDeposit)} refundable deposit
                    </p>
                    <Badge
                      variant={result.withinBudget ? 'success' : 'warning'}
                      size="sm"
                      className="mt-2"
                    >
                      {result.need.budget === null
                        ? 'No budget set'
                        : result.withinBudget
                          ? 'Within budget'
                          : 'Over budget'}
                    </Badge>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-1.5 border-t border-primary/15 pt-3.5">
                  {result.need.items.map((it) => (
                    <Badge key={it.label} variant={it.essential ? 'primary' : 'neutral'} size="sm">
                      {it.essential ? <Check className="size-3" /> : null}
                      {it.label}
                      {!it.essential && <span className="text-muted-foreground">· optional</span>}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </Reveal>

          {/* Notes / reasoning */}
          {result.need.notes.length > 0 && (
            <Reveal delay={0.05}>
              <ul className="space-y-2">
                {result.need.notes.map((n) => (
                  <li
                    key={n}
                    className="flex gap-2.5 rounded-lg border border-border bg-muted/40 px-3.5 py-2.5 text-[0.8125rem] leading-relaxed text-muted-foreground"
                  >
                    <Info className="mt-0.5 size-3.5 shrink-0 text-info" />
                    {n}
                  </li>
                ))}
              </ul>
            </Reveal>
          )}

          {/* Groups */}
          {result.groups.map((group, gi) => (
            <Reveal key={group.item.label} delay={0.05 + gi * 0.04}>
              <section>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[0.9375rem] font-semibold">{group.item.label}</h3>
                    <Badge variant={group.item.essential ? 'primary' : 'neutral'} size="sm">
                      {group.item.essential ? 'Essential' : 'Optional'}
                    </Badge>
                    <span className="text-2xs text-muted-foreground">{group.item.category}</span>
                  </div>
                  <Link
                    to={`/discover?category=${encodeURIComponent(group.item.category)}`}
                    className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Browse all {group.item.category.toLowerCase()}
                  </Link>
                </div>

                {group.blocked && (
                  <div className="mb-3 rounded-xl border border-warning/25 bg-warning-soft px-4 py-3">
                    <p className="flex items-center gap-2 text-[0.8125rem] font-medium text-warning">
                      <CircleSlash className="size-4 shrink-0" />
                      {group.blocked.resource.name} is the strongest match but it is not free on{' '}
                      {result.need.whenLabel.replace(/^\w+, /, '')}.
                    </p>
                    <p className="mt-1 pl-6 text-2xs text-warning/80">
                      Showing the best available substitutes instead.
                    </p>
                  </div>
                )}

                {group.picks.length === 0 ? (
                  <EmptyState
                    compact
                    icon={<CircleSlash />}
                    title={`Nothing available for ${group.item.label.toLowerCase()}`}
                    message="Try a later date, or widen the requirement."
                  />
                ) : (
                  <div className="grid gap-4 lg:grid-cols-3">
                    {group.picks.map((rec, i) => (
                      <AIRecommendationCard
                        key={rec.resource.id}
                        rec={rec}
                        rank={i + 1}
                        days={window_.days}
                        showBreakdown={openBreakdown === rec.resource.id}
                        onToggleBreakdown={() =>
                          setOpenBreakdown((cur) => (cur === rec.resource.id ? null : rec.resource.id))
                        }
                      />
                    ))}
                  </div>
                )}

                {group.blocked?.alternatives && group.blocked.alternatives.length > 0 && (
                  <div className="mt-3 overflow-hidden rounded-xl border border-border bg-card">
                    <p className="border-b border-border bg-muted/40 px-4 py-2 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Also considered
                    </p>
                    <div className="divide-y divide-border">
                      {group.blocked.alternatives.map((alt) => (
                        <ResourceRow key={alt.resource.id} resource={alt.resource} owner={alt.owner} />
                      ))}
                    </div>
                  </div>
                )}
              </section>
            </Reveal>
          ))}

          {/* Plan summary */}
          <Reveal>
            <Card className="bg-muted/30">
              <CardContent className="pt-5">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <h3 className="text-[0.9375rem] font-semibold">Your borrowing plan</h3>
                    <p className="mt-1 text-[0.8125rem] leading-relaxed text-muted-foreground">
                      Requests go one resource at a time so each owner can confirm their own item.
                      Start with the essential you need most.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {result.groups
                      .filter((g) => g.picks[0])
                      .map((g) => (
                        <Link
                          key={g.item.label}
                          to={`/borrow/${g.picks[0].resource.id}?start=${result.need.startDate}&end=${result.need.endDate}&purpose=${encodeURIComponent(result.need.purpose)}`}
                          className={cn(
                            buttonVariants({
                              variant: g.item.essential ? 'primary' : 'outline',
                              size: 'sm',
                            }),
                          )}
                        >
                          Request {g.item.label.toLowerCase()}
                          <ArrowRight />
                        </Link>
                      ))}
                  </div>
                </div>

                {!result.withinBudget && result.need.budget !== null && (
                  <p className="mt-4 flex items-start gap-2 rounded-lg border border-warning/25 bg-warning-soft px-3.5 py-2.5 text-[0.8125rem] text-warning">
                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                    The cheapest essential set costs {inr(result.totalPerDay * window_.days)} for{' '}
                    {window_.days} day{window_.days > 1 ? 's' : ''} — {inr(result.totalPerDay * window_.days - result.need.budget)} over
                    your budget. Dropping the optional items or shortening the period fixes it.
                  </p>
                )}
              </CardContent>
            </Card>
          </Reveal>
        </div>
      )}

      {!result && !busy && (
        <div className="mt-10">
          <EmptyState
            icon={<Sparkles />}
            title="Start with a sentence"
            message="Tell CampusLoop what you are doing — an exam, a shoot, a project, a match — and it will assemble the kit for you."
          />
        </div>
      )}
    </Page>
  )
}
