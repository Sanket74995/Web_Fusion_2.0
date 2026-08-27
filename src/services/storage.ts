import type { AppState, WantedRequest } from '@/types'
import { SEED_USERS, CURRENT_USER_ID } from '@/data/users'
import { SEED_RESOURCES } from '@/data/resources'
import { buildSeedHistory, buildSeedNotifications } from '@/data/history'
import { DEFAULT_PLATFORM_FEE_RATE } from '@/services/pricing'
import { computeBaseline } from '@/services/analytics'

const KEY = 'campusloop.state.v1'
export const STATE_VERSION = 1

const SEED_WANTED_REQUESTS: WantedRequest[] = [
  {
    id: 'w1',
    requesterId: 'u4',
    title: 'GoPro Hero 11 or 12 for Weekend Trek',
    category: 'Cameras',
    description: 'Need an action camera with waterproof housing for a 2-day trek to Rajmachi this weekend.',
    neededByDate: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10),
    maxBudgetPerDay: 400,
    status: 'open',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'w2',
    requesterId: 'u5',
    title: 'TI-84 Plus Graphic Calculator for Exam',
    category: 'Calculators',
    description: 'Need for Statistics mid-semester exam on Friday morning. Will return same day afternoon.',
    neededByDate: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10),
    maxBudgetPerDay: 80,
    status: 'open',
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    id: 'w3',
    requesterId: 'u6',
    title: 'Portable PA Speaker + Wireless Mic for Fest Rehearsal',
    category: 'Event Equipment',
    description: 'Required for drama team rehearsal at the open-air theater.',
    neededByDate: new Date(Date.now() + 86400000 * 5).toISOString().slice(0, 10),
    maxBudgetPerDay: 500,
    status: 'open',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
]

export function createSeedState(): AppState {
  const users = SEED_USERS.map((u) => ({
    ...u,
    coins: u.coins ?? Math.round(u.trustScore * 10 + u.successfulExchanges * 20),
  }))
  const resources = SEED_RESOURCES.map((r) => ({ ...r }))
  const history = buildSeedHistory(resources, users)
  const core = {
    users,
    resources,
    borrowings: history.borrowings,
    transactions: history.transactions,
  }
  return {
    version: STATE_VERSION,
    currentUserId: CURRENT_USER_ID,
    ...core,
    conditionReports: history.conditionReports,
    disputes: history.disputes,
    ratings: history.ratings,
    notifications: buildSeedNotifications(),
    messages: [],
    wishlistResourceIds: ['r1', 'r3'],
    wantedRequests: SEED_WANTED_REQUESTS,
    adminSession: false,
    platformFeeRate: DEFAULT_PLATFORM_FEE_RATE,
    baseline: computeBaseline(core),
    seededAt: new Date().toISOString(),
  }
}

/**
 * Seed dates are relative to "now", so a state persisted days ago would show
 * a stale demo (nothing due, nothing overdue). Re-seed when it gets old, but
 * keep it across refreshes and within a session — that is what the demo needs.
 */
const MAX_STATE_AGE_MS = 1000 * 60 * 60 * 18

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return createSeedState()
    const parsed = JSON.parse(raw) as AppState
    if (parsed.version !== STATE_VERSION) return createSeedState()
    if (Date.now() - new Date(parsed.seededAt).getTime() > MAX_STATE_AGE_MS) return createSeedState()
    // Forward-compatibility fallback for newly added state arrays
    if (!parsed.messages) parsed.messages = []
    if (!parsed.wishlistResourceIds) parsed.wishlistResourceIds = ['r1', 'r3']
    if (!parsed.wantedRequests) parsed.wantedRequests = SEED_WANTED_REQUESTS
    if (parsed.users) {
      parsed.users = parsed.users.map((u) => ({
        ...u,
        coins: u.coins ?? Math.round(u.trustScore * 10 + u.successfulExchanges * 20),
      }))
    }
    return parsed
  } catch {
    return createSeedState()
  }
}

let warned = false

export function saveState(state: AppState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch (err) {
    // Quota exceeded — almost always image data URLs. Drop them and retry once
    // so the demo state survives even if the pictures do not.
    if (!warned) {
      warned = true
      console.warn('CampusLoop: storage full, persisting without images.', err)
    }
    try {
      const slim: AppState = {
        ...state,
        resources: state.resources.map((r) => ({ ...r, images: r.images.slice(0, 1) })),
        conditionReports: state.conditionReports.map((c) => ({ ...c, images: [] })),
        borrowings: state.borrowings.map((b) => ({ ...b, returnEvidence: [] })),
        disputes: state.disputes.map((d) => ({ ...d, evidence: [] })),
      }
      localStorage.setItem(KEY, JSON.stringify(slim))
    } catch {
      /* Give up silently; the in-memory session still works. */
    }
  }
}

export function resetState() {
  localStorage.removeItem(KEY)
}
