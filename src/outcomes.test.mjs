import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('./outcomes.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { periodBounds, saveOutcome, parseOutcomes, parseOutcomeLimits, parentCandidates, linkedOutcomeIds } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const makeOutcome = (id, period = 'daily', date = '2026-10-31') => ({ id, period, date, title: 'Publish release', status: 'planned' });

test('periods use local dates, Monday weeks and exclusive end boundaries', () => {
  assert.deepEqual(periodBounds('weekly', '2027-01-03'), { start: '2026-12-28', end: '2027-01-04' });
  assert.deepEqual(periodBounds('monthly', '2024-02-29'), { start: '2024-02-01', end: '2024-03-01' });
  assert.deepEqual(periodBounds('yearly', '2026-10-31'), { start: '2026-01-01', end: '2027-01-01' });
});

test('three outcomes per period, edits allowed, other dates independent', () => {
  let outcomes = [];
  for (const id of ['one', 'two', 'three']) outcomes = saveOutcome(outcomes, makeOutcome(id));
  assert.throws(() => saveOutcome(outcomes, makeOutcome('four')), /limit of 3/);
  assert.equal(saveOutcome(outcomes, { ...makeOutcome('one'), title: '  Updated  ' })[2].title, 'Updated');
  assert.equal(saveOutcome(outcomes, makeOutcome('four', 'daily', '2026-11-01')).length, 4);
});

test('parent links connect adjacent levels and roll up descendant IDs', () => {
  const year = makeOutcome('year', 'yearly', '2026-01-01');
  const month = { ...makeOutcome('month', 'monthly', '2026-10-01'), parentId: year.id };
  const week = { ...makeOutcome('week', 'weekly', '2026-10-26'), parentId: month.id };
  const day = { ...makeOutcome('day'), parentId: week.id };
  const outcomes = [year, month, week, day];
  assert.deepEqual(parentCandidates(outcomes, 'daily', day.date).map(item => item.id), ['week']);
  assert.throws(() => saveOutcome(outcomes, { ...day, parentId: year.id }), /next planning level/);
  assert.deepEqual([...linkedOutcomeIds(outcomes, year.id)], ['year', 'month', 'week', 'day']);
});

test('persistence round trips and rejects invalid records', () => {
  const outcomes = [makeOutcome('one')];
  assert.deepEqual(parseOutcomes(JSON.stringify(outcomes)), outcomes);
  assert.deepEqual(parseOutcomes(null), []);
  assert.throws(() => parseOutcomes('{'));
  assert.throws(() => parseOutcomes(JSON.stringify([{ ...outcomes[0], date: '2026-02-31' }])));
  assert.throws(() => parseOutcomes(JSON.stringify([{ ...outcomes[0], status: 'unknown' }])));
});

test('configured limits apply independently and reduced limits still allow edits', () => {
  const limits = parseOutcomeLimits(JSON.stringify({ daily: 1, weekly: 2, monthly: 4, yearly: 5 }));
  for (const [period, limit] of Object.entries(limits)) {
    let outcomes = [];
    for (let index = 0; index < limit; index++) outcomes = saveOutcome(outcomes, makeOutcome(String(index), period), limit);
    assert.throws(() => saveOutcome(outcomes, makeOutcome('extra', period), limit), /reached its limit/);
    assert.equal(saveOutcome(outcomes, { ...outcomes[0], title: 'Edited' }, 1).length, limit);
    assert.equal(saveOutcome(outcomes, makeOutcome('extra', period), limit + 1).length, limit + 1);
  }
  assert.throws(() => saveOutcome([], makeOutcome('one'), 0), /positive whole number/);
});

test('limit settings round trip and invalid fields fall back to three', () => {
  const limits = { daily: 1, weekly: 2, monthly: 4, yearly: 5 };
  assert.deepEqual(parseOutcomeLimits(JSON.stringify(limits)), limits);
  assert.deepEqual(parseOutcomeLimits(null), { daily: 3, weekly: 3, monthly: 3, yearly: 3 });
  assert.deepEqual(parseOutcomeLimits('{'), parseOutcomeLimits(null));
  assert.deepEqual(parseOutcomeLimits(JSON.stringify({ daily: 0, weekly: 1.5, monthly: '5', yearly: 8 })), { daily: 3, weekly: 3, monthly: 3, yearly: 8 });
});