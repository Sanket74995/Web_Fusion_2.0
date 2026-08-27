import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  HandCoins,
  Handshake,
  Leaf,
  PackageCheck,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { useStore } from '@/store/AppStore'
import { CATEGORIES } from '@/types'
import { EXAMPLE_QUERIES } from '@/services/ai'
import { platformStats, popularResources } from '@/services/analytics'
import { inr, inrCompact, num } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Container } from '@/components/layout/PageShell'
import { PageTransition, Reveal, Stagger, StaggerItem, CountUp } from '@/components/common/Motion'
import { ResourceCard } from '@/components/common/ResourceCard'
import { CategoryIcon } from '@/components/common/ResourceImage'
import { Avatar, RatingStars } from '@/components/common/Avatar'

const STEPS = [
  {
    icon: Search,
    title: 'Say what you need',
    body: 'Describe the requirement in plain language. CampusLoop expands it into every resource the task actually needs.',
  },
  {
    icon: Sparkles,
    title: 'Get matched, not listed',
    body: 'Availability, distance, suitability, trust, condition and price are weighed to rank the six best options.',
  },
  {
    icon: Handshake,
    title: 'Agree and hand over',
    body: 'A borrowing agreement, deposit and a photographed condition check protect both students.',
  },
  {
    icon: PackageCheck,
    title: 'Return and settle',
    body: 'Return, inspection and deposit refund happen in the app, then both sides rate the exchange.',
  },
]

const TRUST_POINTS = [
  {
    icon: ShieldCheck,
    title: 'Refundable security deposit',
    body: 'Held for the whole borrowing period and returned automatically after inspection.',
  },
  {
    icon: BadgeCheck,
    title: 'Verified campus identity',
    body: 'Every member is tied to a department and year, with a public trust score built from real exchanges.',
  },
  {
    icon: CalendarCheck,
    title: 'Photographed condition reports',
    body: 'Before and after photos with a per-category checklist mean damage disputes have evidence.',
  },
]

