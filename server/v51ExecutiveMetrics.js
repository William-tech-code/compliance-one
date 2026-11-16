import {getAssessmentCycle} from './v51AssessmentStore.js';
import {listCorrectiveActions} from './v51CorrectiveActions.js';
import {verifyAssessmentEvidenceCandidate} from './v51EvidenceCandidate.js';
import {summarizeAssessment} from './v51AssessmentEngine.js';

export function getV51ExecutiveMetrics(db,{companyId,cycleId,evidenceRoot,today=new Date().toISOString().slice(0,10)}) {
  if(!companyId||!cycleId||!evidenceRoot)throw new Error('INVALID_EXECUTIVE_METRICS');
  const cycle=getAssessmentCycle(db,{companyId,cycleId});
  if(!cycle)throw new Error('CYCLE_NOT_FOUND');
  const reviews=db.prepare('SELECT control_id,evidence_id,status,reviewer_id,submitted_by FROM v51_assessment_evidence_reviews WHERE company_id=? AND cycle_id=?')
    .all(companyId,cycleId);
  const evidenceByControl=new Map();
  let approvedAndIntact=0,approvedButInvalid=0;
  for(const review of reviews) {
    if(review.status!=='approved')continue;
    const valid=review.reviewer_id&&review.reviewer_id!==review.submitted_by&&
      verifyAssessmentEvidenceCandidate(db,{companyId,evidenceId:review.evidence_id,evidenceRoot}).verified;
    if(!valid){approvedButInvalid++;continue;}
    const row=db.prepare('SELECT sha256 FROM evidence_files WHERE company_id=? AND id=?')
      .get(companyId,review.evidence_id);
    const checksum=row?.sha256?.replace(/^sha256:/,'');
    if(!/^[a-f0-9]{64}$/i.test(checksum||'')){approvedButInvalid++;continue;}
    approvedAndIntact++;
    const list=evidenceByControl.get(review.control_id)||[];
    list.push({tenantId:companyId,reviewStatus:'approved',privateDocumentId:review.evidence_id,checksum});
    evidenceByControl.set(review.control_id,list);
  }
  const controls=cycle.answers.map(row=>({
    tenantId:companyId,controlId:row.control_id,
    declaredAnswer:row.answer==='unknown'?undefined:row.answer,
    evidence:evidenceByControl.get(row.control_id)||[]
  }));
  const assessment=summarizeAssessment(controls,{tenantId:companyId});
  const corrective=listCorrectiveActions(db,{companyId,cycleId,today});
  const actionCounts={open:0,inProgress:0,completed:0,overdue:corrective.overdue};
  for(const action of corrective.actions){
    if(action.status==='open')actionCounts.open++;
    if(action.status==='in_progress')actionCounts.inProgress++;
    if(action.status==='completed')actionCounts.completed++;
  }
  return {
    cycle:{id:cycle.id,title:cycle.title,status:cycle.status},
    assessment:{totals:assessment.totals,coveragePercent:assessment.coveragePercent,
      evidencePercent:assessment.evidencePercent,verifiedPercent:assessment.verifiedPercent,
      maturityByControl:assessment.controls.map(({controlId,maturity,status,evidenceVerified})=>({
        controlId,maturity,status,evidenceVerified}))},
    evidence:{submitted:reviews.length,pending:reviews.filter(r=>r.status==='pending').length,
      rejected:reviews.filter(r=>r.status==='rejected').length,
      approvedAndIntact,approvedButInvalid},
    correctiveActions:actionCounts,
    provisional:true,legalCertification:false,
    notes:'Maturidade documental exige aprovação independente e integridade atual. Testes e monitoramento não foram integrados; nível máximo 2.'
  };
}
