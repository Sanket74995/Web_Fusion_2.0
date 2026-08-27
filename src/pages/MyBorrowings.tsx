import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CalendarClock,
  Clock,
  Compass,
  HandCoins,
  History,
  Inbox,
  PackageCheck,
  Sparkles,
} from 'lucide-react'
import type { Borrowing } from '@/types'
import { useStore } from '@/store/AppStore'
import { isActive, isClosed, nextAction } from '@/services/lifecycle'
import { fmtDate, fmtDateTime, inr, relativeDeadline } from '@/lib/format'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs } from '@/components/ui/tabs'
import { Page, PageHeader } from '@/components/layout/PageShell'
import { Reveal, Stagger, StaggerItem } from '@/components/common/Motion'
import { ResourceImage } from '@/components/common/ResourceImage'
import { Avatar } from '@/components/common/Avatar'
import { StatusBadge } from '@/components/common/StatusBadge'
import { LifecycleStrip } from '@/components/common/LifecycleTimeline'
import { StatCard } from '@/components/common/StatCard'
import { EmptyState } from '@/components/common/EmptyState'

type Tab = 'active' | 'requests' | 'lending' | 'history'

function BorrowingRow({ borrowing, role }: { borrowing: Borrowing; role: 'borrower' | 'owner' }) {
  const { getResource, getUser } = useStore()
  const resource = getResource(borrowing.resourceId)
  const counterparty = getUser(role === 'borrower' ? borrowing.ownerId : borrowing.borrowerId)
  if (!resource) return null

  const action = nextAction(borrowing)
  const overdue = borrowing.status === 'return_due'

  return (
    <Card className="transition-shadow duration-200 hover:shadow-md">
      <CardContent className="pt-5">
        <div className="flex flex-wrap items-start gap-4 sm:flex-nowrap">
          <Link to={`/resource/${resource.id}`} className="shrink-0">
            <ResourceImage
              resource={resource}
              className="size-[4.5rem]"
              rounded="rounded-xl"
              iconClassName="size-6"
            />
          </Link>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={borrowing.status} />
              {overdue && (
                <Badge variant="danger" size="sm">
                  <Clock className="size-3" />
                  {relativeDeadline(borrowing.dueDate)}
                </Badge>
              )}
              {role === 'owner' && (
                <Badge variant="outline" size="sm">
                  You are lending
                </Badge>
              )}
            </div>

            <Link
              to={`/borrowings/${borrowing.id}`}
              className="mt-2 block truncate text-[0.9375rem] font-semibold hover:text-primary"
            >
              {resource.name}
            </Link>

            <p className="mt-0.5 truncate text-2xs text-muted-foreground">{borrowing.purpose}</p>

            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-2xs text-muted-foreground">
              {counterparty && (
                <span className="inline-flex items-center gap-1.5">
                  <Avatar user={counterparty} size="xs" />
                  {role === 'borrower' ? 'from' : 'to'} {counterparty.name}
                </span>
              )}
              <span className="num inline-flex items-center gap-1.5">
                <CalendarClock className="size-3.5" />
                {fmtDate(borrowing.startDate)} → {fmtDate(borrowing.dueDate)}
              </span>
              <span className="num">
                {inr(borrowing.charges.total)} · deposit {inr(borrowing.charges.deposit)}
              </span>
            </div>
          </div>

          <div className="flex w-full shrink-0 flex-col items-stretch gap-2 sm:w-auto sm:items-end">
            <Link
              to={action.to}
              className={cn(
                buttonVariants({
                  variant: action.urgency === 'primary' ? 'primary' : 'outline',
                  size: 'sm',
                }),
                'w-full sm:w-auto',
              )}
            >
              {action.label}
              <ArrowRight />
            </Link>
            <p className="max-w-[16rem] text-2xs leading-relaxed text-muted-foreground sm:text-right">
              {action.hint}
            </p>
          </div>
        </div>

        <div className="mt-4 border-t border-border pt-3.5">
          <LifecycleStrip borrowing={borrowing} />
        </div>
      </CardContent>
    </Card>
  )
}

