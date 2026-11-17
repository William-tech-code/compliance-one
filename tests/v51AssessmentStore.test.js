import test from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import {
  initializeAssessmentStore, createAssessmentCycle, saveAssessmentAnswer,
  closeAssessmentCycle, getAssessmentCycle
} from '../server/v51AssessmentStore.js';

function withDb(fn) {
  const db = new Database(':memory:');
  try {
    initializeAssessmentStore(db);
    initializeAssessmentStore(db);
    return fn(db);
  } finally { db.close(); }
}

test('create and read a tenant-scoped assessment cycle', () => withDb(db => {
  const cycle = createAssessmentCycle(db, {
    companyId: 'fictional-a', userId: 'user-1', title: '  Avaliação 2026  '
  });
  assert.equal(cycle.title, 'Avaliação 2026');
  assert.equal(getAssessmentCycle(db, { companyId: 'fictional-b', cycleId: cycle.id }), null);
  assert.deepEqual(getAssessmentCycle(db, { companyId: 'fictional-a', cycleId: cycle.id }).answers, []);
}));

test('upsert answers, enforce tenant isolation and lock closed cycles', () => withDb(db => {
  const cycle = createAssessmentCycle(db, {
    companyId: 'fictional-a', userId: 'user-1', title: 'Ciclo'
  });
  const args = { companyId: 'fictional-a', cycleId: cycle.id,
    controlId: 'anticorrupcao:01', answer: 'yes', userId: 'user-1' };
  saveAssessmentAnswer(db, args);
  saveAssessmentAnswer(db, { ...args, answer: 'no' });
  assert.equal(getAssessmentCycle(db, args).answers[0].answer, 'no');
  assert.equal(getAssessmentCycle(db, args).answers.length, 1);
  assert.throws(() => saveAssessmentAnswer(db, { ...args, companyId: 'fictional-b' }),
    /CYCLE_NOT_FOUND/);
  assert.throws(() => closeAssessmentCycle(db, {
    companyId: 'fictional-b', cycleId: cycle.id
  }), /CYCLE_NOT_FOUND_OR_CLOSED/);
  closeAssessmentCycle(db, args);
  assert.equal(getAssessmentCycle(db, args).status, 'closed');
  assert.throws(() => saveAssessmentAnswer(db, args), /CYCLE_CLOSED/);
  assert.throws(() => closeAssessmentCycle(db, args), /CYCLE_NOT_FOUND_OR_CLOSED/);
}));

test('rejects invalid answers, control IDs and titles', () => withDb(db => {
  assert.throws(() => createAssessmentCycle(db, {
    companyId: 'fictional-a', userId: 'user-1', title: ' '
  }), /INVALID_CYCLE/);
  const cycle = createAssessmentCycle(db, {
    companyId: 'fictional-a', userId: 'user-1', title: 'Ciclo'
  });
  assert.throws(() => saveAssessmentAnswer(db, {
    companyId: 'fictional-a', cycleId: cycle.id, controlId: 'x', answer: 'verified',
    userId: 'user-1'
  }), /INVALID_ANSWER/);
  assert.throws(() => saveAssessmentAnswer(db, {
    companyId: 'fictional-a', cycleId: cycle.id, controlId: '../../x', answer: 'yes',
    userId: 'user-1'
  }), /INVALID_ANSWER/);
}));
