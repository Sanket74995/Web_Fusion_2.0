import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

export function Logo({
  className,
  showWordmark = true,
  to = '/',
}: {
  className?: string
  showWordmark?: boolean
  to?: string
}) {
  return (
    <Link to={to} className={cn('group inline-flex items-center gap-2.5', className)} aria-label="CampusLoop home">
      <span className="relative inline-flex size-8 items-center justify-center rounded-[0.6rem] bg-primary shadow-sm transition-transform duration-200 ease-snap group-hover:scale-105">
        <svg viewBox="0 0 24 24" className="size-[1.1rem] text-primary-foreground" aria-hidden>
          <path
            d="M8.2 15.8a5.4 5.4 0 0 1 0-7.6l1.8-1.8a5.4 5.4 0 0 1 7.6 7.6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.1"
            strokeLinecap="round"
          />
          <path
            d="M15.8 8.2a5.4 5.4 0 0 1 0 7.6l-1.8 1.8a5.4 5.4 0 0 1-7.6-7.6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.1"
            strokeLinecap="round"
            opacity="0.55"
          />
        </svg>
      </span>
      {showWordmark && (
        <span className="text-[0.9375rem] font-semibold tracking-tight">
          Campus<span className="text-primary">Loop</span>
        </span>
      )}
    </Link>
  )
}
