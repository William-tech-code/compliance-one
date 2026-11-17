import { summarizeAssessment } from './v51AssessmentEngine.js';

/**
 * Read-only assessment preview over tenant-scoped legacy records.
 * Payloads are untrusted self-reports; no independent evidence verification is implied.
 */
export function configureAssessmentPreview({ app, db, authenticate, requirePermission }) {
  app.get('/api/v51/assessment/preview', authenticate, requirePermission('record:read'), (req, res) => {
    const tenantId = req.user.companyId;
    const rows = db.prepare(
      "SELECT id,payload,version FROM records WHERE company_id=? AND type=? ORDER BY id LIMIT 801"
    ).all(tenantId, 'v51_assessment_control');
    if (rows.length > 800) return res.status(422).json({ error: 'ASSESSMENT_LIMIT_EXCEEDED' });
    try {
      const controls = rows.map(row => {
        const payload = JSON.parse(row.payload);
        if (!payload || typeof payload !== 'object' || Array.isArray(payload))
          throw new Error('INVALID_ASSESSMENT_PAYLOAD');
        // A user-editable record is not a verified evidence repository.
        // Strip evidence/test/monitoring assertions until trusted storage is integrated.
        return {
          tenantId,
          controlId: row.id,
          declaredAnswer: ['yes','no'].includes(payload.declaredAnswer) ? payload.declaredAnswer : undefined,
          applicability: 'applicable'
        };
      });
      const summary = summarizeAssessment(controls, { tenantId });
      return res.json({
        ...summary,
        source: 'tenant_scoped_self_report_records',
        provisional: true,
        verifiedEvidenceIntegrated: false,
        legalCertification: false,
        warning: 'Dados declaratórios. Evidências, testes e exclusões N/A não são verificados nesta prévia.'
      });
    } catch {
      return res.status(422).json({ error: 'INVALID_ASSESSMENT_PAYLOAD' });
    }
  });
}
