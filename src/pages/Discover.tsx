import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Compass, LayoutGrid, List, Sparkles, SlidersHorizontal } from 'lucide-react'
import { useStore } from '@/store/AppStore'
import type { Category, ConditionGrade } from '@/types'
import { CONDITION_GRADES } from '@/types'
import { recommend, type MatchContext } from '@/services/matching'
import { addDays, num, toDateInput } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label, SegmentedControl, Select } from '@/components/ui/input'
import { Dialog } from '@/components/ui/dialog'
import { Page, PageHeader } from '@/components/layout/PageShell'
import { Stagger, StaggerItem } from '@/components/common/Motion'
import { ResourceCard, ResourceRow } from '@/components/common/ResourceCard'
import { EmptyState } from '@/components/common/EmptyState'
import {
  CategoryChips,
  DEFAULT_FILTERS,
  DISTANCE_CEILING,
  FilterPanel,
  PRICE_CEILING,
  SearchBar,
  SORT_OPTIONS,
  type Filters,
} from '@/components/common/Filters'

const CONDITION_RANK: Record<ConditionGrade, number> = CONDITION_GRADES.reduce(
  (acc, grade, i) => ({ ...acc, [grade]: CONDITION_GRADES.length - i }),
  {} as Record<ConditionGrade, number>,
)

