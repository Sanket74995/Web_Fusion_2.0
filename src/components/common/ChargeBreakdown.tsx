import { Info } from 'lucide-react'
import type { Charges, Settlement } from '@/types'
import { inr } from '@/lib/format'
import { cn } from '@/lib/utils'
import { DataRow } from './StatCard'

/**
 * Borrowing Charge + Platform Fee + Security Deposit = Transaction Amount
 * The deposit is always called out as refundable — that is the whole point.
 */
export function ChargeBreakdown({
  charges,
  pricePerDay,
  className,
  showFormula = true,
}: {
  charges: Charges
  pricePerDay?: number
  className?: string
  showFormula?: boolean
}) {
  return (
    <div className={cn('space-y-0.5', className)}>
      <DataRow
        label="Borrowing charge"
        hint={
          charges.minChargeApplied
            ? 'Minimum charge applied for a short booking'
            : pricePerDay
              ? `${inr(pricePerDay)}/day × ${charges.days} day${charges.days > 1 ? 's' : ''}`
              : undefined
        }
        value={inr(charges.borrowCharge)}
      />
      <DataRow
        label="Platform fee"
        hint="Keeps CampusLoop running — non-refundable"
        value={inr(charges.platformFee)}
      />
      <DataRow
        label="Security deposit"
        hint="Fully refundable after inspection"
        value={inr(charges.deposit)}
        tone="primary"
      />
      <div className="mt-1 border-t border-border pt-1">
        <DataRow label="Amount payable now" value={inr(charges.total)} strong />
      </div>
      {showFormula && (
        <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-muted/60 px-2.5 py-2 text-2xs leading-relaxed text-muted-foreground">
          <Info className="mt-px size-3.5 shrink-0" />
          <span>
            {inr(charges.borrowCharge)} charge + {inr(charges.platformFee)} fee +{' '}
            {inr(charges.deposit)} deposit = {inr(charges.total)}. You get{' '}
            {inr(charges.deposit)} back when the resource is returned undamaged and on time.
          </span>
        </p>
      )}
    </div>
  )
}

/** Security Deposit − Damage Deduction − Late Fee = Refund */
export function SettlementBreakdown({
  settlement,
  className,
  showFormula = true,
}: {
  settlement: Settlement
  className?: string
  showFormula?: boolean
}) {
  const deducted = settlement.damageDeduction + settlement.lateFee
  return (
    <div className={cn('space-y-0.5', className)}>
      <DataRow label="Security deposit held" value={inr(settlement.deposit)} />
      <DataRow
        label="Damage deduction"
        hint={settlement.damageDeduction > 0 ? 'Confirmed against the condition reports' : 'No damage found'}
        value={settlement.damageDeduction > 0 ? `− ${inr(settlement.damageDeduction)}` : inr(0)}
        tone={settlement.damageDeduction > 0 ? 'danger' : 'muted'}
      />
      <DataRow
        label="Late fee"
        hint={
          settlement.hoursLate > 0
            ? `Returned ${settlement.hoursLate} hour${settlement.hoursLate > 1 ? 's' : ''} late`
            : 'Returned on time'
        }
        value={settlement.lateFee > 0 ? `− ${inr(settlement.lateFee)}` : inr(0)}
        tone={settlement.lateFee > 0 ? 'danger' : 'muted'}
      />
      <div className="mt-1 border-t border-border pt-1">
        <DataRow label="Refunded to you" value={inr(settlement.refund)} strong tone="primary" />
      </div>
      {showFormula && (
        <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-muted/60 px-2.5 py-2 text-2xs leading-relaxed text-muted-foreground">
          <Info className="mt-px size-3.5 shrink-0" />
          <span>
            {inr(settlement.deposit)} deposit − {inr(settlement.damageDeduction)} damage −{' '}
            {inr(settlement.lateFee)} late fee = {inr(settlement.refund)} refund.
            {deducted > 0 && ` ${inr(deducted)} goes to the owner as compensation.`}
          </span>
        </p>
      )}
    </div>
  )
}
