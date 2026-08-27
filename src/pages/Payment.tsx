import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  ArrowRight,
  Banknote,
  Building2,
  Check,
  CreditCard,
  Loader2,
  Lock,
  Receipt,
  Smartphone,
  Wallet,
} from 'lucide-react'
import { useStore } from '@/store/AppStore'
import type { Transaction } from '@/types'
import { fmtDateTime, inr } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, SectionTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import { BORROW_FLOW_STEPS, FlowSteps, Page, PageHeader } from '@/components/layout/PageShell'
import { Reveal } from '@/components/common/Motion'
import { ResourceImage } from '@/components/common/ResourceImage'
import { ChargeBreakdown } from '@/components/common/ChargeBreakdown'
import { DataRow } from '@/components/common/StatCard'
import { NotFoundPage } from './NotFound'

const METHODS = [
  { id: 'Campus Wallet', label: 'Campus Wallet', hint: 'Balance ₹2,480', icon: Wallet },
  { id: 'UPI', label: 'UPI', hint: 'Pay by any UPI app', icon: Smartphone },
  { id: 'Debit / Credit card', label: 'Card', hint: 'Visa · Mastercard · RuPay', icon: CreditCard },
  { id: 'Net banking', label: 'Net banking', hint: 'All major banks', icon: Building2 },
]

const STEPS = ['Verifying payment method', 'Holding security deposit', 'Confirming with owner']

