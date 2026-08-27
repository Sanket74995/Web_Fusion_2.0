import type { Category, NeedGroup, NeedItem, NeedResult, ParsedNeed, Resource, User } from '@/types'
import { addDays, daysBetween, fmtDate, isToday, isTomorrow, startOfDay, toDateInput } from '@/lib/format'
import { isFreeFor, recommend, type MatchContext } from '@/services/matching'
import { unique } from '@/lib/utils'

/* ─────────────────────────────────────────────────────────────
   The requirement engine.

   A student types what they need in plain language; this module
   turns that into a structured requirement (purpose, dates,
   budget, resource slots) which the matcher then fills.

   Works fully offline. If VITE_AI_API_KEY is configured the same
   contract is fulfilled by a real model instead, and any failure
   silently falls back to the local parser.
   ───────────────────────────────────────────────────────────── */

const I = (
  label: string,
  category: Category,
  tags: string[],
  essential = true,
): NeedItem => ({ label, category, tags, essential })

const ITEMS = {
  camera: I('Camera', 'Cameras', ['camera', 'dslr', 'mirrorless', 'video', 'shoot']),
  actionCam: I('Action camera', 'Cameras', ['gopro', 'action camera', 'pov', 'waterproof']),
  tripod: I('Tripod', 'Event Equipment', ['tripod', 'stand', 'stabilise']),
  mic: I('Microphone', 'Event Equipment', ['microphone', 'mic', 'audio', 'lav', 'wireless']),
  lighting: I('Lighting', 'Event Equipment', ['light', 'lighting', 'led', 'softbox'], false),
  gimbal: I('Gimbal', 'Event Equipment', ['gimbal', 'stabiliser', 'smooth'], false),
  slider: I('Camera slider', 'Event Equipment', ['slider', 'dolly', 'cinematic'], false),
  speaker: I('Speaker / PA system', 'Event Equipment', ['speaker', 'pa system', 'sound', 'audio']),
  backdrop: I('Backdrop', 'Event Equipment', ['backdrop', 'green screen', 'chroma'], false),
  laptop: I('Laptop', 'Laptops', ['laptop', 'coding', 'editing', 'render']),
  projector: I('Projector', 'Electronics', ['projector', 'screening', 'presentation']),
  tablet: I('Tablet', 'Electronics', ['ipad', 'tablet', 'notes', 'sketch'], false),
  drawingTablet: I('Drawing tablet', 'Electronics', ['wacom', 'drawing tablet', 'illustration', 'design']),
  headphones: I('Headphones', 'Electronics', ['headphones', 'noise cancelling', 'study'], false),
  powerBank: I('Power bank', 'Electronics', ['power bank', 'charger', 'battery'], false),
  ebook: I('E-reader', 'Electronics', ['kindle', 'ebook', 'reading'], false),
  calculator: I('Scientific calculator', 'Calculators', ['calculator', 'scientific', 'exam']),
  financeCalc: I('Financial calculator', 'Calculators', ['financial calculator', 'npv', 'finance']),
  book: I('Textbook', 'Books', ['book', 'textbook', 'exam', 'study']),
  guitar: I('Guitar', 'Music', ['guitar', 'acoustic', 'strings']),
  keyboard: I('Keyboard', 'Music', ['keyboard', 'piano', 'roland'], false),
  cajon: I('Percussion', 'Music', ['cajon', 'drum', 'percussion'], false),
  audioInterface: I('Audio interface', 'Music', ['audio interface', 'focusrite', 'recording']),
  arduino: I('Arduino / sensor kit', 'Lab Equipment', ['arduino', 'sensor', 'kit', 'iot']),
  oscilloscope: I('Oscilloscope', 'Lab Equipment', ['oscilloscope', 'scope', 'measurement']),
  drill: I('Power drill', 'Tools', ['drill', 'workshop', 'set building']),
  measuring: I('Measuring instruments', 'Tools', ['vernier', 'caliper', 'micrometer'], false),
  badminton: I('Badminton set', 'Sports', ['badminton', 'racket', 'shuttle']),
  cricket: I('Cricket kit', 'Sports', ['cricket', 'bat', 'pads']),
  football: I('Football', 'Sports', ['football', 'cones']),
  fitness: I('Fitness gear', 'Sports', ['yoga', 'mat', 'bands', 'workout']),
} satisfies Record<string, NeedItem>

