import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  HelpCircle,
  Plus,
  Search,
  Calendar,
  Wallet,
  ArrowRight,
} from 'lucide-react'
import { useStore } from '@/store/AppStore'
import { CATEGORIES, type Category } from '@/types'
import { fmtDate, inr, timeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input, Field } from '@/components/ui/input'
import { Dialog } from '@/components/ui/dialog'
import { Page, PageHeader } from '@/components/layout/PageShell'
import { Avatar } from '@/components/common/Avatar'
import { CategoryIcon } from '@/components/common/ResourceImage'
import { EmptyState } from '@/components/common/EmptyState'
import { Reveal, Stagger, StaggerItem } from '@/components/common/Motion'

export function WantedBoardPage() {
  const { state, currentUser, getUser, getResource, createWantedRequest, fulfillWantedRequest } = useStore()

  const [category, setCategory] = useState<string>('All')
  const [search, setSearch] = useState('')
  const [openModal, setOpenModal] = useState(false)
  const [fulfillModal, setFulfillModal] = useState<string | null>(null)

  // New Request Form state
  const [title, setTitle] = useState('')
  const [reqCategory, setReqCategory] = useState<Category>('Cameras')
  const [description, setDescription] = useState('')
  const [neededByDate, setNeededByDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 3)
    return d.toISOString().slice(0, 10)
  })
  const [maxBudget, setMaxBudget] = useState('200')

  const requests = (state.wantedRequests ?? []).filter((w) => {
    if (category !== 'All' && w.category !== category) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return w.title.toLowerCase().includes(q) || w.description.toLowerCase().includes(q)
    }
    return true
  })

  const myListings = state.resources.filter(
    (r) => r.ownerId === currentUser.id && r.approvalStatus === 'approved',
  )

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !description.trim()) return
    createWantedRequest({
      title: title.trim(),
      category: reqCategory,
      description: description.trim(),
      neededByDate,
      maxBudgetPerDay: Number(maxBudget) || 100,
    })
    setTitle('')
    setDescription('')
    setOpenModal(false)
  }

  const handleFulfill = (resourceId: string) => {
    if (!fulfillModal) return
    fulfillWantedRequest(fulfillModal, resourceId)
    setFulfillModal(null)
  }

  return (
    <Page>
      <PageHeader
        eyebrow={<span className="text-sm text-muted-foreground">Community Feed</span>}
        title="Wanted Board"
        subtitle="Students requesting items that aren't listed yet. Have what they need? Help out and earn!"
        actions={
          <Button onClick={() => setOpenModal(true)}>
            <Plus className="size-4" />
            Post a Request
          </Button>
        }
      />

      {/* Filters & Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setCategory('All')}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors shrink-0',
              category === 'All'
                ? 'bg-primary text-primary-foreground'
                : 'bg-card border border-border text-muted-foreground hover:text-foreground',
            )}
          >
            All Requests
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={cn(
                'inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors shrink-0',
                category === c
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card border border-border text-muted-foreground hover:text-foreground',
              )}
            >
              <CategoryIcon category={c} className="size-3" />
              {c}
            </button>
          ))}
        </div>

        <div className="relative min-w-48 sm:w-64">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search requests…"
            className="pl-8 h-9 text-xs"
          />
        </div>
      </div>

      {/* Request Cards Grid */}
      {requests.length === 0 ? (
        <EmptyState
          icon={<HelpCircle />}
          title="No requests found"
          message="Be the first to post what you need for your project or event!"
          action={
            <Button size="sm" onClick={() => setOpenModal(true)}>
              <Plus className="size-4" />
              Post a Request
            </Button>
          }
        />
      ) : (
        <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {requests.map((req) => {
            const requester = getUser(req.requesterId)
            const fulfilledResource = req.fulfilledByResourceId
              ? getResource(req.fulfilledByResourceId)
              : undefined

            return (
              <StaggerItem key={req.id}>
                <Reveal>
                  <Card className="h-full flex flex-col justify-between hover:shadow-md transition-shadow">
                    <CardContent className="pt-5 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant="outline" size="sm" className="gap-1">
                            <CategoryIcon category={req.category} className="size-3" />
                            {req.category}
                          </Badge>
                          {req.status === 'fulfilled' ? (
                            <Badge variant="success" size="sm">
                              Fulfilled
                            </Badge>
                          ) : (
                            <span className="text-2xs text-muted-foreground">{timeAgo(req.createdAt)}</span>
                          )}
                        </div>

                        <h3 className="mt-3 text-base font-semibold leading-snug">{req.title}</h3>
                        <p className="mt-2 text-xs text-muted-foreground leading-relaxed line-clamp-3">
                          {req.description}
                        </p>

                        <div className="mt-4 flex flex-wrap items-center gap-3 text-2xs text-muted-foreground border-t border-border pt-3">
                          <span className="inline-flex items-center gap-1 font-medium text-foreground">
                            <Wallet className="size-3.5 text-primary" />
                            Budget: <span className="num font-bold">{inr(req.maxBudgetPerDay)}</span>/day
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="size-3.5 text-muted-foreground" />
                            Needed by {fmtDate(req.neededByDate)}
                          </span>
                        </div>
                      </div>

                      <div className="mt-5 pt-3 border-t border-border flex items-center justify-between gap-2">
                        {requester && (
                          <div className="flex items-center gap-2 min-w-0">
                            <Avatar user={requester} size="xs" />
                            <div className="min-w-0">
                              <p className="truncate text-2xs font-medium">{requester.name}</p>
                              <p className="truncate text-[0.625rem] text-muted-foreground">
                                {requester.department}
                              </p>
                            </div>
                          </div>
                        )}

                        {req.status === 'open' && req.requesterId !== currentUser.id && (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => setFulfillModal(req.id)}
                            className="text-xs h-8"
                          >
                            I Have This!
                          </Button>
                        )}
                        {req.status === 'fulfilled' && fulfilledResource && (
                          <Link
                            to={`/resource/${fulfilledResource.id}`}
                            className="text-2xs text-primary font-medium hover:underline inline-flex items-center gap-0.5"
                          >
                            View Offered Item <ArrowRight className="size-3" />
                          </Link>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Reveal>
              </StaggerItem>
            )
          })}
        </Stagger>
      )}

      {/* Post Request Modal */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)} title="Post a Resource Request">
        <form onSubmit={handleCreate} className="space-y-4 pt-2">
          <Field label="What do you need?">
            {(fid) => (
              <Input
                id={fid}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Sony Mirrorless Camera for 2 days"
                required
              />
            )}
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              {(fid) => (
                <select
                  id={fid}
                  value={reqCategory}
                  onChange={(e) => setReqCategory(e.target.value as Category)}
                  className="h-10 w-full rounded-lg border border-border bg-card px-3 text-xs outline-none focus:ring-2 focus:ring-ring"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}
            </Field>

            <Field label="Max Daily Budget (₹)">
              {(fid) => (
                <Input
                  id={fid}
                  type="number"
                  value={maxBudget}
                  onChange={(e) => setMaxBudget(e.target.value)}
                  placeholder="200"
                  required
                />
              )}
            </Field>
          </div>

          <Field label="Needed By Date">
            {(fid) => (
              <Input
                id={fid}
                type="date"
                value={neededByDate}
                onChange={(e) => setNeededByDate(e.target.value)}
                required
              />
            )}
          </Field>

          <Field label="Details / Context">
            {(fid) => (
              <textarea
                id={fid}
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explain what project or event this is for so lenders know how you'll use it."
                className="w-full rounded-lg border border-border bg-card p-3 text-xs outline-none focus:ring-2 focus:ring-ring"
                required
              />
            )}
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpenModal(false)}>
              Cancel
            </Button>
            <Button type="submit">Post Request</Button>
          </div>
        </form>
      </Dialog>

      {/* Fulfill Request Modal */}
      <Dialog
        open={!!fulfillModal}
        onClose={() => setFulfillModal(null)}
        title="Offer Your Resource"
      >
        <div className="space-y-4 pt-2">
          <p className="text-xs text-muted-foreground">
            Select one of your existing listings to fulfill this request:
          </p>

          {myListings.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-border rounded-xl">
              <p className="text-xs text-muted-foreground">You don't have any approved listings yet.</p>
              <Link to="/listings/new" className="mt-3 inline-flex">
                <Button size="sm">List an Item First</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {myListings.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleFulfill(r.id)}
                  className="flex w-full items-center justify-between gap-3 rounded-lg border border-border p-3 text-left hover:border-primary hover:bg-primary-soft/30 transition-colors"
                >
                  <div>
                    <p className="text-xs font-semibold">{r.name}</p>
                    <p className="text-2xs text-muted-foreground">
                      {r.category} · {inr(r.pricePerDay)}/day
                    </p>
                  </div>
                  <span className="text-xs text-primary font-medium">Select & Offer →</span>
                </button>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={() => setFulfillModal(null)}>
              Cancel
            </Button>
          </div>
        </div>
      </Dialog>
    </Page>
  )
}