export function PaymentPage() {
  const { id = '' } = useParams()
  const { getBorrowing, getResource, getUser, state, payBorrowing } = useStore()
  const { toast } = useToast()
  const navigate = useNavigate()
  const reduce = useReducedMotion()

  const borrowing = getBorrowing(id)
  const resource = borrowing ? getResource(borrowing.resourceId) : undefined
  const owner = borrowing ? getUser(borrowing.ownerId) : undefined

  const existing = state.transactions.find((t) => t.borrowingId === id && t.type === 'payment')

  const [method, setMethod] = useState(METHODS[0].id)
  const [step, setStep] = useState(-1)
  const [receipt, setReceipt] = useState<Transaction | undefined>(existing)
  const timers = useRef<number[]>([])

  useEffect(
    () => () => {
      timers.current.forEach((t) => window.clearTimeout(t))
    },
    [],
  )

  if (!borrowing || !resource || !owner) return <NotFoundPage />

  const paying = step >= 0
  const done = Boolean(receipt)

  const pay = () => {
    if (done || paying) return
    setStep(0)
    const tick = reduce ? 120 : 520
    STEPS.forEach((_, i) => {
      if (i === 0) return
      timers.current.push(window.setTimeout(() => setStep(i), i * tick))
    })
    timers.current.push(
      window.setTimeout(() => {
        const tx = payBorrowing(borrowing.id, method)
        setReceipt(tx)
        setStep(-1)
        toast({
          title: `${inr(tx.amount)} paid`,
          description: `${inr(tx.deposit)} of that is a refundable deposit.`,
          tone: 'success',
        })
      }, STEPS.length * tick),
    )
  }

  return (
    <Page width="form">
      <PageHeader
        back={{ to: `/borrowings/${borrowing.id}/agreement`, label: 'Back to agreement' }}
        eyebrow={<FlowSteps steps={BORROW_FLOW_STEPS} current={2} />}
        title={done ? 'Payment complete' : 'Confirm and pay'}
        subtitle={
          done
            ? 'The booking is locked. Meet the owner at the pickup point to record the condition.'
            : `Charge, platform fee and refundable deposit are collected together and held until ${resource.name} comes back.`
        }
        actions={
          <Badge variant="outline" size="sm">
            <Lock className="size-3" />
            Simulated gateway
          </Badge>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <div className="space-y-5">
          <AnimatePresence mode="wait">
            {done ? (
              <motion.div
                key="done"
                initial={reduce ? undefined : { opacity: 0, scale: 0.98 }}
                animate={reduce ? undefined : { opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                <Card className="border-primary/25">
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center text-center">
                      <span className="relative inline-flex size-14 items-center justify-center rounded-full bg-primary-soft text-primary">
                        <span
                          aria-hidden
                          className="absolute inset-0 animate-pulse-ring rounded-full bg-primary/25"
                        />
                        <Check className="size-7" />
                      </span>
                      <p className="num mt-4 text-2xl font-bold tracking-tight">
                        {inr(receipt!.amount)}
                      </p>
                      <p className="mt-1 text-[0.8125rem] text-muted-foreground">
                        paid to {owner.name.split(' ')[0]} via {receipt!.method}
                      </p>
                      <Badge variant="success" size="sm" className="mt-3">
                        Transaction {receipt!.id.toUpperCase()} · success
                      </Badge>
                    </div>

                    <div className="mt-6 rounded-xl border border-border bg-muted/40 p-4">
                      <p className="flex items-center gap-2 text-[0.8125rem] font-semibold">
                        <Receipt className="size-3.5 text-muted-foreground" />
                        Receipt
                      </p>
                      <div className="mt-3 space-y-0.5">
                        <DataRow label="Borrowing charge" value={inr(receipt!.borrowCharge)} />
                        <DataRow label="Platform fee" value={inr(receipt!.platformFee)} />
                        <DataRow label="Security deposit (refundable)" value={inr(receipt!.deposit)} />
                        <DataRow label="Total paid" value={inr(receipt!.amount)} strong />
                        <DataRow label="Paid at" value={fmtDateTime(receipt!.createdAt)} tone="muted" />
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <Button
                        className="flex-1"
                        size="lg"
                        onClick={() => navigate(`/borrowings/${borrowing.id}/handover`)}
                      >
                        Continue to handover
                        <ArrowRight />
                      </Button>
                      <Link
                        to={`/borrowings/${borrowing.id}`}
                        className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}
                      >
                        View exchange
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : paying ? (
              <motion.div
                key="paying"
                initial={reduce ? undefined : { opacity: 0 }}
                animate={reduce ? undefined : { opacity: 1 }}
                exit={reduce ? undefined : { opacity: 0 }}
              >
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-center text-[0.9375rem] font-semibold">
                      Processing {inr(borrowing.charges.total)}…
                    </p>
                    <ol className="mx-auto mt-5 max-w-sm space-y-3">
                      {STEPS.map((s, i) => (
                        <li key={s} className="flex items-center gap-3">
                          <span
                            className={cn(
                              'inline-flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors duration-200',
                              i < step && 'border-primary bg-primary text-primary-foreground',
                              i === step && 'border-primary text-primary',
                              i > step && 'border-border text-muted-foreground',
                            )}
                          >
                            {i < step ? (
                              <Check className="size-3.5" />
                            ) : i === step ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <span className="num text-2xs">{i + 1}</span>
                            )}
                          </span>
                          <span
                            className={cn(
                              'text-[0.875rem]',
                              i <= step ? 'font-medium' : 'text-muted-foreground',
                            )}
                          >
                            {s}
                          </span>
                        </li>
                      ))}
                    </ol>
                    <p className="mt-6 text-center text-2xs text-muted-foreground">
                      Do not close this page — no real money is moving.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                key="choose"
                initial={reduce ? undefined : { opacity: 0 }}
                animate={reduce ? undefined : { opacity: 1 }}
                exit={reduce ? undefined : { opacity: 0 }}
              >
                <Card>
                  <CardContent className="pt-5">
                    <SectionTitle title="Payment method" hint="Nothing real is charged" />
                    <div className="mt-4 space-y-2.5">
                      {METHODS.map((m) => {
                        const active = method === m.id
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setMethod(m.id)}
                            aria-pressed={active}
                            className={cn(
                              'flex w-full items-center gap-3.5 rounded-xl border px-4 py-3.5 text-left transition-all duration-150',
                              active
                                ? 'border-primary bg-primary-soft/60 ring-1 ring-primary/20'
                                : 'border-border bg-card hover:border-primary/30 hover:bg-muted/40',
                            )}
                          >
                            <span
                              className={cn(
                                'inline-flex size-9 shrink-0 items-center justify-center rounded-lg',
                                active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                              )}
                            >
                              <m.icon className="size-[1.125rem]" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-[0.875rem] font-semibold">{m.label}</span>
                              <span className="block text-2xs text-muted-foreground">{m.hint}</span>
                            </span>
                            <span
                              className={cn(
                                'inline-flex size-4 shrink-0 items-center justify-center rounded-full border',
                                active ? 'border-primary bg-primary text-primary-foreground' : 'border-border',
                              )}
                            >
                              {active && <Check className="size-2.5" />}
                            </span>
                          </button>
                        )
                      })}
                    </div>

                    <div className="mt-5 rounded-xl border border-dashed border-border px-4 py-3.5">
                      <p className="flex items-center gap-2 text-[0.8125rem] font-semibold">
                        <Banknote className="size-3.5 text-primary" />
                        Where the money goes
                      </p>
                      <div className="mt-2.5 space-y-0.5">
                        <DataRow
                          label={`To ${owner.name.split(' ')[0]} after handover`}
                          value={inr(borrowing.charges.borrowCharge)}
                        />
                        <DataRow
                          label="CampusLoop platform fee"
                          value={inr(borrowing.charges.platformFee)}
                        />
                        <DataRow
                          label="Held in escrow, refunded to you"
                          value={inr(borrowing.charges.deposit)}
                          tone="primary"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Summary rail */}
        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Reveal delay={0.05}>
            <Card>
              <CardContent className="pt-5">
                <div className="flex gap-3">
                  <ResourceImage
                    resource={resource}
                    className="size-16 shrink-0"
                    rounded="rounded-xl"
                    iconClassName="size-5"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-[0.875rem] font-semibold">{resource.name}</p>
                    <p className="mt-0.5 text-2xs text-muted-foreground">
                      Pickup {fmtDateTime(borrowing.pickupTime)}
                    </p>
                    <p className="truncate text-2xs text-muted-foreground">{borrowing.pickupLocation}</p>
                  </div>
                </div>

                <div className="mt-4 border-t border-border pt-4">
                  <ChargeBreakdown
                    charges={borrowing.charges}
                    pricePerDay={resource.pricePerDay}
                    showFormula
                  />
                </div>

                {!done && (
                  <Button className="mt-5 w-full" size="lg" loading={paying} onClick={pay}>
                    <Lock />
                    Pay {inr(borrowing.charges.total)}
                  </Button>
                )}

                <p className="mt-3 text-center text-2xs leading-relaxed text-muted-foreground">
                  {inr(borrowing.charges.deposit)} of this returns to you after the return inspection.
                </p>
              </CardContent>
            </Card>
          </Reveal>
        </div>
      </div>
    </Page>
  )
}
