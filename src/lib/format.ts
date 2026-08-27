/* Money + date formatting. Rupees are always whole numbers in this product. */

export function inr(amount: number, opts: { sign?: boolean } = {}) {
  const rounded = Math.round(amount)
  const abs = Math.abs(rounded).toLocaleString('en-IN')
  if (rounded < 0) return `−₹${abs}`
  return `${opts.sign && rounded > 0 ? '+' : ''}₹${abs}`
}

/** Compact money for dashboards: ₹2.4L, ₹86.5K. */
export function inrCompact(amount: number) {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`
  return `₹${Math.round(amount)}`
}

export function num(value: number) {
  return value.toLocaleString('en-IN')
}

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

export function startOfDay(d: Date | string = new Date()) {
  const date = new Date(d)
  date.setHours(0, 0, 0, 0)
  return date
}

export function addDays(d: Date | string, days: number) {
  const date = new Date(d)
  date.setDate(date.getDate() + days)
  return date
}

export function addHours(d: Date | string, hours: number) {
  const date = new Date(d)
  date.setHours(date.getHours() + hours)
  return date
}

/** yyyy-mm-dd — the value shape <input type="date"> expects. */
export function toDateInput(d: Date | string) {
  const date = new Date(d)
  const m = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${date.getFullYear()}-${m}-${day}`
}

/** "29 Aug" */
export function fmtDate(d: Date | string) {
  const date = new Date(d)
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`
}

/** "29 Aug 2026" */
export function fmtDateFull(d: Date | string) {
  const date = new Date(d)
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`
}

/** "6:00 PM" */
export function fmtTime(d: Date | string) {
  const date = new Date(d)
  let h = date.getHours()
  const m = `${date.getMinutes()}`.padStart(2, '0')
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${h}:${m} ${ampm}`
}

/** "29 Aug, 6:00 PM" */
export function fmtDateTime(d: Date | string) {
  return `${fmtDate(d)}, ${fmtTime(d)}`
}

/** "28 Aug – 29 Aug" */
export function fmtRange(start: Date | string, end: Date | string) {
  return `${fmtDate(start)} – ${fmtDate(end)}`
}

export function daysBetween(start: Date | string, end: Date | string) {
  const ms = startOfDay(end).getTime() - startOfDay(start).getTime()
  return Math.max(1, Math.round(ms / 86400000))
}

export function hoursBetween(start: Date | string, end: Date | string) {
  return (new Date(end).getTime() - new Date(start).getTime()) / 3600000
}

export function isToday(d: Date | string) {
  return startOfDay(d).getTime() === startOfDay().getTime()
}

export function isTomorrow(d: Date | string) {
  return startOfDay(d).getTime() === startOfDay(addDays(new Date(), 1)).getTime()
}

/** "Available now" / "Available tomorrow" / "Available 30 Aug" */
export function availabilityLabel(d: Date | string) {
  if (startOfDay(d).getTime() <= startOfDay().getTime()) return 'Available now'
  if (isTomorrow(d)) return 'Available tomorrow'
  return `Available ${fmtDate(d)}`
}

/** "2h ago", "3d ago", "just now" */
export function timeAgo(d: Date | string) {
  const diff = Date.now() - new Date(d).getTime()
  if (diff < 60000) return 'just now'
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return fmtDate(d)
}

/** "in 2 days", "in 4 hours", "3 hours overdue" */
export function relativeDeadline(d: Date | string) {
  const diff = new Date(d).getTime() - Date.now()
  const abs = Math.abs(diff)
  const hours = Math.round(abs / 3600000)
  const days = Math.round(abs / 86400000)
  const unit = hours < 24 ? (hours <= 1 ? '1 hour' : `${hours} hours`) : days === 1 ? '1 day' : `${days} days`
  return diff >= 0 ? `in ${unit}` : `${unit} overdue`
}

export function distanceLabel(km: number) {
  if (km < 1) return `${Math.round(km * 1000)} m away`
  return `${km.toFixed(1)} km away`
}
