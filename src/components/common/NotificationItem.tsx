import { Link } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, Info, Star } from 'lucide-react'
import type { Notification, NotificationKind } from '@/types'
import { timeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'

const META: Record<NotificationKind, { icon: typeof Info; className: string }> = {
  success: { icon: CheckCircle2, className: 'bg-primary-soft text-primary' },
  warning: { icon: AlertTriangle, className: 'bg-warning-soft text-warning' },
  info: { icon: Info, className: 'bg-info-soft text-info' },
  review: { icon: Star, className: 'bg-accent/15 text-accent-foreground' },
}

export function NotificationItem({
  notification,
  onRead,
  className,
}: {
  notification: Notification
  onRead?: (id: string) => void
  className?: string
}) {
  const { icon: Icon, className: iconClass } = META[notification.kind]

  const body = (
    <>
      <span
        className={cn(
          'mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg',
          iconClass,
        )}
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p
            className={cn(
              'text-[0.8125rem] leading-snug',
              notification.read ? 'font-medium text-foreground' : 'font-semibold',
            )}
          >
            {notification.title}
          </p>
          <span className="num shrink-0 text-2xs text-muted-foreground">
            {timeAgo(notification.at)}
          </span>
        </div>
        {notification.body && (
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{notification.body}</p>
        )}
      </div>
      {!notification.read && (
        <span className="mt-2 size-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />
      )}
    </>
  )

  const shared = cn(
    'flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition-colors',
    notification.read ? 'border-border bg-card' : 'border-primary/20 bg-primary-soft/40',
    'hover:border-primary/30',
    className,
  )

  if (notification.link) {
    return (
      <Link to={notification.link} className={shared} onClick={() => onRead?.(notification.id)}>
        {body}
      </Link>
    )
  }
  return (
    <button type="button" className={shared} onClick={() => onRead?.(notification.id)}>
      {body}
    </button>
  )
}
