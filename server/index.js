import {MONITOR_SOURCES,probeRegulation,compareRegulationSnapshot} from "./regulatoryMonitor.js";
import {validateAiRequest,buildAiMessages} from "./aiSafety.js";
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

`);

app.use(helmet());

app.use(
  cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",").map(x => x.trim()) : false,
    credentials: false,
  })
);

app.use(express.json({ limit: "5mb" }));

const id = () => crypto.randomUUID();

const now = () => new Date().toISOString();

function createToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      companyId: user.company_id,
      role: user.role,
      name: user.name,
      email: user.email,
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
    const current = db.prepare("SELECT id, company_id, name, email, role, active FROM users WHERE id = ? AND company_id = ?").get(claims.sub, claims.companyId);
    if (!current || current.active !== 1) {
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

/*
|--------------------------------------------------------------------------
| HEALTH CHECK
|--------------------------------------------------------------------------
*/

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "NEXUS API",
    version: "V124",
    time: now(),
  });
});

/*
|--------------------------------------------------------------------------
| PRIMEIRA EMPRESA + ADMINISTRADOR
|--------------------------------------------------------------------------
*/

const aiCalls=new Map();
app.post("/api/ai/compliance-briefing",authenticate,requirePermission("record:read"),async(req,res)=>{
 const key=process.env.OPENAI_API_KEY;
 if(!key)return res.status(503).json({error:"AI_NOT_CONFIGURED"});
 const model=process.env.OPENAI_MODEL||"gpt-4.1-mini";
 let safe;
 try{safe=validateAiRequest(req.body)}catch(e){return res.status(400).json({error:e.message})}
 const last=aiCalls.get(req.user.sub)||0;
 if(Date.now()-last<15000)return res.status(429).json({error:"AI_RATE_LIMIT"});
 aiCalls.set(req.user.sub,Date.now());
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
    const status=compareRegulationSnapshot(previous,current);
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
 res.json({sources:MONITOR_SOURCES.map(x=>({...x,snapshot:snapshots.find(s=>s.source_id===x.id)||null})),legalValidityVerified:false});
});
app.post("/api/regulatory/monitor/run",authenticate,requirePermission("audit:read"),async(req,res)=>{
 const result=await runRegulatoryMonitor();
 if(result.error)return res.status(409).json(result);
 audit(req,"REGULATORY_MONITOR_RUN","regulatory","",{count:result.results.length});
 res.json(result);
});
if(process.env.REGULATORY_MONITOR_ENABLED==="true"){
 setTimeout(()=>{runRegulatoryMonitor().catch(e=>console.error("REGULATORY_MONITOR",e.message))},20000);
 setInterval(()=>{runRegulatoryMonitor().catch(e=>console.error("REGULATORY_MONITOR",e.message))},24*60*60*1000).unref();
}

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
  } = req.body || {};

  const user = db
    .prepare(`
      SELECT *
      FROM users
      WHERE email = ?
      AND active = 1
    `)
    .get((email || "").toLowerCase());

  if (!user) {
    return res.status(401).json({
      error: "INVALID_CREDENTIALS",
    });
  }

  const validPassword = await bcrypt.compare(
    password || "",
    user.password_hash
  );

  if (!validPassword) {
    return res.status(401).json({
      error: "INVALID_CREDENTIALS",
    });
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
  requirePermission("company:read"),
  (req, res) => {
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
  requirePermission("company:read"),
  async (req, res) => {
    if (
      !["Administrador", "Compliance"].includes(
        req.user.role
      )
    ) {
      return res.status(403).json({
        error: "FORBIDDEN",
      });
    }

    const {
      name,
      email,
      password,
      role,
    } = req.body || {};

    if (
      !name ||
      !email ||
      !password ||
      !permissions[role]
    ) {
      return res.status(400).json({
        error: "MISSING_FIELDS",
      });
    }

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
      name,
      email.toLowerCase(),
      passwordHash,
      role,
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