export function MyBorrowingsPage() {
  const { state } = useStore()
  const [tab, setTab] = useState<Tab>('active')

  const mine = useMemo(
    () =>
      state.borrowings
        .filter((b) => b.borrowerId === state.currentUserId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [state.borrowings, state.currentUserId],
  )

  const lending = useMemo(
    () =>
      state.borrowings
        .filter((b) => b.ownerId === state.currentUserId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [state.borrowings, state.currentUserId],
  )

  const active = mine.filter(isActive)
  const requests = mine.filter((b) => b.status === 'requested')
  const history = mine.filter(isClosed)

  const lists: Record<Tab, { items: Borrowing[]; role: 'borrower' | 'owner' }> = {
    active: { items: active, role: 'borrower' },
    requests: { items: requests, role: 'borrower' },
    lending: { items: lending, role: 'owner' },
    history: { items: history, role: 'borrower' },
  }

  const current = lists[tab]

  const spent = mine
    .filter((b) => b.transactionIds.length > 0)
    .reduce((acc, b) => acc + b.charges.borrowCharge + b.charges.platformFee, 0)
  const held = active.reduce(
    (acc, b) => acc + (b.transactionIds.length > 0 && !b.settlement ? b.charges.deposit : 0),
    0,
  )
  const dueSoon = active.find((b) => b.status === 'borrowed' || b.status === 'return_due')

  const empty: Record<Tab, { title: string; message: string }> = {
    active: {
      title: 'Nothing borrowed right now',
      message: 'When you borrow something, it shows up here with the next step you need to take.',
    },
    requests: {
      title: 'No pending requests',
      message: 'Requests waiting for an owner to accept appear here.',
    },
    lending: {
      title: 'Nobody has borrowed from you yet',
      message: 'List a resource and requests from other students will land here.',
    },
    history: {
      title: 'No completed exchanges yet',
      message: 'Finished exchanges, with their settlements and ratings, are kept here.',
    },
  }

  return (
    <Page>
      <PageHeader
        eyebrow={
          <Badge variant="outline" size="sm">
            <PackageCheck className="size-3" />
            Your exchanges
          </Badge>
        }
        title="My borrowings"
        subtitle="Every exchange you are part of, with the one thing that needs to happen next."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to="/ai" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
              <Sparkles />
              Find with AI
            </Link>
            <Link to="/discover" className={cn(buttonVariants({ size: 'sm' }))}>
              <Compass />
              Browse resources
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Reveal>
          <StatCard
            label="Active exchanges"
            value={String(active.length)}
            countTo={active.length}
            icon={PackageCheck}
            tone="primary"
            hint={dueSoon ? `Next return ${relativeDeadline(dueSoon.dueDate)}` : 'Nothing due'}
          />
        </Reveal>
        <Reveal delay={0.05}>
          <StatCard
            label="Deposits held"
            value={inr(held)}
            countTo={held}
            format={inr}
            icon={HandCoins}
            tone="info"
            hint="Refunded after inspection"
          />
        </Reveal>
        <Reveal delay={0.1}>
          <StatCard
            label="Spent instead of buying"
            value={inr(spent)}
            countTo={spent}
            format={inr}
            icon={History}
            hint={`${mine.length} request${mine.length === 1 ? '' : 's'} in total`}
          />
        </Reveal>
      </div>

      {dueSoon && (
        <Reveal delay={0.1}>
          <Card
            className={cn(
              'mt-6',
              dueSoon.status === 'return_due'
                ? 'border-warning/30 bg-warning-soft'
                : 'border-primary/25 bg-primary-soft/40',
            )}
          >
            <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-5">
              <div className="min-w-0">
                <p
                  className={cn(
                    'flex items-center gap-2 text-[0.9375rem] font-semibold',
                    dueSoon.status === 'return_due' ? 'text-warning' : 'text-primary',
                  )}
                >
                  <Clock className="size-4" />
                  {dueSoon.status === 'return_due'
                    ? 'A return is overdue'
                    : 'Return coming up'}
                </p>
                <p className="mt-1 text-[0.8125rem] leading-relaxed text-muted-foreground">
                  {getResourceName(state, dueSoon)} is due {fmtDateTime(dueSoon.dueDate)} —{' '}
                  {relativeDeadline(dueSoon.dueDate)}.
                </p>
              </div>
              <Link
                to={`/borrowings/${dueSoon.id}/return`}
                className={cn(buttonVariants({ size: 'sm' }))}
              >
                Start return
                <ArrowRight />
              </Link>
            </CardContent>
          </Card>
        </Reveal>
      )}

      <div className="mt-8">
        <Tabs
          value={tab}
          onChange={setTab}
          ariaLabel="Borrowing lists"
          items={[
            { value: 'active', label: 'Active', count: active.length, icon: <PackageCheck className="size-3.5" /> },
            { value: 'requests', label: 'Requests', count: requests.length, icon: <Inbox className="size-3.5" /> },
            { value: 'lending', label: 'Lending out', count: lending.length, icon: <HandCoins className="size-3.5" /> },
            { value: 'history', label: 'History', count: history.length, icon: <History className="size-3.5" /> },
          ]}
        />

        {current.items.length === 0 ? (
          <EmptyState
            className="mt-8"
            icon={<Inbox />}
            title={empty[tab].title}
            message={empty[tab].message}
            action={
              <Link to="/discover" className={cn(buttonVariants())}>
                <Compass />
                Browse what is free today
              </Link>
            }
          />
        ) : (
          <Stagger className="mt-5 space-y-4">
            {current.items.map((b) => (
              <StaggerItem key={b.id}>
                <BorrowingRow borrowing={b} role={current.role} />
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </div>
    </Page>
  )
}

function getResourceName(state: { resources: { id: string; name: string }[] }, b: Borrowing) {
  return state.resources.find((r) => r.id === b.resourceId)?.name ?? 'The resource'
}
