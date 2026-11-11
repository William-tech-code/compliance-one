import express from "express";
import cors from "cors";
import helmet from "helmet";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import Database from "better-sqlite3";
import crypto from "node:crypto";

const app = express();

const PORT = Number(process.env.PORT || 8787);
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET must be configured with at least 32 characters.");
}

const db = new Database(process.env.DATABASE_PATH || "nexus.sqlite");

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
`);

app.use(helmet());

app.use(
  cors({
    origin: true,
    credentials: true,
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
    const currentUser = db.prepare("SELECT id, company_id, role, active FROM users WHERE id = ? AND company_id = ?").get(claims.sub, claims.companyId);
    if (!currentUser || currentUser.active !== 1) return res.status(401).json({ error: "SESSION_REVOKED" });
    req.user = { ...claims, companyId: currentUser.company_id, role: currentUser.role };
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

app.post("/api/bootstrap", async (req, res) => {
  if (db.prepare("SELECT COUNT(*) AS count FROM users").get().count > 0) {
    return res.status(403).json({ error: "BOOTSTRAP_DISABLED" });
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

    db.prepare(`
      UPDATE records
      SET
        payload = ?,
        version = version + 1,
        updated_at = ?
      WHERE id = ?
      AND company_id = ?
    `).run(
      JSON.stringify(req.body || {}),
      now(),
      req.params.id,
      req.user.companyId
    );

    audit(
      req,
      "RECORD_UPDATED",
      "record",
      req.params.id,
      {
        type: record.type,
      }
    );

    res.json({
      ok: true,
    });
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
