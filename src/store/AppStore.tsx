import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type {
  AppState,
  Borrowing,
  Category,
  ChecklistItem,
  ConditionGrade,
  ConditionReport,
  Dispute,
  LifecycleStatus,
  Notification,
  NotificationKind,
  Rating,
  Resource,
  Settlement,
  Transaction,
  User,
} from '@/types'
import { LIFECYCLE_ORDER } from '@/types'
import { createSeedState, loadState, resetState, saveState } from '@/services/storage'
import { computeCharges, computeLateFee, computeSettlement } from '@/services/pricing'
import { adjustTrust, blendRating } from '@/services/trust'
import { toDateInput } from '@/lib/format'
import { uid } from '@/lib/utils'

export const ADMIN_CREDENTIALS = { email: 'admin@campusloop.in', password: 'campus123' }

export interface NewResourceInput {
  name: string
  category: Category
  description: string
  condition: ConditionGrade
  conditionNotes: string
  images: string[]
  location: string
  pricePerDay: number
  pricePerHour?: number
  deposit: number
  minCharge: number
  accessories: string[]
  borrowingConditions: string[]
  availableFrom: string
  /** Walking distance from the campus centre. Own listings are treated as on-site. */
  distanceKm?: number
}

export interface ReportInput {
  overall: ConditionGrade
  checklist: ChecklistItem[]
  notes: string
  images: string[]
}

interface Store {
  state: AppState
  currentUser: User
  getUser: (id: string) => User | undefined
  getResource: (id: string) => Resource | undefined
  getBorrowing: (id: string) => Borrowing | undefined
  getReport: (id?: string) => ConditionReport | undefined
  getDispute: (id?: string) => Dispute | undefined
  getRating: (id?: string) => Rating | undefined

  addResource: (input: NewResourceInput) => Resource
  updateResource: (id: string, patch: Partial<Resource>) => void
  removeResource: (id: string) => void

  createRequest: (input: {
    resourceId: string
    startDate: string
    endDate: string
    purpose: string
    message?: string
    pickupTime?: string
  }) => Borrowing
  acceptRequest: (id: string) => void
  declineRequest: (id: string, reason?: string) => void
  payBorrowing: (id: string, method?: string) => Transaction
  confirmHandover: (id: string, report: ReportInput) => void
  confirmReturn: (id: string, input: { evidence: string[]; returnedAt: string }) => void
  completeInspection: (
    id: string,
    input: {
      report: ReportInput
      damage?: { reason: string; description: string; amount: number; evidence: string[] }
    },
  ) => void
  settle: (id: string) => Settlement | undefined
  submitRating: (
    id: string,
    input: { ownerRating: number; resourceRating: number; exchangeRating: number; review: string },
  ) => void

  pushNotification: (n: { kind: NotificationKind; title: string; body?: string; link?: string }) => void
  markNotificationRead: (id: string) => void
  markAllNotificationsRead: () => void

  adminLogin: (email: string, password: string) => boolean
  adminLogout: () => void
  setResourceApproval: (id: string, status: Resource['approvalStatus']) => void
  toggleResourceFlag: (id: string) => void
  setUserStatus: (id: string, status: User['status']) => void
  resolveDispute: (
    id: string,
    input: { status: Dispute['status']; resolvedAmount: number; resolution: string },
  ) => void
  setPlatformFeeRate: (rate: number) => void
  resetDemo: () => void
}

const StoreContext = createContext<Store | null>(null)

/** Deadlines pass while the app is open — keep lifecycle status honest. */
function syncOverdue(state: AppState): AppState {
  const now = Date.now()
  let changed = false
  const borrowings = state.borrowings.map((b) => {
    if (b.status === 'borrowed' && new Date(b.dueDate).getTime() < now) {
      changed = true
      return { ...b, status: 'return_due' as LifecycleStatus }
    }
    return b
  })
  return changed ? { ...state, borrowings } : state
}

