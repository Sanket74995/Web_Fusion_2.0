import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MessageSquare, ArrowRight } from 'lucide-react'
import { useStore } from '@/store/AppStore'
import { timeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Page, PageHeader } from '@/components/layout/PageShell'
import { Avatar } from '@/components/common/Avatar'
import { StatusBadge } from '@/components/common/StatusBadge'
import { EmptyState } from '@/components/common/EmptyState'
import { ChatPanel } from '@/components/common/ChatPanel'
import { Reveal, Stagger, StaggerItem } from '@/components/common/Motion'

export function MessagesPage() {
  const { state, currentUser, getUser, getResource } = useStore()
  const [activeBorrowingId, setActiveBorrowingId] = useState<string | null>(null)

  // Build conversations: one per borrowing involving current user
  const conversations = state.borrowings
    .filter(
      (b) =>
        b.borrowerId === currentUser.id || b.ownerId === currentUser.id,
    )
    .map((b) => {
      const msgs = (state.messages ?? []).filter((m) => m.borrowingId === b.id)
      const last = msgs[msgs.length - 1]
      const unread = msgs.filter(
        (m) => !m.read && m.fromUserId !== currentUser.id,
      ).length
      const counterpartyId =
        b.borrowerId === currentUser.id ? b.ownerId : b.borrowerId
      const counterparty = getUser(counterpartyId)
      const resource = getResource(b.resourceId)
      return { borrowing: b, last, unread, counterparty, resource, msgCount: msgs.length }
    })
    .sort((a, b) => {
      const at = (x: typeof a) => x.last?.sentAt ?? x.borrowing.createdAt
      return at(b).localeCompare(at(a))
    })

  return (
    <Page>
      <PageHeader
        eyebrow={<span className="text-sm text-muted-foreground">Inbox</span>}
        title="Messages"
        subtitle="Chat threads with borrowers and lenders"
      />

      {conversations.length === 0 ? (
        <EmptyState
          icon={<MessageSquare />}
          title="No conversations yet"
          message="Messages appear here once you start borrowing or lending."
        />
      ) : (
        <Stagger className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
          {conversations.map(({ borrowing, last, unread, counterparty, resource }) => (
            <StaggerItem key={borrowing.id}>
              <Reveal>
                <button
                  type="button"
                  onClick={() => setActiveBorrowingId(borrowing.id)}
                  className={cn(
                    'flex w-full items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-muted/60',
                    unread > 0 && 'bg-primary-soft/30',
                  )}
                >
                  {counterparty ? (
                    <Avatar user={counterparty} size="md" />
                  ) : (
                    <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
                      <MessageSquare className="size-5 text-muted-foreground" />
                    </span>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn('truncate text-sm', unread > 0 ? 'font-semibold' : 'font-medium')}>
                        {counterparty?.name ?? 'Unknown'}
                      </p>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {last && (
                          <span className="text-xs text-muted-foreground">
                            {timeAgo(last.sentAt)}
                          </span>
                        )}
                        {unread > 0 && (
                          <span className="num inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[0.625rem] font-bold text-primary-foreground">
                            {unread}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="truncate text-xs text-muted-foreground mt-0.5">
                      {resource?.name ?? 'Resource'}
                    </p>
                    <p className={cn('mt-1 truncate text-xs', unread > 0 ? 'text-foreground' : 'text-muted-foreground')}>
                      {last
                        ? last.fromUserId === currentUser.id
                          ? `You: ${last.text}`
                          : last.text
                        : 'No messages yet — say hi!'}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <StatusBadge status={borrowing.status} />
                    <Link
                      to={`/borrowings/${borrowing.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-0.5 text-xs text-primary hover:underline"
                    >
                      Details <ArrowRight className="size-3" />
                    </Link>
                  </div>
                </button>
              </Reveal>
            </StaggerItem>
          ))}
        </Stagger>
      )}

      <ChatPanel
        borrowingId={activeBorrowingId ?? ''}
        open={!!activeBorrowingId}
        onClose={() => setActiveBorrowingId(null)}
      />
    </Page>
  )
}
