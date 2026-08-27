import { useMemo, useState } from 'react'
import {
  MapPin,
  Navigation,
  Search,
  Package,
  Clock,
  Building,
} from 'lucide-react'
import { useStore } from '@/store/AppStore'
import { CATEGORIES, type Resource } from '@/types'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Page, PageHeader } from '@/components/layout/PageShell'
import { ResourceCard } from '@/components/common/ResourceCard'
import { EmptyState } from '@/components/common/EmptyState'
import { Reveal } from '@/components/common/Motion'

interface Zone {
  id: string
  name: string
  subtitle: string
  x: number // percentage
  y: number // percentage
  walkMins: number
  iconName: string
  matchKeywords: string[]
}

const ZONES: Zone[] = [
  {
    id: 'z1',
    name: 'CS & IT Academic Building',
    subtitle: 'Labs 301-405 · 3rd Floor',
    x: 28,
    y: 32,
    walkMins: 1,
    iconName: 'Building',
    matchKeywords: ['lab', 'hostel', 'room', 'cs', 'it', 'floor', 'block'],
  },
  {
    id: 'z2',
    name: 'Central Library & Reading Hall',
    subtitle: '2nd Floor · Quiet Zone',
    x: 62,
    y: 24,
    walkMins: 3,
    iconName: 'Book',
    matchKeywords: ['library', 'reading', 'book', 'hall'],
  },
  {
    id: 'z3',
    name: 'Canteen & Quadrangle',
    subtitle: 'Ground Floor · Central Hub',
    x: 46,
    y: 54,
    walkMins: 2,
    iconName: 'Coffee',
    matchKeywords: ['canteen', 'quad', 'ground', 'hub'],
  },
  {
    id: 'z4',
    name: 'Boys Hostel (Block A & B)',
    subtitle: 'Behind Sports Ground',
    x: 20,
    y: 72,
    walkMins: 4,
    iconName: 'Home',
    matchKeywords: ['hostel a', 'hostel b', 'room 214', 'room 108', 'boys'],
  },
  {
    id: 'z5',
    name: 'Girls Hostel',
    subtitle: 'East Wing Campus Gate',
    x: 76,
    y: 68,
    walkMins: 5,
    iconName: 'Home',
    matchKeywords: ['girls hostel', 'girls', 'room 302', 'east wing'],
  },
  {
    id: 'z6',
    name: 'Workshop & Mechanical Shed',
    subtitle: 'South Campus Ground',
    x: 78,
    y: 38,
    walkMins: 4,
    iconName: 'Wrench',
    matchKeywords: ['workshop', 'mech', 'shed', 'tool'],
  },
]