export function LandingPage() {
  const { state } = useStore()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  const stats = useMemo(() => platformStats(state), [state])

  const featured = useMemo(() => {
    const approved = state.resources.filter(
      (r) => r.approvalStatus === 'approved' && r.availabilityStatus === 'available',
    )
    return [...approved]
      .sort((a, b) => b.rating * 2 + b.timesBorrowed / 4 - (a.rating * 2 + a.timesBorrowed / 4))
      .slice(0, 6)
  }, [state.resources])

  const popular = useMemo(() => popularResources(state, 5), [state])

  const topLenders = useMemo(
    () =>
      [...state.users]
        .filter((u) => u.id !== state.currentUserId)
        .sort((a, b) => b.trustScore - a.trustScore)
        .slice(0, 4),
    [state.users, state.currentUserId],
  )

  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of state.resources) {
      if (r.approvalStatus !== 'approved') continue
      map.set(r.category, (map.get(r.category) ?? 0) + 1)
    }
    return map
  }, [state.resources])

  const search = (raw: string) => {
    const q = raw.trim()
    navigate(q ? `/ai?q=${encodeURIComponent(q)}` : '/ai')
  }

  return (
    <PageTransition>
      {/* ── Hero ──────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-border">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60rem_32rem_at_50%_-8rem,hsl(var(--primary)/0.10),transparent_70%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent"
        />

        <Container className="relative py-14 sm:py-20 lg:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <Reveal>
              <Badge variant="outline" size="sm" className="gap-1.5">
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex size-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
                </span>
                <span className="num">{num(stats.activeMembers)}</span> students sharing on campus
              </Badge>
            </Reveal>

            <Reveal delay={0.05}>
              <h1 className="mt-5 text-balance text-[2.125rem] font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.4rem]">
                Everything you need may
                <br className="hidden sm:block" /> already be{' '}
                <span className="text-primary">on campus.</span>
              </h1>
            </Reveal>

            <Reveal delay={0.1}>
              <p className="mx-auto mt-5 max-w-xl text-pretty text-[0.9375rem] leading-relaxed text-muted-foreground sm:text-base">
                CampusLoop moves students from owning to accessing. Borrow the camera, calculator
                or textbook that is already sitting idle two buildings away — and lend out yours.
              </p>
            </Reveal>

            {/* Requirement search — the front door to the AI matcher. */}
            <Reveal delay={0.15}>
              <form
                className="mx-auto mt-8 max-w-2xl"
                onSubmit={(e) => {
                  e.preventDefault()
                  search(query)
                }}
                role="search"
              >
                <div className="group relative rounded-2xl border border-border bg-card p-1.5 shadow-lg shadow-black/[0.04] transition-shadow duration-200 focus-within:border-primary/40 focus-within:shadow-xl">
                  <div className="flex items-center gap-2">
                    <Sparkles className="ml-3 size-[1.125rem] shrink-0 text-primary" />
                    <Input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="What do you need? e.g. shoot a reel for my college event tomorrow"
                      aria-label="Describe what you need"
                      className="h-11 border-0 bg-transparent px-0 text-[0.9375rem] shadow-none focus-visible:ring-0"
                    />
                    <Button type="submit" size="md" className="shrink-0">
                      <span className="hidden sm:inline">Find resources</span>
                      <span className="sm:hidden">Find</span>
                      <ArrowRight />
                    </Button>
                  </div>
                </div>
              </form>
            </Reveal>

            <Reveal delay={0.2}>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <span className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">
                  Try
                </span>
                {EXAMPLE_QUERIES.slice(0, 3).map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => search(q)}
                    className="max-w-full truncate rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors duration-150 hover:border-primary/30 hover:bg-primary-soft hover:text-primary"
                  >
                    {q.length > 46 ? `${q.slice(0, 46)}…` : q}
                  </button>
                ))}
              </div>
            </Reveal>

            <Reveal delay={0.25}>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
                <Link to="/discover" className={cn(buttonVariants({ variant: 'outline', size: 'md' }))}>
                  Browse all resources
                </Link>
                <Link to="/listings/new" className={cn(buttonVariants({ variant: 'ghost', size: 'md' }))}>
                  List something you own
                  <ArrowRight />
                </Link>
              </div>
            </Reveal>
          </div>

          {/* Live platform numbers */}
          <Stagger className="mt-14 grid grid-cols-2 gap-3 sm:mt-16 lg:grid-cols-4" delay={0.3}>
            {[
              { label: 'Resources shared', value: stats.resourcesShared, icon: PackageCheck, fmt: num },
              { label: 'Successful exchanges', value: stats.successfulExchanges, icon: Handshake, fmt: num },
              {
                label: 'Saved by students',
                value: stats.moneySaved,
                icon: Wallet,
                fmt: (v: number) => inrCompact(v),
              },
              { label: 'Reuses instead of buys', value: stats.resourcesReused, icon: Leaf, fmt: num },
            ].map((s) => (
              <StaggerItem key={s.label}>
                <div className="rounded-xl border border-border bg-card p-4">
                  <s.icon className="size-4 text-primary" />
                  <p className="num mt-3 text-2xl font-bold tracking-tight">
                    <CountUp value={s.value} format={s.fmt} />
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{s.label}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </Container>
      </section>

      {/* ── How it works ──────────────────────────────────── */}
      <section className="border-b border-border bg-muted/30">
        <Container className="py-14 sm:py-16">
          <Reveal>
            <div className="max-w-2xl">
              <Badge variant="primary" size="sm">
                How it works
              </Badge>
              <h2 className="mt-3 text-[1.625rem] font-semibold tracking-tight sm:text-3xl">
                Borrowing that behaves like a real transaction
              </h2>
              <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                Not a noticeboard. Every exchange runs through a request, an agreement, a deposit, a
                photographed handover and a settlement — so students trust each other with expensive
                things.
              </p>
            </div>
          </Reveal>

          <Stagger className="mt-9 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <StaggerItem key={s.title}>
                <Card className="h-full transition-shadow duration-200 hover:shadow-md">
                  <CardContent className="pt-5">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex size-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
                        <s.icon className="size-[1.125rem]" />
                      </span>
                      <span className="num text-2xs font-semibold text-muted-foreground">
                        STEP {i + 1}
                      </span>
                    </div>
                    <h3 className="mt-3.5 text-[0.9375rem] font-semibold">{s.title}</h3>
                    <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-muted-foreground">
                      {s.body}
                    </p>
                  </CardContent>
                </Card>
              </StaggerItem>
            ))}
          </Stagger>
        </Container>
      </section>

      {/* ── Featured resources ────────────────────────────── */}
      <section className="border-b border-border">
        <Container className="py-14 sm:py-16">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <Badge variant="outline" size="sm">
                  Available now
                </Badge>
                <h2 className="mt-3 text-[1.625rem] font-semibold tracking-tight sm:text-3xl">
                  Ready to borrow today
                </h2>
              </div>
              <Link to="/discover" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
                See all {categoryCounts.size ? num(state.resources.length) : ''} resources
                <ArrowRight />
              </Link>
            </div>
          </Reveal>

          <Stagger className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((r) => (
              <StaggerItem key={r.id}>
                <ResourceCard resource={r} owner={state.users.find((u) => u.id === r.ownerId)} />
              </StaggerItem>
            ))}
          </Stagger>
        </Container>
      </section>

      {/* ── Categories ────────────────────────────────────── */}
      <section className="border-b border-border bg-muted/30">
        <Container className="py-14 sm:py-16">
          <Reveal>
            <h2 className="text-[1.625rem] font-semibold tracking-tight sm:text-3xl">
              Ten categories, one campus
            </h2>
            <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
              From a ₹40-a-day calculator to a ₹300-a-day mirrorless camera — everything students
              buy once and use twice.
            </p>
          </Reveal>

          <Stagger className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {CATEGORIES.map((c) => (
              <StaggerItem key={c}>
                <Link
                  to={`/discover?category=${encodeURIComponent(c)}`}
                  className="group flex h-full flex-col justify-between rounded-xl border border-border bg-card p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
                >
                  <span className="inline-flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors duration-200 group-hover:bg-primary-soft group-hover:text-primary">
                    <CategoryIcon category={c} className="size-[1.125rem]" />
                  </span>
                  <span className="mt-6 block text-[0.8125rem] font-semibold leading-tight">{c}</span>
                  <span className="num mt-0.5 block text-2xs text-muted-foreground">
                    {categoryCounts.get(c) ?? 0} listed
                  </span>
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
        </Container>
      </section>

      {/* ── Trust + activity ──────────────────────────────── */}
      <section className="border-b border-border">
        <Container className="py-14 sm:py-16">
          <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <Reveal>
                <Badge variant="success" size="sm">
                  Trust layer
                </Badge>
                <h2 className="mt-3 text-[1.625rem] font-semibold tracking-tight sm:text-3xl">
                  Lending a ₹65,000 camera should feel safe
                </h2>
                <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
                  Trust is the product. CampusLoop makes the risk visible and small before anyone
                  hands anything over.
                </p>
              </Reveal>

              <Stagger className="mt-7 space-y-3">
                {TRUST_POINTS.map((t) => (
                  <StaggerItem key={t.title}>
                    <div className="flex gap-3.5 rounded-xl border border-border bg-card p-4">
                      <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                        <t.icon className="size-[1.125rem]" />
                      </span>
                      <div>
                        <h3 className="text-[0.875rem] font-semibold">{t.title}</h3>
                        <p className="mt-1 text-[0.8125rem] leading-relaxed text-muted-foreground">
                          {t.body}
                        </p>
                      </div>
                    </div>
                  </StaggerItem>
                ))}
              </Stagger>

              <Reveal delay={0.15}>
                <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-dashed border-border px-4 py-3.5 text-[0.8125rem]">
                  <span className="inline-flex items-center gap-1.5">
                    <TrendingUp className="size-4 text-primary" />
                    <span className="num font-semibold">{stats.onTimeRate}%</span>
                    <span className="text-muted-foreground">returned on time</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <HandCoins className="size-4 text-primary" />
                    <span className="num font-semibold">{inr(stats.depositsHeld)}</span>
                    <span className="text-muted-foreground">deposits held safely</span>
                  </span>
                </div>
              </Reveal>
            </div>

            <div className="space-y-4">
              <Reveal delay={0.1}>
                <Card>
                  <CardContent className="pt-5">
                    <h3 className="text-[0.875rem] font-semibold">Most borrowed this semester</h3>
                    <ul className="mt-3.5 space-y-3">
                      {popular.map((p, i) => (
                        <li key={p.name} className="flex items-center gap-3">
                          <span className="num inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-2xs font-bold text-muted-foreground">
                            {i + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[0.8125rem] font-medium">{p.name}</p>
                            <p className="text-2xs text-muted-foreground">{p.category}</p>
                          </div>
                          <span className="num shrink-0 text-xs font-semibold text-primary">
                            {p.borrows}×
                          </span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </Reveal>

              <Reveal delay={0.15}>
                <Card>
                  <CardContent className="pt-5">
                    <h3 className="text-[0.875rem] font-semibold">Most trusted lenders</h3>
                    <ul className="mt-3.5 space-y-3">
                      {topLenders.map((u) => (
                        <li key={u.id}>
                          <Link
                            to={`/profile/${u.id}`}
                            className="-mx-1.5 flex items-center gap-3 rounded-lg px-1.5 py-1 transition-colors hover:bg-muted"
                          >
                            <Avatar user={u} size="sm" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[0.8125rem] font-medium">{u.name}</p>
                              <p className="truncate text-2xs text-muted-foreground">
                                {u.department} · {u.successfulExchanges} exchanges
                              </p>
                            </div>
                            <RatingStars value={u.rating} size="xs" showValue />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </Reveal>
            </div>
          </div>
        </Container>
      </section>

      {/* ── Closing CTA ───────────────────────────────────── */}
      <section>
        <Container className="py-16 sm:py-20">
          <Reveal>
            <div className="relative overflow-hidden rounded-2xl border border-border bg-ink px-6 py-12 text-center sm:px-12">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(40rem_20rem_at_50%_0%,hsl(var(--primary)/0.28),transparent_70%)]"
              />
              <div className="relative">
                <h2 className="text-balance text-2xl font-bold tracking-tight text-white sm:text-[2rem]">
                  Own less. Access more.
                </h2>
                <p className="mx-auto mt-3 max-w-lg text-pretty text-[0.9375rem] leading-relaxed text-white/70">
                  Your campus already owns everything you need for tomorrow. Start with what you
                  need today, then put your own idle gear into the loop.
                </p>
                <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5">
                  <Link to="/ai" className={cn(buttonVariants({ size: 'lg' }))}>
                    <Sparkles />
                    Find what I need
                  </Link>
                  <Link
                    to="/impact"
                    className={cn(
                      buttonVariants({ variant: 'outline', size: 'lg' }),
                      'border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white',
                    )}
                  >
                    See campus impact
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        </Container>
      </section>
    </PageTransition>
  )
}
