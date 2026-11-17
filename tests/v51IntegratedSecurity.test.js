import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {configureAssessmentCycles} from '../server/v51AssessmentCyclesApi.js';
import {configureCorrectiveActions} from '../server/v51CorrectiveActionsApi.js';
import {configureV51ExecutiveMetrics} from '../server/v51ExecutiveMetricsApi.js';
import {initializeCorrectiveActions} from '../server/v51CorrectiveActions.js';
import {initializeAssessmentEvidenceReviews} from '../server/v51AssessmentEvidenceReviews.js';

test('V51 integrated HTTP flow enforces authentication, RBAC, tenant isolation and persistent cycle history',async()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'v51-integrated-'));
 const dbPath=path.join(tmp,'staging.sqlite');
 const evidenceRoot=path.join(tmp,'evidence');
 fs.mkdirSync(evidenceRoot);
 const db=new Database(dbPath);
 db.pragma('foreign_keys = ON');
 const app=express();app.use(express.json());
 const authenticate=(req,res,next)=>{
  const auth=req.get('authorization');
  if(!auth)return res.status(401).json({error:'AUTH_REQUIRED'});
  const role=auth==='Bearer denied'?'denied':'Compliance';
  req.user={companyId:auth==='Bearer tenant-b'?'tenant-b':'tenant-a',sub:'tester',role};
  next();
 };
 const requirePermission=()=>(req,res,next)=>req.user.role==='denied'
  ?res.status(403).json({error:'FORBIDDEN'}):next();
 const audit=()=>{};
 configureAssessmentCycles({app,db,authenticate,requirePermission,audit});
 configureCorrectiveActions({app,db,authenticate,requirePermission,audit});
 db.exec('CREATE TABLE evidence_files(id TEXT PRIMARY KEY,company_id TEXT,action_id TEXT,sha256 TEXT,size INTEGER,stored_path TEXT)');
 initializeAssessmentEvidenceReviews(db);
 configureV51ExecutiveMetrics({app,db,authenticate,requirePermission,evidenceRoot});
 const server=await new Promise(resolve=>{
  const listener=app.listen(0,'127.0.0.1',()=>resolve(listener));
 });
 const base='http://127.0.0.1:'+server.address().port;
 const call=async(route,method='GET',body,token='tenant-a')=>{
  const response=await fetch(base+route,{method,
   headers:{authorization:'Bearer '+token,'content-type':'application/json'},
   ...(body===undefined?{}:{body:JSON.stringify(body)})});
  return {status:response.status,data:await response.json()};
 };
 try{
  const root='/api/v51/assessment/cycles';
  assert.equal((await fetch(base+root)).status,401);
  assert.equal((await call(root,'GET',undefined,'denied')).status,403);
  const created=await call(root,'POST',{title:'Annual tenant A'});
  assert.equal(created.status,201);
  const id=created.data.id;
  assert.equal((await call(root)).data.cycles.length,1);
  assert.equal((await call(root,'GET',undefined,'tenant-b')).data.cycles.length,0);
  assert.equal((await call(root+'/'+id,'GET',undefined,'tenant-b')).status,404);
  assert.equal((await call(root+'/'+id+'/executive','GET',undefined,'tenant-b')).status,404);
  const overview='/api/v51/assessment/executive/overview';
  assert.equal((await call(overview,'GET',undefined,'tenant-b')).data.cycles,0);
  assert.equal((await call(overview,'GET',undefined,'denied')).status,403);
  assert.equal((await fetch(base+overview)).status,401);
  const answer=await call(root+'/'+id+'/answers/ethics:1','PUT',{answer:'yes'});
  assert.equal(answer.status,200);
  const action=await call(root+'/'+id+'/actions','POST',{
   controlId:'ethics:1',description:'Review controls',owner:'Audit',dueDate:'2020-01-01'});
  assert.equal(action.status,201);
  const report=await call(root+'/'+id+'/executive');
  assert.equal(report.status,200);
  assert.equal(report.data.assessment.totals.assessed,1);
  assert.equal(report.data.correctiveActions.overdue,1);
  assert.equal(report.data.legalCertification,false);
  const alerts=await call(overview);
  assert.equal(alerts.status,200);
  assert.equal(alerts.data.alerts.some(a=>a.code==='OVERDUE_ACTIONS'),true);
  assert.equal((await call(root+'/'+id+'/close','POST')).status,200);
  assert.equal((await call(root+'/'+id+'/answers/ethics:1','PUT',{answer:'no'})).status,409);
  assert.equal((await call(root+'/'+id+'/actions','POST',{
   controlId:'ethics:1',description:'Invalid',owner:'Audit',dueDate:'2026-12-01'})).status,409);
  assert.equal((await call(overview)).data.history.length,1);
  assert.equal((await call(overview)).data.trend.coverageChangePoints,null);
  assert.equal((await call(root,'GET',undefined,'tenant-b')).data.cycles.length,0);
 }finally{
  await new Promise(resolve=>server.close(resolve));
  db.close();
 }
 const reopened=new Database(dbPath);
 try{
  const cycles=reopened.prepare('SELECT COUNT(*) AS n FROM v51_assessment_cycles WHERE company_id=?').get('tenant-a');
  const answers=reopened.prepare('SELECT COUNT(*) AS n FROM v51_assessment_answers WHERE company_id=?').get('tenant-a');
  assert.equal(cycles.n,1);assert.equal(answers.n,1);
 }finally{reopened.close();fs.rmSync(tmp,{recursive:true,force:true});}
});
