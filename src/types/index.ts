/* ─────────────────────────────────────────────────────────────
   CampusLoop — domain model
   Every entity the platform simulates lives here. The services
   layer (src/services) owns all persistence; components only
   ever read these types.
   ───────────────────────────────────────────────────────────── */

export type Category =
  | 'Cameras'
  | 'Laptops'
  | 'Books'
  | 'Calculators'
  | 'Sports'
  | 'Music'
  | 'Electronics'
  | 'Event Equipment'
  | 'Lab Equipment'
  | 'Tools'

export const CATEGORIES: Category[] = [
  'Cameras',
  'Laptops',
  'Books',
  'Calculators',
  'Sports',
  'Music',
  'Electronics',
  'Event Equipment',
  'Lab Equipment',
  'Tools',
]

export type ConditionGrade = 'Excellent' | 'Good' | 'Fair'

export const CONDITION_GRADES: ConditionGrade[] = ['Excellent', 'Good', 'Fair']

export type BadgeKind =
  | 'Verified Student'
  | 'Reliable Borrower'
  | 'Top Sharer'
  | 'Fast Responder'
  | 'Zero Disputes'

export interface User {
  id: string
  name: string
  department: string
  year: string
  verified: boolean
  /** 0–100 composite reliability score. Feeds recommendation ranking. */
  trustScore: number
  rating: number
  ratingCount: number
  successfulExchanges: number
  /** Percentage, 0–100. */
  onTimeRate: number
  disputes: number
  badges: BadgeKind[]
  /** Campus block/hostel used for the human-readable pickup point. */
  location: string
  joinedAt: string
  /** Deterministic hue (0–360) used for the generated avatar. */
  hue: number
  bio?: string
  status: 'active' | 'flagged' | 'suspended'
}

export type AvailabilityStatus = 'available' | 'borrowed' | 'unavailable'

export interface Resource {
  id: string
  ownerId: string
  name: string
  category: Category
  description: string
  condition: ConditionGrade
  conditionNotes: string
  /** Data-URL images added through "List a resource"; empty ⇒ generated visual. */
  images: string[]
  location: string
  distanceKm: number
  pricePerDay: number
  /** Optional hourly model — resources with short-turnaround demand. */
  pricePerHour?: number
  minCharge: number
  deposit: number
  accessories: string[]
  borrowingConditions: string[]
  availabilityStatus: AvailabilityStatus
  /** ISO date the resource frees up. Today/tomorrow reads as "Available now/tomorrow". */
  availableFrom: string
  rating: number
  ratingCount: number
  timesBorrowed: number
  /** Free-text keywords the AI matcher searches against. */
  tags: string[]
  approvalStatus: 'approved' | 'pending' | 'rejected'
  flagged: boolean
  createdAt: string
}

/** The full borrowing lifecycle from the brief, in order. */
export type LifecycleStatus =
  | 'requested'
  | 'accepted'
  | 'handover'
  | 'borrowed'
  | 'return_due'
  | 'returned'
  | 'inspection'
  | 'settlement'
  | 'rated'
  | 'declined'
  | 'cancelled'

export const LIFECYCLE_ORDER: LifecycleStatus[] = [
  'requested',
  'accepted',
  'handover',
  'borrowed',
  'return_due',
  'returned',
  'inspection',
  'settlement',
  'rated',
]

export interface ChecklistItem {
  label: string
  ok: boolean
  note?: string
}

export interface ConditionReport {
  id: string
  borrowingId: string
  phase: 'before' | 'after'
  overall: ConditionGrade
  checklist: ChecklistItem[]
  notes: string
  images: string[]
  createdAt: string
  byUserId: string
}

export interface Charges {
  days: number
  /** Rate actually applied (per day, or per hour × hours for hourly resources). */
  borrowCharge: number
  platformFee: number
  deposit: number
  /** borrowCharge + platformFee + deposit */
  total: number
  minChargeApplied: boolean
  model: 'daily' | 'hourly'
}

export interface Settlement {
  deposit: number
  damageDeduction: number
  lateFee: number
  refund: number
  /** Hours late, 0 when returned on time. */
  hoursLate: number
  settledAt: string
}

