import type { AppState } from '@/types'
import { SEED_USERS, CURRENT_USER_ID } from '@/data/users'
import { SEED_RESOURCES } from '@/data/resources'
import { buildSeedHistory, buildSeedNotifications } from '@/data/history'
import { DEFAULT_PLATFORM_FEE_RATE } from '@/services/pricing'
import { computeBaseline } from '@/services/analytics'

const KEY = 'campusloop.state.v1'
export const STATE_VERSION = 1

export function createSeedState(): AppState {
  const users = SEED_USERS.map((u) => ({ ...u }))
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
