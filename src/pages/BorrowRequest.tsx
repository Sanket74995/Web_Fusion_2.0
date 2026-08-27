import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowRight, CalendarRange, Clock, Info, MapPin, ShieldCheck } from 'lucide-react'
import { useStore } from '@/store/AppStore'
import { computeCharges } from '@/services/pricing'
import { addDays, availabilityLabel, distanceLabel, fmtDate, inr, toDateInput } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, SectionTitle } from '@/components/ui/card'
import { Field, Input, Select, Textarea } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { BORROW_FLOW_STEPS, FlowSteps, Page, PageHeader } from '@/components/layout/PageShell'
import { Reveal } from '@/components/common/Motion'
import { ResourceImage } from '@/components/common/ResourceImage'
import { Avatar, RatingStars } from '@/components/common/Avatar'
import { TrustBadge, VerifiedTag } from '@/components/common/Trust'
import { ChargeBreakdown } from '@/components/common/ChargeBreakdown'
import { NotFoundPage } from './NotFound'

const PICKUP_SLOTS = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00']

const PURPOSE_HINTS = [
  'Shooting a reel for the college fest',
  'Unit test on Friday',
  'Mini project demo',
  'Inter-college match practice',
]

export function BorrowRequestPage() {
  const { resourceId = '' } = useParams()
  const [params] = useSearchParams()
  const { state, getResource, getUser, createRequest } = useStore()
  const { toast } = useToast()
  const navigate = useNavigate()

  const resource = getResource(resourceId)
  const owner = resource ? getUser(resource.ownerId) : undefined

  const [start, setStart] = useState(() => params.get('start') || toDateInput(new Date()))
  const [end, setEnd] = useState(
    () => params.get('end') || toDateInput(addDays(new Date(), 2)),
  )
  const [purpose, setPurpose] = useState(() => params.get('purpose') ?? '')
  const [pickupTime, setPickupTime] = useState('10:00')
  const [message, setMessage] = useState('')
  const [touched, setTouched] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const charges = useMemo(
    () =>
      resource && end >= start
        ? computeCharges(resource, start, end, state.platformFeeRate)
        : undefined,
    [resource, start, end, state.platformFeeRate],
  )

  if (!resource || !owner) return <NotFoundPage />

  const purposeError = touched && purpose.trim().length < 6 ? 'Tell the owner what it is for (a few words is enough).' : undefined
  const dateError = end < start ? 'The return date cannot be before the pickup date.' : undefined
  const tooEarly =
    new Date(`${start}T00:00:00`).getTime() < new Date(`${toDateInput(new Date())}T00:00:00`).getTime()
      ? 'Pickup cannot be in the past.'
      : undefined

  const blocked = Boolean(purposeError || dateError || tooEarly) || purpose.trim().length < 6

  const submit = () => {
    setTouched(true)
    if (blocked || !charges) return
    setSubmitting(true)
    const borrowing = createRequest({
      resourceId: resource.id,
      startDate: start,
      endDate: end,
      purpose: purpose.trim(),
      message: message.trim() || undefined,
      pickupTime: `${start}T${pickupTime}`,
    })
    toast({
      title: 'Request sent',
      description: `${owner.name.split(' ')[0]} has been notified about ${resource.name}.`,
      tone: 'success',
    })
    navigate(`/borrowings/${borrowing.id}/agreement`)
  }

  return (
    <Page width="form">
      <PageHeader
        back={{ to: `/resource/${resource.id}`, label: 'Back to resource' }}
        eyebrow={<FlowSteps steps={BORROW_FLOW_STEPS} current={0} />}
        title="Request to borrow"
        subtitle={`Send ${owner.name.split(' ')[0]} the dates and what you need it for. Nothing is charged yet.`}
      />

      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <div className="space-y-5">
          <Reveal>
            <Card>
              <CardContent className="space-y-5 pt-5">
                <SectionTitle title="When do you need it?" hint={availabilityLabel(resource.availableFrom)} />

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Pickup date" required error={tooEarly}>
                    {(id) => (
                      <Input
                        id={id}
                        type="date"
                        value={start}
                        min={toDateInput(new Date())}
                        onChange={(e) => {
                          setStart(e.target.value)
                          if (e.target.value > end) setEnd(e.target.value)
                        }}
                      />
                    )}
                  </Field>
                  <Field label="Return date" required error={dateError}>
                    {(id) => (
                      <Input
                        id={id}
                        type="date"
                        value={end}
                        min={start}
                        onChange={(e) => setEnd(e.target.value)}
                      />
                    )}
                  </Field>
                </div>

                <Field
                  label="Pickup time"
                  hint={`Hand over at ${resource.location}`}
                >
                  {(id) => (
                    <Select id={id} value={pickupTime} onChange={(e) => setPickupTime(e.target.value)}>
                      {PICKUP_SLOTS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-dashed border-border px-3.5 py-3 text-2xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarRange className="size-3.5" />
                    {fmtDate(start)} → {fmtDate(end)}
                  </span>
                  <span className="num inline-flex items-center gap-1.5">
                    <Clock className="size-3.5" />
                    {charges?.days ?? 1} day{(charges?.days ?? 1) > 1 ? 's' : ''}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="size-3.5" />
                    {distanceLabel(resource.distanceKm)} away
                  </span>
                </div>
              </CardContent>
            </Card>
          </Reveal>

          <Reveal delay={0.05}>
            <Card>
              <CardContent className="space-y-5 pt-5">
                <SectionTitle title="What is it for?" hint="Owners accept faster with context" />

                <Field label="Purpose" required error={purposeError}>
                  {(id) => (
                    <Input
                      id={id}
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                      onBlur={() => setTouched(true)}
                      placeholder="Shooting a reel for the college fest"
                    />
                  )}
                </Field>

                <div className="flex flex-wrap gap-1.5">
                  {PURPOSE_HINTS.map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setPurpose(h)}
                      className="rounded-full border border-border bg-card px-2.5 py-1 text-2xs text-muted-foreground transition-colors hover:border-primary/30 hover:bg-primary-soft hover:text-primary"
                    >
                      {h}
                    </button>
                  ))}
                </div>

                <Field label="Message to the owner" hint="Optional">
                  {(id) => (
                    <Textarea
                      id={id}
                      rows={3}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="I'll take good care of it and return it charged. Can pick up from the library gate."
                    />
                  )}
                </Field>
              </CardContent>
            </Card>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="rounded-xl border border-border bg-muted/40 p-4">
              <p className="flex items-center gap-2 text-[0.8125rem] font-semibold">
                <ShieldCheck className="size-3.5 text-primary" />
                What happens after you send this
              </p>
              <ol className="mt-2.5 space-y-1.5 text-[0.8125rem] text-muted-foreground">
                {[
                  `${owner.name.split(' ')[0]} reviews your request and trust score`,
                  'You accept the borrowing agreement and pay the charge + deposit',
                  'You meet, photograph the condition together and confirm handover',
                  'Return it on time, get the deposit back after inspection',
                ].map((s, i) => (
                  <li key={s} className="flex gap-2.5">
                    <span className="num mt-px inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-card text-[0.5625rem] font-bold text-muted-foreground ring-1 ring-border">
                      {i + 1}
                    </span>
                    {s}
                  </li>
                ))}
              </ol>
            </div>
          </Reveal>
        </div>

        {/* ── Summary rail ────────────────────────────────── */}
        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Reveal delay={0.05}>
            <Card>
              <CardContent className="pt-5">
                <Link to={`/resource/${resource.id}`} className="flex gap-3">
                  <ResourceImage
                    resource={resource}
                    className="size-16 shrink-0"
                    rounded="rounded-xl"
                    iconClassName="size-5"
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-[0.875rem] font-semibold">{resource.name}</span>
                    <span className="mt-0.5 block text-2xs text-muted-foreground">
                      {resource.category} · {resource.condition}
                    </span>
                    <span className="num mt-1 block text-2xs font-medium text-primary">
                      {inr(resource.pricePerDay)}/day
                    </span>
                  </span>
                </Link>

                <div className="mt-4 border-t border-border pt-4">
                  <Link to={`/profile/${owner.id}`} className="flex items-center gap-2.5">
                    <Avatar user={owner} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 truncate text-[0.8125rem] font-medium">
                        {owner.name}
                        <VerifiedTag user={owner} />
                      </span>
                      <RatingStars value={owner.rating} count={owner.ratingCount} size="xs" />
                    </span>
                    <TrustBadge user={owner} />
                  </Link>
                </div>

                {charges && (
                  <div className="mt-4 border-t border-border pt-4">
                    <ChargeBreakdown charges={charges} pricePerDay={resource.pricePerDay} showFormula />
                  </div>
                )}

                <Button className="mt-5 w-full" size="lg" loading={submitting} onClick={submit}>
                  Send request
                  <ArrowRight />
                </Button>
                <p className="mt-2 flex items-start gap-1.5 text-2xs leading-relaxed text-muted-foreground">
                  <Info className="mt-px size-3 shrink-0" />
                  Payment happens only after the owner accepts. The deposit is fully refundable when
                  the resource comes back in the same condition.
                </p>
              </CardContent>
            </Card>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
                Owner conditions
              </p>
              <ul className="mt-2.5 space-y-1.5">
                {resource.borrowingConditions.map((c) => (
                  <li key={c} className="flex gap-2 text-2xs leading-relaxed text-muted-foreground">
                    <span className="mt-1.5 size-1 shrink-0 rounded-full bg-muted-foreground" />
                    {c}
                  </li>
                ))}
              </ul>
              <Badge variant="outline" size="sm" className="mt-3">
                Agreeing to these is part of the next step
              </Badge>
            </div>
          </Reveal>

          <Link
            to={`/resource/${resource.id}`}
            className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'w-full')}
          >
            Cancel and go back
          </Link>
        </div>
      </div>
    </Page>
  )
}
