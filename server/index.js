import {createAiThrottle} from "./aiThrottle.js";
import {verifyEvidenceFile,isEvidencePathInsideTenant} from "./evidenceIntegrity.js";
import {resolveRegulatoryReview} from "./regulatoryReview.js";
import {validateEvidenceReferences} from "./evidenceGuard.js";
import {validateGovernanceMutation} from "./governanceGuard.js";
import {validateCorrectiveActionMutation} from "./correctiveActionGuard.js";
import {MONITOR_SOURCES,probeRegulation,compareRegulationSnapshot} from "./regulatoryMonitor.js";
import {validateAiRequest,buildAiMessages} from "./aiSafety.js";
import {configureWhistleblower} from "./whistleblower.js";
import {createLoginProtection} from "./loginProtection.js";
import {secureTokenMatches,validateAsaasEvent,sendResendEmail,hashResetToken,generateResetToken,sessionVersionValid} from "./v50Integrations.js";
import {generateTotpSecret,encryptTotpSecret,decryptTotpSecret,verifyTotp} from './v50Mfa.js';
import {canReadUserDirectory,canCreateUser,validateNewUser} from "./v51UserAccess.js";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import Database from "better-sqlite3";
import crypto from "node:crypto";
import path from "node:path";
import fs from "node:fs";

const app = express();

const PORT = Number(process.env.PORT || 8787);
const production = process.env.NODE_ENV === "production";
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET must be configured with at least 32 characters");
}
const dbPath = process.env.DATABASE_PATH || "nexus.sqlite";
if (production && !path.isAbsolute(dbPath)) {
  throw new Error("DATABASE_PATH must be an absolute persistent path in production");
}
fs.mkdirSync(path.dirname(path.resolve(dbPath)), { recursive: true });
const db = new Database(dbPath);

