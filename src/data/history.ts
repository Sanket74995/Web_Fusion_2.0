import type {
  Borrowing,
  ConditionReport,
  Dispute,
  LifecycleStatus,
  Notification,
  Rating,
  Resource,
  TimelineEntry,
  Transaction,
  User,
} from '@/types'
import { LIFECYCLE_ORDER } from '@/types'
import { addDays, addHours, toDateInput } from '@/lib/format'
import { computeCharges, computeLateFee, computeSettlement } from '@/services/pricing'
import { CHECKLISTS } from '@/services/checklists'

interface HistorySpec {
  id: string
  resourceId: string
  borrowerId: string
  /** Days ago the borrowing started. Negative ⇒ starts in the future. */
  startedDaysAgo: number
  durationDays: number
  status: LifecycleStatus
  purpose: string
  /** Hours past the deadline the resource actually came back. */
  hoursLate?: number
  damage?: { amount: number; reason: string; description: string }
  dispute?: { status: Dispute['status']; resolvedAmount?: number; resolution?: string }
  review?: { stars: number; text: string }
}

/* A believable six months of campus activity. Drives the admin
   dashboard, impact analytics and the current user's history. */
const SPECS: HistorySpec[] = [
  /* ── The signed-in student's own history ─────────────────── */
  {
    id: 'b101',
    resourceId: 'r17',
    borrowerId: 'u1',
    startedDaysAgo: 1,
    durationDays: 4,
    status: 'borrowed',
    purpose: 'Noise cancelling for end-sem revision in the library',
  },
  {
    id: 'b102',
    resourceId: 'r24',
    borrowerId: 'u1',
    startedDaysAgo: -1,
    durationDays: 2,
    status: 'accepted',
    purpose: 'Applied maths unit test on Friday',
  },
  {
    id: 'b103',
    resourceId: 'r19',
    borrowerId: 'u1',
    startedDaysAgo: 6,
    durationDays: 5,
    status: 'return_due',
    purpose: 'DSA revision before the algorithms viva',
  },
  {
    id: 'b104',
    resourceId: 'r31',
    borrowerId: 'u1',
    startedDaysAgo: 26,
    durationDays: 3,
    status: 'rated',
    purpose: 'Open mic night at the amphitheatre',
    review: { stars: 5, text: 'Guitar was freshly strung and the gig bag saved it from the rain. Smooth handover.' },
  },
  {
    id: 'b105',
    resourceId: 'r15',
    borrowerId: 'u1',
    startedDaysAgo: 41,
    durationDays: 2,
    status: 'rated',
    purpose: 'Film club screening in the seminar hall',
    review: { stars: 5, text: 'Projector was brighter than expected. Tanvi even lent an extra HDMI cable.' },
  },
  {
    id: 'b106',
    resourceId: 'r36',
    borrowerId: 'u1',
    startedDaysAgo: 62,
    durationDays: 7,
    status: 'rated',
    hoursLate: 20,
    purpose: 'IoT mini-project prototype',
    review: { stars: 4, text: 'Complete kit, well organised. I returned it a day late — my fault entirely.' },
  },

  /* ── Campus-wide activity ────────────────────────────────── */
  {
    id: 'b201',
    resourceId: 'r1',
    borrowerId: 'u6',
    startedDaysAgo: 12,
    durationDays: 2,
    status: 'rated',
    purpose: 'Department fest coverage',
    review: { stars: 5, text: 'Best camera on campus and Rahul explains the settings before handover.' },
  },
  {
    id: 'b202',
    resourceId: 'r1',
    borrowerId: 'u13',
    startedDaysAgo: 34,
    durationDays: 3,
    status: 'rated',
    purpose: 'Placement video shoot',
    review: { stars: 5, text: 'Everything worked perfectly. Returned with batteries charged as asked.' },
  },
  {
    id: 'b203',
    resourceId: 'r5',
    borrowerId: 'u13',
    startedDaysAgo: 34,
    durationDays: 3,
    status: 'rated',
    purpose: 'Placement video shoot',
    review: { stars: 5, text: 'Rock solid tripod, the pan head is smooth.' },
  },
  {
    id: 'b204',
    resourceId: 'r6',
    borrowerId: 'u10',
    startedDaysAgo: 20,
    durationDays: 1,
    status: 'rated',
    purpose: 'Alumni interview recording',
    review: { stars: 5, text: 'Audio quality made the whole interview usable. Highly recommend.' },
  },
  {
    id: 'b205',
    resourceId: 'r11',
    borrowerId: 'u13',
    startedDaysAgo: 2,
    durationDays: 6,
    status: 'borrowed',
    purpose: 'Training a model for the capstone project',
  },
  {
    id: 'b206',
    resourceId: 'r12',
    borrowerId: 'u11',
    startedDaysAgo: 15,
    durationDays: 4,
    status: 'rated',
    purpose: 'Submission week — my laptop was in service',
    review: { stars: 5, text: 'Zaid set it up with everything I needed. Lifesaver during submissions.' },
  },
  {
    id: 'b207',
    resourceId: 'r19',
    borrowerId: 'u6',
    startedDaysAgo: 48,
    durationDays: 10,
    status: 'rated',
    purpose: 'Semester exam preparation',
    review: { stars: 5, text: "Priya's margin notes are honestly better than the lectures." },
  },
  {
    id: 'b208',
    resourceId: 'r24',
    borrowerId: 'u11',
    startedDaysAgo: 55,
    durationDays: 2,
    status: 'rated',
    purpose: 'Mid-sem exam',
    review: { stars: 5, text: 'Picked it up in two minutes flat. Exactly what I needed.' },
  },
  {
    id: 'b209',
    resourceId: 'r27',
    borrowerId: 'u9',
    startedDaysAgo: 9,
    durationDays: 1,
    status: 'rated',
    purpose: 'Inter-hostel badminton practice',
    review: { stars: 4, text: 'Rackets were strung well. Shuttle tube was half used but fine.' },
  },
  {
    id: 'b210',
    resourceId: 'r28',
    borrowerId: 'u14',
    startedDaysAgo: 30,
    durationDays: 2,
    status: 'rated',
    hoursLate: 30,
    damage: {
      amount: 250,
      reason: 'Physical damage',
      description: 'Crack along the bat edge after a mistimed shot on the concrete pitch.',
    },
    dispute: {
      status: 'resolved',
      resolvedAmount: 250,
      resolution:
        'Evidence confirmed a new edge crack. ₹250 deduction upheld, late fee waived by 50% as the borrower reported it proactively.',
    },
    purpose: 'Inter-class cricket match',
    review: { stars: 3, text: 'Good kit. My mistake on the damage, settled fairly through the platform.' },
  },
  {
    id: 'b211',
    resourceId: 'r35',
    borrowerId: 'u7',
    startedDaysAgo: 22,
    durationDays: 3,
    status: 'rated',
    purpose: 'Analog circuits project measurements',
    review: { stars: 5, text: 'Saved me three days of waiting for the lab. Sneha is very organised.' },
  },
  {
    id: 'b212',
    resourceId: 'r37',
    borrowerId: 'u12',
    startedDaysAgo: 18,
    durationDays: 2,
    status: 'rated',
    purpose: 'Building the stall frame for tech fest',
    review: { stars: 4, text: 'Both batteries held up through a full day of set building.' },
  },
  {
    id: 'b213',
    resourceId: 'r8',
    borrowerId: 'u3',
    startedDaysAgo: 27,
    durationDays: 1,
    status: 'rated',
    purpose: 'Cultural night sound setup',
    review: { stars: 4, text: 'Very loud, exactly as described. Heavy to carry though.' },
  },
  {
    id: 'b214',
    resourceId: 'r14',
    borrowerId: 'u4',
    startedDaysAgo: 38,
    durationDays: 4,
    status: 'rated',
    purpose: 'Design sprint sketches',
    review: { stars: 5, text: 'The Pencil makes a real difference for diagrams.' },
  },
  {
    id: 'b215',
    resourceId: 'r16',
    borrowerId: 'u8',
    startedDaysAgo: 5,
    durationDays: 2,
    status: 'rated',
    purpose: 'Two-day site survey',
    review: { stars: 5, text: 'Charged my phone and the total station tablet both days.' },
  },
  {
    id: 'b216',
    resourceId: 'r2',
    borrowerId: 'u9',
    startedDaysAgo: 44,
    durationDays: 2,
    status: 'rated',
    purpose: 'Chemical engineering club reel',
    review: { stars: 5, text: 'Flip screen made solo shooting easy. Lightweight and quick to learn.' },
  },
  {
    id: 'b217',
    resourceId: 'r31',
    borrowerId: 'u6',
    startedDaysAgo: 52,
    durationDays: 2,
    status: 'rated',
    purpose: 'Farewell performance rehearsal',
    review: { stars: 5, text: 'Ananya is the most reliable lender on campus.' },
  },
  {
    id: 'b218',
    resourceId: 'r20',
    borrowerId: 'u14',
    startedDaysAgo: 8,
    durationDays: 5,
    status: 'return_due',
    purpose: 'Maths backlog preparation',
  },
  {
    id: 'b219',
    resourceId: 'r13',
    borrowerId: 'u14',
    startedDaysAgo: 4,
    durationDays: 3,
    status: 'inspection',
    hoursLate: 14,
    damage: {
      amount: 400,
      reason: 'Screen damage',
      description: 'Two dead pixels and a hairline mark near the bottom bezel that were not there at handover.',
    },
    dispute: { status: 'under_review' },
    purpose: 'Rendering a fest promo video',
  },
  {
    id: 'b220',
    resourceId: 'r22',
    borrowerId: 'u12',
    startedDaysAgo: 60,
    durationDays: 14,
    status: 'rated',
    purpose: 'GATE preparation',
    review: { stars: 5, text: 'Full set with the formula booklet. Meera even added her own notes.' },
  },
  {
    id: 'b221',
    resourceId: 'r30',
    borrowerId: 'u5',
    startedDaysAgo: 70,
    durationDays: 7,
    status: 'rated',
    purpose: 'Morning fitness routine',
    review: { stars: 5, text: 'Mat was spotless. Bands were a bonus.' },
  },
  {
    id: 'b222',
    resourceId: 'r7',
    borrowerId: 'u2',
    startedDaysAgo: 16,
    durationDays: 2,
    status: 'rated',
    purpose: 'Product photography for the college store',
    review: { stars: 4, text: 'Great output. One diffuser is torn as mentioned in the listing.' },
  },
  {
    id: 'b223',
    resourceId: 'r34',
    borrowerId: 'u7',
    startedDaysAgo: 24,
    durationDays: 3,
    status: 'rated',
    purpose: 'Podcast episode recording',
    review: { stars: 5, text: 'Clean preamp, zero noise. Devansh even lent an XLR cable.' },
  },
  {
    id: 'b224',
    resourceId: 'r38',
    borrowerId: 'u12',
    startedDaysAgo: 33,
    durationDays: 2,
    status: 'rated',
    purpose: 'Workshop measurement submission',
    review: { stars: 5, text: 'Calibrated and accurate. Foam case keeps it safe.' },
  },
  {
    id: 'b225',
    resourceId: 'r21',
    borrowerId: 'u13',
    startedDaysAgo: 66,
    durationDays: 9,
    status: 'rated',
    purpose: 'Analog electronics elective',
    review: { stars: 5, text: 'Practically a new book.' },
  },
  {
    id: 'b226',
    resourceId: 'r9',
    borrowerId: 'u10',
    startedDaysAgo: 3,
    durationDays: 4,
    status: 'borrowed',
    purpose: 'Campus tour video for the admissions team',
  },
  {
    id: 'b227',
    resourceId: 'r32',
    borrowerId: 'u11',
    startedDaysAgo: 1,
    durationDays: 5,
    status: 'borrowed',
    purpose: 'Music society rehearsal week',
  },
  {
    id: 'b228',
    resourceId: 'r4',
    borrowerId: 'u4',
    startedDaysAgo: 2,
    durationDays: 5,
    status: 'borrowed',
    purpose: 'Trek documentation with the adventure club',
  },
  {
    id: 'b229',
    resourceId: 'r23',
    borrowerId: 'u12',
    startedDaysAgo: 0,
    durationDays: 6,
    status: 'accepted',
    purpose: 'Design submission for RCC structures',
  },
  {
    id: 'b230',
    resourceId: 'r25',
    borrowerId: 'u9',
    startedDaysAgo: 78,
    durationDays: 3,
    status: 'rated',
    purpose: 'Thermodynamics unit test',
    review: { stars: 4, text: 'Different key layout took getting used to but it did the job.' },
  },
  {
    id: 'b231',
    resourceId: 'r10',
    borrowerId: 'u7',
    startedDaysAgo: 84,
    durationDays: 2,
    status: 'rated',
    purpose: 'Photo booth for the cultural fest',
    review: { stars: 4, text: 'Frame is sturdy. Green cloth needs an iron before use.' },
  },
  {
    id: 'b232',
    resourceId: 'r17',
    borrowerId: 'u13',
    startedDaysAgo: 90,
    durationDays: 6,
    status: 'rated',
    purpose: 'Exam week focus',
    review: { stars: 5, text: 'Noise cancelling is excellent. Case keeps them safe.' },
  },
  {
    id: 'b233',
    resourceId: 'r18',
    borrowerId: 'u6',
    startedDaysAgo: 11,
    durationDays: 3,
    status: 'rated',
    purpose: 'Poster design for the hackathon',
    review: { stars: 4, text: 'Works well. Would have liked a spare nib but not a problem.' },
  },
  {
    id: 'b234',
    resourceId: 'r3',
    borrowerId: 'u11',
    startedDaysAgo: 7,
    durationDays: 2,
    status: 'rated',
    purpose: 'Sports day photography',
    review: { stars: 4, text: 'Good camera for stills. Grip is a bit worn as described.' },
  },

  /* ── Incoming requests on the signed-in student's listings ── */
  {
    id: 'b301',
    resourceId: 'r39',
    borrowerId: 'u11',
    startedDaysAgo: -1,
    durationDays: 2,
    status: 'requested',
    purpose: 'First-year orientation video for the IT department',
  },
  {
    id: 'b302',
    resourceId: 'r40',
    borrowerId: 'u9',
    startedDaysAgo: 19,
    durationDays: 8,
    status: 'rated',
    purpose: 'Reading week before the chemical engineering finals',
    review: { stars: 5, text: 'Aarav had already loaded the exact textbooks I needed. Very generous.' },
  },
]

