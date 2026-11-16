import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import Database from 'better-sqlite3';
import { initializeAssessmentStore, createAssessmentCycle, closeAssessmentCycle } from '../server/v51AssessmentStore.js';
import { configureCorrectiveActions } from '../server/v51CorrectiveActionsApi.js';

test('corrective actions HTTP: auth, tenant isolation, version conflict and closed cycles', async () => {
  const db = new Database(':memory:');
  initializeAssessmentStore(db);
  const cycle = createAssessmentCycle(db, { companyId: 'a', userId: 'u', title: 'Annual' });
  const app = express();
  app.use(express.json());
  const events = [];
  const authenticate = (req,res,next) => {
    const token = req.get('authorization');
    if (!token) return res.status(401).json({ error: 'AUTH_REQUIRED' });
    req.user = { companyId: token === 'Bearer b' ? 'b' : 'a', sub: 'u',
      role: token === 'Bearer denied' ? 'denied' : 'allowed' };
    next();
  };
  const requirePermission = () => (req,res,next) =>
    req.user.role === 'denied' ? res.status(403).json({ error: 'FORBIDDEN' }) : next();
  configureCorrectiveActions({ app, db, authenticate, requirePermission,
    audit: (req, event) => events.push(event) });
  const server = await new Promise(resolve => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  const base = 'http://127.0.0.1:' + server.address().port;
  const path = '/api/v51/assessment/cycles/' + cycle.id + '/actions';
  const request = async (suffix = '', method = 'GET', body, token = 'a') => {
    const res = await fetch(base + path + suffix, { method,
      headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    return { status: res.status, data: await res.json() };
  };
  try {
    assert.equal((await fetch(base + path)).status, 401);
    assert.equal((await request('', 'GET', undefined, 'denied')).status, 403);
    assert.equal((await request('', 'GET', undefined, 'b')).status, 404);
    const created = await request('', 'POST', { controlId: 'privacy:01',
      description: 'Review policy', owner: 'Legal', dueDate: '2026-01-01' });
    assert.equal(created.status, 201);
    const id = created.data.id;
    assert.equal((await request()).data.overdue, 1);
    assert.equal((await request('/' + id, 'PATCH', {
      status: 'completed', expectedVersion: 1 }, 'b')).status, 404);
    assert.equal((await request('/' + id, 'PATCH', {
      status: 'completed', expectedVersion: 1 })).status, 200);
    assert.equal((await request('/' + id, 'PATCH', {
      status: 'open', expectedVersion: 1 })).status, 409);
    assert.equal((await request()).data.overdue, 0);
    closeAssessmentCycle(db, { companyId: 'a', cycleId: cycle.id });
    assert.equal((await request('', 'POST', { controlId: 'privacy:01',
      description: 'Other', owner: 'Legal', dueDate: '2026-12-01' })).status, 409);
    assert.deepEqual(events, ['V51_CORRECTIVE_ACTION_CREATED',
      'V51_CORRECTIVE_ACTION_STATUS_UPDATED']);
  } finally {
    await new Promise(resolve => server.close(resolve));
    db.close();
  }
});
