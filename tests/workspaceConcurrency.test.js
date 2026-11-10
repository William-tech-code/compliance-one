import test from "node:test";
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {mkdtempSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {setTimeout as delay} from "node:timers/promises";

test("two sessions cannot overwrite a newer workspace version", {timeout:30000},async()=>{
 const dir=mkdtempSync(join(tmpdir(),"compliance-concurrency-"));
 const port=20000+Math.floor(Math.random()*20000);
 const base="http://127.0.0.1:"+port+"/api";
 const secret="integration-test-bootstrap-secret";
 const child=spawn(process.execPath,["server/index.js"],{env:{...process.env,PORT:String(port),DATABASE_PATH:join(dir,"test.sqlite"),JWT_SECRET:"test-only-secret-with-at-least-32-characters",BOOTSTRAP_SECRET:secret,NODE_ENV:"test"},stdio:["ignore","pipe","pipe"]});
 let logs="";
 child.stderr.on("data",chunk=>{logs+=chunk.toString()});
 const call=async(path,method="GET",body,token,version,extra={})=>{
  const res=await fetch(base+path,{method,headers:{"content-type":"application/json",...(token?{authorization:"Bearer "+token}:{}),...(version!==undefined?{"x-record-version":String(version)}:{}),...extra},...(body!==undefined?{body:JSON.stringify(body)}:{})});
  return {status:res.status,data:await res.json()};
 };
 try{
  let ready=false;
  for(let i=0;i<80;i++){
   if(child.exitCode!==null)throw new Error("Server exited: "+logs);
   try{const r=await call("/health");if(r.status===200){ready=true;break}}catch{}
   await delay(100);
  }
  assert.ok(ready,"Server did not start: "+logs);
  const init=await call("/bootstrap","POST",{companyName:"Empresa Teste",adminName:"Auditor",email:"auditor@example.test",password:"TestPass12345"} ,undefined,undefined,{"x-bootstrap-secret":secret});
  assert.equal(init.status,201,JSON.stringify(init.data));
  const token=init.data.token;
  const created=await call("/records/workspace","POST",{answers:{A:"Não"}},token);
  assert.equal(created.status,201);
  const id=created.data.id;
  const sessionA=await call("/records/workspace","GET",undefined,token);
  const sessionB=await call("/records/workspace","GET",undefined,token);
  assert.equal(sessionA.data.records[0].version,1);
  assert.equal(sessionB.data.records[0].version,1);
  const first=await call("/records/"+id,"PUT",{answers:{A:"Sim"}},token,1);
  assert.equal(first.status,200,JSON.stringify(first.data));
  assert.equal(first.data.version,2);
  const stale=await call("/records/"+id,"PUT",{answers:{A:"Parcialmente"}},token,1);
  assert.equal(stale.status,409);
  assert.equal(stale.data.error,"VERSION_CONFLICT");
  const missing=await call("/records/"+id,"PUT",{answers:{A:"Não"}},token);
  assert.equal(missing.status,428);
  const current=await call("/records/workspace","GET",undefined,token);
  assert.equal(current.data.records[0].version,2);
  assert.equal(current.data.records[0].payload.answers.A,"Sim");
  const history=await call("/records/"+id+"/versions","GET",undefined,token);
  assert.equal(history.status,200);
  assert.deepEqual(history.data.versions.map(v=>v.version),[2,1]);
  const old=await call("/records/"+id+"/versions/1","GET",undefined,token);
  assert.equal(old.status,200);
  assert.equal(old.data.payload.answers.A,"Não");
  const newest=await call("/records/"+id+"/versions/2","GET",undefined,token);
  assert.equal(newest.data.payload.answers.A,"Sim");
  const rejectedHistory=await call("/records/"+id+"/versions/3","GET",undefined,token);
  assert.equal(rejectedHistory.status,404);
  // Restoring an old snapshot must append version 3, never rewrite history.
  const restored=await call("/records/"+id,"PUT",old.data.payload,token,2);
  assert.equal(restored.status,200);
  assert.equal(restored.data.version,3);
  const afterRestore=await call("/records/workspace","GET",undefined,token);
  assert.equal(afterRestore.data.records[0].payload.answers.A,"Não");
  assert.equal(afterRestore.data.records[0].version,3);
  const preserved=await call("/records/"+id+"/versions/2","GET",undefined,token);
  assert.equal(preserved.data.payload.answers.A,"Sim");
  const latestHistory=await call("/records/"+id+"/versions","GET",undefined,token);
  assert.deepEqual(latestHistory.data.versions.map(v=>v.version),[3,2,1]);
 }finally{
  child.kill("SIGTERM");
  rmSync(dir,{recursive:true,force:true});
 }
});