const CHECK_NOTES_OK = 'Verified at handover, matches the listing.'

function reportFor(
  borrowing: Borrowing,
  resource: Resource,
  phase: 'before' | 'after',
  byUserId: string,
  damaged: HistorySpec['damage'],
  at: string,
): ConditionReport {
  const checklist = CHECKLISTS[resource.category].map((label, i) => ({
    label,
    ok: phase === 'before' ? true : !(damaged && i === 0),
    note:
      phase === 'after' && damaged && i === 0
        ? damaged.description
        : phase === 'before'
          ? CHECK_NOTES_OK
          : 'No change since handover.',
  }))
  return {
    id: `cr_${borrowing.id}_${phase}`,
    borrowingId: borrowing.id,
    phase,
    overall: phase === 'before' ? resource.condition : damaged ? 'Fair' : resource.condition,
    checklist,
    notes:
      phase === 'before'
        ? `Checked together at handover. ${resource.conditionNotes}`
        : damaged
          ? damaged.description
          : 'Returned in the same condition as handover.',
    images: [],
    createdAt: at,
    byUserId,
  }
}

function timelineUpTo(status: LifecycleStatus, start: Date, due: Date, returnedAt?: Date) {
  const idx = LIFECYCLE_ORDER.indexOf(status)
  const entries: TimelineEntry[] = []
  const at = (d: Date) => d.toISOString()
  const stamps: Partial<Record<LifecycleStatus, string>> = {
    requested: at(addHours(start, -30)),
    accepted: at(addHours(start, -26)),
    handover: at(addHours(start, -1)),
    borrowed: at(start),
    return_due: at(due),
    returned: at(returnedAt ?? due),
    inspection: at(addHours(returnedAt ?? due, 1)),
    settlement: at(addHours(returnedAt ?? due, 2)),
    rated: at(addHours(returnedAt ?? due, 4)),
  }
  for (let i = 0; i <= idx; i++) {
    const s = LIFECYCLE_ORDER[i]
    entries.push({ status: s, at: stamps[s] ?? at(start) })
  }
  return entries
}

