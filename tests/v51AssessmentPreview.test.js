import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { configureAssessmentPreview } from '../server/v51AssessmentPreview.js';

async function withServer({ role = 'Auditoria', rows = [] } = {}, fn) {
  const app = express();
  const db = { prepare(sql) {
    assert.match(sql, /company_id=\?/);
    return { all(tenant, type) {
      assert.equal(tenant, 'tenant-a');
      assert.equal(type, 'v51_assessment_control');
      return rows;
    } };
  } };
  const authenticate = (req, res, next) => {
    if (req.get('authorization') !== 'Bearer fictional-valid-token')
      return res.status(401).json({ error: 'AUTH_REQUIRED' });
    req.user = { companyId: 'tenant-a', role };
    next();
  };
  const requirePermission = permission => (req, res, next) =>
    role === 'Equipe de Apuração' ? res.status(403).json({ error: 'FORBIDDEN' }) : next();
  configureAssessmentPreview({ app, db, authenticate, requirePermission });
  const server = app.listen(0, '127.0.0.1');
  try {
    const url = 'http://127.0.0.1:' + server.address().port + '/api/v51/assessment/preview';
    await fn(url);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

test('anonymous requests cannot read assessment preview', async () => {
  await withServer({}, async url => {
    const res = await fetch(url);
    assert.equal(res.status, 401);
  });
});

test('role without record read cannot access assessment preview', async () => {
  await withServer({ role: 'Equipe de Apuração' }, async url => {
    const res = await fetch(url, { headers: { authorization: 'Bearer fictional-valid-token' } });
    assert.equal(res.status, 403);
  });
});

test('self-reported evidence and verification claims never elevate maturity', async () => {
  await withServer({ rows: [{
    id: 'record-1', version: 1,
    payload: JSON.stringify({ declaredAnswer: 'yes', tenantId: 'tenant-b',
      evidence: [{ reviewStatus: 'approved' }], implementationReviewed: true,
      test: { result: 'passed' }, monitoring: { reviewed: true } })
  }] }, async url => {
    const res = await fetch(url, { headers: { authorization: 'Bearer fictional-valid-token' } });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.provisional, true);
    assert.equal(data.verifiedEvidenceIntegrated, false);
    assert.equal(data.controls[0].maturity, 1);
    assert.equal(data.totals.testedAndPassed, 0);
    assert.equal(data.tenantId, 'tenant-a');
  });
});

test('malformed stored payload fails closed', async () => {
  await withServer({ rows: [{ id: 'record-1', payload: '{broken' }] }, async url => {
    const res = await fetch(url, { headers: { authorization: 'Bearer fictional-valid-token' } });
    assert.equal(res.status, 422);
  });
});