export function DiscoverPage() {
  const { state } = useStore()
  const [params, setParams] = useSearchParams()
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [sheet, setSheet] = useState(false)

  const [filters, setFilters] = useState<Filters>(() => ({
    ...DEFAULT_FILTERS,
    query: params.get('q') ?? '',
    category: (params.get('category') as Category | null) ?? 'All',
  }))

  /* Keep the URL shareable without fighting the inputs. */
  useEffect(() => {
    const next = new URLSearchParams()
    if (filters.query.trim()) next.set('q', filters.query.trim())
    if (filters.category !== 'All') next.set('category', filters.category)
    setParams(next, { replace: true })
  }, [filters.query, filters.category, setParams])

  const ctx = useMemo<MatchContext>(() => {
    const today = toDateInput(new Date())
    return {
      startDate: today,
      endDate: toDateInput(addDays(new Date(), 2)),
      needTags: filters.query
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((w) => w.length > 2),
      budgetPerDay: filters.maxPrice < PRICE_CEILING ? filters.maxPrice : null,
      category: filters.category !== 'All' ? filters.category : undefined,
    }
  }, [filters.query, filters.maxPrice, filters.category])

  const results = useMemo(() => {
    const q = filters.query.trim().toLowerCase()
    const pool = state.resources.filter((r) => {
      if (r.approvalStatus !== 'approved') return false
      if (filters.category !== 'All' && r.category !== filters.category) return false
      if (filters.condition !== 'Any' && CONDITION_RANK[r.condition] < CONDITION_RANK[filters.condition])
        return false
      if (r.pricePerDay > filters.maxPrice) return false
      if (r.distanceKm > filters.maxDistance) return false
      if (filters.availableOnly && r.availabilityStatus !== 'available') return false
      if (q) {
        const hay = [r.name, r.category, r.description, r.location, ...r.tags, ...r.accessories]
          .join(' ')
          .toLowerCase()
        if (!q.split(/\s+/).every((word) => hay.includes(word))) return false
      }
      return true
    })

    const ranked = recommend(pool, state.users, ctx)
    const byId = new Map(ranked.map((r) => [r.resource.id, r]))
    const rows = pool.map((r) => ({ resource: r, rec: byId.get(r.id) }))

    switch (filters.sort) {
      case 'price-asc':
        rows.sort((a, b) => a.resource.pricePerDay - b.resource.pricePerDay)
        break
      case 'price-desc':
        rows.sort((a, b) => b.resource.pricePerDay - a.resource.pricePerDay)
        break
      case 'distance':
        rows.sort((a, b) => a.resource.distanceKm - b.resource.distanceKm)
        break
      case 'rating':
        rows.sort((a, b) => b.resource.rating - a.resource.rating || b.resource.ratingCount - a.resource.ratingCount)
        break
      case 'newest':
        rows.sort((a, b) => b.resource.createdAt.localeCompare(a.resource.createdAt))
        break
      default:
        rows.sort((a, b) => (b.rec?.score ?? 0) - (a.rec?.score ?? 0))
    }
    return rows
  }, [state.resources, state.users, filters, ctx])

  const activeFilters =
    (filters.category !== 'All' ? 1 : 0) +
    (filters.condition !== 'Any' ? 1 : 0) +
    (filters.maxPrice < PRICE_CEILING ? 1 : 0) +
    (filters.maxDistance < DISTANCE_CEILING ? 1 : 0) +
    (filters.availableOnly ? 1 : 0)

  const availableNow = results.filter((r) => r.resource.availabilityStatus === 'available').length

  return (
    <Page>
      <PageHeader
        eyebrow={
          <Badge variant="outline" size="sm">
            <Compass className="size-3" />
            Discover
          </Badge>
        }
        title="Everything shared on campus"
        subtitle={
          <>
            <span className="num font-medium text-foreground">{num(results.length)}</span> resources
            match your filters · <span className="num">{availableNow}</span> free to pick up today.
          </>
        }
        actions={
          <Link to="/ai" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
            <Sparkles />
            Describe a need instead
          </Link>
        }
      />

      <div className="space-y-4">
        <SearchBar value={filters.query} onChange={(query) => setFilters((f) => ({ ...f, query }))} />
        <CategoryChips
          value={filters.category}
          onChange={(category) => setFilters((f) => ({ ...f, category }))}
        />
      </div>

      <div className="mt-7 grid gap-8 lg:grid-cols-[15rem_1fr]">
        {/* Desktop filter rail */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-xl border border-border bg-card p-4">
            <FilterPanel filters={filters} onChange={setFilters} />
          </div>
        </aside>

        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="lg:hidden"
                onClick={() => setSheet(true)}
              >
                <SlidersHorizontal />
                Filters
                {activeFilters > 0 && (
                  <Badge variant="primary" size="sm" className="num ml-0.5">
                    {activeFilters}
                  </Badge>
                )}
              </Button>
              <div className="hidden items-center gap-2 sm:flex">
                <Label htmlFor="sort" className="text-muted-foreground">
                  Sort
                </Label>
                <Select
                  id="sort"
                  value={filters.sort}
                  onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value as Filters['sort'] }))}
                  className="h-9 w-auto"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <SegmentedControl
              ariaLabel="Result layout"
              size="sm"
              value={view}
              onChange={setView}
              options={[
                { value: 'grid', label: 'Grid', icon: <LayoutGrid /> },
                { value: 'list', label: 'List', icon: <List /> },
              ]}
            />
          </div>

          {results.length === 0 ? (
            <EmptyState
              icon={<Compass />}
              title="No resources match those filters"
              message="Try widening the distance, raising the price ceiling, or clearing the category."
              action={
                <Button variant="outline" onClick={() => setFilters(DEFAULT_FILTERS)}>
                  Clear all filters
                </Button>
              }
            />
          ) : view === 'grid' ? (
            <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" step={0.03}>
              {results.map(({ resource, rec }) => (
                <StaggerItem key={resource.id}>
                  <ResourceCard
                    resource={resource}
                    owner={rec?.owner ?? state.users.find((u) => u.id === resource.ownerId)}
                    score={filters.sort === 'best' && filters.query.trim() ? rec?.score : undefined}
                  />
                </StaggerItem>
              ))}
            </Stagger>
          ) : (
            <Stagger className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card" step={0.02}>
              {results.map(({ resource, rec }) => (
                <StaggerItem key={resource.id}>
                  <ResourceRow
                    resource={resource}
                    owner={rec?.owner ?? state.users.find((u) => u.id === resource.ownerId)}
                  />
                </StaggerItem>
              ))}
            </Stagger>
          )}
        </div>
      </div>

      <Dialog open={sheet} onClose={() => setSheet(false)} title="Filters" size="sm">
        <FilterPanel filters={filters} onChange={setFilters} />
        <div className="mt-6 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => setFilters(DEFAULT_FILTERS)}>
            Clear
          </Button>
          <Button className="flex-1" onClick={() => setSheet(false)}>
            Show {results.length} results
          </Button>
        </div>
      </Dialog>
    </Page>
  )
}
