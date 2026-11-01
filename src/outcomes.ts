export const OUTCOME_PERIODS = ['daily', 'weekly', 'monthly', 'yearly'] as const;
export const OUTCOME_STATUSES = ['planned', 'in progress', 'achieved', 'deferred'] as const;
export type OutcomePeriod = typeof OUTCOME_PERIODS[number];
export type OutcomeStatus = typeof OUTCOME_STATUSES[number];
export const INTENTS = [
  { id: 'muscle', name: 'Building Muscle', purpose: 'Physical security' },
  { id: 'wealth', name: 'Compounding Wealth', purpose: 'Financial security' },
  { id: 'trust', name: 'Reinforcing Trust', purpose: 'Social security' },
] as const;
export type IntentId = typeof INTENTS[number]['id'];
export const OUTCOME_PRIORITIES = ['P1', 'P2', 'P3'] as const;
export type OutcomePriority = typeof OUTCOME_PRIORITIES[number];
export const PRIORITY_LABELS = { P1: 'Must', P2: 'Should', P3: 'Could' };
export type OutcomeLimits = Record<OutcomePeriod, number>;
export const DEFAULT_OUTCOME_LIMITS: OutcomeLimits = { daily: 3, weekly: 3, monthly: 3, yearly: 3 };

export function parseOutcomeLimits(raw: string | null): OutcomeLimits {
  const limits = { ...DEFAULT_OUTCOME_LIMITS };
  try {
    const parsed: unknown = JSON.parse(raw || '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return limits;
    for (const period of OUTCOME_PERIODS) {
      const value = (parsed as Partial<OutcomeLimits>)[period];
      if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 1) limits[period] = value;
    }
  } catch { return limits; }
  return limits;
}

export interface Outcome {
  id: string;
  title: string;
  period: OutcomePeriod;
  date: string;
  status: OutcomeStatus;
  parentId?: string;
  intentId?: IntentId;
  priority?: OutcomePriority;
  notes?: string;
}

export function outcomeIntent(outcomes: Outcome[], id: string | undefined): IntentId | undefined {
  let intent: IntentId | undefined;
  const visited = new Set<string>();
  while (id && !visited.has(id)) {
    visited.add(id);
    const outcome = outcomes.find(item => item.id === id);
    if (!outcome) break;
    if (outcome.intentId) intent = outcome.intentId;
    id = outcome.parentId;
  }
  return intent;
}

export function sortOutcomes(outcomes: Outcome[]) {
  return [...outcomes].sort((first, second) => (first.priority ? OUTCOME_PRIORITIES.indexOf(first.priority) : 3) - (second.priority ? OUTCOME_PRIORITIES.indexOf(second.priority) : 3));
}

export interface AlignedActivity {
  id: string;
  taskTitle?: string;
  date: string;
  endTime?: string;
  duration?: number;
  outcomeId?: string;
  intentId?: IntentId;
}

export function alignmentGroups(outcomes: Outcome[], activities: AlignedActivity[], period: OutcomePeriod, date: string) {
  const bounds = periodBounds(period, date);
  const planned = outcomesForPeriod(outcomes, period, date);
  const work = activities.filter(activity => bounds.start <= activity.date && activity.date < bounds.end);
  const intents: (IntentId | undefined)[] = [...INTENTS.map(intent => intent.id), undefined];
  return intents.map(intentId => {
    const linked = work.filter(activity => (outcomeIntent(outcomes, activity.outcomeId) || activity.intentId) === intentId);
    const targeted = planned.filter(outcome => outcomeIntent(outcomes, outcome.id) === intentId);
    return {
      intentId, outcomes: targeted, activities: linked,
      achieved: targeted.filter(outcome => outcome.status === 'achieved').length,
      minutes: linked.filter(activity => activity.endTime).reduce((total, activity) => total + (activity.duration || 0), 0),
    };
  });
}

function localDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function periodBounds(period: OutcomePeriod, date: string) {
  const start = new Date(`${date}T12:00:00`);
  if (period === 'weekly') start.setDate(start.getDate() - (start.getDay() + 6) % 7);
  if (period === 'monthly') start.setDate(1);
  if (period === 'yearly') start.setMonth(0, 1);
  const end = new Date(start);
  if (period === 'daily') end.setDate(end.getDate() + 1);
  if (period === 'weekly') end.setDate(end.getDate() + 7);
  if (period === 'monthly') end.setMonth(end.getMonth() + 1);
  if (period === 'yearly') end.setFullYear(end.getFullYear() + 1);
  return { start: localDate(start), end: localDate(end) };
}

export function outcomesForPeriod(outcomes: Outcome[], period: OutcomePeriod, date: string) {
  const key = periodBounds(period, date).start;
  return sortOutcomes(outcomes.filter(outcome => outcome.period === period && outcome.date === key));
}

export function parentCandidates(outcomes: Outcome[], period: OutcomePeriod, date: string) {
  const nextPeriod = OUTCOME_PERIODS[OUTCOME_PERIODS.indexOf(period) + 1];
  const child = periodBounds(period, date);
  return outcomes.filter(outcome => {
    const parent = periodBounds(outcome.period, outcome.date);
    return outcome.period === nextPeriod && parent.start < child.end && child.start < parent.end;
  });
}

export function saveOutcome(outcomes: Outcome[], outcome: Outcome, limit = DEFAULT_OUTCOME_LIMITS[outcome.period]) {
  if (!Number.isSafeInteger(limit) || limit < 1) throw new Error('Outcome limit must be a positive whole number.');
  const normalized = { ...outcome, title: outcome.title.trim(), notes: outcome.notes?.trim() || undefined, date: periodBounds(outcome.period, outcome.date).start };
  if (!normalized.title) throw new Error('Enter an outcome.');
  const existing = outcomes.some(item => item.id === normalized.id && item.period === normalized.period && item.date === normalized.date);
  if (!existing && outcomesForPeriod(outcomes, normalized.period, normalized.date).length >= limit) {
    throw new Error(`This period has reached its limit of ${limit} outcomes.`);
  }
  if (normalized.parentId && !parentCandidates(outcomes, normalized.period, normalized.date).some(parent => parent.id === normalized.parentId)) {
    throw new Error('Select a parent outcome from the next planning level.');
  }
  return [...outcomes.filter(item => item.id !== normalized.id), normalized];
}

export function parseOutcomes(raw: string | null): Outcome[] {
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed) || !parsed.every(item => {
    if (!item || typeof item !== 'object') return false;
    return typeof item.id === 'string' && typeof item.title === 'string'
      && OUTCOME_PERIODS.includes(item.period) && OUTCOME_STATUSES.includes(item.status)
      && typeof item.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.date)
      && Number.isFinite(new Date(`${item.date}T12:00:00`).getTime())
      && periodBounds('daily', item.date).start === item.date
      && periodBounds(item.period, item.date).start === item.date
      && (item.parentId === undefined || typeof item.parentId === 'string')
      && (item.intentId === undefined || INTENTS.some(intent => intent.id === item.intentId))
      && (item.priority === undefined || OUTCOME_PRIORITIES.includes(item.priority))
      && (item.notes === undefined || typeof item.notes === 'string');
  })) throw new Error('Saved outcomes could not be read.');
  if (new Set(parsed.map(item => item.id)).size !== parsed.length) throw new Error('Duplicate outcome IDs.');
  return parsed;
}

export function linkedOutcomeIds(outcomes: Outcome[], id: string): Set<string> {
  const ids = new Set([id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const outcome of outcomes) {
      if (outcome.parentId && ids.has(outcome.parentId) && !ids.has(outcome.id)) {
        ids.add(outcome.id);
        changed = true;
      }
    }
  }
  return ids;
}