import { Star } from 'lucide-react'
import type { User } from '@/types'
import { cn, initials } from '@/lib/utils'

const SIZES = {
  xs: 'size-6 text-[0.625rem]',
  sm: 'size-8 text-xs',
  md: 'size-10 text-[0.8125rem]',
  lg: 'size-14 text-base',
  xl: 'size-20 text-xl',
} as const

export function Avatar({
  user,
  size = 'md',
  className,
}: {
  user: Pick<User, 'name' | 'hue'>
  size?: keyof typeof SIZES
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold',
        SIZES[size],
        className,
      )}
      style={{
        background: `linear-gradient(140deg, hsl(${user.hue} 46% 92%), hsl(${user.hue + 24} 44% 84%))`,
        color: `hsl(${user.hue} 52% 26%)`,
      }}
      aria-hidden
    >
      {initials(user.name)}
    </span>
  )
}

export function RatingStars({
  value,
  count,
  size = 'sm',
  className,
  showValue = true,
}: {
  value: number
  count?: number
  size?: 'xs' | 'sm' | 'md'
  className?: string
  showValue?: boolean
}) {
  const px = { xs: 'size-3', sm: 'size-3.5', md: 'size-4' }[size]
  const text = { xs: 'text-2xs', sm: 'text-xs', md: 'text-sm' }[size]
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      <span className="inline-flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={cn(px, i <= Math.round(value) ? 'fill-accent text-accent' : 'text-border')}
            strokeWidth={1.5}
          />
        ))}
      </span>
      {showValue && (
        <span className={cn('num font-medium text-foreground', text)}>
          {value > 0 ? value.toFixed(1) : '—'}
          {count !== undefined && (
            <span className="ml-1 font-normal text-muted-foreground">({count})</span>
          )}
        </span>
      )}
    </span>
  )
}

/** Interactive star input for the rating page. */
export function StarInput({
  value,
  onChange,
  label,
  size = 'md',
}: {
  value: number
  onChange: (next: number) => void
  label: string
  size?: 'md' | 'lg'
}) {
  const px = size === 'lg' ? 'size-8' : 'size-6'
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={value === i}
          aria-label={`${i} star${i > 1 ? 's' : ''}`}
          onClick={() => onChange(i)}
          className="rounded-md p-0.5 transition-transform duration-150 ease-snap hover:scale-110 active:scale-95"
        >
          <Star
            className={cn(px, i <= value ? 'fill-accent text-accent' : 'text-border')}
            strokeWidth={1.5}
          />
        </button>
      ))}
    </div>
  )
}
