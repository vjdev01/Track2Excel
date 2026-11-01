import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('./activityTimer.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { MAX_ACTIVITY_MS, activityDeadline, completeTimedActivity, closeExpiredActivities } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('daytime activities stop exactly at 90 minutes, including late wakeups', () => {
  const start = new Date(2026, 10, 1, 10, 0, 0).getTime();
  const activity = { id: 'one', startTime: new Date(start).toISOString(), outcomeId: 'plan', notes: 'Keep me' };
  assert.equal(activityDeadline(activity.startTime), start + MAX_ACTIVITY_MS);
  const finished = completeTimedActivity(activity, start + 3 * MAX_ACTIVITY_MS);
  assert.equal(finished.endTime, new Date(start + MAX_ACTIVITY_MS).toISOString());
  assert.equal(finished.duration, 90);
  assert.equal(finished.outcomeId, 'plan');
  assert.equal(finished.notes, 'Keep me');
});

test('late activities stop at local midnight and retain their starting date', () => {
  const start = new Date(2026, 10, 1, 23, 30, 0).getTime();
  const midnight = new Date(2026, 10, 2, 0, 0, 0).getTime();
  const activity = { startTime: new Date(start).toISOString(), date: '2026-11-01' };
  assert.equal(activityDeadline(activity.startTime), midnight);
  const finished = completeTimedActivity(activity, midnight + 60000);
  assert.equal(finished.endTime, new Date(midnight).toISOString());
  assert.equal(finished.duration, 30);
  assert.equal(finished.date, activity.date);
});

test('startup reconciliation only completes expired running activities and is idempotent', () => {
  const start = new Date(2026, 10, 1, 10, 0, 0).getTime();
  const old = { id: 'expired', startTime: new Date(start).toISOString() };
  const running = { id: 'running', startTime: new Date(start + MAX_ACTIVITY_MS).toISOString() };
  const ended = { ...old, id: 'ended', endTime: new Date(start + 60000).toISOString(), duration: 1 };
  const now = start + MAX_ACTIVITY_MS;
  const before = closeExpiredActivities([old], now - 1);
  assert.equal(before[0], old);
  const after = closeExpiredActivities([old, running, ended], now);
  assert.equal(after[0].duration, 90);
  assert.equal(after[1], running);
  assert.equal(after[2], ended);
  assert.deepEqual(closeExpiredActivities(after, now), after);
});

test('manual stops before the cutoff preserve elapsed time and midnight uses local calendar dates', () => {
  const start = new Date(2026, 9, 31, 23, 50, 0).getTime();
  const activity = { startTime: new Date(start).toISOString() };
  assert.equal(completeTimedActivity(activity, start + 5 * 60000).duration, 5);
  assert.equal(activityDeadline(activity.startTime), new Date(2026, 10, 1, 0, 0, 0).getTime());
  const dstStart = new Date(2026, 10, 1, 0, 30, 0).getTime();
  assert.equal(activityDeadline(new Date(dstStart).toISOString()), dstStart + MAX_ACTIVITY_MS);
});