import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  CheckCircle2,
  Flag,
  Package,
  PackageCheck,
  Search,
  Trash2,
  XCircle,
} from 'lucide-react'
import type { Category, Resource } from '@/types'
import { CATEGORIES } from '@/types'
import { useStore } from '@/store/AppStore'
import { estimatedRetailValue } from '@/services/analytics'
import { availabilityLabel, inr, inrCompact, num, timeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input, Select } from '@/components/ui/input'
import { Tabs } from '@/components/ui/tabs'
import { Dialog, ConfirmDialog } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { PageHeader } from '@/components/layout/PageShell'
import { PageTransition, Reveal } from '@/components/common/Motion'
import { StatCard, DataRow } from '@/components/common/StatCard'
import { AdminTable, type Column } from '@/components/common/AdminTable'
import { Avatar } from '@/components/common/Avatar'
import { ResourceImage } from '@/components/common/ResourceImage'
import { ApprovalBadge, AvailabilityBadge } from '@/components/common/StatusBadge'

type Tab = 'pending' | 'approved' | 'flagged' | 'rejected' | 'all'

export function AdminResourcesPage() {
  const { state, getUser, setResourceApproval, toggleResourceFlag, removeResource } = useStore()
  const { toast } = useToast()

  const [tab, setTab] = useState<Tab>('pending')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<Category | 'all'>('all')
  const [openId, setOpenId] = useState<string | null>(null)
  const [removeId, setRemoveId] = useState<string | null>(null)

  const counts = useMemo(
    () => ({
      all: state.resources.length,
      pending: state.resources.filter((r) => r.approvalStatus === 'pending').length,
      approved: state.resources.filter((r) => r.approvalStatus === 'approved').length,
      rejected: state.resources.filter((r) => r.approvalStatus === 'rejected').length,
      flagged: state.resources.filter((r) => r.flagged).length,
    }),
    [state.resources],
  )

  const idleValue = useMemo(
    () => state.resources.reduce((s, r) => s + estimatedRetailValue(r), 0),
    [state.resources],
  )

  const outNow = state.resources.filter((r) => r.availabilityStatus === 'borrowed').length

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return state.resources
      .filter((r) => {
        if (tab === 'flagged' ? !r.flagged : tab !== 'all' && r.approvalStatus !== tab) return false
        if (category !== 'all' && r.category !== category) return false
        if (!q) return true
        const owner = getUser(r.ownerId)
        return (
          r.name.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q) ||
          r.tags.some((t) => t.toLowerCase().includes(q)) ||
          (owner?.name.toLowerCase().includes(q) ?? false)
        )
      })
      .sort((a, b) => {
        if (a.flagged !== b.flagged) return a.flagged ? -1 : 1
        return b.createdAt.localeCompare(a.createdAt)
      })
  }, [state.resources, tab, category, query, getUser])

  const open = openId ? state.resources.find((r) => r.id === openId) : undefined
  const openOwner = open ? getUser(open.ownerId) : undefined
  const toRemove = removeId ? state.resources.find((r) => r.id === removeId) : undefined

  const approve = (r: Resource) => {
    setResourceApproval(r.id, 'approved')
    toast({ title: `${r.name} approved`, description: 'Live on Discover now.', tone: 'success' })
  }

  const reject = (r: Resource) => {
    setResourceApproval(r.id, 'rejected')
    toast({
      title: `${r.name} rejected`,
      description: 'Hidden from Discover. The owner can edit and resubmit.',
      tone: 'warning',
    })
  }

  const flag = (r: Resource) => {
    toggleResourceFlag(r.id)
    toast({
      title: r.flagged ? `Flag cleared on ${r.name}` : `${r.name} flagged`,
      description: r.flagged
        ? 'It is back to normal ranking.'
        : 'Ranked lower and surfaced in the moderation queue.',
      tone: r.flagged ? 'success' : 'warning',
    })
  }

  const columns: Column<Resource>[] = [
    {
      key: 'resource',
      header: 'Resource',
      render: (r) => (
        <div className="flex items-center gap-3">
          <ResourceImage
            resource={r}
            className="size-10 shrink-0"
            rounded="rounded-lg"
            iconClassName="size-4"
          />
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 truncate text-[0.8125rem] font-semibold">
              {r.name}
              {r.flagged && (
                <Badge variant="danger" size="sm">
                  Flagged
                </Badge>
              )}
            </p>
            <p className="truncate text-2xs text-muted-foreground">
              {r.category} · {r.condition} · listed {timeAgo(r.createdAt)}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'owner',
      header: 'Owner',
      hideBelow: 'md',
      render: (r) => {
        const owner = getUser(r.ownerId)
        if (!owner) return <span className="text-2xs text-muted-foreground">Unknown</span>
        return (
          <div className="flex items-center gap-2">
            <Avatar user={owner} size="xs" />
            <div className="min-w-0">
              <p className="truncate text-xs font-medium">{owner.name}</p>
              <p className="num truncate text-2xs text-muted-foreground">
                Trust {owner.trustScore}
              </p>
            </div>
          </div>
        )
      },
    },
    {
      key: 'price',
      header: 'Per day',
      align: 'right',
      render: (r) => <span className="num text-[0.8125rem] font-semibold">{inr(r.pricePerDay)}</span>,
    },
    {
      key: 'deposit',
      header: 'Deposit',
      align: 'right',
      hideBelow: 'sm',
      render: (r) => <span className="num text-[0.8125rem]">{inr(r.deposit)}</span>,
    },
    {
      key: 'borrows',
      header: 'Borrows',
      align: 'right',
      hideBelow: 'lg',
      render: (r) => <span className="num text-[0.8125rem]">{r.timesBorrowed}</span>,
    },
    {
      key: 'availability',
      header: 'Availability',
      hideBelow: 'lg',
      render: (r) => <AvailabilityBadge resource={r} size="sm" />,
    },
    {
      key: 'approval',
      header: 'Approval',
      render: (r) => <ApprovalBadge status={r.approvalStatus} size="sm" />,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (r) => (
        <div className="flex justify-end gap-1.5">
          {r.approvalStatus !== 'approved' && (
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                approve(r)
              }}
            >
              Approve
            </Button>
          )}
          {r.approvalStatus === 'approved' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                flag(r)
              }}
            >
              <Flag />
              {r.flagged ? 'Clear flag' : 'Flag'}
            </Button>
          )}
          {r.approvalStatus === 'pending' && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:bg-destructive-soft hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation()
                reject(r)
              }}
            >
              Reject
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Listings"
        title="Resource moderation"
        subtitle="Nothing reaches Discover until a moderator has seen it. Check the photos, the deposit and the conditions."
        actions={
          counts.pending > 0 && (
            <Badge variant="warning">
              <AlertTriangle className="size-3" />
              {counts.pending} awaiting review
            </Badge>
          )
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Listings"
          value={num(counts.all)}
          countTo={counts.all}
          icon={Package}
          tone="primary"
          hint={`${counts.approved} live on Discover`}
        />
        <StatCard
          label="Awaiting approval"
          value={String(counts.pending)}
          icon={PackageCheck}
          tone={counts.pending > 0 ? 'warning' : 'default'}
          hint={counts.pending > 0 ? 'Blocking students from listing' : 'Queue is clear'}
        />
        <StatCard
          label="Out with borrowers"
          value={String(outNow)}
          icon={CheckCircle2}
          tone="info"
          hint="Currently on loan"
        />
        <StatCard
          label="Idle value listed"
          value={inrCompact(idleValue)}
          countTo={idleValue}
          format={inrCompact}
          icon={Package}
          hint="Estimated retail value in the pool"
        />
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        ariaLabel="Filter listings by approval state"
        className="mb-4"
        items={[
          { value: 'pending', label: 'Pending', count: counts.pending },
          { value: 'approved', label: 'Approved', count: counts.approved },
          { value: 'flagged', label: 'Flagged', count: counts.flagged },
          { value: 'rejected', label: 'Rejected', count: counts.rejected },
          { value: 'all', label: 'All', count: counts.all },
        ]}
      />

      <Reveal>
        <Card className="mb-4">
          <CardContent className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search listings, tags or owners"
                className="pl-9"
                aria-label="Search listings"
              />
            </div>
            <Select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category | 'all')}
              aria-label="Filter by category"
              className="sm:w-52"
            >
              <option value="all">All categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </CardContent>
        </Card>
      </Reveal>

      <Reveal delay={0.04}>
        <AdminTable
          rows={rows}
          columns={columns}
          onRowClick={(r) => setOpenId(r.id)}
          empty={{
            title:
              tab === 'pending'
                ? 'Nothing waiting for review'
                : 'No listings match these filters',
            message:
              tab === 'pending'
                ? 'Every submitted listing has been reviewed. New ones appear here instantly.'
                : 'Try another category or clear the search.',
          }}
        />
      </Reveal>

      <p className="mt-3 text-2xs text-muted-foreground">
        Showing {rows.length} listing{rows.length === 1 ? '' : 's'}. Click a row to inspect photos,
        accessories and borrowing conditions before approving.
      </p>

      {/* Listing detail */}
      <Dialog
        open={Boolean(open)}
        onClose={() => setOpenId(null)}
        size="xl"
        title={open?.name}
        description={open ? `${open.category} · ${open.location} · ${open.condition}` : undefined}
        footer={
          open && (
            <>
              <Button variant="ghost" onClick={() => setOpenId(null)}>
                Close
              </Button>
              <Button variant="outline" onClick={() => flag(open)}>
                <Flag />
                {open.flagged ? 'Clear flag' : 'Flag listing'}
              </Button>
              {open.approvalStatus !== 'rejected' && (
                <Button variant="outline" onClick={() => reject(open)}>
                  <XCircle />
                  Reject
                </Button>
              )}
              {open.approvalStatus !== 'approved' && (
                <Button onClick={() => approve(open)}>
                  <CheckCircle2 />
                  Approve listing
                </Button>
              )}
              <Button
                variant="destructive"
                onClick={() => {
                  setRemoveId(open.id)
                }}
              >
                <Trash2 />
                Remove
              </Button>
            </>
          )
        }
      >
        {open && (
          <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
            <div>
              {open.images.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {open.images.slice(0, 4).map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      alt={`${open.name} photo ${i + 1}`}
                      className="h-32 w-full rounded-lg border border-border object-cover"
                    />
                  ))}
                </div>
              ) : (
                <ResourceImage resource={open} className="h-40" rounded="rounded-xl" />
              )}

              <p className="mt-3 text-[0.8125rem] leading-relaxed text-muted-foreground">
                {open.description}
              </p>

              <div className="mt-3 rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Condition notes
                </p>
                <p className="mt-1 text-xs leading-relaxed">{open.conditionNotes}</p>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Included
                  </p>
                  <ul className="mt-1.5 space-y-1">
                    {open.accessories.map((a) => (
                      <li key={a} className="flex items-start gap-1.5 text-xs">
                        <CheckCircle2 className="mt-px size-3 shrink-0 text-primary" />
                        {a}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Borrowing conditions
                  </p>
                  <ul className="mt-1.5 space-y-1">
                    {open.borrowingConditions.map((c) => (
                      <li key={c} className="flex items-start gap-1.5 text-xs">
                        <span className="mt-1.5 size-1 shrink-0 rounded-full bg-muted-foreground" />
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <ApprovalBadge status={open.approvalStatus} />
                <AvailabilityBadge resource={open} />
                {open.flagged && <Badge variant="danger">Flagged</Badge>}
              </div>

              {openOwner && (
                <Link
                  to={`/profile/${openOwner.id}`}
                  className="mt-3 flex items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:bg-muted/40"
                >
                  <Avatar user={openOwner} size="md" />
                  <div className="min-w-0">
                    <p className="truncate text-[0.8125rem] font-semibold">{openOwner.name}</p>
                    <p className="num truncate text-2xs text-muted-foreground">
                      Trust {openOwner.trustScore} · {openOwner.successfulExchanges} exchanges ·{' '}
                      {openOwner.disputes} disputes
                    </p>
                  </div>
                </Link>
              )}

              <div className="mt-4 space-y-0.5 border-t border-border pt-3">
                <DataRow label="Per day" value={inr(open.pricePerDay)} strong />
                {open.pricePerHour !== undefined && (
                  <DataRow label="Per hour" value={inr(open.pricePerHour)} />
                )}
                <DataRow label="Minimum charge" value={inr(open.minCharge)} />
                <DataRow label="Security deposit" value={inr(open.deposit)} tone="primary" strong />
                <DataRow
                  label="Estimated retail value"
                  value={inr(estimatedRetailValue(open))}
                  tone="muted"
                />
                <DataRow label="Times borrowed" value={String(open.timesBorrowed)} />
                <DataRow label="Availability" value={availabilityLabel(open.availableFrom)} />
                <DataRow label="Distance from campus gate" value={`${open.distanceKm} km`} />
              </div>

              {open.tags.length > 0 && (
                <div className="mt-4">
                  <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Search tags
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {open.tags.map((t) => (
                      <Badge key={t} variant="outline" size="sm">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 flex items-start gap-2 rounded-lg border border-warning/25 bg-warning-soft/40 p-3">
                <AlertTriangle className="mt-px size-3.5 shrink-0 text-warning" />
                <p className="text-2xs leading-relaxed">
                  Check the deposit covers a realistic replacement. It is the only protection the
                  owner has if the resource comes back damaged.
                </p>
              </div>
            </div>
          </div>
        )}
      </Dialog>

      <ConfirmDialog
        open={Boolean(toRemove)}
        onClose={() => setRemoveId(null)}
        onConfirm={() => {
          if (toRemove) {
            removeResource(toRemove.id)
            toast({
              title: `${toRemove.name} removed`,
              description: 'The listing is gone from the platform.',
              tone: 'error',
            })
          }
          setRemoveId(null)
          setOpenId(null)
        }}
        tone="destructive"
        title={toRemove ? `Remove ${toRemove.name}?` : 'Remove listing?'}
        confirmLabel="Remove listing"
        message="This deletes the listing entirely. Use reject instead if the owner should be able to fix it and resubmit."
      />

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3">
        <p className="text-2xs leading-relaxed text-muted-foreground">
          Approvals take effect immediately — the student's listing appears on Discover with no
          rebuild or deploy.
        </p>
        <Link
          to="/discover"
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
        >
          Open Discover
        </Link>
      </div>
    </PageTransition>
  )
}
