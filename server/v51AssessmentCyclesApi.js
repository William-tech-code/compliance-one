import {
  initializeAssessmentStore, createAssessmentCycle, saveAssessmentAnswer,
  closeAssessmentCycle, getAssessmentCycle
} from './v51AssessmentStore.js';
import { summarizeAssessment } from './v51AssessmentEngine.js';

export function configureAssessmentCycles({ app, db, authenticate, requirePermission, audit }) {
  initializeAssessmentStore(db);
  const read = [authenticate, requirePermission('record:read')];
  const write = [authenticate, requirePermission('record:write')];
  const sendError = (res, error) => {
    const code = error.message;
    const status = code === 'CYCLE_NOT_FOUND' ? 404 :
      code === 'CYCLE_NOT_FOUND_OR_CLOSED' || code === 'CYCLE_CLOSED' ? 409 :
      code === 'INVALID_CYCLE' || code === 'INVALID_ANSWER' ? 422 : 500;
    if (status === 500) throw error;
    return res.status(status).json({ error: code });
  };

  app.post('/api/v51/assessment/cycles', ...write, (req, res) => {
    try {
      const cycle = createAssessmentCycle(db, {
        companyId: req.user.companyId, userId: req.user.sub, title: req.body?.title
      });
      audit(req, 'V51_ASSESSMENT_CYCLE_CREATED', 'assessment_cycle', cycle.id);
      return res.status(201).json(cycle);
    } catch (error) { return sendError(res, error); }
  });

  app.get('/api/v51/assessment/cycles/:cycleId', ...read, (req, res) => {
    const cycle = getAssessmentCycle(db, {
      companyId: req.user.companyId, cycleId: req.params.cycleId
    });
    if (!cycle) return res.status(404).json({ error: 'CYCLE_NOT_FOUND' });
    const controls = cycle.answers.map(row => ({
      tenantId: req.user.companyId, controlId: row.control_id,
      declaredAnswer: row.answer === 'unknown' ? undefined : row.answer
    }));
    return res.json({
      cycle, summary: summarizeAssessment(controls, { tenantId: req.user.companyId }),
      provisional: true, verifiedEvidenceIntegrated: false, legalCertification: false
    });
  });

  app.put('/api/v51/assessment/cycles/:cycleId/answers/:controlId', ...write, (req, res) => {
    try {
      const answer = saveAssessmentAnswer(db, {
        companyId: req.user.companyId, cycleId: req.params.cycleId,
        controlId: req.params.controlId, answer: req.body?.answer, userId: req.user.sub
      });
      audit(req, 'V51_ASSESSMENT_ANSWER_SAVED', 'assessment_cycle', answer.cycleId,
        { controlId: answer.controlId });
      return res.json(answer);
    } catch (error) { return sendError(res, error); }
  });

  app.post('/api/v51/assessment/cycles/:cycleId/close', ...write, (req, res) => {
    try {
      const result = closeAssessmentCycle(db, {
        companyId: req.user.companyId, cycleId: req.params.cycleId
      });
      audit(req, 'V51_ASSESSMENT_CYCLE_CLOSED', 'assessment_cycle', result.cycleId);
      return res.json(result);
    } catch (error) { return sendError(res, error); }
  });
}
