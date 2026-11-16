import crypto from 'node:crypto';

export function initializeCorrectiveActions(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS v51_corrective_actions (
      company_id TEXT NOT NULL,
      id TEXT NOT NULL,
      cycle_id TEXT NOT NULL,
      control_id TEXT NOT NULL,
      description TEXT NOT NULL,
      owner TEXT NOT NULL,
      due_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','in_progress','completed')),
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      PRIMARY KEY(company_id,id),
      FOREIGN KEY(company_id,cycle_id) REFERENCES v51_assessment_cycles(company_id,id)
    );
    CREATE INDEX IF NOT EXISTS idx_v51_corrective_actions_cycle
      ON v51_corrective_actions(company_id,cycle_id,status,due_date);
  `);
}

export function createCorrectiveAction(db, input) {
  const { companyId, cycleId, controlId, description, owner, dueDate, userId } = input;
  if (!companyId || !cycleId || !userId ||
      typeof controlId !== 'string' || !/^[a-zA-Z0-9_:.-]{1,120}$/.test(controlId) ||
      typeof description !== 'string' || !description.trim() || description.length > 2000 ||
      typeof owner !== 'string' || !owner.trim() || owner.length > 160 ||
      typeof dueDate !== 'string' || !/^\\d{4}-\\d{2}-\\d{2}$/.test(dueDate) ||
      Number.isNaN(Date.parse(dueDate + 'T00:00:00Z')) ||
      new Date(dueDate + 'T00:00:00Z').toISOString().slice(0,10) !== dueDate)
    throw new Error('INVALID_CORRECTIVE_ACTION');
  return db.transaction(() => {
    const cycle = db.prepare(`SELECT status FROM v51_assessment_cycles
      WHERE company_id=? AND id=?`).get(companyId, cycleId);
    if (!cycle) throw new Error('CYCLE_NOT_FOUND');
    if (cycle.status !== 'draft') throw new Error('CYCLE_CLOSED');
    const now = new Date().toISOString();
    const action = { id: crypto.randomUUID(), cycleId, controlId,
      description: description.trim(), owner: owner.trim(), dueDate,
      status: 'open', version: 1 };
    db.prepare(`INSERT INTO v51_corrective_actions
      (company_id,id,cycle_id,control_id,description,owner,due_date,status,created_by,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(companyId,action.id,cycleId,controlId,
        action.description,action.owner,dueDate,'open',userId,now,now);
    return action;
  })();
}

export function listCorrectiveActions(db, { companyId, cycleId, today = new Date().toISOString().slice(0,10) }) {
  const cycle = db.prepare(`SELECT id FROM v51_assessment_cycles
    WHERE company_id=? AND id=?`).get(companyId,cycleId);
  if (!cycle) throw new Error('CYCLE_NOT_FOUND');
  const actions = db.prepare(`SELECT id,cycle_id,control_id,description,owner,due_date,status,version
    FROM v51_corrective_actions WHERE company_id=? AND cycle_id=?
    ORDER BY due_date,id`).all(companyId,cycleId);
  return { actions, overdue: actions.filter(a => a.status !== 'completed' && a.due_date < today).length };
}

export function updateCorrectiveActionStatus(db, { companyId, cycleId, actionId, status, expectedVersion }) {
  if (!['open','in_progress','completed'].includes(status) ||
      !Number.isSafeInteger(expectedVersion) || expectedVersion < 1)
    throw new Error('INVALID_CORRECTIVE_ACTION');
  return db.transaction(() => {
    const cycle = db.prepare(`SELECT status FROM v51_assessment_cycles
      WHERE company_id=? AND id=?`).get(companyId,cycleId);
    if (!cycle) throw new Error('CYCLE_NOT_FOUND');
    if (cycle.status !== 'draft') throw new Error('CYCLE_CLOSED');
    const result = db.prepare(`UPDATE v51_corrective_actions
      SET status=?,version=version+1,updated_at=?
      WHERE company_id=? AND cycle_id=? AND id=? AND version=?`)
      .run(status,new Date().toISOString(),companyId,cycleId,actionId,expectedVersion);
    if (result.changes !== 1) throw new Error('ACTION_NOT_FOUND_OR_VERSION_CONFLICT');
    return { actionId, status, version: expectedVersion + 1 };
  })();
}
