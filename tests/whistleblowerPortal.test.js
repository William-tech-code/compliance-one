import test from "node:test";
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {mkdtempSync,readFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import net from "node:net";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";

const freePort=()=>new Promise(resolve=>{const s=net.createServer();s.listen(0,"127.0.0.1",()=>{const p=s.address().port;s.close(()=>resolve(p))})});

test("public ethics intake stays encrypted and only designated team can view cases",{timeout:25000},async()=>{
 const tmp=mkdtempSync(path.join(tmpdir(),"nexora-ethics-"));
 const port=await freePort(),base=`http://127.0.0.1:${port}`;
 const child=spawn(process.execPath,["server/index.js"],{cwd:process.cwd(),env:{...process.env,PORT:String(port),DATABASE_PATH:path.join(tmp,EVIDENCE_STORAGE_PATH:path.join(tmp,"evidence"),"ethics.sqlite"),JWT_SECRET:crypto.randomBytes(32).toString("hex"),BOOTSTRAP_SECRET:"test-only-secret",WHISTLEBLOWER_ENCRYPTION_KEY:crypto.randomBytes(32).toString("hex")},stdio:"ignore"});
 async function call(url,method="GET",body,token){const response=await fetch(`${base}${url}`,{method,headers:{...(body?{"Content-Type":"application/json"}:{}),...(token?{Authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:response.status,data:await response.json()}}
 try{
  let ready=false;
  for(let n=0;n<75;n++){if(child.exitCode!==null)throw Error("Server failed");try{const r=await call("/api/health");if(r.status===200){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,100))}
  assert.ok(ready,"server never became ready");
  const boot=await fetch(`${base}/api/bootstrap`,{method:"POST",headers:{"Content-Type":"application/json","x-bootstrap-secret":"test-only-secret"},body:JSON.stringify({companyName:"Teste Ética",adminName:"Diretor",email:"admin@exemplo.test",password:"adminpass123456"})}).then(r=>r.json());
  assert.ok(boot.token);
  const admin=boot.token;
  const team=await call("/api/users","POST",{name:"Responsável",email:"equipe@exemplo.test",password:"senhaforte12345",role:"Equipe de Apuração"},admin);
  assert.equal(team.status,201);
  const login=await call("/api/login","POST",{email:"equipe@exemplo.test",password:"senhaforte12345"});assert.equal(login.status,200);
  for(let i=0;i<8;i++)assert.equal((await call("/api/login","POST",{email:"inexistente@exemplo.test",password:"tentativa"})).status,401);
  const throttled=await call("/api/login","POST",{email:"inexistente@exemplo.test",password:"tentativa"});
  assert.equal(throttled.status,429);
  assert.equal((await call("/api/login","POST",{email:"equipe@exemplo.test",password:"senhaforte12345"})).status,200);
  const forbidden=await call("/api/ethics/team/cases","GET",undefined,admin);assert.equal(forbidden.status,403);
  const authorized=await call("/api/ethics/team-members","POST",{email:"admin@exemplo.test"},admin);assert.equal(authorized.status,200);
  const memberships=await call("/api/ethics/team-members","GET",undefined,admin);assert.equal(memberships.data.members.length,1);
  assert.equal((await call("/api/ethics/team/cases","GET",undefined,admin)).status,200);
  const revoked=await call("/api/ethics/team-members/revoke","POST",{email:"admin@exemplo.test"},admin);assert.equal(revoked.status,200);
  assert.equal((await call("/api/ethics/team/cases","GET",undefined,admin)).status,403);
  const created=await call("/api/ethics/channel","POST",{},admin);assert.equal(created.status,201);assert.match(created.data.publicPath,/^\/denunciar\//);
  const key=created.data.publicPath.split("/")[2];
  const publicInfo=await call(`/api/ethics/public/${key}`);assert.equal(publicInfo.data.organization,"Teste Ética");
  const report="Relato confidencial de teste: situação fictícia com dados que não podem aparecer em texto puro.";
  const receipt=await call(`/api/ethics/public/${key}/report`,"POST",{category:"Fraude",description:report});assert.equal(receipt.status,201);
  assert.ok(receipt.data.protocol&&receipt.data.accessKey);
  const raw=readFileSync(path.join(tmp,"ethics.sqlite"));assert.equal(raw.includes(Buffer.from(report)),false,"plaintext must not be persisted");
  const wrong=await call("/api/ethics/track","POST",{protocol:receipt.data.protocol,accessKey:"wrong"});assert.equal(wrong.status,404);
  const track=await call("/api/ethics/track","POST",{protocol:receipt.data.protocol,accessKey:receipt.data.accessKey});assert.equal(track.data.status,"Recebida");
  const list=await call("/api/ethics/team/cases","GET",undefined,login.data.token);assert.equal(list.data.cases.length,1);
  const otherDb=new Database(path.join(tmp,"ethics.sqlite"));
  try{
   otherDb.prepare("INSERT INTO companies(id,name,created_at) VALUES (?,?,?)").run("other-company","Outra organização",new Date().toISOString());
   otherDb.prepare("INSERT INTO users(id,company_id,name,email,password_hash,role,created_at) VALUES (?,?,?,?,?,?,?)").run("other-team","other-company","Outra equipe","outra@exemplo.test",bcrypt.hashSync("outrasenhaforte",10),"Equipe de Apuração",new Date().toISOString());
  }finally{otherDb.close()}
  const otherLogin=await call("/api/login","POST",{email:"outra@exemplo.test",password:"outrasenhaforte"});assert.equal(otherLogin.status,200);
  const isolated=await call("/api/ethics/team/cases","GET",undefined,otherLogin.data.token);assert.equal(isolated.data.cases.length,0);
  const caseId=list.data.cases[0].id;
  assert.equal((await call(`/api/ethics/team/cases/${caseId}`,"GET",undefined,admin)).status,403);
  assert.equal((await call(`/api/ethics/team/cases/${caseId}`,"GET",undefined,otherLogin.data.token)).status,404);
  const detail=await call(`/api/ethics/team/cases/${caseId}`,"GET",undefined,login.data.token);assert.equal(detail.data.report.description,report);
  const updated=await call(`/api/ethics/team/cases/${caseId}/status`,"POST",{status:"Em triagem"},login.data.token);assert.equal(updated.status,200);
  const history=await call(`/api/ethics/team/cases/${caseId}`,"GET",undefined,login.data.token);
  assert.equal(history.status,200);
  assert.equal(history.data.events.length,1);
  assert.match(history.data.events[0].description,/Recebida → Em triagem/);
  assert.ok(history.data.events[0].at);
  assert.equal((await call(`/api/ethics/team/cases/${caseId}`,"GET",undefined,otherLogin.data.token)).status,404);
  const tracked=await call("/api/ethics/track","POST",{protocol:receipt.data.protocol,accessKey:receipt.data.accessKey});assert.equal(tracked.data.status,"Em triagem");
 }finally{child.kill();await new Promise(resolve=>{if(child.exitCode!==null)return resolve();child.once("exit",resolve);setTimeout(resolve,1500)});try{rmSync(tmp,{recursive:true,force:true,maxRetries:12,retryDelay:200})}catch{}}
});
