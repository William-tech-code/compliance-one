import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import Database from 'better-sqlite3';
import {initializeAssessmentStore,createAssessmentCycle,saveAssessmentAnswer} from '../server/v51AssessmentStore.js';
import {initializeCorrectiveActions,createCorrectiveAction} from '../server/v51CorrectiveActions.js';
import {initializeAssessmentEvidenceReviews,submitAssessmentEvidence,reviewAssessmentEvidence} from '../server/v51AssessmentEvidenceReviews.js';
import {getV51ExecutiveMetrics} from '../server/v51ExecutiveMetrics.js';

test('executive metrics use only independently approved intact evidence in same tenant',()=>{
  const db=new Database(':memory:');
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'v51-exec-'));
  try{
    initializeAssessmentStore(db);
    initializeCorrectiveActions(db);
    db.exec('CREATE TABLE evidence_files(id TEXT PRIMARY KEY,company_id TEXT,action_id TEXT,sha256 TEXT,size INTEGER,stored_path TEXT)');
    initializeAssessmentEvidenceReviews(db);
    const companyId='company-a';
    const cycle=createAssessmentCycle(db,{companyId,userId:'author',title:'Compliance 2026'});
    saveAssessmentAnswer(db,{companyId,cycleId:cycle.id,controlId:'governance:1',answer:'yes',userId:'author'});
    const dir=path.join(root,crypto.createHash('sha256').update(companyId).digest('hex'));
    fs.mkdirSync(dir);
    const file=path.join(dir,'document');
    const bytes=Buffer.from('original audit evidence');
    fs.writeFileSync(file,bytes);
    db.prepare('INSERT INTO evidence_files VALUES(?,?,?,?,?,?)').run(
      'evidence-1',companyId,'action-1','sha256:'+crypto.createHash('sha256').update(bytes).digest('hex'),bytes.length,file);
    const base={companyId,cycleId:cycle.id,evidenceRoot:root};
    const initial=getV51ExecutiveMetrics(db,base);
    assert.equal(initial.assessment.totals.documented,0);
    assert.equal(initial.assessment.maturityByControl[0].maturity,1);
    assert.equal(initial.provisional,true);
    submitAssessmentEvidence(db,{...base,controlId:'governance:1',evidenceId:'evidence-1',userId:'author'});
    const pending=getV51ExecutiveMetrics(db,base);
    assert.equal(pending.evidence.pending,1);
    assert.equal(pending.assessment.totals.documented,0);
    reviewAssessmentEvidence(db,{...base,controlId:'governance:1',evidenceId:'evidence-1',
      reviewerId:'auditor',decision:'approved',note:'Checked'});
    const approved=getV51ExecutiveMetrics(db,base);
    assert.equal(approved.evidence.approvedAndIntact,1);
    assert.equal(approved.assessment.totals.documented,1);
    assert.equal(approved.assessment.maturityByControl[0].maturity,2);
    assert.equal(approved.assessment.totals.testedAndPassed,0);
    createCorrectiveAction(db,{companyId,cycleId:cycle.id,controlId:'governance:1',
      description:'Close gap',owner:'Owner',dueDate:'2020-01-01',userId:'author'});
    assert.equal(getV51ExecutiveMetrics(db,{...base,today:'2026-11-16'}).correctiveActions.overdue,1);
    fs.writeFileSync(file,'tampered');
    const invalid=getV51ExecutiveMetrics(db,base);
    assert.equal(invalid.evidence.approvedAndIntact,0);
    assert.equal(invalid.evidence.approvedButInvalid,1);
    assert.equal(invalid.assessment.totals.documented,0);
    assert.throws(()=>getV51ExecutiveMetrics(db,{...base,companyId:'other'}),/CYCLE_NOT_FOUND/);
  }finally{db.close();fs.rmSync(root,{recursive:true,force:true});}
});