type ItemKey = keyof typeof ITEMS

interface Intent {
  id: string
  /** Any of these phrases in the input activates the intent. */
  cues: string[]
  purpose: string
  items: ItemKey[]
  defaultDays: number
}

/* Ordered by specificity — the first match wins as the primary purpose. */
const INTENTS: Intent[] = [
  {
    id: 'reel',
    cues: ['reel', 'short video', 'shoot a video', 'video shoot', 'vlog', 'youtube', 'instagram', 'promo video', 'film', 'shoot for', 'content'],
    purpose: 'Shoot a video / reel',
    items: ['camera', 'tripod', 'mic', 'lighting'],
    defaultDays: 1,
  },
  {
    id: 'podcast',
    cues: ['podcast', 'record audio', 'voice over', 'voiceover', 'interview recording', 'record an interview'],
    purpose: 'Record a podcast or interview',
    items: ['mic', 'audioInterface', 'headphones'],
    defaultDays: 1,
  },
  {
    id: 'photography',
    cues: ['photograph', 'photography', 'photo shoot', 'photos', 'click pictures', 'portraits', 'sports day photo'],
    purpose: 'Photography session',
    items: ['camera', 'tripod', 'lighting'],
    defaultDays: 1,
  },
  {
    id: 'presentation',
    cues: ['presentation', 'screening', 'seminar', 'pitch', 'movie night', 'demo day', 'project review', 'present'],
    purpose: 'Present to a room',
    items: ['projector', 'laptop'],
    defaultDays: 1,
  },
  {
    id: 'event',
    cues: ['fest', 'event', 'annual day', 'cultural', 'concert', 'farewell', 'orientation', 'stall', 'function'],
    purpose: 'Run a campus event',
    items: ['speaker', 'mic', 'lighting', 'backdrop'],
    defaultDays: 1,
  },
  {
    id: 'exam',
    cues: ['exam', 'unit test', 'viva', 'mid-sem', 'midsem', 'end sem', 'end-sem', 'paper tomorrow', 'test tomorrow'],
    purpose: 'Sit an exam',
    items: ['calculator', 'book'],
    defaultDays: 2,
  },
  {
    id: 'study',
    cues: ['study', 'revision', 'revise', 'prepare for', 'preparation', 'syllabus', 'reading', 'gate'],
    purpose: 'Study and revision',
    items: ['book', 'calculator', 'headphones'],
    defaultDays: 5,
  },
  {
    id: 'project',
    cues: ['mini project', 'project', 'prototype', 'iot', 'circuit', 'lab work', 'capstone', 'final year'],
    purpose: 'Build a project',
    items: ['arduino', 'oscilloscope', 'laptop'],
    defaultDays: 7,
  },
  {
    id: 'editing',
    cues: ['edit', 'editing', 'render', 'premiere', 'davinci', 'after effects'],
    purpose: 'Edit and render footage',
    items: ['laptop', 'headphones'],
    defaultDays: 3,
  },
  {
    id: 'design',
    cues: ['poster', 'illustration', 'sketch', 'design work', 'graphics', 'ui design'],
    purpose: 'Design work',
    items: ['drawingTablet', 'tablet'],
    defaultDays: 3,
  },
  {
    id: 'music',
    cues: ['open mic', 'band', 'perform', 'jam', 'rehearsal', 'music society', 'song'],
    purpose: 'Music performance',
    items: ['guitar', 'cajon', 'mic'],
    defaultDays: 2,
  },
  {
    id: 'sports',
    cues: ['match', 'tournament', 'practice session', 'badminton', 'cricket', 'football', 'sports'],
    purpose: 'Play a match',
    items: ['badminton', 'cricket', 'football'],
    defaultDays: 1,
  },
  {
    id: 'workshop',
    cues: ['workshop', 'set building', 'build a stall', 'carpentry', 'fabricate', 'assemble'],
    purpose: 'Workshop / fabrication',
    items: ['drill', 'measuring'],
    defaultDays: 2,
  },
  {
    id: 'trek',
    cues: ['trek', 'trip', 'travel', 'camping', 'outdoor', 'adventure'],
    purpose: 'Trip / outdoor activity',
    items: ['actionCam', 'powerBank'],
    defaultDays: 3,
  },
  {
    id: 'fitness',
    cues: ['workout', 'fitness', 'yoga', 'gym'],
    purpose: 'Fitness routine',
    items: ['fitness'],
    defaultDays: 7,
  },
]

