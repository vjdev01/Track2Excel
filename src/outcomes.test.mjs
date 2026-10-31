import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('./outcomes.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { periodBounds, saveOutcome, parseOutcomes, parentCandidates, linkedOutcomeIds } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const makeOutcome = (id, period = 'daily', date = '2026-10-31') => ({ id, period, date, title: 'Publish release', status: 'planned' });

test('periods use local dates, Monday weeks and exclusive end boundaries', () => {
  assert.deepEqual(periodBounds('weekly', '2027-01-03'), { start: '2026-12-28', end: '2027-01-04' });
  assert.deepEqual(periodBounds('monthly', '2024-02-29'), { start: '2024-02-01', end: '2024-03-01' });
  assert.deepEqual(periodBounds('yearly', '2026-10-31'), { start: '2026-01-01', end: '2027-01-01' });
});

test('three outcomes per period, edits allowed, other dates independent', () => {
  let outcomes = [];
  for (const id of ['one', 'two', 'three']) outcomes = saveOutcome(outcomes, makeOutcome(id));
  assert.throws(() => saveOutcome(outcomes, makeOutcome('four')), /three outcomes/);
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