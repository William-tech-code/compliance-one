import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import Database from 'better-sqlite3';
import { verifyAssessmentEvidenceCandidate } from '../server/v51EvidenceCandidate.js';

test('candidate evidence requires matching tenant, secure path and intact original', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(),'v51-evidence-'));
  const db = new Database(':memory:');
  try {
    db.exec(`CREATE TABLE evidence_files (
      id TEXT PRIMARY KEY,company_id TEXT,action_id TEXT,sha256 TEXT,
      size INTEGER,stored_path TEXT)`);
    const companyId = 'tenant-a';
    const tenantDir = path.join(root,crypto.createHash('sha256').update(companyId).digest('hex'));
    fs.mkdirSync(tenantDir);
    const file = path.join(tenantDir,'original');
    const bytes = Buffer.from('test document');
    fs.writeFileSync(file,bytes);
    const hash = 'sha256:' + crypto.createHash('sha256').update(bytes).digest('hex');
    db.prepare('INSERT INTO evidence_files VALUES(?,?,?,?,?,?)')
      .run('doc-1',companyId,'action-1',hash,bytes.length,file);
    const check = (tenant = companyId) => verifyAssessmentEvidenceCandidate(db, {
      companyId: tenant,evidenceId: 'doc-1',evidenceRoot: root
    });
    assert.equal(check().verified,true);
    assert.equal(check().independentlyApproved,false);
    assert.equal(check().eligibleForMaturityUpgrade,false);
    assert.equal(check('tenant-b').reason,'EVIDENCE_NOT_FOUND');
    fs.writeFileSync(file,Buffer.from('tampered file'));
    assert.equal(check().reason,'EVIDENCE_INTEGRITY_FAILED');
    db.prepare('UPDATE evidence_files SET stored_path=? WHERE id=?')
      .run(path.join(root,'outside'),'doc-1');
    assert.equal(check().reason,'EVIDENCE_PATH_INVALID');
  } finally {
    db.close();
    fs.rmSync(root,{recursive:true,force:true});
  }
});
