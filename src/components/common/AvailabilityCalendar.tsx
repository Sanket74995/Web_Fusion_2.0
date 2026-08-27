import { useState } from 'react'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Info } from 'lucide-react'
import { useStore } from '@/store/AppStore'
import { toDateInput } from '@/lib/format'
import { cn } from '@/lib/utils'

interface AvailabilityCalendarProps {
  resourceId: string
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
  onSelectRange: (start: string, end: string) => void
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function AvailabilityCalendar({
  resourceId,
  startDate,
  endDate,
  onSelectRange,
}: AvailabilityCalendarProps) {
  const { state } = useStore()

  // Track month navigation relative to currently selected start or today
  const initialDate = startDate ? new Date(startDate) : new Date()
  const [viewYear, setViewYear] = useState(initialDate.getFullYear())
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth())

  // First click sets pickingStart, second click sets range
  const [pickingStart, setPickingStart] = useState<string | null>(null)

  // Find all active borrowings for this resource
  const activeBorrowings = state.borrowings.filter(
    (b) =>
      b.resourceId === resourceId &&
      !['declined', 'cancelled', 'settled', 'rated'].includes(b.status)
  )

  // Check if a date string YYYY-MM-DD is booked
  const isDateBooked = (dateStr: string) => {
    return activeBorrowings.some((b) => {
      const bStart = b.startDate
      const bEnd = toDateInput(new Date(b.dueDate))
      return dateStr >= bStart && dateStr <= bEnd
    })
  }

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear((y) => y - 1)
    } else {
      setViewMonth((m) => m - 1)
    }
  }

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear((y) => y + 1)
    } else {
      setViewMonth((m) => m + 1)
    }
  }

  // Days calculations
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()

  const todayStr = toDateInput(new Date())

  const handleDateClick = (dateStr: string) => {
    if (dateStr < todayStr || isDateBooked(dateStr)) return

    if (!pickingStart) {
      // First click: start range
      setPickingStart(dateStr)
    } else {
      // Second click: end range
      if (dateStr >= pickingStart) {
        onSelectRange(pickingStart, dateStr)
      } else {
        onSelectRange(dateStr, pickingStart)
      }
      setPickingStart(null)
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      {/* Header & Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarIcon className="size-4 text-primary" />
          <h4 className="text-sm font-semibold">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </h4>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="inline-flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Previous month"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="inline-flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Next month"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 text-center text-2xs font-semibold text-muted-foreground">
        {DAYS_OF_WEEK.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Empty slots before day 1 */}
        {Array.from({ length: firstDayOfMonth }).map((_, i) => (
          <div key={`empty-${i}`} className="h-8" />
        ))}

        {/* Days of the month */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dayNum = i + 1
          const d = new Date(viewYear, viewMonth, dayNum)
          const dateStr = toDateInput(d)

          const isPast = dateStr < todayStr
          const isBooked = isDateBooked(dateStr)
          const isToday = dateStr === todayStr

          const effectiveStart = pickingStart || startDate
          const effectiveEnd = pickingStart ? pickingStart : endDate

          const isStart = dateStr === effectiveStart
          const isEnd = dateStr === effectiveEnd
          const isInRange = dateStr >= effectiveStart && dateStr <= effectiveEnd

          return (
            <button
              key={dateStr}
              type="button"
              disabled={isPast || isBooked}
              onClick={() => handleDateClick(dateStr)}
              className={cn(
                'relative flex h-8 items-center justify-center rounded-lg text-xs font-medium transition-colors',
                isPast && 'text-muted-foreground/30 cursor-not-allowed line-through',
                isBooked &&
                  'bg-destructive/10 text-destructive cursor-not-allowed font-normal line-through',
                !isPast &&
                  !isBooked &&
                  !isInRange &&
                  'hover:bg-primary-soft hover:text-primary text-foreground',
                isInRange &&
                  !isBooked &&
                  'bg-primary-soft text-primary font-semibold',
                (isStart || isEnd) &&
                  !isBooked &&
                  'bg-primary text-primary-foreground font-bold shadow-sm hover:bg-primary hover:text-primary-foreground',
              )}
            >
              {dayNum}
              {isToday && !isInRange && !isBooked && (
                <span className="absolute bottom-1 size-1 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend & Instructions */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-2xs text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <span className="size-2 rounded-full bg-primary" /> Available
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="size-2 rounded-full bg-destructive/60" /> Booked
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="size-2 rounded-full bg-primary-soft border border-primary" /> Selected
          </span>
        </div>
        <p className="inline-flex items-center gap-1 text-muted-foreground/80">
          <Info className="size-3" />
          {pickingStart ? 'Select end date' : 'Click start & end dates'}
        </p>
      </div>
    </div>
  )
}