export interface SeedHistory {
  borrowings: Borrowing[]
  transactions: Transaction[]
  conditionReports: ConditionReport[]
  disputes: Dispute[]
  ratings: Rating[]
}

export function buildSeedHistory(resources: Resource[], users: User[]): SeedHistory {
  const byId = new Map(resources.map((r) => [r.id, r]))
  const borrowings: Borrowing[] = []
  const transactions: Transaction[] = []
  const conditionReports: ConditionReport[] = []
  const disputes: Dispute[] = []
  const ratings: Rating[] = []

  for (const spec of SPECS) {
    const resource = byId.get(spec.resourceId)
    if (!resource) continue
    const owner = users.find((u) => u.id === resource.ownerId)
    if (!owner) continue

    const start = addDays(new Date(), -spec.startedDaysAgo)
    start.setHours(10, 0, 0, 0)
    const due = addDays(start, spec.durationDays)
    due.setHours(18, 0, 0, 0)
    const charges = computeCharges(resource, toDateInput(start), toDateInput(due))
    const reachedReturn = LIFECYCLE_ORDER.indexOf(spec.status) >= LIFECYCLE_ORDER.indexOf('returned')
    const returnedAt = reachedReturn ? addHours(due, spec.hoursLate ?? -3) : undefined

    const borrowing: Borrowing = {
      id: spec.id,
      resourceId: resource.id,
      ownerId: owner.id,
      borrowerId: spec.borrowerId,
      startDate: toDateInput(start),
      dueDate: due.toISOString(),
      purpose: spec.purpose,
      status: spec.status,
      charges,
      pickupLocation: resource.location,
      pickupTime: `${toDateInput(start)}T10:00`,
      returnEvidence: [],
      transactionIds: [],
      timeline: timelineUpTo(spec.status, start, due, returnedAt),
      createdAt: addHours(start, -30).toISOString(),
    }

    if (LIFECYCLE_ORDER.indexOf(spec.status) >= LIFECYCLE_ORDER.indexOf('handover')) {
      borrowing.handoverAt = addHours(start, -1).toISOString()
      const before = reportFor(
        borrowing,
        resource,
        'before',
        owner.id,
        undefined,
        addHours(start, -1).toISOString(),
      )
      conditionReports.push(before)
      borrowing.beforeReportId = before.id
    }
    if (LIFECYCLE_ORDER.indexOf(spec.status) >= LIFECYCLE_ORDER.indexOf('borrowed')) {
      borrowing.borrowedAt = start.toISOString()
    }
    if (returnedAt) {
      borrowing.returnedAt = returnedAt.toISOString()
      const after = reportFor(
        borrowing,
        resource,
        'after',
        spec.borrowerId,
        spec.damage,
        returnedAt.toISOString(),
      )
      conditionReports.push(after)
      borrowing.afterReportId = after.id
    }

    /* Payment happens the moment the agreement is confirmed. */
    if (spec.status !== 'requested' && spec.status !== 'declined') {
      const payment: Transaction = {
        id: `t_${spec.id}_pay`,
        borrowingId: borrowing.id,
        resourceId: resource.id,
        borrowerId: spec.borrowerId,
        ownerId: owner.id,
        type: 'payment',
        amount: charges.total,
        borrowCharge: charges.borrowCharge,
        platformFee: charges.platformFee,
        deposit: charges.deposit,
        status: 'success',
        createdAt: addHours(start, -25).toISOString(),
        method: 'Campus Wallet',
      }
      transactions.push(payment)
      borrowing.transactionIds.push(payment.id)
    }

    if (spec.damage) {
      const dispute: Dispute = {
        id: `d_${spec.id}`,
        borrowingId: borrowing.id,
        resourceId: resource.id,
        raisedByUserId: owner.id,
        againstUserId: spec.borrowerId,
        reason: spec.damage.reason,
        description: spec.damage.description,
        claimedAmount: spec.damage.amount,
        evidence: [],
        status: spec.dispute?.status ?? 'under_review',
        resolution: spec.dispute?.resolution,
        resolvedAmount: spec.dispute?.resolvedAmount,
        createdAt: (returnedAt ?? due).toISOString(),
        resolvedAt:
          spec.dispute?.status === 'resolved'
            ? addHours(returnedAt ?? due, 20).toISOString()
            : undefined,
      }
      disputes.push(dispute)
      borrowing.disputeId = dispute.id
    }

    /* Settlement + refund once inspection is done. */
    if (LIFECYCLE_ORDER.indexOf(spec.status) >= LIFECYCLE_ORDER.indexOf('settlement')) {
      const { hoursLate, lateFee } = computeLateFee(
        resource.pricePerDay,
        borrowing.dueDate,
        borrowing.returnedAt!,
      )
      const damageDeduction =
        spec.dispute?.status === 'resolved'
          ? (spec.dispute.resolvedAmount ?? 0)
          : spec.damage
            ? spec.damage.amount
            : 0
      const settlement = computeSettlement({
        deposit: charges.deposit,
        damageDeduction,
        lateFee,
        hoursLate,
      })
      settlement.settledAt = addHours(returnedAt ?? due, 2).toISOString()
      borrowing.settlement = settlement

      const refund: Transaction = {
        id: `t_${spec.id}_refund`,
        borrowingId: borrowing.id,
        resourceId: resource.id,
        borrowerId: spec.borrowerId,
        ownerId: owner.id,
        type: 'refund',
        amount: settlement.refund,
        borrowCharge: 0,
        platformFee: 0,
        deposit: settlement.refund,
        status: 'success',
        createdAt: settlement.settledAt,
        method: 'Campus Wallet',
      }
      transactions.push(refund)
      borrowing.transactionIds.push(refund.id)
    }

    if (spec.status === 'rated' && spec.review) {
      const rating: Rating = {
        id: `rt_${spec.id}`,
        borrowingId: borrowing.id,
        fromUserId: spec.borrowerId,
        toUserId: owner.id,
        resourceId: resource.id,
        ownerRating: spec.review.stars,
        resourceRating: spec.review.stars,
        exchangeRating: spec.review.stars,
        review: spec.review.text,
        createdAt: addHours(returnedAt ?? due, 4).toISOString(),
      }
      ratings.push(rating)
      borrowing.ratingId = rating.id
    }

    borrowings.push(borrowing)
  }

  return { borrowings, transactions, conditionReports, disputes, ratings }
}