/* Direct item mentions, checked in addition to the intent. */
const DIRECT: { cues: string[]; key: ItemKey }[] = [
  { cues: ['camera', 'dslr', 'mirrorless', 'alpha', 'canon', 'nikon'], key: 'camera' },
  { cues: ['gopro', 'action cam'], key: 'actionCam' },
  { cues: ['tripod'], key: 'tripod' },
  { cues: ['mic', 'microphone', 'lapel', 'lav'], key: 'mic' },
  { cues: ['light', 'lighting', 'softbox', 'led panel'], key: 'lighting' },
  { cues: ['gimbal', 'stabilis', 'stabiliz'], key: 'gimbal' },
  { cues: ['slider', 'dolly'], key: 'slider' },
  { cues: ['speaker', 'pa system', 'sound system'], key: 'speaker' },
  { cues: ['green screen', 'backdrop', 'chroma'], key: 'backdrop' },
  { cues: ['laptop', 'macbook', 'thinkpad'], key: 'laptop' },
  { cues: ['projector'], key: 'projector' },
  { cues: ['ipad', 'tablet'], key: 'tablet' },
  { cues: ['wacom', 'drawing tablet', 'pen tablet'], key: 'drawingTablet' },
  { cues: ['headphone', 'earphone', 'noise cancel'], key: 'headphones' },
  { cues: ['power bank', 'powerbank'], key: 'powerBank' },
  { cues: ['kindle', 'e-reader', 'ereader'], key: 'ebook' },
  { cues: ['calculator', 'casio', 'fx-991', 'classwiz'], key: 'calculator' },
  { cues: ['financial calculator'], key: 'financeCalc' },
  { cues: ['book', 'textbook', 'clrs', 'grewal', 'sedra', 'is code'], key: 'book' },
  { cues: ['guitar'], key: 'guitar' },
  { cues: ['keyboard', 'piano'], key: 'keyboard' },
  { cues: ['cajon', 'drum', 'percussion'], key: 'cajon' },
  { cues: ['audio interface', 'focusrite', 'scarlett'], key: 'audioInterface' },
  { cues: ['arduino', 'sensor kit', 'breadboard'], key: 'arduino' },
  { cues: ['oscilloscope', 'scope'], key: 'oscilloscope' },
  { cues: ['drill'], key: 'drill' },
  { cues: ['vernier', 'caliper', 'micrometer'], key: 'measuring' },
  { cues: ['badminton', 'racket', 'shuttle'], key: 'badminton' },
  { cues: ['cricket', 'bat'], key: 'cricket' },
  { cues: ['football'], key: 'football' },
  { cues: ['yoga', 'resistance band'], key: 'fitness' },
]

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

