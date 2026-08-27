import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Check, ChevronDown, Repeat2, UserCog } from 'lucide-react'
import type { Borrowing, User } from '@/types'
import { useStore } from '@/store/AppStore'
import { actorUserId, canAct, isActive, nextAction } from '@/services/lifecycle'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { Avatar } from '@/components/common/Avatar'
import { TrustBadge } from '@/components/common/Trust'

/**
 * How many live exchanges are waiting on each account to do something.
 * This is what makes switching useful rather than decorative — the judge can
 * see that Rahul has a request to approve before switching to him.
 */
function useWaitingCounts() {
  const { state } = useStore()
  return useMemo(() => {
    const counts = new Map<string, number>()
    for (const b of state.borrowings) {
      if (b.status !== 'requested' && !isActive(b)) continue
      const id = actorUserId(b)
      if (!id) continue
      counts.set(id, (counts.get(id) ?? 0) + 1)
    }
    return counts
  }, [state.borrowings])
}

/** One row in the account list. */
function AccountRow({
  user,
  active,
  waiting,
  onSelect,
}: {
  user: User
  active: boolean
  waiting: number
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={active}
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors duration-150',
        active ? 'bg-primary-soft' : 'hover:bg-muted',
      )}
    >
      <Avatar user={user} size="sm" />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span
            className={cn(
              'truncate text-[0.8125rem] font-medium',
              active && 'text-primary',
            )}
          >
            {user.name}
          </span>
          {waiting > 0 && !active && (
            <span className="num shrink-0 rounded-full bg-warning-soft px-1.5 text-[0.5625rem] font-bold leading-4 text-warning">
              {waiting} waiting
            </span>
          )}
        </span>
        <span className="block truncate text-2xs text-muted-foreground">
          {user.department} · {user.year}
        </span>
      </span>
      {active ? (
        <Check className="size-4 shrink-0 text-primary" />
      ) : (
        <TrustBadge user={user} />
      )}
    </button>
  )
}

/**
 * Navbar account switcher. Every screen derives roles from the signed-in id, so
 * this single control lets one browser play the borrower and the owner.
 */
