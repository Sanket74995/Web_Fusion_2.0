import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  Bell,
  BellOff,
  CheckCheck,
  Inbox,
  Info,
  Star,
} from 'lucide-react'
import type { Notification, NotificationKind } from '@/types'
import { useStore } from '@/store/AppStore'
import { fmtDateFull, isToday, isTomorrow, startOfDay } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/toast'
import { Page, PageHeader } from '@/components/layout/PageShell'
import { Reveal, Stagger, StaggerItem } from '@/components/common/Motion'
import { NotificationItem } from '@/components/common/NotificationItem'
import { EmptyState } from '@/components/common/EmptyState'

type Filter = 'all' | 'unread' | 'action' | 'updates'

/** Warnings are the ones that need the student to do something. */
const ACTION_KINDS: NotificationKind[] = ['warning', 'review']

function dayLabel(iso: string) {
  if (isToday(iso)) return 'Today'
  if (isTomorrow(iso)) return 'Tomorrow'
  const yesterday = startOfDay(new Date())
  yesterday.setDate(yesterday.getDate() - 1)
  if (startOfDay(iso).getTime() === yesterday.getTime()) return 'Yesterday'
  return fmtDateFull(iso)
}

export function NotificationsPage() {
  const { state, markNotificationRead, markAllNotificationsRead } = useStore()
  const { toast } = useToast()
  const [filter, setFilter] = useState<Filter>('all')

  const sorted = useMemo(
    () => [...state.notifications].sort((a, b) => b.at.localeCompare(a.at)),
    [state.notifications],
  )

  const unread = sorted.filter((n) => !n.read)
  const action = sorted.filter((n) => ACTION_KINDS.includes(n.kind))
  const updates = sorted.filter((n) => !ACTION_KINDS.includes(n.kind))

  const shown =
    filter === 'unread' ? unread : filter === 'action' ? action : filter === 'updates' ? updates : sorted

  /* Group into day buckets so a long list still reads as a timeline. */
  const groups = useMemo(() => {
    const map = new Map<string, Notification[]>()
    for (const n of shown) {
      const key = dayLabel(n.at)
      const list = map.get(key)
      if (list) list.push(n)
      else map.set(key, [n])
    }
    return Array.from(map.entries())
  }, [shown])

  const markAll = () => {
    if (!unread.length) return
    markAllNotificationsRead()
    toast({
      title: 'All caught up',
      description: `${unread.length} notification${unread.length === 1 ? '' : 's'} marked as read.`,
      tone: 'success',
    })
  }

  return (
    <Page width="narrow">
      <PageHeader
        title="Notifications"
        subtitle="Requests, handovers, deadlines and settlements — everything the platform did on your behalf."
        actions={
          <Button variant="outline" onClick={markAll} disabled={!unread.length}>
            <CheckCheck />
            Mark all read
          </Button>
        }
      />

      {unread.length > 0 && (
        <Reveal>
          <Card className="mb-5 border-primary/25 bg-primary-soft/40">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-5">
              <p className="flex items-center gap-2 text-[0.875rem] font-medium">
                <Bell className="size-4 text-primary" />
                {unread.length} unread
                {action.some((n) => !n.read) && ' — some need your attention'}
              </p>
              <Button size="sm" variant="soft" onClick={() => setFilter('unread')}>
                Show unread only
              </Button>
            </CardContent>
          </Card>
        </Reveal>
      )}

      <Tabs
        value={filter}
        onChange={setFilter}
        ariaLabel="Notification filters"
        className="mb-5"
        items={[
          { value: 'all', label: 'All', count: sorted.length, icon: <Inbox className="size-4" /> },
          { value: 'unread', label: 'Unread', count: unread.length, icon: <Bell className="size-4" /> },
          {
            value: 'action',
            label: 'Needs action',
            count: action.length,
            icon: <AlertTriangle className="size-4" />,
          },
          {
            value: 'updates',
            label: 'Updates',
            count: updates.length,
            icon: <Info className="size-4" />,
          },
        ]}
      />

      {shown.length === 0 ? (
        <EmptyState
          icon={filter === 'unread' ? <BellOff /> : <Inbox />}
          title={filter === 'unread' ? 'Nothing unread' : 'No notifications yet'}
          message={
            filter === 'unread'
              ? 'You have read everything. New activity on your requests and listings will land here.'
              : 'Request a resource or list one of your own and the platform will keep you posted here.'
          }
          action={
            <Link to="/discover" className={cn(buttonVariants({ variant: 'outline' }))}>
              Browse resources
            </Link>
          }
        />
      ) : (
        <div className="space-y-6">
          {groups.map(([label, items], gi) => (
            <section key={label}>
              <div className="mb-2.5 flex items-center gap-3">
                <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {label}
                </p>
                <span className="h-px flex-1 bg-border" />
                <span className="num text-2xs text-muted-foreground">{items.length}</span>
              </div>
              <Stagger className="space-y-2" delay={gi * 0.04}>
                {items.map((n) => (
                  <StaggerItem key={n.id}>
                    <NotificationItem notification={n} onRead={markNotificationRead} />
                  </StaggerItem>
                ))}
              </Stagger>
            </section>
          ))}
        </div>
      )}

      <Reveal delay={0.05}>
        <div className="mt-8 rounded-xl border border-border bg-muted/40 p-4">
          <p className="flex items-center gap-2 text-[0.8125rem] font-medium">
            <Star className="size-4 text-accent" />
            How notifications work here
          </p>
          <p className="mt-1.5 text-2xs leading-relaxed text-muted-foreground">
            Nothing is pushed from a server — CampusLoop generates these as the lifecycle advances,
            so every request, acceptance, payment, handover, overdue deadline, inspection and refund
            leaves a trace you can click straight back into.
          </p>
        </div>
      </Reveal>
    </Page>
  )
}
