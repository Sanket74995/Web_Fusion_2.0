import type { Category, Charges, ConditionGrade, Resource, Settlement } from '@/types'
import { daysBetween, hoursBetween } from '@/lib/format'

/** Default platform/service fee. Configurable from the admin dashboard. */
export const DEFAULT_PLATFORM_FEE_RATE = 0.1
export const MIN_PLATFORM_FEE = 5

/** Late returns cost 40% of the daily rate for every started day past the deadline. */
export const LATE_FEE_DAY_RATE = 0.4
/** Grace period before a return counts as late. */
export const LATE_GRACE_HOURS = 1

export function platformFee(borrowCharge: number, rate = DEFAULT_PLATFORM_FEE_RATE) {
  if (borrowCharge <= 0) return 0
  return Math.max(MIN_PLATFORM_FEE, Math.round(borrowCharge * rate))
}

/**
 * Borrowing Charge + Platform Fee + Security Deposit = Transaction Amount
 * The deposit is refundable and is always shown separately from the fee.
 */
export function computeCharges(
  resource: Pick<Resource, 'pricePerDay' | 'pricePerHour' | 'minCharge' | 'deposit'>,
  startDate: string,
  endDate: string,
  rate = DEFAULT_PLATFORM_FEE_RATE,
): Charges {
  const days = daysBetween(startDate, endDate)
  const raw = resource.pricePerDay * days
  const minChargeApplied = raw < resource.minCharge
  const borrowCharge = Math.round(Math.max(raw, resource.minCharge))
  const fee = platformFee(borrowCharge, rate)
  return {
    days,
    borrowCharge,
    platformFee: fee,
    deposit: resource.deposit,
    total: borrowCharge + fee + resource.deposit,
    minChargeApplied,
    model: 'daily',
  }
}

/** Same math on an hourly model — used by resources that advertise pricePerHour. */
export function computeHourlyCharges(
  resource: Pick<Resource, 'pricePerHour' | 'pricePerDay' | 'minCharge' | 'deposit'>,
  hours: number,
  rate = DEFAULT_PLATFORM_FEE_RATE,
): Charges {
  const perHour = resource.pricePerHour ?? Math.round(resource.pricePerDay / 6)
  const raw = perHour * Math.max(1, Math.round(hours))
  const capped = Math.min(raw, resource.pricePerDay)
  const borrowCharge = Math.round(Math.max(capped, resource.minCharge))
  const fee = platformFee(borrowCharge, rate)
  return {
    days: 1,
    borrowCharge,
    platformFee: fee,
    deposit: resource.deposit,
    total: borrowCharge + fee + resource.deposit,
    minChargeApplied: capped < resource.minCharge,
    model: 'hourly',
  }
}

export function computeLateFee(pricePerDay: number, dueDate: string, returnedAt: string) {
  const late = hoursBetween(dueDate, returnedAt)
  if (late <= LATE_GRACE_HOURS) return { hoursLate: 0, lateFee: 0 }
  const daysLate = Math.ceil(late / 24)
  return {
    hoursLate: Math.round(late),
    lateFee: Math.round(pricePerDay * LATE_FEE_DAY_RATE) * daysLate,
  }
}

/**
 * Security Deposit − Damage Deduction − Late Fee = Refund
 * Deductions are capped at the deposit so a borrower is never quietly
 * charged more than they placed.
 */
export function computeSettlement(input: {
  deposit: number
  damageDeduction: number
  lateFee: number
  hoursLate: number
}): Settlement {
  const requested = input.damageDeduction + input.lateFee
  const capped = Math.min(requested, input.deposit)
  // Late fee is recovered first, then damage, so the split still adds up.
  const lateFee = Math.min(input.lateFee, capped)
  const damageDeduction = Math.max(0, capped - lateFee)
  return {
    deposit: input.deposit,
    damageDeduction,
    lateFee,
    refund: Math.max(0, input.deposit - lateFee - damageDeduction),
    hoursLate: input.hoursLate,
    settledAt: new Date().toISOString(),
  }
}

/** What the owner actually receives once the platform takes its cut. */
export function ownerPayout(borrowCharge: number, lateFee: number, damageDeduction: number) {
  return borrowCharge + lateFee + damageDeduction
}

/**
 * Typical campus day-rate and deposit per category, derived from what students
 * on this campus already charge. Used to nudge new listings towards a rate that
 * actually gets borrowed instead of an arbitrary number.
 */
const CATEGORY_BASELINE: Record<Category, { day: number; deposit: number }> = {
  Cameras: { day: 220, deposit: 2000 },
  Laptops: { day: 300, deposit: 4000 },
  Books: { day: 20, deposit: 300 },
  Calculators: { day: 30, deposit: 500 },
  Sports: { day: 60, deposit: 600 },
  Music: { day: 150, deposit: 1500 },
  Electronics: { day: 90, deposit: 900 },
  'Event Equipment': { day: 250, deposit: 2000 },
  'Lab Equipment': { day: 120, deposit: 1200 },
  Tools: { day: 50, deposit: 500 },
}

const CONDITION_MULTIPLIER: Record<ConditionGrade, number> = {
  Excellent: 1.15,
  Good: 1,
  Fair: 0.8,
}

export interface PricingSuggestion {
  pricePerDay: number
  deposit: number
  rationale: string
}

/** Rounds to the nearest ₹5 so suggested rates read like real prices. */
function round5(value: number) {
  return Math.max(5, Math.round(value / 5) * 5)
}

export function suggestPricing(
  category: Category,
  condition: ConditionGrade,
): PricingSuggestion {
  const base = CATEGORY_BASELINE[category]
  const multiplier = CONDITION_MULTIPLIER[condition]
  const pricePerDay = round5(base.day * multiplier)
  const deposit = Math.round((base.deposit * multiplier) / 50) * 50
  const tone =
    condition === 'Excellent'
      ? 'in excellent shape, so a small premium is fair'
      : condition === 'Fair'
        ? 'showing some wear, so pricing under the average gets it borrowed faster'
        : 'in good working condition'
  return {
    pricePerDay,
    deposit,
    rationale: `${category} on this campus go for around ${inrPlain(base.day)}/day. Yours is ${tone}. The deposit roughly covers a replacement without pricing students out.`,
  }
}

function inrPlain(value: number) {
  return `₹${value}`
}
