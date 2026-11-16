import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import Database from 'better-sqlite3';
import { configureAssessmentCycles } from '../server/v51AssessmentCyclesApi.js';

async function setup(fn) {
  const db = new Database(':memory:');
  const app = express();
  app.use(express.json());
  const authenticate = (req, res, next) => {
    const auth = req.get('authorization');
    if (!auth) return res.status(401).json({ error: 'AUTH_REQUIRED' });
    req.user = { companyId: auth === 'Bearer b' ? 'tenant-b' : 'tenant-a',
      sub: 'user-1', role: auth === 'Bearer denied' ? 'Equipe de Apuração' : 'Compliance' };
    next();
  };
  const requirePermission = () => (req, res, next) =>
    req.user.role === 'Equipe de Apuração' ? res.status(403).json({ error: 'FORBIDDEN' }) : next();
  const events = [];
  configureAssessmentCycles({ app, db, authenticate, requirePermission,
    audit: (req, event) => events.push(event) });
  const server = await new Promise(resolve => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  const url = 'http://127.0.0.1:' + server.address().port;
  const request = async (path, method = 'GET', body, token = 'a') => {
    const res = await fetch(url + path, {
      method, headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) })
    });
    return { status: res.status, data: await res.json() };
  };
  try { await fn({ request, events, url }); }
  finally { await new Promise(resolve => server.close(resolve)); db.close(); }
}

test('create, update, summarize and close assessment cycle with audit events', async () => {
  await setup(async ({ request, events }) => {
    const created = await request('/api/v51/assessment/cycles', 'POST', { title: 'Empresa A' });
    assert.equal(created.status, 201);
    const id = created.data.id;
    const path = '/api/v51/assessment/cycles/' + id;
    const saved = await request(path + '/answers/governance:1', 'PUT', { answer: 'yes' });
    assert.equal(saved.status, 200);
    const read = await request(path);
    assert.equal(read.data.summary.coveragePercent, 100);
    assert.equal(read.data.summary.verifiedPercent, 0);
    assert.equal(read.data.provisional, true);
    assert.equal((await request(path, 'GET', undefined, 'b')).status, 404);
    assert.equal((await request(path + '/answers/governance:1', 'PUT',
      { answer: 'yes' }, 'b')).status, 404);
    assert.equal((await request(path + '/close', 'POST', undefined, 'b')).status, 409);
    assert.equal((await request(path + '/close', 'POST')).status, 200);
    assert.equal((await request(path + '/answers/governance:1', 'PUT',
      { answer: 'no' })).status, 409);
    assert.deepEqual(events, ['V51_ASSESSMENT_CYCLE_CREATED',
      'V51_ASSESSMENT_ANSWER_SAVED', 'V51_ASSESSMENT_CYCLE_CLOSED']);
  });
});

test('rejects unauthorized and invalid assessment mutations', async () => {
  await setup(async ({ request, url }) => {
    const anonymous = await fetch(url + '/api/v51/assessment/cycles', { method: 'POST' });
    assert.equal(anonymous.status, 401);
    assert.equal((await request('/api/v51/assessment/cycles', 'POST',
      { title: 'Denied' }, 'denied')).status, 403);
    assert.equal((await request('/api/v51/assessment/cycles', 'POST',
      { title: '' })).status, 422);
  });
});
