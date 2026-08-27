import { useEffect, useRef, useState } from 'react'
import { X, Send, MessageSquare } from 'lucide-react'
import { useStore } from '@/store/AppStore'
import { cn } from '@/lib/utils'
import { Avatar } from '@/components/common/Avatar'

interface ChatPanelProps {
  borrowingId: string
  open: boolean
  onClose: () => void
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

function formatDay(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const diff = Math.floor((today.setHours(0,0,0,0) - d.setHours(0,0,0,0)) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export function ChatPanel({ borrowingId, open, onClose }: ChatPanelProps) {
  const { state, currentUser, sendMessage, markMessagesRead, getUser } = useStore()
  const [text, setText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const messages = (state.messages ?? []).filter((m) => m.borrowingId === borrowingId)
  const borrowing = state.borrowings.find((b) => b.id === borrowingId)
  const counterpartyId = borrowing
    ? borrowing.borrowerId === currentUser.id
      ? borrowing.ownerId
      : borrowing.borrowerId
    : undefined
  const counterparty = counterpartyId ? getUser(counterpartyId) : undefined

  useEffect(() => {
    if (open) {
      markMessagesRead(borrowingId)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open, borrowingId, markMessagesRead])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const handleSend = () => {
    const trimmed = text.trim()
    if (!trimmed) return
    sendMessage(borrowingId, trimmed)
    setText('')
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Group messages by day
  type DayGroup = { day: string; items: typeof messages }
  const grouped: DayGroup[] = []
  for (const m of messages) {
    const day = formatDay(m.sentAt)
    const last = grouped[grouped.length - 1]
    if (last?.day === day) {
      last.items.push(m)
    } else {
      grouped.push({ day, items: [m] })
    }
  }

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
          onClick={onClose}
          aria-hidden
        />
      )}

      {/* Drawer */}
      <div
        className={cn(
          'fixed bottom-0 right-0 z-50 flex h-[520px] w-full max-w-md flex-col rounded-t-2xl border border-border bg-card shadow-xl transition-transform duration-300 sm:right-4 sm:h-[580px] sm:rounded-2xl sm:bottom-4',
          open ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none',
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          {counterparty ? (
            <Avatar user={counterparty} size="sm" />
          ) : (
            <span className="inline-flex size-8 items-center justify-center rounded-full bg-primary-soft text-primary">
              <MessageSquare className="size-4" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">
              {counterparty?.name ?? 'Chat'}
            </p>
            {counterparty && (
              <p className="truncate text-xs text-muted-foreground">
                {counterparty.department} · {counterparty.year}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close chat"
            className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <MessageSquare className="size-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No messages yet.</p>
              <p className="text-xs text-muted-foreground/70">
                Send a message to start the conversation.
              </p>
            </div>
          )}

          {grouped.map((group) => (
            <div key={group.day}>
              <div className="flex items-center gap-2 my-2">
                <span className="h-px flex-1 bg-border" />
                <span className="text-2xs text-muted-foreground font-medium">{group.day}</span>
                <span className="h-px flex-1 bg-border" />
              </div>
              <div className="space-y-2">
                {group.items.map((m) => {
                  const isMe = m.fromUserId === currentUser.id
                  const sender = getUser(m.fromUserId)
                  return (
                    <div
                      key={m.id}
                      className={cn('flex gap-2', isMe ? 'flex-row-reverse' : 'flex-row')}
                    >
                      {!isMe && sender && (
                        <Avatar user={sender} size="xs" className="mt-1 shrink-0" />
                      )}
                      <div
                        className={cn(
                          'max-w-[75%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed',
                          isMe
                            ? 'rounded-tr-sm bg-primary text-primary-foreground'
                            : 'rounded-tl-sm bg-muted text-foreground',
                        )}
                      >
                        <p className="break-words">{m.text}</p>
                        <p
                          className={cn(
                            'mt-0.5 text-[0.65rem]',
                            isMe ? 'text-primary-foreground/70 text-right' : 'text-muted-foreground',
                          )}
                        >
                          {formatTime(m.sentAt)}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-border px-3 py-3">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-ring/20">
            <input
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Type a message…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <button
              onClick={handleSend}
              disabled={!text.trim()}
              aria-label="Send message"
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-opacity disabled:opacity-40 hover:opacity-90"
            >
              <Send className="size-3.5" />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