db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  segment TEXT DEFAULT '',
  size TEXT DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL,
  active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  user_id TEXT,
  action TEXT NOT NULL,
  entity TEXT,
  entity_id TEXT,
  metadata TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS records (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  type TEXT NOT NULL,
  payload TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS record_versions (
  record_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  payload TEXT NOT NULL,
  changed_by TEXT,
  created_at TEXT NOT NULL,
  PRIMARY KEY (record_id, company_id, version)
);
CREATE INDEX IF NOT EXISTS idx_record_versions_company ON record_versions(company_id, record_id, version);

CREATE TABLE IF NOT EXISTS v50_password_resets (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_v50_password_resets_user ON v50_password_resets(user_id);
CREATE TABLE IF NOT EXISTS v50_asaas_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  payment_id TEXT,
  subscription_id TEXT,
  received_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING_VERIFICATION'
);

`);
if(!db.pragma('table_info(users)').some(column=>column.name==='session_version')){
  db.exec('ALTER TABLE users ADD COLUMN session_version INTEGER NOT NULL DEFAULT 0');
}
for(const [column,definition] of [
  ['mfa_secret_enc','TEXT'],['mfa_pending_enc','TEXT'],['mfa_enabled','INTEGER NOT NULL DEFAULT 0'],['mfa_last_counter','INTEGER NOT NULL DEFAULT -1']
]){
  if(!db.pragma('table_info(users)').some(item=>item.name===column))db.exec(`ALTER TABLE users ADD COLUMN ${column} ${definition}`);
}

app.use(helmet());

app.use(
  cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",").map(x => x.trim()) : false,
    credentials: false,
  })
);

app.use(express.json({ limit: "12mb" }));

const id = () => crypto.randomUUID();

const now = () => new Date().toISOString();
const loginProtection = createLoginProtection();
const resetAttempts=new Map();
const mfaConfirmAttempts=new Map();
function mfaEncryptionKey(){
 const raw=process.env.MFA_ENCRYPTION_KEY;
 if(!raw)return null;
 const key=Buffer.from(raw,'base64');
 return key.length===32?key:null;
}

// Sandbox integration: no charging, no automatic license activation.
app.post('/api/integrations/asaas/webhook',(req,res)=>{
  if(!secureTokenMatches(req.get('asaas-access-token'),process.env.ASAAS_WEBHOOK_TOKEN)) return res.status(401).json({error:'WEBHOOK_UNAUTHORIZED'});
  let event;
  try{event=validateAsaasEvent(req.body)}catch{return res.status(400).json({error:'INVALID_WEBHOOK'})}
  const result=db.prepare(`INSERT OR IGNORE INTO v50_asaas_events(id,event_type,payment_id,subscription_id,received_at)
    VALUES(?,?,?,?,?)`).run(event.id,event.event,event.paymentId,event.subscriptionId,now());
  // An event is evidence to reconcile, not proof of payment or an authorization to grant access.
  return res.json({received:true,duplicate:result.changes===0});
});

app.post('/api/auth/forgot-password',async(req,res)=>{
  const email=typeof req.body?.email==='string'?req.body.email.trim().toLowerCase():'';
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254) return res.status(400).json({error:'INVALID_EMAIL'});
  if(!process.env.RESEND_API_KEY||!process.env.RESEND_FROM_EMAIL||!process.env.PUBLIC_APP_URL)
    return res.status(503).json({error:'PASSWORD_RECOVERY_NOT_CONFIGURED'});
  const key=crypto.createHash('sha256').update(req.ip+'|'+email).digest('hex');
  const last=resetAttempts.get(key)||0;
  if(Date.now()-last<60000)return res.json({ok:true});
  resetAttempts.set(key,Date.now());
  if(resetAttempts.size>10000)resetAttempts.clear();
  const user=db.prepare('SELECT id,email FROM users WHERE email=? AND active=1').get(email);
  if(user){
    const token=generateResetToken();
    db.prepare('DELETE FROM v50_password_resets WHERE user_id=?').run(user.id);
    db.prepare('INSERT INTO v50_password_resets(token_hash,user_id,expires_at) VALUES(?,?,?)')
      .run(hashResetToken(token),user.id,Date.now()+20*60*1000);
    const base=process.env.PUBLIC_APP_URL.replace(/\/$/,'');
    try{await sendResendEmail({apiKey:process.env.RESEND_API_KEY,from:process.env.RESEND_FROM_EMAIL,
      to:user.email,subject:'NEXORA Compliance One · recuperação de senha',
      text:'Para redefinir sua senha, abra este link em até 20 minutos:\n'+base+'/?reset_token='+encodeURIComponent(token)+'\nSe você não solicitou, ignore esta mensagem.'});}
    catch{db.prepare('DELETE FROM v50_password_resets WHERE token_hash=?').run(hashResetToken(token));}
  }
  return res.json({ok:true});
});

app.post('/api/auth/reset-password',async(req,res)=>{
  const {token,password}=req.body||{};
  if(typeof token!=='string'||token.length>256||typeof password!=='string'||password.length<12||password.length>1024)
    return res.status(400).json({error:'INVALID_RESET_REQUEST'});
  const row=db.prepare('SELECT user_id FROM v50_password_resets WHERE token_hash=? AND used_at IS NULL AND expires_at>?')
    .get(hashResetToken(token),Date.now());
  if(!row)return res.status(400).json({error:'RESET_TOKEN_INVALID_OR_EXPIRED'});
  const newHash=await bcrypt.hash(password,12);
  const updated=db.transaction(()=>{
    const consumed=db.prepare('UPDATE v50_password_resets SET used_at=? WHERE token_hash=? AND used_at IS NULL AND expires_at>?')
      .run(Date.now(),hashResetToken(token),Date.now());
    if(consumed.changes!==1)return false;
    db.prepare('UPDATE users SET password_hash=?,session_version=session_version+1 WHERE id=? AND active=1').run(newHash,row.user_id);
    db.prepare('DELETE FROM v50_password_resets WHERE user_id=?').run(row.user_id);
    return true;
  })();
  return updated?res.json({ok:true}):res.status(400).json({error:'RESET_TOKEN_INVALID_OR_EXPIRED'});
});

function createToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      companyId: user.company_id,
      role: user.role,
      name: user.name,
      email: user.email,
      sessionVersion: user.session_version||0,
    },
    JWT_SECRET,
    {
      expiresIn: "8h",
    }
  );
}

function authenticate(req, res, next) {
  const authorization = req.headers.authorization || "";

  if (!authorization.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "AUTH_REQUIRED",
    });
  }

  const token = authorization.substring(7);

  try {
    const claims = jwt.verify(token, JWT_SECRET);
    const current = db.prepare("SELECT id, company_id, name, email, role, active, session_version FROM users WHERE id = ? AND company_id = ?").get(claims.sub, claims.companyId);
    if (!sessionVersionValid(claims,current)) {
      return res.status(401).json({ error: "SESSION_REVOKED" });
    }
    req.user = {
      sub: current.id,
      companyId: current.company_id,
      name: current.name,
      email: current.email,
      role: current.role
    };
    next();
  } catch {
    return res.status(401).json({
      error: "INVALID_TOKEN",
    });
  }
}

app.post('/api/auth/mfa/enroll',authenticate,async(req,res)=>{
  const key=mfaEncryptionKey();
  if(!key)return res.status(503).json({error:'MFA_NOT_CONFIGURED'});
  const user=db.prepare('SELECT * FROM users WHERE id=? AND company_id=?').get(req.user.sub,req.user.companyId);
  if(!user||user.mfa_enabled)return res.status(409).json({error:'MFA_ALREADY_ENABLED'});
  if(typeof req.body?.password!=='string'||!await bcrypt.compare(req.body.password,user.password_hash))
    return res.status(401).json({error:'INVALID_CREDENTIALS'});
  const secret=generateTotpSecret();
  db.prepare('UPDATE users SET mfa_pending_enc=? WHERE id=?').run(encryptTotpSecret(secret,key),user.id);
  const uri='otpauth://totp/'+encodeURIComponent('NEXORA Compliance One:'+user.email)+'?secret='+secret+'&issuer='+encodeURIComponent('NEXORA Compliance One')+'&algorithm=SHA1&digits=6&period=30';
  return res.json({secret,otpauthUri:uri});
});

app.post('/api/auth/mfa/confirm',authenticate,(req,res)=>{
  const key=mfaEncryptionKey();
  if(!key)return res.status(503).json({error:'MFA_NOT_CONFIGURED'});
  const user=db.prepare('SELECT * FROM users WHERE id=? AND company_id=?').get(req.user.sub,req.user.companyId);
  if(!user?.mfa_pending_enc||user.mfa_enabled)return res.status(409).json({error:'MFA_ENROLLMENT_REQUIRED'});
  const attempt=mfaConfirmAttempts.get(user.id)||{count:0,until:Date.now()+300000};
  if(Date.now()>attempt.until){attempt.count=0;attempt.until=Date.now()+300000}
  if(attempt.count>=5)return res.status(429).json({error:'MFA_TOO_MANY_ATTEMPTS'});
  attempt.count++;mfaConfirmAttempts.set(user.id,attempt);
  if(mfaConfirmAttempts.size>10000)mfaConfirmAttempts.clear();
  let counter;
  try{counter=verifyTotp(decryptTotpSecret(user.mfa_pending_enc,key),req.body?.code)}
  catch{return res.status(400).json({error:'MFA_CODE_INVALID'})}
  if(counter===null)return res.status(400).json({error:'MFA_CODE_INVALID'});
  db.prepare('UPDATE users SET mfa_secret_enc=mfa_pending_enc,mfa_pending_enc=NULL,mfa_enabled=1,mfa_last_counter=?,session_version=session_version+1 WHERE id=?')
    .run(counter,user.id);
  mfaConfirmAttempts.delete(user.id);
  return res.json({ok:true,reauthRequired:true});
});

const permissions = {
  Administrador: ["*"],

  Compliance: [
    "company:read",
    "record:read",
    "record:write",
    "audit:read",
  ],

  Jurídico: [
    "company:read",
    "record:read",
    "record:write",
    "audit:read",
  ],

  Auditoria: [
    "company:read",
    "record:read",
    "audit:read",
  ],

  Diretoria: [
    "company:read",
    "record:read",
  ],

  Financeiro: [
    "company:read",
    "record:read",
  ],

  Colaborador: [
    "record:read",
  ],
  "Equipe de Apuração": [],
};

function requirePermission(permission) {
  return (req, res, next) => {
    const userPermissions = permissions[req.user.role] || [];

    if (
      userPermissions.includes("*") ||
      userPermissions.includes(permission)
    ) {
      return next();
    }

    return res.status(403).json({
      error: "FORBIDDEN",
      permission,
    });
  };
}

function audit(req, action, entity = "", entityId = "", metadata = {}) {
  db.prepare(`
    INSERT INTO audit_log
    (
      id,
      company_id,
      user_id,
      action,
      entity,
      entity_id,
      metadata,
      created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id(),
    req.user.companyId,
    req.user.sub,
    action,
    entity,
    entityId,
    JSON.stringify(metadata),
    now()
  );
}

