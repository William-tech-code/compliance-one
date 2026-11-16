import test from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import {initializeAssessmentStore,createAssessmentCycle,saveAssessmentAnswer,listAssessmentCycles} from '../server/v51AssessmentStore.js';

test('cycle selector lists only tenant cycles and counts answers',()=>{
 const db=new Database(':memory:');
 try{
  initializeAssessmentStore(db);
  const a=createAssessmentCycle(db,{companyId:'tenant-a',userId:'user-a',title:'Avaliação A'});
  createAssessmentCycle(db,{companyId:'tenant-b',userId:'user-b',title:'Segredo B'});
  saveAssessmentAnswer(db,{companyId:'tenant-a',cycleId:a.id,controlId:'control_1',answer:'yes',userId:'user-a'});
  const rows=listAssessmentCycles(db,{companyId:'tenant-a'});
  assert.equal(rows.length,1);
  assert.equal(rows[0].id,a.id);
  assert.equal(rows[0].answer_count,1);
  assert.equal(listAssessmentCycles(db,{companyId:'tenant-c'}).length,0);
  assert.throws(()=>listAssessmentCycles(db,{companyId:'tenant-a',limit:101}),/INVALID_CYCLE_LIST/);
 }finally{db.close();}
});
