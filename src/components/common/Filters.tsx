import { Search, SlidersHorizontal, X } from 'lucide-react'
import type { Category, ConditionGrade } from '@/types'
import { CATEGORIES, CONDITION_GRADES } from '@/types'
import { inr } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input, Label, Select, Switch } from '@/components/ui/input'
import { ChipGroup } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'

export interface Filters {
  query: string
  category: Category | 'All'
  condition: ConditionGrade | 'Any'
  maxPrice: number
  maxDistance: number
  availableOnly: boolean
  sort: 'best' | 'price-asc' | 'price-desc' | 'distance' | 'rating' | 'newest'
}

export const DEFAULT_FILTERS: Filters = {
  query: '',
  category: 'All',
  condition: 'Any',
  maxPrice: 500,
  maxDistance: 3,
  availableOnly: false,
  sort: 'best',
}

export const PRICE_CEILING = 500
export const DISTANCE_CEILING = 3

export function SearchBar({
  value,
  onChange,
  placeholder = 'Search cameras, calculators, textbooks…',
  className,
  onSubmit,
  autoFocus,
}: {
  value: string
  onChange: (next: string) => void
  placeholder?: string
  className?: string
  onSubmit?: () => void
  autoFocus?: boolean
}) {
  return (
    <form
      className={cn('relative', className)}
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit?.()
      }}
      role="search"
    >
      <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Search resources"
        autoFocus={autoFocus}
        className="h-11 pl-10 pr-10"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      )}
    </form>
  )
}

export function CategoryChips({
  value,
  onChange,
  className,
}: {
  value: Category | 'All'
  onChange: (next: Category | 'All') => void
  className?: string
}) {
  return (
    <ChipGroup
      ariaLabel="Filter by category"
      className={className}
      value={value}
      onChange={onChange}
      items={[
        { value: 'All' as const, label: 'All' },
        ...CATEGORIES.map((c) => ({ value: c, label: c })),
      ]}
    />
  )
}

function activeCount(f: Filters) {
  let n = 0
  if (f.category !== 'All') n++
  if (f.condition !== 'Any') n++
  if (f.maxPrice < PRICE_CEILING) n++
  if (f.maxDistance < DISTANCE_CEILING) n++
  if (f.availableOnly) n++
  return n
}

export function FilterPanel({
  filters,
  onChange,
  className,
  onClose,
}: {
  filters: Filters
  onChange: (next: Filters) => void
  className?: string
  onClose?: () => void
}) {
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    onChange({ ...filters, [key]: value })
  const count = activeCount(filters)

  return (
    <div className={cn('space-y-5', className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Filters</h3>
          {count > 0 && (
            <Badge variant="primary" size="sm" className="num">
              {count}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          {count > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onChange({ ...DEFAULT_FILTERS, query: filters.query, sort: filters.sort })}
            >
              Reset
            </Button>
          )}
          {onClose && (
            <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close filters">
              <X />
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="filter-category">Category</Label>
        <Select
          id="filter-category"
          value={filters.category}
          onChange={(e) => set('category', e.target.value as Category | 'All')}
        >
          <option value="All">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="filter-condition">Minimum condition</Label>
        <Select
          id="filter-condition"
          value={filters.condition}
          onChange={(e) => set('condition', e.target.value as ConditionGrade | 'Any')}
        >
          <option value="Any">Any condition</option>
          {CONDITION_GRADES.map((c) => (
            <option key={c} value={c}>
              {c} or better
            </option>
          ))}
        </Select>
      </div>

      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <Label htmlFor="filter-price">Max price per day</Label>
          <span className="num text-xs font-medium text-muted-foreground">
            {filters.maxPrice >= PRICE_CEILING ? 'Any' : inr(filters.maxPrice)}
          </span>
        </div>
        <input
          id="filter-price"
          type="range"
          min={20}
          max={PRICE_CEILING}
          step={10}
          value={filters.maxPrice}
          onChange={(e) => set('maxPrice', Number(e.target.value))}
          className="w-full accent-[hsl(var(--primary))]"
        />
      </div>

      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <Label htmlFor="filter-distance">Max distance</Label>
          <span className="num text-xs font-medium text-muted-foreground">
            {filters.maxDistance >= DISTANCE_CEILING ? 'Any' : `${filters.maxDistance.toFixed(1)} km`}
          </span>
        </div>
        <input
          id="filter-distance"
          type="range"
          min={0.2}
          max={DISTANCE_CEILING}
          step={0.1}
          value={filters.maxDistance}
          onChange={(e) => set('maxDistance', Number(e.target.value))}
          className="w-full accent-[hsl(var(--primary))]"
        />
      </div>

      <div className="border-t border-border pt-4">
        <Switch
          checked={filters.availableOnly}
          onChange={(v) => set('availableOnly', v)}
          label="Available right now only"
        />
      </div>
    </div>
  )
}

export const SORT_OPTIONS: { value: Filters['sort']; label: string }[] = [
  { value: 'best', label: 'Best match' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'distance', label: 'Nearest first' },
  { value: 'rating', label: 'Highest rated' },
  { value: 'newest', label: 'Newest listings' },
]
