import type { Category } from '@/types'

/**
 * Condition checklists shown before handover and after return.
 * Same labels on both sides so the BEFORE ↔ AFTER comparison lines up row for row.
 */
const BASE = ['Body condition', 'Accessories complete', 'Physical damage', 'Working as expected']

export const CHECKLISTS: Record<Category, string[]> = {
  Cameras: ['Body condition', 'Lens & screen', 'Accessories complete', 'Battery health', 'Physical damage'],
  Laptops: ['Body & lid', 'Screen & pixels', 'Keyboard & trackpad', 'Charger & accessories', 'Battery health'],
  Books: ['Cover & spine', 'Pages intact', 'Markings & highlights', 'Water damage', 'Accessories complete'],
  Calculators: ['Body condition', 'Display', 'Keys responsive', 'Battery / cover', 'Physical damage'],
  Sports: ['Frame / body', 'Grip & strings', 'Accessories complete', 'Wear & tear', 'Physical damage'],
  Music: ['Body & finish', 'Strings / keys', 'Tuning & sound', 'Accessories complete', 'Physical damage'],
  Electronics: ['Body condition', 'Screen / display', 'Ports & cables', 'Battery health', 'Physical damage'],
  'Event Equipment': ['Body & mounts', 'Cables & adapters', 'Accessories complete', 'Working as expected', 'Physical damage'],
  'Lab Equipment': ['Body & panel', 'Probes & leads', 'Calibration', 'Accessories complete', 'Physical damage'],
  Tools: ['Body & housing', 'Bits / attachments', 'Battery & charger', 'Safety gear', 'Physical damage'],
}

export function checklistFor(category: Category) {
  return CHECKLISTS[category] ?? BASE
}

export const DAMAGE_REASONS = [
  'Physical damage',
  'Screen damage',
  'Missing accessory',
  'Not working',
  'Excessive wear',
  'Lost / not returned',
] as const
