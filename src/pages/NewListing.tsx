import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Coins,
  Info,
  ListChecks,
  Package,
  Plus,
  Sparkles,
  X,
} from 'lucide-react'
import type { Category, ConditionGrade } from '@/types'
import { CATEGORIES, CONDITION_GRADES } from '@/types'
import { useStore } from '@/store/AppStore'
import { checklistFor } from '@/services/checklists'
import { platformFee, suggestPricing } from '@/services/pricing'
import { inr, toDateInput } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, SectionTitle } from '@/components/ui/card'
import { Field, Input, SegmentedControl, Select, Textarea } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { Page, PageHeader } from '@/components/layout/PageShell'
import { Reveal } from '@/components/common/Motion'
import { PhotoUpload } from '@/components/common/PhotoUpload'
import { CATEGORY_ICON, ResourceImage } from '@/components/common/ResourceImage'
import { DataRow } from '@/components/common/StatCard'

const DEFAULT_CONDITIONS = [
  'Return by the agreed deadline',
  'Keep it away from water',
  'Report any damage immediately',
]

export function NewListingPage() {
  const { currentUser, addResource } = useStore()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [category, setCategory] = useState<Category>('Cameras')
  const [description, setDescription] = useState('')
  const [condition, setCondition] = useState<ConditionGrade>('Excellent')
  const [conditionNotes, setConditionNotes] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [location, setLocation] = useState(currentUser.location)
  const [pricePerDay, setPricePerDay] = useState('')
  const [deposit, setDeposit] = useState('')
  const [accessories, setAccessories] = useState<string[]>([])
  const [accessoryDraft, setAccessoryDraft] = useState('')
  const [conditions, setConditions] = useState<string[]>(DEFAULT_CONDITIONS)
  const [conditionDraft, setConditionDraft] = useState('')
  const [availableFrom, setAvailableFrom] = useState(toDateInput(new Date()))
  const [submitting, setSubmitting] = useState(false)

  const suggestion = useMemo(() => suggestPricing(category, condition), [category, condition])
  const day = Number(pricePerDay) || 0
  const dep = Number(deposit) || 0
  const fee = platformFee(day)
  const Icon = CATEGORY_ICON[category]

  const errors = {
    name: name.trim().length < 3 ? 'Give it a name a student would search for' : '',
    description: description.trim().length < 20 ? 'At least a sentence or two' : '',
    pricePerDay: day <= 0 ? 'Set a daily rate' : '',
    deposit: dep <= 0 ? 'Set a refundable deposit' : '',
  }
  const valid = Object.values(errors).every((e) => !e)

  const addChip = (
    draft: string,
    setDraft: (v: string) => void,
    list: string[],
    setList: (v: string[]) => void,
  ) => {
    const value = draft.trim()
    if (!value || list.includes(value)) return
    setList([...list, value])
    setDraft('')
  }

  const applySuggestion = () => {
    setPricePerDay(String(suggestion.pricePerDay))
    setDeposit(String(suggestion.deposit))
    toast({
      title: 'Suggested pricing applied',
      description: `Based on ${category.toLowerCase()} in ${condition.toLowerCase()} condition on campus.`,
      tone: 'info',
    })
  }

  const submit = () => {
    if (!valid || submitting) return
    setSubmitting(true)
    window.setTimeout(() => {
      const resource = addResource({
        name: name.trim(),
        category,
        description: description.trim(),
        condition,
        conditionNotes: conditionNotes.trim() || `Condition graded ${condition} by the owner.`,
        images,
        location: location.trim() || currentUser.location,
        pricePerDay: day,
        deposit: dep,
        minCharge: Math.max(10, Math.round(day / 2)),
        accessories: accessories.length ? accessories : ['As shown in the photos'],
        borrowingConditions: conditions.length ? conditions : DEFAULT_CONDITIONS,
        availableFrom,
      })
      toast({
        title: `${resource.name} submitted`,
        description: 'It goes live on Discover once an admin approves the listing.',
        tone: 'success',
      })
      navigate('/listings')
    }, 700)
  }

  return (
    <Page width="form">
      <PageHeader
        back={{ to: '/listings', label: 'My listings' }}
        title="List a resource"
        subtitle="Something sitting unused is something another student is about to buy. Two minutes here saves them a purchase."
      />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          {/* Basics */}
          <Reveal>
            <Card>
              <CardContent className="space-y-4 pt-5">
                <SectionTitle title="The basics" hint="What it is and why someone would borrow it" />

                <Field label="Name" required error={errors.name || undefined}>
                  {(id) => (
                    <Input
                      id={id}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Canon EOS 200D DSLR with 18–55mm lens"
                    />
                  )}
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Category" required>
                    {(id) => (
                      <Select
                        id={id}
                        value={category}
                        onChange={(e) => setCategory(e.target.value as Category)}
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </Select>
                    )}
                  </Field>
                  <Field label="Pickup point" hint="Where a borrower would collect it">
                    {(id) => (
                      <Input
                        id={id}
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="Hostel B, Room 214"
                      />
                    )}
                  </Field>
                </div>

                <Field
                  label="Description"
                  required
                  error={errors.description || undefined}
                  hint="Mention the model, what it is good for, and anything a borrower should know."
                >
                  {(id) => (
                    <Textarea
                      id={id}
                      rows={4}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Great for event coverage and reels. Comes with a spare battery and a 32GB card. Shoots 1080p60 video, autofocus is quick enough for handheld work."
                    />
                  )}
                </Field>

                <Field label="Available from">
                  {(id) => (
                    <Input
                      id={id}
                      type="date"
                      value={availableFrom}
                      min={toDateInput(new Date())}
                      onChange={(e) => setAvailableFrom(e.target.value)}
                    />
                  )}
                </Field>
              </CardContent>
            </Card>
          </Reveal>

          {/* Condition */}
          <Reveal delay={0.05}>
            <Card>
              <CardContent className="space-y-4 pt-5">
                <SectionTitle
                  title="Condition"
                  hint="Grade it honestly — this is what the return inspection compares against"
                />
                <Field label="Overall grade">
                  {() => (
                    <SegmentedControl
                      value={condition}
                      onChange={setCondition}
                      options={CONDITION_GRADES.map((c) => ({ value: c, label: c }))}
                      ariaLabel="Condition grade"
                    />
                  )}
                </Field>
                <Field label="Condition notes" hint="Existing marks, quirks, battery health">
                  {(id) => (
                    <Textarea
                      id={id}
                      rows={2}
                      value={conditionNotes}
                      onChange={(e) => setConditionNotes(e.target.value)}
                      placeholder="Small scuff on the base plate. Everything else is as new."
                    />
                  )}
                </Field>

                <div className="rounded-xl border border-border bg-muted/30 p-3.5">
                  <p className="flex items-center gap-2 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <ListChecks className="size-3.5" />
                    Handover checklist for this category
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {checklistFor(category).map((item) => (
                      <Badge key={item} variant="outline" size="sm">
                        {item}
                      </Badge>
                    ))}
                  </div>
                  <p className="mt-2 text-2xs leading-relaxed text-muted-foreground">
                    Both students tick these off at handover and again at return, so damage is never
                    a matter of opinion.
                  </p>
                </div>

                <PhotoUpload
                  images={images}
                  onChange={setImages}
                  label="Photos"
                  hint="a clear photo doubles request rates"
                  emptyTitle="Add photos of the resource"
                  emptyMessage="No photo? CampusLoop generates a clean placeholder, but real photos get borrowed far more often."
                />
              </CardContent>
            </Card>
          </Reveal>

          {/* Pricing */}
          <Reveal delay={0.08}>
            <Card>
              <CardContent className="space-y-4 pt-5">
                <SectionTitle
                  title="Pricing"
                  hint="Keep it student-friendly — this is access, not rent"
                  action={
                    <Button variant="soft" size="sm" onClick={applySuggestion}>
                      <Sparkles />
                      Suggest
                    </Button>
                  }
                />

                <div className="rounded-xl border border-primary/20 bg-primary-soft/40 p-3.5">
                  <p className="flex items-center gap-2 text-[0.8125rem] font-semibold text-primary">
                    <Sparkles className="size-3.5" />
                    Suggested: {inr(suggestion.pricePerDay)}/day, {inr(suggestion.deposit)} deposit
                  </p>
                  <p className="mt-1 text-2xs leading-relaxed text-muted-foreground">
                    {suggestion.rationale}
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Price per day" required error={errors.pricePerDay || undefined}>
                    {(id) => (
                      <Input
                        id={id}
                        type="number"
                        min={0}
                        value={pricePerDay}
                        onChange={(e) => setPricePerDay(e.target.value)}
                        placeholder={String(suggestion.pricePerDay)}
                      />
                    )}
                  </Field>
                  <Field
                    label="Security deposit"
                    required
                    error={errors.deposit || undefined}
                    hint="Refunded in full after a clean return"
                  >
                    {(id) => (
                      <Input
                        id={id}
                        type="number"
                        min={0}
                        value={deposit}
                        onChange={(e) => setDeposit(e.target.value)}
                        placeholder={String(suggestion.deposit)}
                      />
                    )}
                  </Field>
                </div>

                <p className="flex items-start gap-1.5 rounded-lg bg-muted/60 px-3 py-2.5 text-2xs leading-relaxed text-muted-foreground">
                  <Info className="mt-px size-3.5 shrink-0" />
                  A borrower pays your charge plus a {inr(fee)} platform fee plus the {inr(dep)}{' '}
                  deposit. You receive the charge; CampusLoop holds the deposit until the inspection
                  passes.
                </p>
              </CardContent>
            </Card>
          </Reveal>

          {/* Accessories + rules */}
          <Reveal delay={0.1}>
            <Card>
              <CardContent className="space-y-5 pt-5">
                <SectionTitle title="What is included" hint="Accessories are checked at handover" />

                <div>
                  <div className="flex gap-2">
                    <Input
                      value={accessoryDraft}
                      onChange={(e) => setAccessoryDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addChip(accessoryDraft, setAccessoryDraft, accessories, setAccessories)
                        }
                      }}
                      placeholder="Spare battery"
                    />
                    <Button
                      variant="outline"
                      onClick={() =>
                        addChip(accessoryDraft, setAccessoryDraft, accessories, setAccessories)
                      }
                    >
                      <Plus />
                      Add
                    </Button>
                  </div>
                  {accessories.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {accessories.map((a) => (
                        <span
                          key={a}
                          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium"
                        >
                          {a}
                          <button
                            type="button"
                            aria-label={`Remove ${a}`}
                            onClick={() => setAccessories(accessories.filter((x) => x !== a))}
                            className="text-muted-foreground transition-colors hover:text-destructive"
                          >
                            <X className="size-3" strokeWidth={3} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-t border-border pt-4">
                  <p className="text-[0.8125rem] font-medium">Borrowing conditions</p>
                  <p className="mt-0.5 text-2xs text-muted-foreground">
                    These appear in the agreement the borrower has to accept.
                  </p>
                  <div className="mt-2.5 flex gap-2">
                    <Input
                      value={conditionDraft}
                      onChange={(e) => setConditionDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addChip(conditionDraft, setConditionDraft, conditions, setConditions)
                        }
                      }}
                      placeholder="No outdoor use in the rain"
                    />
                    <Button
                      variant="outline"
                      onClick={() =>
                        addChip(conditionDraft, setConditionDraft, conditions, setConditions)
                      }
                    >
                      <Plus />
                      Add
                    </Button>
                  </div>
                  <ul className="mt-3 space-y-1.5">
                    {conditions.map((c) => (
                      <li
                        key={c}
                        className="flex items-start justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2"
                      >
                        <span className="flex min-w-0 items-start gap-2 text-2xs leading-relaxed">
                          <Check className="mt-px size-3.5 shrink-0 text-primary" />
                          {c}
                        </span>
                        <button
                          type="button"
                          aria-label={`Remove condition: ${c}`}
                          onClick={() => setConditions(conditions.filter((x) => x !== c))}
                          className="shrink-0 text-muted-foreground transition-colors hover:text-destructive"
                        >
                          <X className="size-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </Reveal>
        </div>

        {/* Live preview */}
        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Reveal delay={0.05}>
            <Card className="overflow-hidden">
              <div className="relative">
                {images.length > 0 ? (
                  <img
                    src={images[0]}
                    alt={name || 'Listing preview'}
                    className="h-36 w-full object-cover"
                  />
                ) : (
                  <ResourceImage
                    resource={{ id: 'preview', name: name || 'Your resource', category, images: [] }}
                    className="h-36"
                  />
                )}
                <div className="absolute left-3 top-3">
                  <Badge variant="outline" size="sm" className="bg-card/90 backdrop-blur-sm">
                    <Icon className="size-3" />
                    {category}
                  </Badge>
                </div>
              </div>
              <CardContent className="pt-4">
                <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Live preview
                </p>
                <p className="mt-1.5 truncate text-[0.9375rem] font-semibold">
                  {name || 'Your resource name'}
                </p>
                <p className="mt-1 line-clamp-2 text-2xs leading-relaxed text-muted-foreground">
                  {description || 'Your description shows up here, exactly as students will read it.'}
                </p>

                <div className="mt-4 space-y-0.5 border-t border-border pt-4">
                  <DataRow label="Per day" value={day ? inr(day) : '—'} />
                  <DataRow
                    label="Deposit"
                    value={dep ? inr(dep) : '—'}
                    tone="primary"
                    hint="Held by CampusLoop, refunded after inspection"
                  />
                  <DataRow label="Condition" value={condition} />
                  <DataRow label="Included" value={`${accessories.length || 0} accessories`} />
                </div>

                <div className="mt-4 space-y-0.5 border-t border-border pt-4">
                  <DataRow
                    label="A 3-day loan earns you"
                    value={inr(day * 3)}
                    strong
                    tone="primary"
                  />
                </div>

                <Button
                  className="mt-5 w-full"
                  size="lg"
                  disabled={!valid}
                  loading={submitting}
                  onClick={submit}
                >
                  <Package />
                  Submit listing
                  <ArrowRight />
                </Button>
                {!valid && (
                  <p className="mt-2 text-center text-2xs text-muted-foreground">
                    Fill in the name, description, rate and deposit.
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => navigate('/listings')}
                  className="mt-2 inline-flex w-full items-center justify-center gap-1.5 text-2xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ArrowLeft className="size-3" />
                  Cancel
                </button>
              </CardContent>
            </Card>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="flex items-center gap-2 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Coins className="size-3.5" />
                What happens next
              </p>
              <ol className="mt-2.5 space-y-2">
                {[
                  'An admin reviews the listing for safety and accuracy.',
                  'Once approved it appears in Discover and in AI matches.',
                  'You get a notification the moment someone requests it.',
                ].map((line, i) => (
                  <li key={line} className="flex items-start gap-2 text-2xs leading-relaxed text-muted-foreground">
                    <span className={cn('num mt-px inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[0.5625rem] font-semibold text-primary')}>
                      {i + 1}
                    </span>
                    {line}
                  </li>
                ))}
              </ol>
            </div>
          </Reveal>
        </div>
      </div>
    </Page>
  )
}
