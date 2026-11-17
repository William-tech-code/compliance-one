import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {spawn} from "node:child_process";
import {setTimeout as delay} from "node:timers/promises";
import Database from "better-sqlite3";
import jwt from "jsonwebtoken";

test("V51 organization routes isolate two tenants and enforce admin updates",{timeout:45000},async()=>{
 const dir=mkdtempSync(join(tmpdir(),"nexora-v51-org-"));
 const dbPath=join(dir,"test.sqlite");
 const secret="v51-integration-secret-at-least-32-characters";
 const port=25000+Math.floor(Math.random()*12000);
 const base="http://127.0.0.1:"+port+"/api";
 let child;
 const request=async(route,method="GET",body,token,headers={})=>{
  const r=await fetch(base+route,{method,headers:{"content-type":"application/json",...(token?{authorization:"Bearer "+token}:{}),...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});
  return {status:r.status,data:await r.json()};
 };
 try{
  child=spawn(process.execPath,["server/index.js"],{env:{...process.env,PORT:String(port),NODE_ENV:"test",DATABASE_PATH:dbPath,EVIDENCE_STORAGE_PATH:join(dir,"evidence"),JWT_SECRET:secret,BOOTSTRAP_SECRET:"tenant-test-secret"},stdio:"ignore"});
  let ready=false;
  for(let i=0;i<120;i++){if(child.exitCode!==null)throw Error("Server exited");try{if((await fetch(base+"/health")).ok){ready=true;break}}catch{}await delay(100)}
  assert.equal(ready,true);
  const init=await request("/bootstrap","POST",{companyName:"Alpha Ltda",adminName:"Admin Alpha",email:"alpha@example.test",password:"Password12345"},undefined,{"x-bootstrap-secret":"tenant-test-secret"});
  assert.equal(init.status,201);
  const tokenA=init.data.token;
  const companyA=init.data.company.id;
  const db=new Database(dbPath),stamp=new Date().toISOString();
  db.prepare("INSERT INTO companies(id,name,created_at) VALUES(?,?,?)").run("company-beta","Beta Ltda",stamp);
  db.prepare("INSERT INTO users(id,company_id,name,email,password_hash,role,active,created_at) VALUES(?,?,?,?,?,?,?,?)").run("beta-admin","company-beta","Admin Beta","beta@example.test","unused","Administrador",1,stamp);
  db.prepare("INSERT INTO users(id,company_id,name,email,password_hash,role,active,created_at) VALUES(?,?,?,?,?,?,?,?)").run("alpha-viewer",companyA,"Viewer Alpha","viewer@example.test","unused","Colaborador",1,stamp);
  db.close();
  const tokenB=jwt.sign({sub:"beta-admin",companyId:"company-beta",sessionVersion:0},secret,{expiresIn:"10m"});
  const tokenViewer=jwt.sign({sub:"alpha-viewer",companyId:companyA,sessionVersion:0},secret,{expiresIn:"10m"});
  assert.equal((await request("/v51/organization","GET",undefined,tokenA)).data.company.name,"Alpha Ltda");
  assert.equal((await request("/v51/organization","GET",undefined,tokenB)).data.company.name,"Beta Ltda");
  const membersA=await request("/v51/organization/users","GET",undefined,tokenA);
  assert.equal(membersA.status,200);
  assert.ok(membersA.data.users.some(u=>u.email==="viewer@example.test"));
  assert.ok(membersA.data.users.every(u=>u.email!=="beta@example.test"));
  const membersB=await request("/v51/organization/users","GET",undefined,tokenB);
  assert.equal(membersB.status,200);
  assert.ok(membersB.data.users.every(u=>u.email!=="viewer@example.test"));
  assert.equal((await request("/v51/organization/users","GET",undefined,tokenViewer)).status,403);
  assert.equal((await request("/v51/organization","PATCH",{name:"Viewer edit"},tokenViewer)).status,403);
  assert.equal((await request("/v51/organization","PATCH",{id:"company-beta",name:"Forbidden edit"},tokenA)).status,400);
  const update=await request("/v51/organization","PATCH",{name:"Alpha Enterprise"},tokenA);
  assert.equal(update.status,200);
  assert.equal(update.data.company.name,"Alpha Enterprise");
  assert.equal((await request("/v51/organization","GET",undefined,tokenB)).data.company.name,"Beta Ltda");
  const a=await request("/v51/organization/audit","GET",undefined,tokenA);
  const b=await request("/v51/organization/audit","GET",undefined,tokenB);
  assert.equal(a.status,200);assert.equal(b.status,200);
  assert.ok(a.data.events.some(e=>e.action==="V51_ORGANIZATION_UPDATED"));
  assert.ok(b.data.events.every(e=>e.action!=="V51_ORGANIZATION_UPDATED"));
  assert.equal((await request("/v51/organization/audit","GET",undefined,tokenViewer)).status,403);
 }finally{
  if(child){const done=new Promise(resolve=>child.once("exit",resolve));child.kill("SIGTERM");await Promise.race([done,delay(2000)]);if(child.exitCode===null)child.kill("SIGKILL")}
  rmSync(dir,{recursive:true,force:true});
 }
});
