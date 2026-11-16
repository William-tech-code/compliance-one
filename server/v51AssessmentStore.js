import crypto from 'node:crypto';

export function initializeAssessmentStore(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS v51_assessment_cycles (
      id TEXT NOT NULL,
      company_id TEXT NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','closed')),
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      closed_at TEXT,
      PRIMARY KEY(company_id,id)
    );
    CREATE TABLE IF NOT EXISTS v51_assessment_answers (
      company_id TEXT NOT NULL,
      cycle_id TEXT NOT NULL,
      control_id TEXT NOT NULL,
      answer TEXT NOT NULL CHECK(answer IN ('yes','no','unknown')),
      updated_by TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY(company_id,cycle_id,control_id),
      FOREIGN KEY(company_id,cycle_id) REFERENCES v51_assessment_cycles(company_id,id)
    );
    CREATE INDEX IF NOT EXISTS idx_v51_assessment_cycles_company
      ON v51_assessment_cycles(company_id,status);
  `);
}

export function createAssessmentCycle(db, { companyId, userId, title }) {
  if (!companyId || !userId || typeof title !== 'string' ||
      !title.trim() || title.length > 160) throw new Error('INVALID_CYCLE');
  const cycle = {
    id: crypto.randomUUID(), companyId, title: title.trim(),
    status: 'draft', createdAt: new Date().toISOString()
  };
  db.prepare(`INSERT INTO v51_assessment_cycles
    (id,company_id,title,status,created_by,created_at)
    VALUES (?,?,?,?,?,?)`).run(cycle.id, companyId, cycle.title, 'draft', userId, cycle.createdAt);
  return cycle;
}

export function saveAssessmentAnswer(db, { companyId, cycleId, controlId, answer, userId }) {
  if (!companyId || !cycleId || !userId ||
      typeof controlId !== 'string' || !/^[a-zA-Z0-9_:.\\-]{1,120}$/.test(controlId) ||
      !['yes','no','unknown'].includes(answer)) throw new Error('INVALID_ANSWER');
  return db.transaction(() => {
    const cycle = db.prepare(`SELECT status FROM v51_assessment_cycles
      WHERE company_id=? AND id=?`).get(companyId, cycleId);
    if (!cycle) throw new Error('CYCLE_NOT_FOUND');
    if (cycle.status !== 'draft') throw new Error('CYCLE_CLOSED');
    db.prepare(`INSERT INTO v51_assessment_answers
      (company_id,cycle_id,control_id,answer,updated_by,updated_at)
      VALUES (?,?,?,?,?,?)
      ON CONFLICT(company_id,cycle_id,control_id) DO UPDATE SET
        answer=excluded.answer,updated_by=excluded.updated_by,updated_at=excluded.updated_at`)
      .run(companyId, cycleId, controlId, answer, userId, new Date().toISOString());
    return { cycleId, controlId, answer };
  })();
}

export function closeAssessmentCycle(db, { companyId, cycleId }) {
  if (!companyId || !cycleId) throw new Error('INVALID_CYCLE');
  const result = db.prepare(`UPDATE v51_assessment_cycles
    SET status='closed',closed_at=?
    WHERE company_id=? AND id=? AND status='draft'`)
    .run(new Date().toISOString(), companyId, cycleId);
  if (result.changes !== 1) throw new Error('CYCLE_NOT_FOUND_OR_CLOSED');
  return { cycleId, status: 'closed' };
}

export function getAssessmentCycle(db, { companyId, cycleId }) {
  const cycle = db.prepare(`SELECT id,title,status,created_at,closed_at
    FROM v51_assessment_cycles WHERE company_id=? AND id=?`).get(companyId, cycleId);
  if (!cycle) return null;
  const answers = db.prepare(`SELECT control_id,answer,updated_at FROM v51_assessment_answers
    WHERE company_id=? AND cycle_id=? ORDER BY control_id`).all(companyId, cycleId);
  return { ...cycle, answers };
}