export function AccountSwitcher() {
  const { state, currentUser, setCurrentUser } = useStore()
  const { toast } = useToast()
  const waiting = useWaitingCounts()
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  /* Accounts with something pending float to the top, current user first. */
  const ordered = useMemo(() => {
    const rest = state.users
      .filter((u) => u.id !== currentUser.id)
      .sort((a, b) => {
        const aw = waiting.get(a.id) ?? 0
        const bw = waiting.get(b.id) ?? 0
        if (aw !== bw) return bw - aw
        return b.trustScore - a.trustScore
      })
    return [currentUser, ...rest]
  }, [state.users, currentUser, waiting])

  const others = ordered.slice(1)
  const suggested = others.filter((u) => (waiting.get(u.id) ?? 0) > 0)
  const remaining = others.filter((u) => (waiting.get(u.id) ?? 0) === 0)

  const pick = (user: User) => {
    setOpen(false)
    if (user.id === currentUser.id) return
    setCurrentUser(user.id)
    toast({
      title: `Now signed in as ${user.name.split(' ')[0]}`,
      description: 'Requests, listings and exchanges have switched to this account.',
      tone: 'info',
    })
  }

  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Signed in as ${currentUser.name}. Switch account.`}
        className={cn(
          'inline-flex items-center gap-2 rounded-lg px-1.5 py-1 transition-colors duration-150',
          open ? 'bg-muted' : 'hover:bg-muted',
        )}
      >
        <Avatar user={currentUser} size="sm" />
        <span className="hidden text-[0.8125rem] font-medium lg:inline">
          {currentUser.name.split(' ')[0]}
        </span>
        <ChevronDown
          className={cn(
            'size-3.5 text-muted-foreground transition-transform duration-200',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Switch account"
          className="animate-scale-in absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[19.5rem] origin-top-right overflow-hidden rounded-xl border border-border bg-card shadow-lg"
        >
          <div className="border-b border-border px-3 py-2.5">
            <p className="flex items-center justify-between gap-2 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <UserCog className="size-3.5" />
                Signed in as
              </span>
              <Link
                to="/profile"
                onClick={() => setOpen(false)}
                className="font-semibold normal-case tracking-normal text-primary hover:underline"
              >
                View profile
              </Link>
            </p>
          </div>

          <div className="max-h-[19rem] overflow-y-auto p-1.5">
            <AccountRow
              user={currentUser}
              active
              waiting={waiting.get(currentUser.id) ?? 0}
              onSelect={() => setOpen(false)}
            />

            {suggested.length > 0 && (
              <>
                <p className="px-2 pb-1 pt-2.5 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Waiting on them
                </p>
                {suggested.map((u) => (
                  <AccountRow
                    key={u.id}
                    user={u}
                    active={false}
                    waiting={waiting.get(u.id) ?? 0}
                    onSelect={() => pick(u)}
                  />
                ))}
              </>
            )}

            <p className="px-2 pb-1 pt-2.5 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
              Other campus members
            </p>
            {remaining.map((u) => (
              <AccountRow
                key={u.id}
                user={u}
                active={false}
                waiting={0}
                onSelect={() => pick(u)}
              />
            ))}
          </div>

          <p className="border-t border-border bg-muted/40 px-3 py-2.5 text-2xs leading-relaxed text-muted-foreground">
            Login is simulated. Switching accounts shows the other side of an exchange —
            approving a request, running an inspection — without leaving the demo.
          </p>
        </div>
      )}
    </div>
  )
}

/**
 * Shown on an exchange when the next step belongs to the other student.
 * One click signs in as them and keeps you on the same screen, so the lifecycle
 * can be driven end to end in front of a judge.
 */
export function SwitchToActorCard({
  borrowing,
  className,
}: {
  borrowing: Borrowing
  className?: string
}) {
  const { state, getUser, setCurrentUser } = useStore()
  const { toast } = useToast()
  const navigate = useNavigate()

  const action = nextAction(borrowing)
  if (action.urgency === 'done') return null
  if (canAct(borrowing, state.currentUserId)) return null

  const neededId = actorUserId(borrowing)
  const needed = neededId ? getUser(neededId) : undefined
  if (!needed) return null

  const isOwnerTurn = neededId === borrowing.ownerId
  const first = needed.name.split(' ')[0]

  const switchAndGo = () => {
    setCurrentUser(needed.id)
    toast({
      title: `Now signed in as ${first}`,
      description: `${action.label} is this account's step.`,
      tone: 'info',
    })
    navigate(action.to)
  }

  return (
    <div
      className={cn(
        'rounded-xl border border-primary/25 bg-primary-soft/50 p-4',
        className,
      )}
    >
      <p className="flex items-center gap-2 text-[0.875rem] font-semibold text-primary">
        <Repeat2 className="size-4" />
        {isOwnerTurn ? "It's the owner's turn" : "It's the borrower's turn"}
      </p>
      <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-muted-foreground">
        <span className="font-medium text-foreground">{action.label}</span> is done by{' '}
        {needed.name}. Sign in as {first} to carry the exchange forward — the demo has
        no second browser, so accounts switch in place.
      </p>
      <div className="mt-3 flex items-center gap-2">
        <Avatar user={needed} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-2xs font-medium">{needed.name}</span>
          <span className="num block text-2xs text-muted-foreground">
            {isOwnerTurn ? 'Owner' : 'Borrower'} · {needed.trustScore} trust
          </span>
        </span>
        <Badge variant="outline" size="sm">
          {isOwnerTurn ? 'Lending' : 'Borrowing'}
        </Badge>
      </div>
      <Button size="sm" className="mt-3 w-full" onClick={switchAndGo}>
        Continue as {first}
        <ArrowRight />
      </Button>
    </div>
  )
}