configureWhistleblower({app,db,authenticate,audit});

/*
|--------------------------------------------------------------------------
| HEALTH CHECK
|--------------------------------------------------------------------------
*/

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "NEXUS API",
    version: process.env.APP_RELEASE_VERSION || "V50-STAGING",
    time: now(),
  });
});

/*
|--------------------------------------------------------------------------
| PRIMEIRA EMPRESA + ADMINISTRADOR
|--------------------------------------------------------------------------
*/

const aiThrottle=createAiThrottle();
app.post("/api/ai/compliance-briefing",authenticate,requirePermission("record:read"),async(req,res)=>{
 const key=process.env.OPENAI_API_KEY;
 if(!key)return res.status(503).json({error:"AI_NOT_CONFIGURED"});
 const model=process.env.OPENAI_MODEL||"gpt-4.1-mini";
 let safe;
 try{safe=validateAiRequest(req.body)}catch(e){return res.status(400).json({error:e.message})}
 const throttle=aiThrottle.check(req.user.sub);
 if(!throttle.allowed){
  res.setHeader("Retry-After",String(Math.ceil(throttle.retryAfter/1000)));
  return res.status(429).json({error:"AI_RATE_LIMIT"});
 }
 try{
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),15000);
  let response;
  try{
   response=await fetch("https://api.openai.com/v1/chat/completions",{
    method:"POST",signal:controller.signal,
    headers:{"Authorization":"Bearer "+key,"Content-Type":"application/json"},
    body:JSON.stringify({model,messages:buildAiMessages(safe),max_completion_tokens:700,store:false})
   });
  }finally{clearTimeout(timer)}
  if(!response.ok)return res.status(502).json({error:"AI_PROVIDER_UNAVAILABLE"});
  const data=await response.json();
  const answer=data?.choices?.[0]?.message?.content;
  if(typeof answer!=="string"||!answer.trim())return res.status(502).json({error:"AI_EMPTY_RESPONSE"});
  audit(req,"AI_BRIEFING_REQUESTED","ai","",{model,questionLength:safe.question.length});
  return res.json({answer:answer.slice(0,5000),model,legalReviewRequired:true,liveLegalUpdate:false});
 }catch(e){return res.status(502).json({error:"AI_PROVIDER_UNAVAILABLE"})}
});

