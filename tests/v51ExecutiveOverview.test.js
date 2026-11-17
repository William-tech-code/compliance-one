import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import {initializeAssessmentStore,createAssessmentCycle,saveAssessmentAnswer,closeAssessmentCycle} from '../server/v51AssessmentStore.js';
import {initializeCorrectiveActions,createCorrectiveAction} from '../server/v51CorrectiveActions.js';
import {initializeAssessmentEvidenceReviews} from '../server/v51AssessmentEvidenceReviews.js';
import {getV51ExecutiveOverview} from '../server/v51ExecutiveOverview.js';

test('executive alerts and history are scoped to tenant and never invent trend',()=>{
 const db=new Database(':memory:'),root=fs.mkdtempSync(path.join(os.tmpdir(),'v51-overview-'));
 try{
  initializeAssessmentStore(db);initializeCorrectiveActions(db);
  db.exec('CREATE TABLE evidence_files(id TEXT PRIMARY KEY,company_id TEXT,action_id TEXT,sha256 TEXT,size INTEGER,stored_path TEXT)');
  initializeAssessmentEvidenceReviews(db);
  const empty=getV51ExecutiveOverview(db,{companyId:'tenant-a',evidenceRoot:root});
  assert.equal(empty.cycles,0);
  assert.equal(empty.trend.coverageChangePoints,null);
  const a=createAssessmentCycle(db,{companyId:'tenant-a',userId:'u',title:'Cycle A'});
  saveAssessmentAnswer(db,{companyId:'tenant-a',cycleId:a.id,controlId:'control1',answer:'yes',userId:'u'});
  createCorrectiveAction(db,{companyId:'tenant-a',cycleId:a.id,controlId:'control1',description:'Fix',owner:'u',dueDate:'2020-01-01',userId:'u'});
  const other=createAssessmentCycle(db,{companyId:'tenant-b',userId:'u',title:'Private'});
  closeAssessmentCycle(db,{companyId:'tenant-b',cycleId:other.id});
  const active=getV51ExecutiveOverview(db,{companyId:'tenant-a',evidenceRoot:root,today:'2026-11-16'});
  assert.equal(active.cycles,1);
  assert.equal(active.history.length,0);
  assert.equal(active.alerts.find(a=>a.code==='OVERDUE_ACTIONS').count,1);
  assert.equal(active.trend.coverageChangePoints,null);
  closeAssessmentCycle(db,{companyId:'tenant-a',cycleId:a.id});
  const second=createAssessmentCycle(db,{companyId:'tenant-a',userId:'u',title:'Cycle B'});
  saveAssessmentAnswer(db,{companyId:'tenant-a',cycleId:second.id,controlId:'control1',answer:'no',userId:'u'});
  closeAssessmentCycle(db,{companyId:'tenant-a',cycleId:second.id});
  const historical=getV51ExecutiveOverview(db,{companyId:'tenant-a',evidenceRoot:root});
  assert.equal(historical.history.length,2);
  assert.equal(historical.trend.coverageChangePoints,0);
  assert.equal(historical.history.some(h=>h.title==='Private'),false);
 }finally{db.close();fs.rmSync(root,{recursive:true,force:true});}
});
