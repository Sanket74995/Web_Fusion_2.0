import type { Borrowing } from '@/types'

export interface NextAction {
  label: string
  to: string
  /** Short line explaining what the student has to do now. */
  hint: string
  /** Primary = it is this student's turn to act. */
  urgency: 'primary' | 'waiting' | 'done'
}

/**
 * The single next step for a borrowing, so every card, banner and detail page
 * agrees on what happens next instead of each screen guessing.
 */
export function nextAction(b: Borrowing): NextAction {
  const base = `/borrowings/${b.id}`
  const paid = b.transactionIds.length > 0

  switch (b.status) {
    case 'requested':
      return {
        label: 'Open agreement',
        to: `${base}/agreement`,
        hint: 'Waiting for the owner to accept your dates',
        urgency: 'waiting',
      }
    case 'accepted':
      return paid
        ? {
            label: 'Confirm handover',
            to: `${base}/handover`,
            hint: 'Meet the owner and record the condition together',
            urgency: 'primary',
          }
        : {
            label: 'Pay & confirm',
            to: `${base}/payment`,
            hint: 'Pay the charge and deposit to lock this booking',
            urgency: 'primary',
          }
    case 'handover':
      return {
        label: 'Finish handover',
        to: `${base}/handover`,
        hint: 'Record the condition before the resource changes hands',
        urgency: 'primary',
      }
    case 'borrowed':
      return {
        label: 'Return resource',
        to: `${base}/return`,
        hint: 'Return before the deadline to keep your full deposit',
        urgency: 'waiting',
      }
    case 'return_due':
      return {
        label: 'Return now',
        to: `${base}/return`,
        hint: 'The deadline has passed — a late fee grows each day',
        urgency: 'primary',
      }
    case 'returned':
      return {
        label: 'Run inspection',
        to: `${base}/inspection`,
        hint: 'The owner compares the returned condition with handover',
        urgency: 'primary',
      }
    case 'inspection':
      return {
        label: 'Settle deposit',
        to: `${base}/settlement`,
        hint: 'Deposit − damage − late fee = your refund',
        urgency: 'primary',
      }
    case 'settlement':
      return {
        label: 'Rate the exchange',
        to: `${base}/rating`,
        hint: 'Your rating feeds the trust score that ranks future matches',
        urgency: 'primary',
      }
    case 'rated':
      return {
        label: 'View summary',
        to: base,
        hint: 'Exchange complete — deposit settled and rated',
        urgency: 'done',
      }
    case 'declined':
      return {
        label: 'Find alternatives',
        to: '/discover',
        hint: 'The owner could not lend it for those dates',
        urgency: 'done',
      }
    case 'cancelled':
    default:
      return {
        label: 'View details',
        to: base,
        hint: 'This request was cancelled',
        urgency: 'done',
      }
  }
}

/** Active exchanges are the ones still moving through the lifecycle. */
export const ACTIVE_STATUSES: Borrowing['status'][] = [
  'accepted',
  'handover',
  'borrowed',
  'return_due',
  'returned',
  'inspection',
  'settlement',
]

export function isActive(b: Borrowing) {
  return ACTIVE_STATUSES.includes(b.status)
}

export function isClosed(b: Borrowing) {
  return b.status === 'rated' || b.status === 'declined' || b.status === 'cancelled'
}