function parseWhen(text: string): { start: Date; label: string } {
  const now = new Date()
  if (/\bday after tomorrow\b/.test(text)) {
    const d = addDays(now, 2)
    return { start: d, label: `Day after tomorrow, ${fmtDate(d)}` }
  }
  if (/\btomorrow\b|\btmrw\b|\btmr\b/.test(text)) {
    const d = addDays(now, 1)
    return { start: d, label: `Tomorrow, ${fmtDate(d)}` }
  }
  if (/\btoday\b|\btonight\b|\bright now\b|\bnow\b|\basap\b/.test(text)) {
    return { start: now, label: `Today, ${fmtDate(now)}` }
  }
  if (/\bweekend\b/.test(text)) {
    const delta = (6 - now.getDay() + 7) % 7 || 7
    const d = addDays(now, delta)
    return { start: d, label: `This weekend, ${fmtDate(d)}` }
  }
  if (/\bnext week\b/.test(text)) {
    const d = addDays(now, 7)
    return { start: d, label: `Next week, ${fmtDate(d)}` }
  }
  for (let i = 0; i < WEEKDAYS.length; i++) {
    if (new RegExp(`\\b${WEEKDAYS[i]}\\b`).test(text)) {
      const delta = (i - now.getDay() + 7) % 7 || 7
      const d = addDays(now, delta)
      return { start: d, label: `${WEEKDAYS[i][0].toUpperCase()}${WEEKDAYS[i].slice(1)}, ${fmtDate(d)}` }
    }
  }
  return { start: now, label: `Today, ${fmtDate(now)}` }
}

function parseDuration(text: string, fallback: number): number {
  const week = /\b(?:a|one|1)\s*week\b|\b7\s*days?\b/.exec(text)
  if (week) return 7
  const fortnight = /\b(?:two|2)\s*weeks?\b/.exec(text)
  if (fortnight) return 14
  const days = /\b(?:for\s*)?(\d{1,2})\s*days?\b/.exec(text)
  if (days) return Math.min(30, Math.max(1, Number(days[1])))
  const hours = /\b(\d{1,2})\s*(?:hours?|hrs?)\b/.exec(text)
  if (hours) return 1
  if (/\bwhole (?:semester|month)\b|\bmonth\b/.test(text)) return 21
  return fallback
}

function parseBudget(text: string): number | null {
  const patterns = [
    /(?:budget|under|within|upto|up to|max(?:imum)?|around|about)\D{0,12}?(\d[\d,]*)/i,
    /₹\s*(\d[\d,]*)/,
    /(?:rs\.?|inr)\s*(\d[\d,]*)/i,
    /(\d[\d,]*)\s*(?:rs\.?|rupees|inr)\b/i,
  ]
  for (const p of patterns) {
    const m = p.exec(text)
    if (m) {
      const value = Number(m[1].replace(/,/g, ''))
      if (Number.isFinite(value) && value > 0) return value
    }
  }
  return null
}

export function parseNeedLocal(raw: string): ParsedNeed {
  const text = raw.toLowerCase()
  const intent = INTENTS.find((i) => i.cues.some((c) => text.includes(c)))

  const keys: ItemKey[] = []
  const direct = DIRECT.filter((d) => d.cues.some((c) => text.includes(c))).map((d) => d.key)
  keys.push(...direct)
  if (intent) keys.push(...intent.items)

  /* Nothing recognised — fall back to a broad, useful default. */
  const finalKeys = unique(keys.length ? keys : (['camera', 'laptop', 'book', 'calculator'] as ItemKey[]))

  const items: NeedItem[] = finalKeys.slice(0, 5).map((k, i) => ({
    ...ITEMS[k],
    // Anything the student named explicitly is essential; intent extras are optional.
    essential: direct.includes(k) ? true : i < 3 ? ITEMS[k].essential : false,
  }))

  const { start, label } = parseWhen(text)
  const days = parseDuration(text, intent?.defaultDays ?? 2)
  const startDate = toDateInput(start)
  const endDate = toDateInput(addDays(start, days))
  const budget = parseBudget(text)

  const notes: string[] = []
  if (budget !== null) {
    notes.push(
      `Budget of ₹${budget.toLocaleString('en-IN')} read as the borrowing charge — refundable deposits are counted separately.`,
    )
  }
  if (!intent && !direct.length) {
    notes.push('Requirement was broad, so the most-borrowed resources on campus are shown first.')
  }
  if (days > 7) notes.push(`Long borrowing period (${days} days) — longer periods cost more but the deposit stays the same.`)

  return {
    raw: raw.trim(),
    purpose: intent?.purpose ?? (direct.length ? `Borrow ${items.map((i) => i.label.toLowerCase()).join(', ')}` : 'General campus requirement'),
    whenLabel: label,
    startDate,
    endDate,
    days,
    budget,
    items,
    notes,
    source: 'local',
  }
}

