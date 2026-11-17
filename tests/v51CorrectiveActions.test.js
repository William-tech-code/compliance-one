import test from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { initializeAssessmentStore, createAssessmentCycle, closeAssessmentCycle } from '../server/v51AssessmentStore.js';
import { initializeCorrectiveActions, createCorrectiveAction,
  listCorrectiveActions, updateCorrectiveActionStatus } from '../server/v51CorrectiveActions.js';

test('corrective actions: tenant isolation, overdue indicator, versions and closed cycle', () => {
  const db = new Database(':memory:');
  try {
    initializeAssessmentStore(db);
    initializeCorrectiveActions(db);
    initializeCorrectiveActions(db);
    const cycle = createAssessmentCycle(db, {
      companyId: 'a', userId: 'user', title: 'Annual review'
    });
    const input = { companyId: 'a', cycleId: cycle.id, controlId: 'privacy:01',
      description: 'Implement policy', owner: 'Compliance', dueDate: '2026-01-01', userId: 'user' };
    const action = createCorrectiveAction(db, input);
    assert.equal(listCorrectiveActions(db, { companyId: 'a', cycleId: cycle.id,
      today: '2026-11-16' }).overdue, 1);
    assert.throws(() => listCorrectiveActions(db, { companyId: 'b', cycleId: cycle.id }),
      /CYCLE_NOT_FOUND/);
    assert.throws(() => createCorrectiveAction(db, { ...input, companyId: 'b' }),
      /CYCLE_NOT_FOUND/);
    const change = { companyId: 'a', cycleId: cycle.id, actionId: action.id,
      status: 'completed', expectedVersion: 1 };
    assert.throws(() => updateCorrectiveActionStatus(db, { ...change, companyId: 'b' }),
      /CYCLE_NOT_FOUND/);
    assert.equal(updateCorrectiveActionStatus(db, change).version, 2);
    assert.equal(listCorrectiveActions(db, { companyId: 'a', cycleId: cycle.id,
      today: '2026-11-16' }).overdue, 0);
    assert.throws(() => updateCorrectiveActionStatus(db, change), /VERSION_CONFLICT/);
    closeAssessmentCycle(db, { companyId: 'a', cycleId: cycle.id });
    assert.throws(() => createCorrectiveAction(db, input), /CYCLE_CLOSED/);
    assert.throws(() => updateCorrectiveActionStatus(db, { ...change, expectedVersion: 2 }),
      /CYCLE_CLOSED/);
  } finally { db.close(); }
});

test('corrective actions reject invalid due dates and unrecognized statuses', () => {
  const db = new Database(':memory:');
  try {
    initializeAssessmentStore(db);
    initializeCorrectiveActions(db);
    const cycle = createAssessmentCycle(db, { companyId: 'a', userId: 'u', title: 'Test' });
    const input = { companyId: 'a', cycleId: cycle.id, controlId: 'c:1',
      description: 'Fix', owner: 'Owner', dueDate: '2026-02-30', userId: 'u' };
    assert.throws(() => createCorrectiveAction(db, input), /INVALID_CORRECTIVE_ACTION/);
    assert.throws(() => updateCorrectiveActionStatus(db, { companyId: 'a', cycleId: cycle.id,
      actionId: 'x', status: 'verified', expectedVersion: 1 }), /INVALID_CORRECTIVE_ACTION/);
  } finally { db.close(); }
});
