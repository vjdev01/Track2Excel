export const OUTCOME_PERIODS = ['daily', 'weekly', 'monthly', 'yearly'] as const;
export const OUTCOME_STATUSES = ['planned', 'in progress', 'achieved', 'deferred'] as const;
export type OutcomePeriod = typeof OUTCOME_PERIODS[number];
export type OutcomeStatus = typeof OUTCOME_STATUSES[number];

export interface Outcome {
  id: string;
  title: string;
  period: OutcomePeriod;
  date: string;
  status: OutcomeStatus;
  parentId?: string;
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
  return outcomes.filter(outcome => outcome.period === period && outcome.date === key);
}

export function parentCandidates(outcomes: Outcome[], period: OutcomePeriod, date: string) {
  const nextPeriod = OUTCOME_PERIODS[OUTCOME_PERIODS.indexOf(period) + 1];
  const child = periodBounds(period, date);
  return outcomes.filter(outcome => {
    const parent = periodBounds(outcome.period, outcome.date);
    return outcome.period === nextPeriod && parent.start < child.end && child.start < parent.end;
  });
}

export function saveOutcome(outcomes: Outcome[], outcome: Outcome) {
  const normalized = { ...outcome, title: outcome.title.trim(), date: periodBounds(outcome.period, outcome.date).start };
  if (!normalized.title) throw new Error('Enter an outcome.');
  if (outcomesForPeriod(outcomes, normalized.period, normalized.date).filter(item => item.id !== normalized.id).length >= 3) {
    throw new Error('This period already has three outcomes.');
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
      && (item.parentId === undefined || typeof item.parentId === 'string');
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