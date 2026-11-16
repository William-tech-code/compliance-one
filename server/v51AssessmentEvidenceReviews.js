import { verifyAssessmentEvidenceCandidate } from './v51EvidenceCandidate.js';

export function initializeAssessmentEvidenceReviews(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS v51_assessment_evidence_reviews (
      company_id TEXT NOT NULL,
      cycle_id TEXT NOT NULL,
      control_id TEXT NOT NULL,
      evidence_id TEXT NOT NULL,
      submitted_by TEXT NOT NULL,
      reviewer_id TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
      review_note TEXT,
      created_at TEXT NOT NULL,
      reviewed_at TEXT,
      PRIMARY KEY(company_id,cycle_id,control_id,evidence_id),
      FOREIGN KEY(company_id,cycle_id) REFERENCES v51_assessment_cycles(company_id,id)
    );
    CREATE INDEX IF NOT EXISTS idx_v51_assessment_evidence_reviews
      ON v51_assessment_evidence_reviews(company_id,cycle_id,status);
  `);
}

export function submitAssessmentEvidence(db, {
  companyId, cycleId, controlId, evidenceId, userId, evidenceRoot
}) {
  if (!companyId || !cycleId || !userId || !evidenceId ||
      typeof controlId !== 'string' || !/^[a-zA-Z0-9_:.-]{1,120}$/.test(controlId))
    throw new Error('INVALID_EVIDENCE_REVIEW');
  return db.transaction(() => {
    const cycle = db.prepare(`SELECT status FROM v51_assessment_cycles
      WHERE company_id=? AND id=?`).get(companyId,cycleId);
    if (!cycle) throw new Error('CYCLE_NOT_FOUND');
    if (cycle.status !== 'draft') throw new Error('CYCLE_CLOSED');
    const answer = db.prepare(`SELECT control_id FROM v51_assessment_answers
      WHERE company_id=? AND cycle_id=? AND control_id=?`)
      .get(companyId,cycleId,controlId);
    if (!answer) throw new Error('CONTROL_NOT_ASSESSED');
    const check = verifyAssessmentEvidenceCandidate(db, {
      companyId,evidenceId,evidenceRoot
    });
    if (!check.verified) throw new Error('EVIDENCE_INTEGRITY_NOT_VERIFIED');
    db.prepare(`INSERT INTO v51_assessment_evidence_reviews
      (company_id,cycle_id,control_id,evidence_id,submitted_by,created_at)
      VALUES (?,?,?,?,?,?)`)
      .run(companyId,cycleId,controlId,evidenceId,userId,new Date().toISOString());
    return { cycleId,controlId,evidenceId,status:'pending' };
  })();
}

export function reviewAssessmentEvidence(db, {
  companyId,cycleId,controlId,evidenceId,reviewerId,decision,note,evidenceRoot
}) {
  if (!companyId || !reviewerId || !['approved','rejected'].includes(decision) ||
      typeof note !== 'string' || note.length > 2000)
    throw new Error('INVALID_EVIDENCE_REVIEW');
  return db.transaction(() => {
    const cycle = db.prepare(`SELECT status FROM v51_assessment_cycles
      WHERE company_id=? AND id=?`).get(companyId,cycleId);
    if (!cycle) throw new Error('CYCLE_NOT_FOUND');
    if (cycle.status !== 'draft') throw new Error('CYCLE_CLOSED');
    const submission = db.prepare(`SELECT submitted_by,status FROM v51_assessment_evidence_reviews
      WHERE company_id=? AND cycle_id=? AND control_id=? AND evidence_id=?`)
      .get(companyId,cycleId,controlId,evidenceId);
    if (!submission) throw new Error('EVIDENCE_REVIEW_NOT_FOUND');
    if (submission.status !== 'pending') throw new Error('EVIDENCE_ALREADY_REVIEWED');
    if (submission.submitted_by === reviewerId) throw new Error('INDEPENDENT_REVIEW_REQUIRED');
    if (decision === 'approved') {
      const check = verifyAssessmentEvidenceCandidate(db,{
        companyId,evidenceId,evidenceRoot
      });
      if (!check.verified) throw new Error('EVIDENCE_INTEGRITY_NOT_VERIFIED');
    }
    db.prepare(`UPDATE v51_assessment_evidence_reviews
      SET status=?,reviewer_id=?,review_note=?,reviewed_at=?
      WHERE company_id=? AND cycle_id=? AND control_id=? AND evidence_id=? AND status='pending'`)
      .run(decision,reviewerId,note,new Date().toISOString(),
        companyId,cycleId,controlId,evidenceId);
    return { cycleId,controlId,evidenceId,status:decision,
      independentlyReviewed:true,legalCertification:false };
  })();
}