export function CampusMapPage() {
  const { state, getUser } = useStore()
  const [selectedZoneId, setSelectedZoneId] = useState<string>('z1')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string>('All')

  const selectedZone = ZONES.find((z) => z.id === selectedZoneId) ?? ZONES[0]

  // Map resources to zones based on location text
  const resourcesByZone = useMemo(() => {
    const map = new Map<string, Resource[]>()
    ZONES.forEach((z) => map.set(z.id, []))

    state.resources.forEach((r) => {
      if (r.approvalStatus !== 'approved') return
      const loc = r.location.toLowerCase()

      // Match zone by keyword
      let matched = ZONES.find((z) =>
        z.matchKeywords.some((kw) => loc.includes(kw)),
      )
      if (!matched) matched = ZONES[0] // fallback to main building

      const current = map.get(matched.id) ?? []
      map.set(matched.id, [...current, r])
    })

    return map
  }, [state.resources])

  // Filter resources in the selected zone
  const activeZoneResources = useMemo(() => {
    const list = resourcesByZone.get(selectedZone.id) ?? []
    return list.filter((r) => {
      if (category !== 'All' && r.category !== category) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        return r.name.toLowerCase().includes(q) || r.tags.some((t) => t.includes(q))
      }
      return true
    })
  }, [resourcesByZone, selectedZone.id, category, search])

  return (
    <Page>
      <PageHeader
        eyebrow={<span className="text-sm text-muted-foreground">Live Pickup Radar</span>}
        title="Interactive Campus Map"
        subtitle="Locate available gear pinned to campus pickup zones with walking distance estimates"
      />

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        {/* Map View */}
        <div className="space-y-4">
          <Reveal>
            <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm">
              {/* Map Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <Navigation className="size-4 text-primary" />
                  <span className="text-xs font-semibold">TSEC Campus Layout</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" size="sm">
                    {ZONES.length} Active Pickup Zones
                  </Badge>
                </div>
              </div>

              {/* Interactive Visual Map Container */}
              <div className="relative w-full aspect-[4/3] rounded-xl border border-border bg-gradient-to-br from-primary-soft/30 via-background to-muted/40 overflow-hidden grid-bg select-none">
                {/* SVG Campus Pathways */}
                <svg className="absolute inset-0 size-full stroke-border/80" strokeWidth="2" fill="none">
                  <path d="M 28% 32% L 46% 54% L 62% 24%" strokeDasharray="4 4" />
                  <path d="M 46% 54% L 20% 72%" strokeDasharray="4 4" />
                  <path d="M 46% 54% L 76% 68%" strokeDasharray="4 4" />
                  <path d="M 62% 24% L 78% 38%" strokeDasharray="4 4" />
                </svg>

                {/* Campus Zone Pins */}
                {ZONES.map((zone) => {
                  const zoneResources = resourcesByZone.get(zone.id) ?? []
                  const count = zoneResources.length
                  const isSelected = zone.id === selectedZoneId

                  return (
                    <button
                      key={zone.id}
                      type="button"
                      onClick={() => setSelectedZoneId(zone.id)}
                      style={{ left: `${zone.x}%`, top: `${zone.y}%` }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 group focus:outline-none z-10"
                    >
                      {/* Pulse animation for active pin */}
                      {isSelected && (
                        <span className="absolute inset-0 size-full rounded-full bg-primary/40 animate-ping opacity-75" />
                      )}

                      <div
                        className={cn(
                          'relative flex items-center gap-2 rounded-full px-3 py-1.5 shadow-md border transition-all duration-200',
                          isSelected
                            ? 'bg-primary text-primary-foreground border-primary scale-110 shadow-lg'
                            : 'bg-card text-foreground border-border hover:border-primary/40 hover:scale-105',
                        )}
                      >
                        <MapPin className={cn('size-3.5', isSelected ? 'fill-primary-foreground' : 'text-primary')} />
                        <span className="text-2xs font-bold whitespace-nowrap">{zone.name.split(' ')[0]}</span>
                        <span
                          className={cn(
                            'num inline-flex size-4 items-center justify-center rounded-full text-[0.625rem] font-extrabold',
                            isSelected ? 'bg-primary-foreground text-primary' : 'bg-primary-soft text-primary',
                          )}
                        >
                          {count}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Zone Selector Chips */}
              <div className="mt-4 no-scrollbar flex gap-2 overflow-x-auto pb-1">
                {ZONES.map((zone) => {
                  const isSelected = zone.id === selectedZoneId
                  const count = (resourcesByZone.get(zone.id) ?? []).length
                  return (
                    <button
                      key={zone.id}
                      type="button"
                      onClick={() => setSelectedZoneId(zone.id)}
                      className={cn(
                        'flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium border transition-colors shrink-0',
                        isSelected
                          ? 'border-primary bg-primary-soft text-primary font-semibold'
                          : 'border-border bg-card text-muted-foreground hover:text-foreground',
                      )}
                    >
                      <Building className="size-3.5" />
                      {zone.name}
                      <span className="num text-2xs font-bold opacity-75">({count})</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </Reveal>
        </div>

        {/* Selected Zone Resource Sidebar */}
        <div className="space-y-4">
          <Reveal delay={0.05}>
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-start justify-between gap-3 border-b border-border pb-3 mb-4">
                  <div>
                    <Badge variant="primary" size="sm" className="mb-1">
                      Zone Details
                    </Badge>
                    <h3 className="text-base font-semibold">{selectedZone.name}</h3>
                    <p className="text-xs text-muted-foreground">{selectedZone.subtitle}</p>
                  </div>
                  <Badge variant="outline" size="sm" className="gap-1 shrink-0">
                    <Clock className="size-3 text-primary" />
                    {selectedZone.walkMins} min walk
                  </Badge>
                </div>

                {/* Filter & Search inside Zone */}
                <div className="space-y-3 mb-4">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search items in this zone…"
                      className="pl-8 h-8 text-xs"
                    />
                  </div>

                  <div className="no-scrollbar flex gap-1 overflow-x-auto">
                    <button
                      type="button"
                      onClick={() => setCategory('All')}
                      className={cn(
                        'rounded-md px-2.5 py-1 text-2xs font-medium shrink-0',
                        category === 'All'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:text-foreground',
                      )}
                    >
                      All
                    </button>
                    {CATEGORIES.slice(0, 5).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCategory(c)}
                        className={cn(
                          'rounded-md px-2.5 py-1 text-2xs font-medium shrink-0',
                          category === c
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:text-foreground',
                        )}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Resource List */}
                {activeZoneResources.length === 0 ? (
                  <EmptyState
                    compact
                    icon={<Package className="size-6 text-muted-foreground" />}
                    title="No resources in this zone"
                    message="Try selecting another campus zone on the map."
                  />
                ) : (
                  <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                    {activeZoneResources.map((r) => (
                      <ResourceCard
                        key={r.id}
                        resource={r}
                        owner={getUser(r.ownerId)}
                        compact
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </Reveal>
        </div>
      </div>
    </Page>
  )
}
