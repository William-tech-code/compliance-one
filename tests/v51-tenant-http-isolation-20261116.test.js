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
  const port=server.address().port;
  await new Promise(resolve=>server.close(resolve));
  return port;
}
async function ready(url,child){
  for(let i=0;i<100;i++){
    if(child.exitCode!==null)throw new Error("Test API terminated early");
    try{const r=await fetch(url+"/api/health",{signal:AbortSignal.timeout(500)});if(r.ok)return;}catch{}
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  throw new Error("Test API health timeout");
}
test("real HTTP API isolates two fictitious tenants, users, records and audit", {timeout:30000}, async()=>{
  const dir=mkdtempSync(path.join(tmpdir(),"compliance-tenant-"));
  const dbPath=path.join(dir,"tenant-test.sqlite");
  const port=await freePort();
  const url="http://127.0.0.1:"+port;
  const child=spawn(process.execPath,["server/index.js"],{
    cwd:process.cwd(),stdio:"ignore",
    env:{...process.env,NODE_ENV:"test",PORT:String(port),DATABASE_PATH:dbPath,JWT_SECRET:"isolated-test-jwt-secret-minimum-32-characters",BOOTSTRAP_SECRET:"isolated-test-bootstrap-secret",ASAAS_API_KEY:"",RESEND_API_KEY:""}
  });
  try{
    await ready(url,child);
    const db=new Database(dbPath);
    try{
      const now=new Date().toISOString();
      const hash=await bcrypt.hash("TestPassword-123456",4);
      for(const tenant of ["company-alpha","company-beta"]){
        db.prepare("INSERT INTO companies(id,name,created_at) VALUES(?,?,?)").run(tenant,tenant,now);
        db.prepare("INSERT INTO users(id,company_id,name,email,password_hash,role,created_at) VALUES(?,?,?,?,?,?,?)")
          .run("user-"+tenant,tenant,"Fictitious "+tenant,tenant+"@example.test",hash,"Administrador",now);
        db.prepare("INSERT INTO records(id,company_id,type,payload,created_at,updated_at) VALUES(?,?,?,?,?,?)")
          .run("record-"+tenant,tenant,"workspace",JSON.stringify({privateTenant:tenant}),now,now);
        db.prepare("INSERT INTO audit_log(id,company_id,action,created_at) VALUES(?,?,?,?)")
          .run("audit-"+tenant,tenant,"TEST_EVENT",now);
      }
    }finally{db.close();}
    async function request(method,route,token,body,extra={}){
      const res=await fetch(url+route,{method,headers:{...(token?{Authorization:"Bearer "+token}:{}),...(body?{"Content-Type":"application/json"}:{}),...extra},...(body?{body:JSON.stringify(body)}:{})});
      return {status:res.status,data:await res.json()};
    }
    const tokens={};
    for(const tenant of ["company-alpha","company-beta"]){
      const login=await request("POST","/api/login",null,{email:tenant+"@example.test",password:"TestPassword-123456"});
      assert.equal(login.status,200,JSON.stringify(login.data));
      assert.equal(login.data.company.id,tenant);
      tokens[tenant]=login.data.token;
      const me=await request("GET","/api/me",tokens[tenant]);
      assert.equal(me.data.company.id,tenant);
      const users=await request("GET","/api/users",tokens[tenant]);
      assert.equal(users.status,200);
      assert.equal(users.data.users.length,1);
      assert.equal(users.data.users[0].email,tenant+"@example.test");
      const records=await request("GET","/api/records/workspace",tokens[tenant]);
      assert.equal(records.status,200);
      assert.equal(records.data.records.length,1);
      assert.equal(records.data.records[0].payload.privateTenant,tenant);
      const audit=await request("GET","/api/audit",tokens[tenant]);
      assert.equal(audit.status,200);
      assert.equal(audit.data.events.length,1);
    }
    const denied=await request("PUT","/api/records/record-company-alpha",tokens["company-beta"],{privateTenant:"tampered"},{"x-record-version":"1"});
    assert.equal(denied.status,404);
    const history=await request("GET","/api/records/record-company-alpha/versions",tokens["company-beta"]);
    assert.equal(history.status,404);
    const noAuth=await request("GET","/api/records/workspace");
    assert.equal(noAuth.status,401);
    const alpha=await request("GET","/api/records/workspace",tokens["company-alpha"]);
    assert.equal(alpha.data.records[0].payload.privateTenant,"company-alpha");
  }finally{
    child.kill("SIGTERM");
    rmSync(dir,{recursive:true,force:true});
  }
});