/* ── Optional real-model path ─────────────────────────────── */

const AI_KEY = import.meta.env.VITE_AI_API_KEY
const AI_MODEL = import.meta.env.VITE_AI_MODEL ?? 'claude-sonnet-5'
const AI_BASE = import.meta.env.VITE_AI_BASE_URL ?? 'https://api.anthropic.com/v1/messages'

export const aiMode: 'api' | 'local' = AI_KEY ? 'api' : 'local'

const SYSTEM_PROMPT = `You extract structured borrowing requirements for a campus resource-sharing platform.
Reply with JSON only, no prose, matching:
{"purpose":string,"days":number,"startsIn":number,"budget":number|null,"items":[{"label":string,"category":string,"tags":string[],"essential":boolean}]}
"startsIn" is days from today (0 = today). Category must be one of: Cameras, Laptops, Books, Calculators, Sports, Music, Electronics, Event Equipment, Lab Equipment, Tools.
Expand the need into every resource actually required — a video shoot needs a camera, tripod, microphone and lighting. Max 5 items.`

async function parseNeedApi(raw: string): Promise<ParsedNeed | null> {
  if (!AI_KEY) return null
  try {
    const res = await fetch(AI_BASE, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': AI_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: AI_MODEL,
        max_tokens: 700,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: raw }],
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    const text: string = data?.content?.[0]?.text ?? ''
    const json = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1))
    const start = addDays(new Date(), Math.max(0, Number(json.startsIn) || 0))
    const days = Math.min(30, Math.max(1, Number(json.days) || 2))
    const items: NeedItem[] = (json.items ?? [])
      .slice(0, 5)
      .map((it: NeedItem) => ({
        label: String(it.label),
        category: it.category,
        tags: Array.isArray(it.tags) ? it.tags.map((t) => String(t).toLowerCase()) : [],
        essential: it.essential !== false,
      }))
    if (!items.length) return null
    const local = parseNeedLocal(raw)
    return {
      ...local,
      purpose: String(json.purpose || local.purpose),
      startDate: toDateInput(start),
      endDate: toDateInput(addDays(start, days)),
      days,
      whenLabel: isToday(start) ? `Today, ${fmtDate(start)}` : isTomorrow(start) ? `Tomorrow, ${fmtDate(start)}` : fmtDate(start),
      budget: json.budget === null || json.budget === undefined ? local.budget : Number(json.budget),
      items,
      source: 'api',
    }
  } catch {
    return null
  }
}

/** The stage labels the UI animates through while a requirement is analysed. */
export const AI_STAGES = [
  'Understanding your requirement',
  'Finding nearby resources',
  'Checking availability',
  'Ranking the best matches',
]

export async function parseNeed(raw: string): Promise<ParsedNeed> {
  const viaApi = await parseNeedApi(raw)
  return viaApi ?? parseNeedLocal(raw)
}

/* ── Requirement → recommendations ────────────────────────── */

function poolFor(item: NeedItem, resources: Resource[]) {
  const byTag = resources.filter((r) => {
    const hay = [r.name.toLowerCase(), ...r.tags, r.category.toLowerCase()].join(' ')
    return item.tags.some((t) => t.length > 2 && hay.includes(t))
  })
  const byCategory = resources.filter((r) => r.category === item.category)
  const merged = unique([...byTag, ...byCategory])
  return merged.length ? merged : resources
}

