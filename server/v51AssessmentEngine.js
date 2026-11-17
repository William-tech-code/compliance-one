/**
 * V51 enterprise assessment domain engine.
 * Pure functions; no database, HTTP endpoint, or UI integration in this module.
 * Scores are operational evidence indicators, NOT legal compliance certifications.
 */
const levels = Object.freeze({
  NOT_EVALUATED: 0, DECLARED: 1, DOCUMENTED: 2,
  IMPLEMENTED: 3, TESTED: 4, MONITORED: 5
});

const own = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
const validEvidence = (e, tenantId, now) =>
  e && e.tenantId === tenantId && e.reviewStatus === 'approved' &&
  e.privateDocumentId && typeof e.checksum === 'string' &&
  /^[a-f0-9]{64}$/i.test(e.checksum) &&
  (!e.expiresAt || Number.isFinite(Date.parse(e.expiresAt)) && Date.parse(e.expiresAt) >= now);

export function assessControl(control, { tenantId, now = Date.now() } = {}) {
  if (!tenantId || typeof tenantId !== 'string') throw new Error('TENANT_REQUIRED');
  if (!control || control.tenantId !== tenantId) throw new Error('TENANT_MISMATCH');
  if (!control.controlId) throw new Error('CONTROL_ID_REQUIRED');
  const applicability = control.applicability || 'applicable';
  if (!['applicable', 'not_applicable', 'undetermined'].includes(applicability))
    throw new Error('INVALID_APPLICABILITY');
  if (applicability === 'not_applicable') {
    const approved = Boolean(control.applicabilityReason?.trim() && control.applicabilityReviewedBy &&
      control.applicabilityReviewedBy !== control.applicabilityRequestedBy);
    return { controlId: control.controlId, applicability: approved ? 'not_applicable' : 'undetermined',
      maturity: 0, evidenceVerified: false, testPassed: false, monitoringVerified: false,
      status: approved ? 'excluded_with_review' : 'needs_applicability_review' };
  }
  if (applicability === 'undetermined') return {
    controlId: control.controlId, applicability, maturity: 0, evidenceVerified: false,
    testPassed: false, monitoringVerified: false, status: 'needs_applicability_review'
  };
  if (control.declaredAnswer !== 'yes') return {
    controlId: control.controlId, applicability, maturity: 0, evidenceVerified: false,
    testPassed: false, monitoringVerified: false,
    status: control.declaredAnswer === 'no' ? 'gap_declared' : 'not_evaluated'
  };
  const evidenceVerified = (control.evidence || []).some(e => validEvidence(e, tenantId, now));
  const implemented = evidenceVerified && control.implementationReviewed === true;
  const testPassed = implemented && control.test?.result === 'passed' &&
    control.test?.tenantId === tenantId && control.test?.reviewerId &&
    control.test.reviewerId !== control.test.ownerId;
  const monitoringVerified = testPassed && control.monitoring?.tenantId === tenantId &&
    control.monitoring?.reviewed === true && control.monitoring?.hasHistory === true;
  const maturity = monitoringVerified ? 5 : testPassed ? 4 : implemented ? 3 : evidenceVerified ? 2 : 1;
  return { controlId: control.controlId, applicability, maturity, evidenceVerified,
    testPassed: Boolean(testPassed), monitoringVerified: Boolean(monitoringVerified),
    status: maturity >= 4 ? 'verified' : evidenceVerified ? 'evidence_under_review' : 'awaiting_evidence' };
}

export function summarizeAssessment(controls, { tenantId, now = Date.now() } = {}) {
  if (!Array.isArray(controls)) throw new Error('CONTROLS_REQUIRED');
  if (!tenantId) throw new Error('TENANT_REQUIRED');
  const seen = new Set();
  const results = controls.map(c => {
    if (seen.has(c.controlId)) throw new Error('DUPLICATE_CONTROL');
    seen.add(c.controlId);
    return assessControl(c, { tenantId, now });
  });
  const applicable = results.filter(r => r.applicability === 'applicable');
  const excluded = results.filter(r => r.applicability === 'not_applicable');
  const unresolved = results.filter(r => r.applicability === 'undetermined');
  const assessed = applicable.filter(r => r.status !== 'not_evaluated');
  const documented = assessed.filter(r => r.evidenceVerified);
  const tested = assessed.filter(r => r.maturity >= 4);
  const percent = (n, d) => d ? Math.round(10000 * n / d) / 100 : null;
  return {
    tenantId, totals: { controls: results.length, applicable: applicable.length,
      excludedWithReview: excluded.length, unresolved: unresolved.length,
      assessed: assessed.length, documented: documented.length, testedAndPassed: tested.length },
    coveragePercent: percent(assessed.length, applicable.length),
    evidencePercent: percent(documented.length, assessed.length),
    verifiedPercent: percent(tested.length, applicable.length),
    indicatorsAreLegalCertification: false, controls: results
  };
}

export { levels as MATURITY_LEVELS };
