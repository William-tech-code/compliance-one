import {initializeAssessmentEvidenceReviews,submitAssessmentEvidence,reviewAssessmentEvidence} from './v51AssessmentEvidenceReviews.js';

export function configureAssessmentEvidenceReviews({app,db,authenticate,requirePermission,audit,evidenceRoot}) {
  initializeAssessmentEvidenceReviews(db);
  const read=[authenticate,requirePermission('record:read')];
  const write=[authenticate,requirePermission('record:write')];
  const reviewer=[authenticate,(req,res,next)=>{
    if (!['Auditoria','Administrador'].includes(req.user.role))
      return res.status(403).json({error:'REVIEWER_ROLE_REQUIRED'});
    next();
  }];
  const handle=(res,error)=>{
    const code=error.message;
    const status=['CYCLE_NOT_FOUND','EVIDENCE_REVIEW_NOT_FOUND'].includes(code)?404:
      ['CYCLE_CLOSED','EVIDENCE_ALREADY_REVIEWED','INDEPENDENT_REVIEW_REQUIRED'].includes(code)?409:
      ['INVALID_EVIDENCE_REVIEW','CONTROL_NOT_ASSESSED','EVIDENCE_INTEGRITY_NOT_VERIFIED'].includes(code)?422:
      code.startsWith('SQLITE_CONSTRAINT_')?409:500;
    if(status===500)throw error;
    return res.status(status).json({error:code});
  };
  app.get('/api/v51/assessment/cycles/:cycleId/evidence',...read,(req,res)=>{
    const cycle=db.prepare('SELECT id FROM v51_assessment_cycles WHERE company_id=? AND id=?')
      .get(req.user.companyId,req.params.cycleId);
    if(!cycle)return res.status(404).json({error:'CYCLE_NOT_FOUND'});
    const rows=db.prepare('SELECT control_id,evidence_id,submitted_by,reviewer_id,status,review_note,created_at,reviewed_at FROM v51_assessment_evidence_reviews WHERE company_id=? AND cycle_id=? ORDER BY created_at,evidence_id')
      .all(req.user.companyId,req.params.cycleId);
    return res.json({cycleId:req.params.cycleId,evidence:rows,verifiedEvidenceIntegrated:false,legalCertification:false});
  });
  app.post('/api/v51/assessment/cycles/:cycleId/evidence',...write,(req,res)=>{
    try{
      const result=submitAssessmentEvidence(db,{companyId:req.user.companyId,cycleId:req.params.cycleId,
        controlId:req.body?.controlId,evidenceId:req.body?.evidenceId,userId:req.user.sub,evidenceRoot});
      audit(req,'V51_EVIDENCE_SUBMITTED','assessment_cycle',result.cycleId,
        {controlId:result.controlId,evidenceId:result.evidenceId});
      return res.status(201).json(result);
    }catch(error){return handle(res,error);}
  });
  app.post('/api/v51/assessment/cycles/:cycleId/evidence/:evidenceId/review',...reviewer,(req,res)=>{
    try{
      const result=reviewAssessmentEvidence(db,{companyId:req.user.companyId,cycleId:req.params.cycleId,
        controlId:req.body?.controlId,evidenceId:req.params.evidenceId,reviewerId:req.user.sub,
        decision:req.body?.decision,note:req.body?.note??'',evidenceRoot});
      audit(req,'V51_EVIDENCE_REVIEWED','assessment_cycle',result.cycleId,
        {controlId:result.controlId,evidenceId:result.evidenceId,status:result.status});
      return res.json(result);
    }catch(error){return handle(res,error);}
  });
}
