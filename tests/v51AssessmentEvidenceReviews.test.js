import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import Database from 'better-sqlite3';
import { initializeAssessmentStore, createAssessmentCycle, saveAssessmentAnswer,
  closeAssessmentCycle } from '../server/v51AssessmentStore.js';
import { initializeAssessmentEvidenceReviews, submitAssessmentEvidence,
  reviewAssessmentEvidence } from '../server/v51AssessmentEvidenceReviews.js';

test('evidence submission and independent review require valid tenant-owned original', () => {
  const db = new Database(':memory:');
  const root = fs.mkdtempSync(path.join(os.tmpdir(),'v51-review-'));
  try {
    initializeAssessmentStore(db);
    db.exec(`CREATE TABLE evidence_files (
      id TEXT PRIMARY KEY,company_id TEXT,action_id TEXT,sha256 TEXT,
      size INTEGER,stored_path TEXT)`);
    initializeAssessmentEvidenceReviews(db);
    initializeAssessmentEvidenceReviews(db);
    const companyId = 'a';
    const cycle = createAssessmentCycle(db,{companyId,userId:'author',title:'Annual'});
    const tenantDir = path.join(root,crypto.createHash('sha256').update(companyId).digest('hex'));
    fs.mkdirSync(tenantDir);
    const original = path.join(tenantDir,'doc-1');
    const bytes = Buffer.from('authentic original');
    fs.writeFileSync(original,bytes);
    db.prepare('INSERT INTO evidence_files VALUES(?,?,?,?,?,?)').run(
      'doc-1',companyId,'action-1',
      'sha256:'+crypto.createHash('sha256').update(bytes).digest('hex'),bytes.length,original);
    const args = {companyId,cycleId:cycle.id,controlId:'governance:1',
      evidenceId:'doc-1',userId:'author',evidenceRoot:root};
    assert.throws(()=>submitAssessmentEvidence(db,args),/CONTROL_NOT_ASSESSED/);
    saveAssessmentAnswer(db,{companyId,cycleId:cycle.id,controlId:'governance:1',
      answer:'yes',userId:'author'});
    assert.throws(()=>submitAssessmentEvidence(db,{...args,companyId:'b'}),/CYCLE_NOT_FOUND/);
    assert.equal(submitAssessmentEvidence(db,args).status,'pending');
    const review = {companyId,cycleId:cycle.id,controlId:'governance:1',
      evidenceId:'doc-1',reviewerId:'author',decision:'approved',note:'Reviewed',evidenceRoot:root};
    assert.throws(()=>reviewAssessmentEvidence(db,review),/INDEPENDENT_REVIEW_REQUIRED/);
    fs.writeFileSync(original,'tampered');
    assert.throws(()=>reviewAssessmentEvidence(db,{...review,reviewerId:'reviewer'}),
      /EVIDENCE_INTEGRITY_NOT_VERIFIED/);
    fs.writeFileSync(original,bytes);
    assert.equal(reviewAssessmentEvidence(db,{...review,reviewerId:'reviewer'}).status,'approved');
    assert.throws(()=>reviewAssessmentEvidence(db,{...review,reviewerId:'reviewer'}),
      /EVIDENCE_ALREADY_REVIEWED/);
    closeAssessmentCycle(db,{companyId,cycleId:cycle.id});
    assert.throws(()=>submitAssessmentEvidence(db,{...args,evidenceId:'other'}),/CYCLE_CLOSED/);
  } finally { db.close(); fs.rmSync(root,{recursive:true,force:true}); }
});