function stamp(b: Borrowing, status: LifecycleStatus, note?: string): Borrowing {
  const at = new Date().toISOString()
  const timeline = b.timeline.some((t) => t.status === status)
    ? b.timeline.map((t) => (t.status === status ? { ...t, at, note: note ?? t.note } : t))
    : [...b.timeline, { status, at, note }]
  return { ...b, status, timeline }
}

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => syncOverdue(loadState()))
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    saveState(state)
  }, [state])

  /* Re-check deadlines every minute so an overdue item flips live. */
  useEffect(() => {
    const t = window.setInterval(() => setState((s) => syncOverdue(s)), 60000)
    return () => window.clearInterval(t)
  }, [])

  const update = useCallback((fn: (s: AppState) => AppState) => {
    setState((s) => fn(s))
  }, [])

  const notify = useCallback(
    (s: AppState, n: { kind: NotificationKind; title: string; body?: string; link?: string }): AppState => {
      const notification: Notification = {
        id: uid('n'),
        kind: n.kind,
        title: n.title,
        body: n.body,
        link: n.link,
        at: new Date().toISOString(),
        read: false,
      }
      return { ...s, notifications: [notification, ...s.notifications] }
    },
    [],
  )

  const store = useMemo<Store>(() => {
    const byId = <T extends { id: string }>(list: T[], id?: string) =>
      id ? list.find((x) => x.id === id) : undefined

    const currentUser =
      state.users.find((u) => u.id === state.currentUserId) ?? state.users[0]

    return {
      state,
      currentUser,
      getUser: (id) => byId(state.users, id),
      getResource: (id) => byId(state.resources, id),
      getBorrowing: (id) => byId(state.borrowings, id),
      getReport: (id) => byId(state.conditionReports, id),
      getDispute: (id) => byId(state.disputes, id),
      getRating: (id) => byId(state.ratings, id),

      /* ── Listings ───────────────────────────────────────── */
      addResource(input) {
        const resource: Resource = {
          id: uid('r'),
          ownerId: state.currentUserId,
          ...input,
          distanceKm: input.distanceKm ?? 0.4,
          availabilityStatus: 'available',
          rating: 0,
          ratingCount: 0,
          timesBorrowed: 0,
          tags: input.name
            .toLowerCase()
            .split(/[^a-z0-9]+/)
            .filter((w) => w.length > 2)
            .concat(input.category.toLowerCase()),
          approvalStatus: 'pending',
          flagged: false,
          createdAt: toDateInput(new Date()),
        }
        update((s) =>
          notify({ ...s, resources: [resource, ...s.resources] }, {
            kind: 'info',
            title: 'Listing submitted for review',
            body: `${resource.name} will be discoverable once approved.`,
            link: '/listings',
          }),
        )
        return resource
      },

      updateResource(id, patch) {
        update((s) => ({
          ...s,
          resources: s.resources.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        }))
      },

      removeResource(id) {
        update((s) => ({ ...s, resources: s.resources.filter((r) => r.id !== id) }))
      },

      /* ── Borrowing lifecycle ────────────────────────────── */
      createRequest(input) {
        const resource = state.resources.find((r) => r.id === input.resourceId)!
        const owner = state.users.find((u) => u.id === resource.ownerId)!
        const due = new Date(`${input.endDate}T18:00:00`)
        const borrowing: Borrowing = {
          id: uid('b'),
          resourceId: resource.id,
          ownerId: owner.id,
          borrowerId: state.currentUserId,
          startDate: input.startDate,
          dueDate: due.toISOString(),
          purpose: input.purpose,
          message: input.message,
          status: 'requested',
          charges: computeCharges(resource, input.startDate, input.endDate, state.platformFeeRate),
          pickupLocation: resource.location,
          pickupTime: input.pickupTime ?? `${input.startDate}T10:00`,
          returnEvidence: [],
          transactionIds: [],
          timeline: [{ status: 'requested', at: new Date().toISOString() }],
          createdAt: new Date().toISOString(),
        }
        update((s) =>
          notify({ ...s, borrowings: [borrowing, ...s.borrowings] }, {
            kind: 'info',
            title: `Request sent to ${owner.name.split(' ')[0]}`,
            body: `${resource.name} · ${borrowing.charges.days} day${borrowing.charges.days > 1 ? 's' : ''}`,
            link: `/borrowings/${borrowing.id}`,
          }),
        )
        return borrowing
      },

      acceptRequest(id) {
        update((s) => {
          const b = s.borrowings.find((x) => x.id === id)
          if (!b) return s
          const resource = s.resources.find((r) => r.id === b.resourceId)
          const owner = s.users.find((u) => u.id === b.ownerId)
          const next = {
            ...s,
            borrowings: s.borrowings.map((x) =>
              x.id === id ? stamp(x, 'accepted', 'Owner approved the request') : x,
            ),
          }
          return notify(next, {
            kind: 'success',
            title:
              b.borrowerId === s.currentUserId
                ? `${owner?.name.split(' ')[0]} accepted your borrowing request`
                : 'You accepted a borrowing request',
            body: `${resource?.name} · pickup at ${b.pickupLocation}`,
            link: `/borrowings/${b.id}`,
          })
        })
      },

      declineRequest(id, reason) {
        update((s) => {
          const b = s.borrowings.find((x) => x.id === id)
          if (!b) return s
          const resource = s.resources.find((r) => r.id === b.resourceId)
          const next = {
            ...s,
            borrowings: s.borrowings.map((x) =>
              x.id === id ? stamp(x, 'declined', reason ?? 'Request declined') : x,
            ),
          }
          return notify(next, {
            kind: 'warning',
            title: 'Borrowing request declined',
            body: `${resource?.name}${reason ? ` — ${reason}` : ''}`,
            link: `/borrowings/${b.id}`,
          })
        })
      },

      payBorrowing(id, method = 'Campus Wallet') {
        const b = stateRef.current.borrowings.find((x) => x.id === id)!
        const transaction: Transaction = {
          id: uid('t'),
          borrowingId: b.id,
          resourceId: b.resourceId,
          borrowerId: b.borrowerId,
          ownerId: b.ownerId,
          type: 'payment',
          amount: b.charges.total,
          borrowCharge: b.charges.borrowCharge,
          platformFee: b.charges.platformFee,
          deposit: b.charges.deposit,
          status: 'success',
          createdAt: new Date().toISOString(),
          method,
        }
        update((s) => {
          const resource = s.resources.find((r) => r.id === b.resourceId)
          const next: AppState = {
            ...s,
            transactions: [transaction, ...s.transactions],
            borrowings: s.borrowings.map((x) =>
              x.id === id
                ? { ...x, transactionIds: [...x.transactionIds, transaction.id] }
                : x,
            ),
          }
          return notify(next, {
            kind: 'success',
            title: 'Payment successful',
            body: `₹${transaction.amount} paid for ${resource?.name}. ₹${transaction.deposit} is a refundable deposit.`,
            link: `/borrowings/${b.id}`,
          })
        })
        return transaction
      },

      confirmHandover(id, report) {
        update((s) => {
          const b = s.borrowings.find((x) => x.id === id)
          if (!b) return s
          const record: ConditionReport = {
            id: uid('cr'),
            borrowingId: b.id,
            phase: 'before',
            overall: report.overall,
            checklist: report.checklist,
            notes: report.notes,
            images: report.images,
            createdAt: new Date().toISOString(),
            byUserId: s.currentUserId,
          }
          const withHandover = stamp(b, 'handover', 'Condition recorded and resource handed over')
          const borrowed = stamp({ ...withHandover, beforeReportId: record.id, handoverAt: record.createdAt }, 'borrowed')
          const resource = s.resources.find((r) => r.id === b.resourceId)
          const next: AppState = {
            ...s,
            conditionReports: [record, ...s.conditionReports],
            borrowings: s.borrowings.map((x) =>
              x.id === id ? { ...borrowed, borrowedAt: new Date().toISOString() } : x,
            ),
            resources: s.resources.map((r) =>
              r.id === b.resourceId
                ? { ...r, availabilityStatus: 'borrowed' as const, availableFrom: toDateInput(b.dueDate) }
                : r,
            ),
          }
          return notify(next, {
            kind: 'success',
            title: 'Handover complete',
            body: `${resource?.name} is now with you. Return by the deadline to get your full deposit back.`,
            link: `/borrowings/${b.id}`,
          })
        })
      },

      confirmReturn(id, input) {
        update((s) => {
          const b = s.borrowings.find((x) => x.id === id)
          if (!b) return s
          const resource = s.resources.find((r) => r.id === b.resourceId)
          const returned = stamp(
            { ...b, returnedAt: input.returnedAt, returnEvidence: input.evidence },
            'returned',
            'Resource returned by borrower',
          )
          const { lateFee } = computeLateFee(resource?.pricePerDay ?? 0, b.dueDate, input.returnedAt)
          const next: AppState = {
            ...s,
            borrowings: s.borrowings.map((x) => (x.id === id ? returned : x)),
            resources: s.resources.map((r) =>
              r.id === b.resourceId
                ? { ...r, availabilityStatus: 'available' as const, availableFrom: toDateInput(new Date()) }
                : r,
            ),
          }
          return notify(next, {
            kind: lateFee > 0 ? 'warning' : 'success',
            title: lateFee > 0 ? `Returned late — ₹${lateFee} late fee applies` : 'Resource returned on time',
            body: `${resource?.name} is now with the owner for inspection.`,
            link: `/borrowings/${b.id}`,
          })
        })
      },

      completeInspection(id, input) {
        update((s) => {
          const b = s.borrowings.find((x) => x.id === id)
          if (!b) return s
          const record: ConditionReport = {
            id: uid('cr'),
            borrowingId: b.id,
            phase: 'after',
            overall: input.report.overall,
            checklist: input.report.checklist,
            notes: input.report.notes,
            images: input.report.images,
            createdAt: new Date().toISOString(),
            byUserId: s.currentUserId,
          }
          let dispute: Dispute | undefined
          if (input.damage && input.damage.amount > 0) {
            dispute = {
              id: uid('d'),
              borrowingId: b.id,
              resourceId: b.resourceId,
              raisedByUserId: b.ownerId,
              againstUserId: b.borrowerId,
              reason: input.damage.reason,
              description: input.damage.description,
              claimedAmount: input.damage.amount,
              evidence: input.damage.evidence,
              status: 'under_review',
              createdAt: new Date().toISOString(),
            }
          }
          const inspected = stamp(
            { ...b, afterReportId: record.id, disputeId: dispute?.id ?? b.disputeId },
            'inspection',
            dispute ? `Damage reported — ₹${dispute.claimedAmount} claimed` : 'Condition verified against handover',
          )
          const next: AppState = {
            ...s,
            conditionReports: [record, ...s.conditionReports],
            disputes: dispute ? [dispute, ...s.disputes] : s.disputes,
            borrowings: s.borrowings.map((x) => (x.id === id ? inspected : x)),
          }
          return notify(
            next,
            dispute
              ? {
                  kind: 'warning',
                  title: 'Damage reported — dispute raised',
                  body: `₹${dispute.claimedAmount} claimed. An admin will review the evidence.`,
                  link: `/borrowings/${b.id}`,
                }
              : {
                  kind: 'success',
                  title: 'Inspection passed',
                  body: 'No damage found. Your deposit is ready to be refunded in full.',
                  link: `/borrowings/${b.id}`,
                },
          )
        })
      },

      settle(id) {
        const s0 = stateRef.current
        const b = s0.borrowings.find((x) => x.id === id)
        if (!b) return undefined
        const resource = s0.resources.find((r) => r.id === b.resourceId)
        const dispute = s0.disputes.find((d) => d.id === b.disputeId)
        const { hoursLate, lateFee } = computeLateFee(
          resource?.pricePerDay ?? 0,
          b.dueDate,
          b.returnedAt ?? new Date().toISOString(),
        )
        const damageDeduction =
          dispute?.status === 'resolved'
            ? (dispute.resolvedAmount ?? 0)
            : (dispute?.claimedAmount ?? 0)
        const settlement = computeSettlement({
          deposit: b.charges.deposit,
          damageDeduction,
          lateFee,
          hoursLate,
        })
        const refund: Transaction = {
          id: uid('t'),
          borrowingId: b.id,
          resourceId: b.resourceId,
          borrowerId: b.borrowerId,
          ownerId: b.ownerId,
          type: 'refund',
          amount: settlement.refund,
          borrowCharge: 0,
          platformFee: 0,
          deposit: settlement.refund,
          status: 'success',
          createdAt: settlement.settledAt,
          method: 'Campus Wallet',
        }
        update((s) => {
          const settled = stamp(
            { ...b, settlement, transactionIds: [...b.transactionIds, refund.id] },
            'settlement',
            `Refund of ₹${settlement.refund} processed`,
          )
          const next: AppState = {
            ...s,
            transactions: [refund, ...s.transactions],
            borrowings: s.borrowings.map((x) => (x.id === id ? settled : x)),
          }
          return notify(next, {
            kind: 'success',
            title: `₹${settlement.refund} security deposit refunded`,
            body: `${resource?.name} — settlement complete.`,
            link: `/borrowings/${b.id}`,
          })
        })
        return settlement
      },

      submitRating(id, input) {
        update((s) => {
          const b = s.borrowings.find((x) => x.id === id)
          if (!b) return s
          const resource = s.resources.find((r) => r.id === b.resourceId)
          const rating: Rating = {
            id: uid('rt'),
            borrowingId: b.id,
            fromUserId: s.currentUserId,
            toUserId: b.ownerId,
            resourceId: b.resourceId,
            ownerRating: input.ownerRating,
            resourceRating: input.resourceRating,
            exchangeRating: input.exchangeRating,
            review: input.review,
            createdAt: new Date().toISOString(),
          }
          const onTime = !b.settlement || b.settlement.hoursLate === 0
          const rated = stamp({ ...b, ratingId: rating.id }, 'rated', 'Exchange rated')

          const users = s.users.map((u) => {
            if (u.id === b.ownerId) {
              const exchanges = u.successfulExchanges + 1
              return {
                ...u,
                rating: blendRating(u.rating, u.ratingCount, input.ownerRating),
                ratingCount: u.ratingCount + 1,
                successfulExchanges: exchanges,
                trustScore: adjustTrust(u, {
                  fiveStar: input.ownerRating >= 5,
                  lowRating: input.ownerRating <= 2,
                }),
              }
            }
            if (u.id === b.borrowerId) {
              const exchanges = u.successfulExchanges + 1
              const onTimeCount = Math.round((u.onTimeRate / 100) * u.successfulExchanges) + (onTime ? 1 : 0)
              return {
                ...u,
                successfulExchanges: exchanges,
                onTimeRate: Math.round((onTimeCount / exchanges) * 100),
                trustScore: adjustTrust(u, { onTimeReturn: onTime, lateReturn: !onTime }),
              }
            }
            return u
          })

          const resources = s.resources.map((r) =>
            r.id === b.resourceId
              ? {
                  ...r,
                  rating: blendRating(r.rating, r.ratingCount, input.resourceRating),
                  ratingCount: r.ratingCount + 1,
                  timesBorrowed: r.timesBorrowed + 1,
                }
              : r,
          )

          const next: AppState = {
            ...s,
            users,
            resources,
            ratings: [rating, ...s.ratings],
            borrowings: s.borrowings.map((x) => (x.id === id ? rated : x)),
          }
          return notify(next, {
            kind: 'review',
            title: 'Thanks for rating this exchange',
            body: `Your review helps the next student borrow ${resource?.name} with confidence.`,
            link: `/borrowings/${b.id}`,
          })
        })
      },

      /* ── Notifications ──────────────────────────────────── */
      pushNotification(n) {
        update((s) => notify(s, n))
      },
      markNotificationRead(id) {
        update((s) => ({
          ...s,
          notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
        }))
      },
      markAllNotificationsRead() {
        update((s) => ({ ...s, notifications: s.notifications.map((n) => ({ ...n, read: true })) }))
      },

      /* ── Admin ─────────────────────────────────────────── */
      adminLogin(email, password) {
        const ok =
          email.trim().toLowerCase() === ADMIN_CREDENTIALS.email &&
          password === ADMIN_CREDENTIALS.password
        if (ok) update((s) => ({ ...s, adminSession: true }))
        return ok
      },
      adminLogout() {
        update((s) => ({ ...s, adminSession: false }))
      },
      setResourceApproval(id, status) {
        update((s) => {
          const resource = s.resources.find((r) => r.id === id)
          const next = {
            ...s,
            resources: s.resources.map((r) => (r.id === id ? { ...r, approvalStatus: status } : r)),
          }
          if (resource?.ownerId !== s.currentUserId) return next
          return notify(next, {
            kind: status === 'approved' ? 'success' : 'warning',
            title: status === 'approved' ? 'Your resource listing was approved' : 'Your listing was rejected',
            body: resource?.name,
            link: '/listings',
          })
        })
      },
      toggleResourceFlag(id) {
        update((s) => ({
          ...s,
          resources: s.resources.map((r) => (r.id === id ? { ...r, flagged: !r.flagged } : r)),
        }))
      },
      setUserStatus(id, status) {
        update((s) => ({ ...s, users: s.users.map((u) => (u.id === id ? { ...u, status } : u)) }))
      },
      resolveDispute(id, input) {
        update((s) => {
          const dispute = s.disputes.find((d) => d.id === id)
          if (!dispute) return s
          const next: AppState = {
            ...s,
            disputes: s.disputes.map((d) =>
              d.id === id
                ? {
                    ...d,
                    status: input.status,
                    resolvedAmount: input.resolvedAmount,
                    resolution: input.resolution,
                    resolvedAt: new Date().toISOString(),
                  }
                : d,
            ),
            users: s.users.map((u) =>
              u.id === dispute.againstUserId && input.status === 'resolved' && input.resolvedAmount > 0
                ? {
                    ...u,
                    disputes: u.disputes + 1,
                    trustScore: adjustTrust(u, { damageConfirmed: true }),
                  }
                : u,
            ),
          }
          if (dispute.againstUserId !== s.currentUserId && dispute.raisedByUserId !== s.currentUserId)
            return next
          return notify(next, {
            kind: input.status === 'resolved' ? 'info' : 'success',
            title: input.status === 'resolved' ? 'Your dispute was resolved' : 'Dispute closed with no deduction',
            body: input.resolution,
            link: `/borrowings/${dispute.borrowingId}`,
          })
        })
      },
      setPlatformFeeRate(rate) {
        update((s) => ({ ...s, platformFeeRate: rate }))
      },
      resetDemo() {
        resetState()
        setState(createSeedState())
      },
    }
  }, [state, update, notify])

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside <AppStoreProvider>')
  return ctx
}

/** Convenience selectors used across pages. */
export function useCurrentUser() {
  return useStore().currentUser
}

export function lifecycleIndex(status: LifecycleStatus) {
  return LIFECYCLE_ORDER.indexOf(status)
}

export function isBeyond(status: LifecycleStatus, marker: LifecycleStatus) {
  return lifecycleIndex(status) >= lifecycleIndex(marker)
}