export interface TimelineEntry {
  status: LifecycleStatus
  at: string
  note?: string
}

export interface Borrowing {
  id: string
  resourceId: string
  ownerId: string
  borrowerId: string
  startDate: string
  /** Return deadline (ISO, includes time). */
  dueDate: string
  purpose: string
  message?: string
  status: LifecycleStatus
  charges: Charges
  handoverAt?: string
  pickupLocation: string
  pickupTime: string
  borrowedAt?: string
  returnedAt?: string
  returnEvidence: string[]
  beforeReportId?: string
  afterReportId?: string
  settlement?: Settlement
  ratingId?: string
  disputeId?: string
  transactionIds: string[]
  timeline: TimelineEntry[]
  createdAt: string
}

export interface Transaction {
  id: string
  borrowingId: string
  resourceId: string
  borrowerId: string
  ownerId: string
  type: 'payment' | 'refund' | 'payout'
  amount: number
  borrowCharge: number
  platformFee: number
  deposit: number
  status: 'success' | 'pending' | 'failed'
  createdAt: string
  method: string
}

export interface Dispute {
  id: string
  borrowingId: string
  resourceId: string
  raisedByUserId: string
  againstUserId: string
  reason: string
  description: string
  claimedAmount: number
  evidence: string[]
  status: 'under_review' | 'resolved' | 'rejected'
  resolution?: string
  resolvedAmount?: number
  createdAt: string
  resolvedAt?: string
}

export interface Rating {
  id: string
  borrowingId: string
  fromUserId: string
  toUserId: string
  resourceId: string
  ownerRating: number
  resourceRating: number
  exchangeRating: number
  review: string
  createdAt: string
}

export type NotificationKind = 'success' | 'warning' | 'info' | 'review'

export interface Notification {
  id: string
  kind: NotificationKind
  title: string
  body?: string
  at: string
  read: boolean
  link?: string
}

/* ── AI layer ───────────────────────────────────────────────── */

export interface ParsedNeed {
  raw: string
  purpose: string
  /** Human label, e.g. "Tomorrow, 28 Aug". */
  whenLabel: string
  startDate: string
  endDate: string
  days: number
  budget: number | null
  /** Resource kinds the requirement expands to, ranked by importance. */
  items: NeedItem[]
  notes: string[]
  source: 'local' | 'api'
}

export interface NeedItem {
  label: string
  category: Category
  tags: string[]
  essential: boolean
}

export interface MatchReason {
  label: string
  positive: boolean
}

export interface MatchFactorBreakdown {
  availability: number
  distance: number
  suitability: number
  trust: number
  condition: number
  price: number
}

export interface Recommendation {
  resource: Resource
  owner: User
  score: number
  reasons: MatchReason[]
  factors: MatchFactorBreakdown
  /** The requirement slot this resource fills. */
  forItem: string
  essential: boolean
  /** Populated when the primary pick is unavailable for the requested dates. */
  alternatives?: Recommendation[]
}

export interface NeedResult {
  need: ParsedNeed
  groups: NeedGroup[]
  totalPerDay: number
  totalDeposit: number
  withinBudget: boolean
}

export interface NeedGroup {
  item: NeedItem
  picks: Recommendation[]
  /**
   * The most suitable resource that is *not* free for the requested dates.
   * Present so the UI can say "Not available? Try these instead."
   */
  blocked?: Recommendation
}

/* ── Persisted app state ────────────────────────────────────── */

/**
 * Activity that happened before the seeded window. Campus totals are
 * baseline + live, so the dashboard reads like a platform that has been
 * running for a year while still reacting to what happens in the demo.
 */
export interface PlatformBaseline {
  members: number
  resources: number
  exchanges: number
  moneySaved: number
  resourcesReused: number
  transactionVolume: number
  platformFees: number
}

export interface AppState {
  version: number
  currentUserId: string
  users: User[]
  resources: Resource[]
  borrowings: Borrowing[]
  transactions: Transaction[]
  conditionReports: ConditionReport[]
  disputes: Dispute[]
  ratings: Rating[]
  notifications: Notification[]
  adminSession: boolean
  platformFeeRate: number
  baseline: PlatformBaseline
  seededAt: string
}