db.exec(`
CREATE TABLE IF NOT EXISTS regulatory_monitor_snapshots (
 source_id TEXT PRIMARY KEY,
 digest TEXT NOT NULL,
 checked_at TEXT NOT NULL,
 changed_at TEXT,
 status TEXT NOT NULL,
 error TEXT
);
`);
db.exec(`
CREATE TABLE IF NOT EXISTS regulatory_tenant_reviews (
 company_id TEXT NOT NULL,
 source_id TEXT NOT NULL,
 digest TEXT NOT NULL,
 decision TEXT NOT NULL,
 notes TEXT NOT NULL,
 reviewed_by TEXT NOT NULL,
 reviewed_at TEXT NOT NULL,
 PRIMARY KEY(company_id,source_id,digest)
);
CREATE INDEX IF NOT EXISTS idx_regulatory_tenant_reviews ON regulatory_tenant_reviews(company_id,source_id);
`);
let monitoring=false;
async function runRegulatoryMonitor(){
 if(monitoring)return {error:"MONITOR_BUSY"};
 monitoring=true;
 const results=[];
 try{
  for(const source of MONITOR_SOURCES){
   const previous=db.prepare("SELECT * FROM regulatory_monitor_snapshots WHERE source_id=?").get(source.id);
   try{
    const current=await probeRegulation(source);
    const detected=compareRegulationSnapshot(previous,current);
    const status=detected==="UNCHANGED"&&previous?.status==="CONTENT_CHANGED_REVIEW_REQUIRED"?"CONTENT_CHANGED_REVIEW_REQUIRED":detected;
    db.prepare(`INSERT INTO regulatory_monitor_snapshots(source_id,digest,checked_at,changed_at,status,error)
      VALUES(?,?,?,?,?,NULL) ON CONFLICT(source_id) DO UPDATE SET digest=excluded.digest,checked_at=excluded.checked_at,changed_at=excluded.changed_at,status=excluded.status,error=NULL`)
      .run(source.id,current.digest,current.checkedAt,status==="CONTENT_CHANGED_REVIEW_REQUIRED"?current.checkedAt:previous?.changed_at||null,status);
    results.push({sourceId:source.id,status,checkedAt:current.checkedAt});
   }catch(e){
    results.push({sourceId:source.id,status:"CHECK_FAILED",error:String(e.message).slice(0,100)});
    if(previous)db.prepare("UPDATE regulatory_monitor_snapshots SET error=? WHERE source_id=?").run(String(e.message).slice(0,100),source.id);
   }
  }
  return {results,legalValidityVerified:false};
 }finally{monitoring=false}
}
app.get("/api/regulatory/monitor",authenticate,requirePermission("record:read"),(req,res)=>{
 const snapshots=db.prepare("SELECT source_id,digest,checked_at,changed_at,status,error FROM regulatory_monitor_snapshots").all();
 const reviews=db.prepare("SELECT source_id,digest,decision,reviewed_at FROM regulatory_tenant_reviews WHERE company_id=?").all(req.user.companyId);
 res.json({sources:MONITOR_SOURCES.map(x=>{
  const snapshot=snapshots.find(s=>s.source_id===x.id)||null;
  return {...x,snapshot:resolveRegulatoryReview(snapshot,reviews)};
 }),legalValidityVerified:false});
});
app.post("/api/regulatory/monitor/run",authenticate,requirePermission("audit:read"),async(req,res)=>{
 const result=await runRegulatoryMonitor();
 if(result.error)return res.status(409).json(result);
 audit(req,"REGULATORY_MONITOR_RUN","regulatory","",{count:result.results.length});
 res.json(result);
});
app.post("/api/regulatory/monitor/:sourceId/review",authenticate,requirePermission("record:write"),(req,res)=>{
 const source=MONITOR_SOURCES.find(s=>s.id===req.params.sourceId);
 if(!source)return res.status(404).json({error:"SOURCE_NOT_FOUND"});
 const decision=String(req.body?.decision||"");
 const notes=String(req.body?.notes||"").trim();
 if(!["REVIEWED","NEEDS_ACTION"].includes(decision)||notes.length<12||notes.length>2000)return res.status(400).json({error:"REVIEW_NOT_VALID"});
 const snapshot=db.prepare("SELECT * FROM regulatory_monitor_snapshots WHERE source_id=?").get(source.id);
 if(!snapshot)return res.status(404).json({error:"NO_SNAPSHOT"});
 db.prepare(`INSERT INTO regulatory_tenant_reviews(company_id,source_id,digest,decision,notes,reviewed_by,reviewed_at)
 VALUES(?,?,?,?,?,?,?) ON CONFLICT(company_id,source_id,digest) DO UPDATE SET decision=excluded.decision,notes=excluded.notes,reviewed_by=excluded.reviewed_by,reviewed_at=excluded.reviewed_at`)
 .run(req.user.companyId,source.id,snapshot.digest,decision,notes,req.user.sub,now());
 audit(req,"REGULATORY_CHANGE_REVIEWED","regulatory",source.id,{decision,notes,sourceDigest:snapshot.digest});
 res.json({ok:true,sourceId:source.id,status:decision});
});
if(process.env.REGULATORY_MONITOR_ENABLED==="true"){
 setTimeout(()=>{runRegulatoryMonitor().catch(e=>console.error("REGULATORY_MONITOR",e.message))},20000);
 setInterval(()=>{runRegulatoryMonitor().catch(e=>console.error("REGULATORY_MONITOR",e.message))},24*60*60*1000).unref();
}