export function buildSeedNotifications(): Notification[] {
  const now = Date.now()
  const ago = (mins: number) => new Date(now - mins * 60000).toISOString()
  return [
    {
      id: 'n1',
      kind: 'warning',
      title: 'Introduction to Algorithms is overdue',
      body: 'Return it today to stop the late fee from growing.',
      at: ago(45),
      read: false,
      link: '/borrowings/b103',
    },
    {
      id: 'n2',
      kind: 'success',
      title: 'Sneha accepted your borrowing request',
      body: 'Casio FX-991EX — pick up tomorrow at Girls Hostel, Room 302.',
      at: ago(180),
      read: false,
      link: '/borrowings/b102',
    },
    {
      id: 'n3',
      kind: 'info',
      title: 'Sony WH-1000XM4 is due in 3 days',
      body: 'Return deadline is set for 6:00 PM.',
      at: ago(600),
      read: false,
      link: '/borrowings/b101',
    },
    {
      id: 'n4',
      kind: 'review',
      title: 'Ananya left you a 5-star review',
      body: '"Returned the guitar early and in perfect condition."',
      at: ago(1500),
      read: true,
      link: '/profile',
    },
    {
      id: 'n5',
      kind: 'success',
      title: 'Your ₹400 security deposit was refunded',
      body: 'Yamaha F310 Acoustic Guitar — settled in full.',
      at: ago(1560),
      read: true,
      link: '/borrowings/b104',
    },
    {
      id: 'n6',
      kind: 'success',
      title: 'Your listing was approved',
      body: 'It is now discoverable to everyone on campus.',
      at: ago(4300),
      read: true,
      link: '/listings',
    },
  ]
}
