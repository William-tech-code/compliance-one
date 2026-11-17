import test from "node:test";
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {mkdtempSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {setTimeout as delay} from "node:timers/promises";
import Database from "better-sqlite3";
import jwt from "jsonwebtoken";

test("tenant isolation and workspace persistence across server restart", {timeout:45000},async()=>{
 const dir=mkdtempSync(join(tmpdir(),"compliance-tenant-"));
 const dbPath=join(dir,"workspace.sqlite");
 const port=21000+Math.floor(Math.random()*19000);
 const base="http://127.0.0.1:"+port+"/api";
 const jwtSecret="tenant-test-secret-with-at-least-32-characters";
 const secret="test-bootstrap-secret";
 let child;
 const start=async()=>{
  child=spawn(process.execPath,["server/index.js"],{env:{...process.env,PORT:String(port),DATABASE_PATH:dbPath,EVIDENCE_STORAGE_PATH:join(dir,"evidence"),JWT_SECRET:jwtSecret,BOOTSTRAP_SECRET:secret,NODE_ENV:"test"},stdio:"ignore"});
  for(let i=0;i<100;i++){
   if(child.exitCode!==null)throw Error("Server exited");
   try{const r=await fetch(base+"/health");if(r.ok)return}catch{}
   await delay(100);
  }
  throw Error("Server not ready");
 };
 const stop=async()=>{if(!child)return;const c=child;child=null;const done=new Promise(resolve=>c.once("exit",resolve));c.kill("SIGTERM");await Promise.race([done,delay(2000)]);if(c.exitCode===null)c.kill("SIGKILL")};
 const call=async(path,method="GET",body,token,version,extra={})=>{
  const r=await fetch(base+path,{method,headers:{"content-type":"application/json",...(token?{authorization:"Bearer "+token}:{}),...(version!==undefined?{"x-record-version":String(version)}:{}),...extra},...(body!==undefined?{body:JSON.stringify(body)}:{})});
  return {status:r.status,data:await r.json()};
 };
 try{
  await start();
  const init=await call("/bootstrap","POST",{companyName:"Empresa A",adminName:"Admin A",email:"a@example.test",password:"TestPassword123"},undefined,undefined,{"x-bootstrap-secret":secret});
  assert.equal(init.status,201);
  const tokenA=init.data.token;
  const created=await call("/records/workspace","POST",{answers:{Q1:"Não"},company:{name:"Empresa A"}},tokenA);
  assert.equal(created.status,201);
  const recordId=created.data.id;
  const db=new Database(dbPath);
  const companyB="tenant-b",userB="user-b";
  db.prepare("INSERT INTO companies (id,name,created_at) VALUES (?,?,?)").run(companyB,"Empresa B",new Date().toISOString());
  db.prepare("INSERT INTO users (id,company_id,name,email,password_hash,role,active,created_at) VALUES (?,?,?,?,?,?,?,?)").run(userB,companyB,"Admin B","b@example.test","unused","Administrador",1,new Date().toISOString());
  db.close();
  const tokenB=jwt.sign({sub:userB,companyId:companyB,role:"Administrador",name:"Admin B"},jwtSecret,{expiresIn:"1h"});
  const otherList=await call("/records/workspace","GET",undefined,tokenB);
  assert.equal(otherList.status,200);
  assert.equal(otherList.data.records.length,0);
  const otherUpdate=await call("/records/"+recordId,"PUT",{answers:{Q1:"Sim"}},tokenB,1);
  assert.equal(otherUpdate.status,404);
  const own=await call("/records/workspace","GET",undefined,tokenA);
  assert.equal(own.data.records.length,1);
  assert.equal(own.data.records[0].payload.answers.Q1,"Não");
  await stop();
  await start();
  const restored=await call("/records/workspace","GET",undefined,tokenA);
  assert.equal(restored.status,200);
  assert.equal(restored.data.records[0].id,recordId);
  assert.equal(restored.data.records[0].version,1);
  assert.equal(restored.data.records[0].payload.answers.Q1,"Não");
  // Existing tokens must honor current database role, not stale JWT claims.
  const roleDb=new Database(dbPath);
  roleDb.prepare("UPDATE users SET role='Colaborador' WHERE id=?").run(init.data.user.id);
  roleDb.close();
  const forbidden=await call("/records/"+recordId,"PUT",{answers:{Q1:"Sim"}},tokenA,1);
  assert.equal(forbidden.status,403);
  const restoreRoleDb=new Database(dbPath);
  restoreRoleDb.prepare("UPDATE users SET role='Administrador' WHERE id=?").run(init.data.user.id);
  restoreRoleDb.close();
  // Token remains signed but account revocation must take effect immediately.
  const revokeDb=new Database(dbPath);
  revokeDb.prepare("UPDATE users SET active=0 WHERE id=?").run(init.data.user.id);
  revokeDb.close();
  const revoked=await call("/records/workspace","GET",undefined,tokenA);
  assert.equal(revoked.status,401);
  assert.equal(revoked.data.error,"SESSION_REVOKED");
  const otherStillWorks=await call("/records/workspace","GET",undefined,tokenB);
  assert.equal(otherStillWorks.status,200);
 }finally{await stop();rmSync(dir,{recursive:true,force:true})}
});
