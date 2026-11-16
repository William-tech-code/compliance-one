import { verifyEvidenceFile, isEvidencePathInsideTenant } from './evidenceIntegrity.js';

// Evidence uploaded for a legacy workspace action is not automatically approved
// for an assessment. This function verifies the original bytes and tenant boundary.
export function verifyAssessmentEvidenceCandidate(db, {
  companyId, evidenceId, evidenceRoot
}) {
  if (!companyId || typeof evidenceId !== 'string' || !evidenceId ||
      typeof evidenceRoot !== 'string' || !evidenceRoot) return {
    verified: false, reason: 'INVALID_REFERENCE'
  };
  const row = db.prepare(`SELECT id,company_id,action_id,sha256,size,stored_path
    FROM evidence_files WHERE company_id=? AND id=?`).get(companyId,evidenceId);
  if (!row) return { verified: false, reason: 'EVIDENCE_NOT_FOUND' };
  if (!isEvidencePathInsideTenant(row.stored_path,evidenceRoot,companyId))
    return { verified: false, reason: 'EVIDENCE_PATH_INVALID' };
  if (!verifyEvidenceFile(row.stored_path,row.sha256,row.size))
    return { verified: false, reason: 'EVIDENCE_INTEGRITY_FAILED' };
  return { verified: true, evidenceId: row.id, actionId: row.action_id,
    integrityChecked: true, independentlyApproved: false,
    eligibleForMaturityUpgrade: false };
}
