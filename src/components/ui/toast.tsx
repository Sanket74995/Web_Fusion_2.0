import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { cn, uid } from '@/lib/utils'

export type ToastTone = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  title: string
  description?: string
  tone: ToastTone
  action?: { label: string; onClick: () => void }
}

interface ToastContextValue {
  toast: (t: Omit<Toast, 'id' | 'tone'> & { tone?: ToastTone; duration?: number }) => void
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const TONE: Record<ToastTone, { icon: typeof CheckCircle2; ring: string; iconClass: string }> = {
  success: { icon: CheckCircle2, ring: 'border-primary/25', iconClass: 'text-primary' },
  error: { icon: XCircle, ring: 'border-destructive/25', iconClass: 'text-destructive' },
  warning: { icon: AlertTriangle, ring: 'border-warning/30', iconClass: 'text-warning' },
  info: { icon: Info, ring: 'border-info/25', iconClass: 'text-info' },
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    const timer = timers.current[id]
    if (timer) {
      clearTimeout(timer)
      delete timers.current[id]
    }
  }, [])

  const toast = useCallback<ToastContextValue['toast']>(
    ({ tone = 'success', duration = 4200, ...rest }) => {
      const id = uid('toast')
      setToasts((prev) => [...prev.slice(-2), { id, tone, ...rest }])
      timers.current[id] = setTimeout(() => dismiss(id), duration)
    },
    [dismiss],
  )

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss])

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-0 sm:top-0 sm:items-end sm:p-5">
          <AnimatePresence initial={false}>
            {toasts.map((t) => {
              const { icon: Icon, ring, iconClass } = TONE[t.tone]
              return (
                <motion.div
                  key={t.id}
                  layout
                  initial={{ opacity: 0, y: 14, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 24, scale: 0.97 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className={cn(
                    'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border bg-card p-3.5 shadow-lg',
                    ring,
                  )}
                  role="status"
                >
                  <Icon className={cn('mt-0.5 size-[1.125rem] shrink-0', iconClass)} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-snug">{t.title}</p>
                    {t.description && (
                      <p className="mt-0.5 text-[0.8125rem] leading-snug text-muted-foreground">
                        {t.description}
                      </p>
                    )}
                    {t.action && (
                      <button
                        type="button"
                        onClick={() => {
                          t.action?.onClick()
                          dismiss(t.id)
                        }}
                        className="mt-2 text-[0.8125rem] font-semibold text-primary underline-offset-2 hover:underline"
                      >
                        {t.action.label}
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => dismiss(t.id)}
                    aria-label="Dismiss notification"
                    className="-mr-1 -mt-1 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
