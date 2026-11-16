import test from "node:test";
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {mkdtempSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import net from "node:net";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";

async function freePort(){
 const server=net.createServer();
 await new Promise((resolve,reject)=>server.once("error",reject).listen(0,"127.0.0.1",resolve));
 const p=server.address().port;
 await new Promise(resolve=>server.close(resolve));
 return p;
}
test("V51 upgrades legacy SQLite schema without losing tenant records", {timeout:30000},async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),"compliance-v51-upgrade-"));
 const dbPath=path.join(dir,"legacy.sqlite");
 const db=new Database(dbPath);
 const password="LegacyPassword-1234";
 const hash=await bcrypt.hash(password,4);
 let child;
 try{
  db.exec(`
   CREATE TABLE companies(id TEXT PRIMARY KEY,name TEXT NOT NULL,segment TEXT DEFAULT '',size TEXT DEFAULT '',created_at TEXT NOT NULL);
   CREATE TABLE users(id TEXT PRIMARY KEY,company_id TEXT NOT NULL,name TEXT NOT NULL,email TEXT NOT NULL UNIQUE,password_hash TEXT NOT NULL,role TEXT NOT NULL,active INTEGER DEFAULT 1,created_at TEXT NOT NULL);
   CREATE TABLE records(id TEXT PRIMARY KEY,company_id TEXT NOT NULL,type TEXT NOT NULL,payload TEXT NOT NULL,version INTEGER DEFAULT 1,created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
   CREATE TABLE audit_log(id TEXT PRIMARY KEY,company_id TEXT NOT NULL,user_id TEXT,action TEXT NOT NULL,entity TEXT,entity_id TEXT,metadata TEXT,created_at TEXT NOT NULL);
   CREATE TABLE record_versions(record_id TEXT NOT NULL,company_id TEXT NOT NULL,version INTEGER NOT NULL,payload TEXT NOT NULL,changed_by TEXT,created_at TEXT NOT NULL,PRIMARY KEY(record_id,company_id,version));
  `);
  const now=new Date().toISOString();
  db.prepare("INSERT INTO companies(id,name,created_at) VALUES(?,?,?)").run("legacy-co","Legacy Company",now);
  db.prepare("INSERT INTO users(id,company_id,name,email,password_hash,role,created_at) VALUES(?,?,?,?,?,?,?)").run("legacy-user","legacy-co","Legacy Admin","legacy@example.test",hash,"Administrador",now);
  db.prepare("INSERT INTO records(id,company_id,type,payload,created_at,updated_at) VALUES(?,?,?,?,?,?)").run("legacy-record","legacy-co","workspace",JSON.stringify({legacyMarker:"PRESERVED"}),now,now);
  db.close();
  const p=await freePort(),base="http://127.0.0.1:"+p;
  child=spawn(process.execPath,["server/index.js"],{cwd:process.cwd(),stdio:["ignore","pipe","pipe"],env:{...process.env,NODE_ENV:"test",PORT:String(p),DATABASE_PATH:dbPath,EVIDENCE_STORAGE_PATH:path.join(dir,"evidence"),JWT_SECRET:"v51-legacy-migration-test-secret-at-least-32",ASAAS_API_KEY:"",RESEND_API_KEY:""}});
  let err="";
  child.stderr.on("data",buf=>{err+=String(buf).slice(-2000)});
  let ready=false;
  for(let i=0;i<100;i++){
   if(child.exitCode!==null)throw Error("API exited: "+err);
   try{if((await fetch(base+"/api/health",{signal:AbortSignal.timeout(500)})).ok){ready=true;break}}catch{}
   await new Promise(resolve=>setTimeout(resolve,100));
  }
  assert.equal(ready,true,"API failed to start: "+err);
  const login=await fetch(base+"/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:"legacy@example.test",password})});
  const loginBody=await login.json();
  assert.equal(login.status,200,JSON.stringify(loginBody));
  assert.ok(loginBody.token);
  const records=await fetch(base+"/api/records/workspace",{headers:{Authorization:"Bearer "+loginBody.token}});
  assert.equal(records.status,200);
  const data=await records.json();
  assert.equal(data.records.length,1);
  assert.equal(data.records[0].payload.legacyMarker,"PRESERVED");
  const upgraded=new Database(dbPath,{readonly:true});
  try{
   const columns=upgraded.pragma("table_info(users)").map(x=>x.name);
   for(const name of ["session_version","mfa_secret_enc","mfa_pending_enc","mfa_enabled","mfa_last_counter"])assert.ok(columns.includes(name),name);
   assert.equal(upgraded.prepare("SELECT count(*) AS n FROM companies").get().n,1);
   assert.equal(upgraded.prepare("SELECT count(*) AS n FROM records").get().n,1);
   assert.equal(upgraded.prepare("SELECT count(*) AS n FROM v50_password_resets").get().n,0);
  }finally{upgraded.close()}
 }finally{
  if(child)child.kill("SIGTERM");
  try{db.close()}catch{}
  rmSync(dir,{recursive:true,force:true});
 }
});
