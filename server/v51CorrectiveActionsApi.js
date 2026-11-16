import {
  initializeCorrectiveActions, createCorrectiveAction,
  listCorrectiveActions, updateCorrectiveActionStatus
} from './v51CorrectiveActions.js';

export function configureCorrectiveActions({ app, db, authenticate, requirePermission, audit }) {
  initializeCorrectiveActions(db);
  const read = [authenticate, requirePermission('record:read')];
  const write = [authenticate, requirePermission('record:write')];
  function handle(res, error) {
    const code = error.message;
    const status = code === 'CYCLE_NOT_FOUND' ? 404 :
      code === 'CYCLE_CLOSED' || code === 'ACTION_NOT_FOUND_OR_VERSION_CONFLICT' ? 409 :
      code === 'INVALID_CORRECTIVE_ACTION' ? 422 : 500;
    if (status === 500) throw error;
    return res.status(status).json({ error: code });
  }
  app.get('/api/v51/assessment/cycles/:cycleId/actions', ...read, (req, res) => {
    try {
      return res.json(listCorrectiveActions(db, {
        companyId: req.user.companyId, cycleId: req.params.cycleId
      }));
    } catch (error) { return handle(res, error); }
  });
  app.post('/api/v51/assessment/cycles/:cycleId/actions', ...write, (req, res) => {
    try {
      const action = createCorrectiveAction(db, {
        companyId: req.user.companyId, cycleId: req.params.cycleId,
        controlId: req.body?.controlId, description: req.body?.description,
        owner: req.body?.owner, dueDate: req.body?.dueDate, userId: req.user.sub
      });
      audit(req, 'V51_CORRECTIVE_ACTION_CREATED', 'corrective_action', action.id,
        { cycleId: action.cycleId, controlId: action.controlId });
      return res.status(201).json(action);
    } catch (error) { return handle(res, error); }
  });
  app.patch('/api/v51/assessment/cycles/:cycleId/actions/:actionId', ...write, (req, res) => {
    try {
      const action = updateCorrectiveActionStatus(db, {
        companyId: req.user.companyId, cycleId: req.params.cycleId,
        actionId: req.params.actionId, status: req.body?.status,
        expectedVersion: req.body?.expectedVersion
      });
      audit(req, 'V51_CORRECTIVE_ACTION_STATUS_UPDATED', 'corrective_action', action.actionId,
        { cycleId: req.params.cycleId, status: action.status });
      return res.json(action);
    } catch (error) { return handle(res, error); }
  });
}