db.exec(`
CREATE TABLE IF NOT EXISTS evidence_files (
 id TEXT PRIMARY KEY, company_id TEXT NOT NULL, action_id TEXT NOT NULL,
 name TEXT NOT NULL, mime TEXT NOT NULL, sha256 TEXT NOT NULL,
 size INTEGER NOT NULL, stored_path TEXT NOT NULL,
 uploaded_by TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_evidence_files_tenant ON evidence_files(company_id,action_id);
`);
const evidenceRoot=process.env.EVIDENCE_STORAGE_PATH||(production?"/var/data/evidence":path.resolve("evidence-dev"));
if(production&&(!path.isAbsolute(evidenceRoot)||!evidenceRoot.startsWith("/var/data/")))throw Error("EVIDENCE_STORAGE_PATH must be under /var/data");
fs.mkdirSync(evidenceRoot,{recursive:true,mode:0o700});
app.post("/api/evidence/upload",authenticate,requirePermission("record:write"),(req,res)=>{
 const {actionId,name,mime,base64}=req.body||{};
 if(typeof actionId!=="string"||!actionId.trim()||typeof name!=="string"||!name.trim()||name.length>200||typeof base64!=="string"||base64.length>7_000_000)return res.status(400).json({error:"INVALID_UPLOAD"});
 if(!/^[A-Za-z0-9+/]*={0,2}$/.test(base64))return res.status(400).json({error:"INVALID_BASE64"});
 const actionExists=db.prepare("SELECT payload FROM records WHERE company_id=? AND type='workspace'").all(req.user.companyId).some(row=>{
  try{return (JSON.parse(row.payload).correctiveActions||[]).some(a=>a.id===actionId&&!["CONCLUÍDA","CANCELADA"].includes(a.status))}catch{return false}
 });
 if(!actionExists)return res.status(404).json({error:"ACTION_NOT_FOUND"});
 const bytes=Buffer.from(base64,"base64");
 if(!bytes.length||bytes.length>5*1024*1024)return res.status(413).json({error:"FILE_SIZE_LIMIT"});
 const digest="sha256:"+crypto.createHash("sha256").update(bytes).digest("hex");
 const fileId=id();
 const tenantDir=path.join(evidenceRoot,crypto.createHash("sha256").update(req.user.companyId).digest("hex"));
 fs.mkdirSync(tenantDir,{recursive:true,mode:0o700});
 const filePath=path.join(tenantDir,fileId);
 try{
  fs.writeFileSync(filePath,bytes,{flag:"wx",mode:0o600});
  db.prepare("INSERT INTO evidence_files(id,company_id,action_id,name,mime,sha256,size,stored_path,uploaded_by,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)")
   .run(fileId,req.user.companyId,actionId,name,typeof mime==="string"?mime.slice(0,100):"application/octet-stream",digest,bytes.length,filePath,req.user.sub,now());
  audit(req,"EVIDENCE_FILE_UPLOADED","evidence",fileId,{actionId,sha256:digest,size:bytes.length});
  return res.status(201).json({id:fileId,actionId,name,hash:digest,size:bytes.length,uploadedAt:now()});
 }catch(e){try{fs.unlinkSync(filePath)}catch{}return res.status(500).json({error:"EVIDENCE_STORAGE_FAILED"})}
});
app.get("/api/evidence/:id/download",authenticate,requirePermission("record:read"),(req,res)=>{
 const item=db.prepare("SELECT * FROM evidence_files WHERE id=? AND company_id=?").get(req.params.id,req.user.companyId);
 if(!item)return res.status(404).json({error:"NOT_FOUND"});
 if(!fs.existsSync(item.stored_path))return res.status(503).json({error:"EVIDENCE_MISSING"});
 if(!isEvidencePathInsideTenant(item.stored_path,evidenceRoot,req.user.companyId)||!verifyEvidenceFile(item.stored_path,item.sha256,item.size)){
  audit(req,"EVIDENCE_INTEGRITY_FAILED","evidence",item.id,{actionId:item.action_id});
  return res.status(409).json({error:"EVIDENCE_INTEGRITY_FAILED"});
 }
 res.setHeader("Content-Type","application/octet-stream");
 res.setHeader("Content-Disposition",'attachment; filename="evidence-'+item.id+'"');
 res.setHeader("X-Content-Type-Options","nosniff");
 audit(req,"EVIDENCE_FILE_DOWNLOADED","evidence",item.id,{actionId:item.action_id});
 return res.sendFile(item.stored_path);
});
app.post("/api/bootstrap", async (req, res) => {
  const bootstrapSecret = process.env.BOOTSTRAP_SECRET;
  if (!bootstrapSecret || req.get("x-bootstrap-secret") !== bootstrapSecret) {
    return res.status(403).json({ error: "BOOTSTRAP_DISABLED" });
  }
  if (db.prepare("SELECT COUNT(*) AS count FROM companies").get().count > 0) {
    return res.status(409).json({ error: "ALREADY_INITIALIZED" });
  }
  const {
    companyName,
    segment = "",
    size = "",
    adminName,
    email,
    password,
  } = req.body || {};

  if (!companyName || !adminName || !email || !password) {
    return res.status(400).json({
      error: "MISSING_FIELDS",
    });
  }

  if (password.length < 10) {
    return res.status(400).json({
      error: "PASSWORD_MIN_10",
    });
  }

  const companyId = id();
  const userId = id();

  const passwordHash = await bcrypt.hash(password, 12);

  try {
    const transaction = db.transaction(() => {
      db.prepare(`
        INSERT INTO companies
        (
          id,
          name,
          segment,
          size,
          created_at
        )
        VALUES (?, ?, ?, ?, ?)
      `).run(
        companyId,
        companyName,
        segment,
        size,
        now()
      );

      db.prepare(`
        INSERT INTO users
        (
          id,
          company_id,
          name,
          email,
          password_hash,
          role,
          active,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        userId,
        companyId,
        adminName,
        email.toLowerCase(),
        passwordHash,
        "Administrador",
        1,
        now()
      );
    });

    transaction();

    const user = {
      id: userId,
      company_id: companyId,
      name: adminName,
      email: email.toLowerCase(),
      role: "Administrador",
    };

    res.status(201).json({
      token: createToken(user),

      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },

      company: {
        id: companyId,
        name: companyName,
        segment,
        size,
      },
    });
  } catch (error) {
    res.status(409).json({
      error: "BOOTSTRAP_FAILED",
      detail: error.message,
    });
  }
});

/*
|--------------------------------------------------------------------------
| LOGIN
|--------------------------------------------------------------------------
*/

app.post("/api/login", async (req, res) => {
  const {
    email,
    password,
    totpCode,
  } = req.body || {};

  if(typeof email!=="string"||typeof password!=="string"||email.length>254||password.length>1024){
    return res.status(400).json({error:"CREDENCIAIS_INVALIDAS"});
  }

  const attempt=loginProtection.check(req.ip,email);
  if(!attempt.allowed){
    res.setHeader("Retry-After",String(attempt.retryAfter));
    return res.status(429).json({error:"MUITAS_TENTATIVAS_AGUARDE"});
  }

  const user = db
    .prepare(`
      SELECT *
      FROM users
      WHERE email = ?
      AND active = 1
    `)
    .get(email.trim().toLowerCase());

  if (!user) {
    loginProtection.failure(attempt.key);
    return res.status(401).json({
      error: "INVALID_CREDENTIALS",
    });
  }

  const validPassword = await bcrypt.compare(
    password || "",
    user.password_hash
  );

  if (!validPassword) {
    loginProtection.failure(attempt.key);
    return res.status(401).json({
      error: "INVALID_CREDENTIALS",
    });
  }

  if(user.mfa_enabled){
    const key=mfaEncryptionKey();
    if(!key)return res.status(503).json({error:'MFA_NOT_CONFIGURED'});
    if(!totpCode)return res.status(401).json({error:'MFA_REQUIRED'});
    let counter;
    try{counter=verifyTotp(decryptTotpSecret(user.mfa_secret_enc,key),totpCode,{lastCounter:user.mfa_last_counter})}
    catch{counter=null}
    if(counter===null){loginProtection.failure(attempt.key);return res.status(401).json({error:'MFA_CODE_INVALID'})}
    const result=db.prepare('UPDATE users SET mfa_last_counter=? WHERE id=? AND mfa_last_counter<?')
      .run(counter,user.id,counter);
    if(result.changes!==1){loginProtection.failure(attempt.key);return res.status(401).json({error:'MFA_CODE_REPLAYED'})}
  }

  const company = db
    .prepare(`
      SELECT
        id,
        name,
        segment,
        size
      FROM companies
      WHERE id = ?
    `)
    .get(user.company_id);

  loginProtection.success(attempt.key);

  res.json({
    token: createToken(user),

    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },

    company,
  });
});

/*
|--------------------------------------------------------------------------
| USUÁRIO ATUAL
|--------------------------------------------------------------------------
*/

app.get("/api/me", authenticate, (req, res) => {
  const user = db
    .prepare(`
      SELECT
        id,
        name,
        email,
        role,
        created_at
      FROM users
      WHERE id = ?
    `)
    .get(req.user.sub);

  const company = db
    .prepare(`
      SELECT
        id,
        name,
        segment,
        size,
        created_at
      FROM companies
      WHERE id = ?
    `)
    .get(req.user.companyId);

  res.json({
    user,
    company,
  });
});

/*
|--------------------------------------------------------------------------
| USUÁRIOS
|--------------------------------------------------------------------------
*/

app.get(
  "/api/users",
  authenticate,
  (req, res) => {
    if(!canReadUserDirectory(req.user.role))return res.status(403).json({error:"FORBIDDEN"});
    const users = db
      .prepare(`
        SELECT
          id,
          name,
          email,
          role,
          active,
          created_at
        FROM users
        WHERE company_id = ?
        ORDER BY created_at DESC
      `)
      .all(req.user.companyId);

    res.json({
      users,
    });
  }
);

app.post(
  "/api/users",
  authenticate,
  async (req, res) => {
    if(!canCreateUser(req.user.role))return res.status(403).json({error:"FORBIDDEN"});

    const {
      name,
      email,
      password,
      role,
    } = req.body || {};

    const validation=validateNewUser({name,email,password,role});
    if(!validation.ok)return res.status(400).json({error:validation.error});

    const userId = id();

    const passwordHash = await bcrypt.hash(
      password,
      12
    );

    db.prepare(`
      INSERT INTO users
      (
        id,
        company_id,
        name,
        email,
        password_hash,
        role,
        active,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      req.user.companyId,
      validation.name,
      validation.email,
      passwordHash,
      validation.role,
      1,
      now()
    );

    audit(
      req,
      "USER_CREATED",
      "user",
      userId,
      {
        role,
        email,
      }
    );

    res.status(201).json({
      id: userId,
      name,
      email: email.toLowerCase(),
      role,
    });
  }
);

/*
|--------------------------------------------------------------------------
| AUDITORIA
|--------------------------------------------------------------------------
*/

app.get(
  "/api/audit",
  authenticate,
  requirePermission("audit:read"),
  (req, res) => {
    const events = db
      .prepare(`
        SELECT
          id,
          user_id,
          action,
          entity,
          entity_id,
          metadata,
          created_at
        FROM audit_log
        WHERE company_id = ?
        ORDER BY created_at DESC
        LIMIT 200
      `)
      .all(req.user.companyId);

    res.json({
      events,
    });
  }
);

/*
|--------------------------------------------------------------------------
| REGISTROS DO NEXUS
|--------------------------------------------------------------------------
*/

app.get(
  "/api/records/:type",
  authenticate,
  requirePermission("record:read"),
  (req, res) => {
    const records = db
      .prepare(`
        SELECT
          id,
          type,
          payload,
          version,
          created_at,
          updated_at
        FROM records
        WHERE company_id = ?
        AND type = ?
        ORDER BY updated_at DESC
      `)
      .all(
        req.user.companyId,
        req.params.type
      );

    res.json({
      records: records.map((record) => ({
        ...record,
        payload: JSON.parse(record.payload),
      })),
    });
  }
);

app.post(
  "/api/records/:type",
  authenticate,
  requirePermission("record:write"),
  (req, res) => {
    if(req.params.type==="workspace"){
      try{
        validateCorrectiveActionMutation({},req.body||{},req.user.email);
        validateGovernanceMutation({},req.body||{},req.user.email);
        validateEvidenceReferences({},req.body||{},fileId=>db.prepare("SELECT action_id,sha256,name FROM evidence_files WHERE id=? AND company_id=?").get(fileId,req.user.companyId));
      }catch(e){return res.status(422).json({error:e.message})}
    }
    const recordId = id();
    const timestamp = now();

    db.prepare(`
      INSERT INTO records
      (
        id,
        company_id,
        type,
        payload,
        version,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      recordId,
      req.user.companyId,
      req.params.type,
      JSON.stringify(req.body || {}),
      1,
      timestamp,
      timestamp
    );

    audit(
      req,
      "RECORD_CREATED",
      "record",
      recordId,
      {
        type: req.params.type,
      }
    );

    res.status(201).json({
      id: recordId,
      type: req.params.type,
    });
  }
);

app.get(
  "/api/records/:id/versions",
  authenticate,
  requirePermission("record:read"),
  (req,res)=>{
    const record=db.prepare("SELECT id,version FROM records WHERE id=? AND company_id=?").get(req.params.id,req.user.companyId);
    if(!record)return res.status(404).json({error:"NOT_FOUND"});
    const versions=db.prepare("SELECT version,changed_by,created_at FROM record_versions WHERE record_id=? AND company_id=? ORDER BY version DESC LIMIT 100").all(req.params.id,req.user.companyId);
    res.json({recordId:record.id,currentVersion:record.version,versions});
  }
);
app.get(
  "/api/records/:id/versions/:version",
  authenticate,
  requirePermission("record:read"),
  (req,res)=>{
    const version=Number(req.params.version);
    if(!Number.isSafeInteger(version)||version<1)return res.status(400).json({error:"INVALID_VERSION"});
    const record=db.prepare("SELECT id FROM records WHERE id=? AND company_id=?").get(req.params.id,req.user.companyId);
    if(!record)return res.status(404).json({error:"NOT_FOUND"});
    const snapshot=db.prepare("SELECT version,payload,changed_by,created_at FROM record_versions WHERE record_id=? AND company_id=? AND version=?").get(req.params.id,req.user.companyId,version);
    if(!snapshot)return res.status(404).json({error:"VERSION_NOT_FOUND"});
    res.json({...snapshot,payload:JSON.parse(snapshot.payload)});
  }
);

app.put(
  "/api/records/:id",
  authenticate,
  requirePermission("record:write"),
  (req, res) => {
    const record = db
      .prepare(`
        SELECT *
        FROM records
        WHERE id = ?
        AND company_id = ?
      `)
      .get(
        req.params.id,
        req.user.companyId
      );

    if (!record) {
      return res.status(404).json({
        error: "NOT_FOUND",
      });
    }

    try{
      validateCorrectiveActionMutation(JSON.parse(record.payload),req.body||{},req.user.email);
      validateGovernanceMutation(JSON.parse(record.payload),req.body||{},req.user.email);
      validateEvidenceReferences(JSON.parse(record.payload),req.body||{},fileId=>db.prepare("SELECT action_id,sha256,name FROM evidence_files WHERE id=? AND company_id=?").get(fileId,req.user.companyId));
    }catch(error){
      return res.status(422).json({error:error.message});
    }
    const expectedVersion = Number(req.get("x-record-version"));
    if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1) {
      return res.status(428).json({error:"VERSION_REQUIRED", currentVersion:record.version});
    }
    if (record.version !== expectedVersion) {
      return res.status(409).json({error:"VERSION_CONFLICT",currentVersion:record.version});
    }
    const timestamp=now();
    const updated=db.transaction(()=>{
      db.prepare(`
        INSERT OR IGNORE INTO record_versions (record_id,company_id,version,payload,changed_by,created_at)
        VALUES (?,?,?,?,?,?)
      `).run(record.id,req.user.companyId,record.version,record.payload,req.user.sub,timestamp);
      const write=db.prepare(`
        UPDATE records SET payload=?, version=version+1, updated_at=?
        WHERE id=? AND company_id=? AND version=?
      `).run(JSON.stringify(req.body||{}),timestamp,req.params.id,req.user.companyId,expectedVersion);
      if(write.changes!==1)throw new Error("CONCURRENT_UPDATE");
      db.prepare(`
        INSERT INTO record_versions (record_id,company_id,version,payload,changed_by,created_at)
        VALUES (?,?,?,?,?,?)
      `).run(record.id,req.user.companyId,expectedVersion+1,JSON.stringify(req.body||{}),req.user.sub,timestamp);
      return write;
    });
    try {updated();} catch(error){
      if(error.message==="CONCURRENT_UPDATE")return res.status(409).json({error:"VERSION_CONFLICT"});
      throw error;
    }

    audit(
      req,
      "RECORD_UPDATED",
      "record",
      req.params.id,
      {
        type: record.type,
      }
    );

    res.json({ok:true,version:expectedVersion+1});
  }
);

/*
|--------------------------------------------------------------------------
| START
|--------------------------------------------------------------------------
*/

app.use(express.static("dist"));

app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) {
    return next();
  }

  res.sendFile("index.html", {
    root: "dist",
  });
});
app.listen(PORT, () => {
  console.log("");
  console.log("======================================");
  console.log("      NEXUS COMPLIANCE ONE API");
  console.log("======================================");
  console.log(`API: http://localhost:${PORT}`);
  console.log("Status: ONLINE");
  console.log("======================================");
  console.log("");
});