export function resolveNeed(need: ParsedNeed, resources: Resource[], users: User[]): NeedResult {
  const listed = resources.filter((r) => r.approvalStatus === 'approved')
  const budgetPerDay = need.budget !== null ? need.budget / need.days : null

  const groups: NeedGroup[] = need.items.map((item) => {
    const ctx: MatchContext = {
      startDate: need.startDate,
      endDate: need.endDate,
      needTags: unique([...item.tags, ...need.raw.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3)]),
      budgetPerDay,
      category: item.category,
    }
    const scored = recommend(poolFor(item, listed), users, ctx, {
      forItem: item.label,
      essential: item.essential,
    })
    const available = scored.filter((r) => isFreeFor(r.resource, need.startDate))
    const picks = available.slice(0, 3)

    /* The most suitable resource that cannot be picked up on the requested date. */
    const bestBlocked = scored.find((r) => !isFreeFor(r.resource, need.startDate))
    const blocked =
      bestBlocked && (!picks.length || bestBlocked.score + 6 >= (picks[0]?.score ?? 0))
        ? { ...bestBlocked, alternatives: picks.slice(0, 2) }
        : undefined

    return { item, picks, blocked }
  })

  const topPicks = groups.map((g) => g.picks[0]).filter(Boolean)
  const essentialPicks = groups.filter((g) => g.item.essential).map((g) => g.picks[0]).filter(Boolean)

  const totalPerDay = topPicks.reduce((a, p) => a + p.resource.pricePerDay, 0)
  const essentialPerDay = essentialPicks.reduce((a, p) => a + p.resource.pricePerDay, 0)
  const totalDeposit = topPicks.reduce((a, p) => a + p.resource.deposit, 0)

  const notes = [...need.notes]
  if (need.budget !== null) {
    const essentialTotal = essentialPerDay * need.days
    const fullTotal = totalPerDay * need.days
    if (essentialTotal <= need.budget && fullTotal > need.budget) {
      const optional = groups.filter((g) => !g.item.essential && g.picks[0]).map((g) => g.item.label.toLowerCase())
      if (optional.length) {
        notes.push(
          `The essentials come to ₹${essentialTotal} for ${need.days} day${need.days > 1 ? 's' : ''}. Adding ${optional.join(' and ')} takes it to ₹${fullTotal}, which is ₹${fullTotal - need.budget} over budget.`,
        )
      }
    }
  }

  return {
    need: { ...need, notes },
    groups,
    totalPerDay: essentialPerDay || totalPerDay,
    totalDeposit,
    withinBudget: need.budget === null || essentialPerDay * need.days <= need.budget,
  }
}

/** One-line human summary of a parsed requirement. */
export function needSummary(need: ParsedNeed) {
  const items = need.items.filter((i) => i.essential).map((i) => i.label)
  const list =
    items.length > 1
      ? `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
      : items[0]
  return `${need.purpose} · ${need.whenLabel} · ${list ?? 'resources'}`
}

/** Days the requirement covers, used for the charge preview on the results page. */
export function needWindow(need: ParsedNeed) {
  return {
    startDate: need.startDate,
    endDate: need.endDate,
    days: daysBetween(need.startDate, need.endDate),
    startsToday: startOfDay(need.startDate).getTime() === startOfDay().getTime(),
  }
}

export const EXAMPLE_QUERIES = [
  'I need to shoot a reel for my college event tomorrow. My budget is ₹500.',
  'Calculator and Grewal for my maths unit test on Friday',
  'Sound system and mic for the cultural night this weekend',
  'Laptop for editing a fest video, for 3 days',
  'Arduino and sensors for my IoT mini project next week',
  'Badminton rackets for practice today',
]
