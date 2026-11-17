import test from 'node:test';
import assert from 'node:assert/strict';
import { assessControl, summarizeAssessment } from '../server/v51AssessmentEngine.js';

const tenantId = 'fictional-tenant-a';
const now = Date.parse('2026-11-16T12:00:00Z');
const checksum = 'a'.repeat(64);
const base = () => ({ tenantId, controlId: 'ctrl-001', declaredAnswer: 'yes' });
const evidence = () => ({ tenantId, privateDocumentId: 'doc-001', checksum,
  reviewStatus: 'approved', expiresAt: '2027-01-01T00:00:00Z' });

test('800 affirmative answers without evidence cannot claim verification', () => {
  const controls = Array.from({ length: 800 }, (_, i) => ({
    ...base(), controlId: 'ctrl-' + i
  }));
  const summary = summarizeAssessment(controls, { tenantId, now });
  assert.equal(summary.totals.applicable, 800);
  assert.equal(summary.totals.testedAndPassed, 0);
  assert.equal(summary.verifiedPercent, 0);
  assert.equal(summary.evidencePercent, 0);
  assert.equal(summary.indicatorsAreLegalCertification, false);
  assert.ok(summary.controls.every(c => c.maturity === 1));
});

test('approved valid evidence raises only to documented level', () => {
  const result = assessControl({ ...base(), evidence: [evidence()] }, { tenantId, now });
  assert.equal(result.maturity, 2);
  assert.equal(result.status, 'evidence_under_review');
});

test('expired, unreviewed, invalid hash and cross-tenant evidence never count', () => {
  const bad = [
    { ...evidence(), expiresAt: '2025-01-01T00:00:00Z' },
    { ...evidence(), reviewStatus: 'pending' },
    { ...evidence(), checksum: 'invalid' },
    { ...evidence(), tenantId: 'fictional-tenant-b' }
  ];
  for (const e of bad) assert.equal(assessControl({
    ...base(), evidence: [e], implementationReviewed: true
  }, { tenantId, now }).maturity, 1);
});

test('implementation, independent test and monitoring are separate gates', () => {
  const input = { ...base(), evidence: [evidence()], implementationReviewed: true };
  assert.equal(assessControl(input, { tenantId, now }).maturity, 3);
  input.test = { tenantId, result: 'passed', ownerId: 'alice', reviewerId: 'alice' };
  assert.equal(assessControl(input, { tenantId, now }).maturity, 3);
  input.test.reviewerId = 'bob';
  assert.equal(assessControl(input, { tenantId, now }).maturity, 4);
  input.monitoring = { tenantId, reviewed: true, hasHistory: true };
  assert.equal(assessControl(input, { tenantId, now }).maturity, 5);
});

test('not applicable needs reason and independent review', () => {
  const input = { ...base(), applicability: 'not_applicable',
    applicabilityReason: 'Not part of fictional business scope',
    applicabilityRequestedBy: 'alice' };
  assert.equal(assessControl(input, { tenantId, now }).applicability, 'undetermined');
  input.applicabilityReviewedBy = 'bob';
  const summary = summarizeAssessment([input], { tenantId, now });
  assert.equal(summary.totals.excludedWithReview, 1);
  assert.equal(summary.coveragePercent, null);
});

test('unanswered remains unknown, negative is a gap, and denominators remain visible', () => {
  const summary = summarizeAssessment([
    { ...base(), declaredAnswer: undefined },
    { ...base(), controlId: 'ctrl-002', declaredAnswer: 'no' }
  ], { tenantId, now });
  assert.equal(summary.totals.assessed, 1);
  assert.equal(summary.coveragePercent, 50);
  assert.equal(summary.evidencePercent, 0);
});

test('rejects tenant mixing and duplicate control IDs', () => {
  assert.throws(() => assessControl({ ...base(), tenantId: 'fictional-tenant-b' },
    { tenantId, now }), /TENANT_MISMATCH/);
  assert.throws(() => summarizeAssessment([base(), base()], { tenantId, now }), /DUPLICATE_CONTROL/);
});
