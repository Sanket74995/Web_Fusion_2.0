import type { AvailabilityStatus, Dispute, LifecycleStatus, Resource } from '@/types'
import { Badge, type BadgeProps } from '@/components/ui/badge'

const LIFECYCLE_META: Record<
  LifecycleStatus,
  { label: string; variant: NonNullable<BadgeProps['variant']> }
> = {
  requested: { label: 'Request sent', variant: 'info' },
  accepted: { label: 'Accepted', variant: 'primary' },
  handover: { label: 'Handover', variant: 'primary' },
  borrowed: { label: 'Borrowed', variant: 'primary' },
  return_due: { label: 'Return due', variant: 'warning' },
  returned: { label: 'Returned', variant: 'info' },
  inspection: { label: 'Under inspection', variant: 'info' },
  settlement: { label: 'Settled', variant: 'primary' },
  rated: { label: 'Completed', variant: 'neutral' },
  declined: { label: 'Declined', variant: 'danger' },
  cancelled: { label: 'Cancelled', variant: 'neutral' },
}

export function statusLabel(status: LifecycleStatus) {
  return LIFECYCLE_META[status].label
}

export function StatusBadge({
  status,
  size = 'sm',
}: {
  status: LifecycleStatus
  size?: BadgeProps['size']
}) {
  const meta = LIFECYCLE_META[status]
  return (
    <Badge variant={meta.variant} size={size}>
      {meta.label}
    </Badge>
  )
}

const AVAILABILITY_META: Record<
  AvailabilityStatus,
  { label: string; variant: NonNullable<BadgeProps['variant']> }
> = {
  available: { label: 'Available', variant: 'primary' },
  borrowed: { label: 'Currently borrowed', variant: 'warning' },
  unavailable: { label: 'Unavailable', variant: 'neutral' },
}

export function AvailabilityBadge({
  resource,
  size = 'sm',
}: {
  resource: Pick<Resource, 'availabilityStatus'>
  size?: BadgeProps['size']
}) {
  const meta = AVAILABILITY_META[resource.availabilityStatus]
  return (
    <Badge variant={meta.variant} size={size}>
      <span
        className={
          resource.availabilityStatus === 'available'
            ? 'size-1.5 rounded-full bg-primary'
            : 'size-1.5 rounded-full bg-current opacity-60'
        }
      />
      {meta.label}
    </Badge>
  )
}

export function ApprovalBadge({
  status,
  size = 'sm',
}: {
  status: Resource['approvalStatus']
  size?: BadgeProps['size']
}) {
  const map = {
    approved: { label: 'Approved', variant: 'primary' as const },
    pending: { label: 'Pending review', variant: 'warning' as const },
    rejected: { label: 'Rejected', variant: 'danger' as const },
  }
  const meta = map[status]
  return (
    <Badge variant={meta.variant} size={size}>
      {meta.label}
    </Badge>
  )
}

export function DisputeBadge({
  status,
  size = 'sm',
}: {
  status: Dispute['status']
  size?: BadgeProps['size']
}) {
  const map = {
    under_review: { label: 'Under review', variant: 'warning' as const },
    resolved: { label: 'Resolved', variant: 'primary' as const },
    rejected: { label: 'Rejected', variant: 'neutral' as const },
  }
  const meta = map[status]
  return (
    <Badge variant={meta.variant} size={size}>
      {meta.label}
    </Badge>
  )
}
