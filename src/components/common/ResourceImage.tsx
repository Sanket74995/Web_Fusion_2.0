import {
  BookOpen,
  Calculator,
  Camera,
  Dumbbell,
  FlaskConical,
  Laptop,
  Music,
  Plug,
  Speaker,
  Wrench,
} from 'lucide-react'
import type { Category, Resource } from '@/types'
import { cn, hashRandom } from '@/lib/utils'

export const CATEGORY_ICON: Record<Category, typeof Camera> = {
  Cameras: Camera,
  Laptops: Laptop,
  Books: BookOpen,
  Calculators: Calculator,
  Sports: Dumbbell,
  Music: Music,
  Electronics: Plug,
  'Event Equipment': Speaker,
  'Lab Equipment': FlaskConical,
  Tools: Wrench,
}

/** Deterministic hue per category so a category always reads the same colour. */
const CATEGORY_HUE: Record<Category, number> = {
  Cameras: 168,
  Laptops: 214,
  Books: 28,
  Calculators: 258,
  Sports: 142,
  Music: 322,
  Electronics: 196,
  'Event Equipment': 44,
  'Lab Equipment': 178,
  Tools: 12,
}

/**
 * Resource visual. Uses an uploaded image when the student provided one,
 * otherwise paints a deterministic gradient with the category glyph — no
 * network requests, no broken-image states, and every card looks intentional.
 */
export function ResourceImage({
  resource,
  className,
  iconClassName,
  rounded = 'rounded-t-xl',
}: {
  resource: Pick<Resource, 'id' | 'name' | 'category' | 'images'>
  className?: string
  iconClassName?: string
  rounded?: string
}) {
  const uploaded = resource.images.find((src) => src?.startsWith('data:'))
  if (uploaded) {
    return (
      <div className={cn('relative overflow-hidden bg-muted', rounded, className)}>
        <img src={uploaded} alt={resource.name} className="size-full object-cover" loading="lazy" />
      </div>
    )
  }

  const Icon = CATEGORY_ICON[resource.category]
  const hue = CATEGORY_HUE[resource.category]
  const drift = Math.round(hashRandom(resource.id) * 26) - 13
  const h1 = hue + drift
  const h2 = hue + drift + 22

  return (
    <div
      className={cn('relative flex items-center justify-center overflow-hidden', rounded, className)}
      style={{
        background: `linear-gradient(135deg, hsl(${h1} 42% 94%) 0%, hsl(${h2} 36% 88%) 100%)`,
      }}
      aria-hidden
    >
      <div
        className="absolute -right-6 -top-6 size-28 rounded-full opacity-40"
        style={{ background: `radial-gradient(circle, hsl(${h1} 60% 82%), transparent 70%)` }}
      />
      <div
        className="absolute -bottom-8 -left-4 size-24 rounded-full opacity-35"
        style={{ background: `radial-gradient(circle, hsl(${h2} 55% 80%), transparent 70%)` }}
      />
      <Icon
        className={cn('relative size-10 opacity-70', iconClassName)}
        style={{ color: `hsl(${h1} 46% 32%)` }}
        strokeWidth={1.5}
      />
    </div>
  )
}

export function CategoryIcon({ category, className }: { category: Category; className?: string }) {
  const Icon = CATEGORY_ICON[category]
  return <Icon className={className} />
}
