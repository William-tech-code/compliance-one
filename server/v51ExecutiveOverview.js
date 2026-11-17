import {listAssessmentCycles} from './v51AssessmentStore.js';
import {getV51ExecutiveMetrics} from './v51ExecutiveMetrics.js';

const ratio=(n,d)=>d?Math.round(n/d*10000)/100:null;

export function getV51ExecutiveOverview(db,{companyId,evidenceRoot,today=new Date().toISOString().slice(0,10)}){
  if(!companyId||!evidenceRoot)throw new Error('INVALID_EXECUTIVE_OVERVIEW');
  const cycles=listAssessmentCycles(db,{companyId,limit:50});
  const history=cycles.filter(c=>c.status==='closed').slice(0,12).reverse().map(c=>{
    const report=getV51ExecutiveMetrics(db,{companyId,cycleId:c.id,evidenceRoot,today});
    return {cycleId:c.id,title:c.title,closedAt:c.closed_at,
      coveragePercent:report.assessment.coveragePercent,
      documentedPercent:report.assessment.evidencePercent,
      assessed:report.assessment.totals.assessed,
      overdueActions:report.correctiveActions.overdue};
  });
  const active=cycles.find(c=>c.status==='draft')||cycles[0];
  if(!active)return {cycles:0,activeCycleId:null,alerts:[],history:[],
    trend:{coverageChangePoints:null,reason:'INSUFFICIENT_COMPLETED_CYCLES'},
    provisional:true,legalCertification:false};
  const report=getV51ExecutiveMetrics(db,{companyId,cycleId:active.id,evidenceRoot,today});
  const alerts=[];
  if(report.correctiveActions.overdue>0)alerts.push({code:'OVERDUE_ACTIONS',severity:'high',
    count:report.correctiveActions.overdue,message:'Ações corretivas com prazo vencido'});
  if(report.evidence.approvedButInvalid>0)alerts.push({code:'INVALID_EVIDENCE',severity:'high',
    count:report.evidence.approvedButInvalid,message:'Evidências aprovadas sem integridade confirmada'});
  if(report.evidence.pending>0)alerts.push({code:'EVIDENCE_REVIEW_PENDING',severity:'medium',
    count:report.evidence.pending,message:'Evidências aguardando revisão independente'});
  if(report.assessment.totals.applicable>0&&report.assessment.coveragePercent<100)
    alerts.push({code:'ASSESSMENT_INCOMPLETE',severity:'medium',
      count:report.assessment.totals.applicable-report.assessment.totals.assessed,
      message:'Controles registrados ainda não avaliados'});
  const last=history.at(-1),previous=history.at(-2);
  const trend=last&&previous&&last.coveragePercent!==null&&previous.coveragePercent!==null
    ?{coverageChangePoints:Math.round((last.coveragePercent-previous.coveragePercent)*100)/100,
      fromCycleId:previous.cycleId,toCycleId:last.cycleId,
      caveat:'Cobertura de controles registrados em cada ciclo; não representa comparação de escopo padronizado.'}
    :{coverageChangePoints:null,reason:'INSUFFICIENT_COMPLETED_CYCLES'};
  return {cycles:cycles.length,activeCycleId:active.id,alerts,history,trend,
    provisional:true,legalCertification:false,
    notes:'Alertas calculados sobre o ciclo ativo. Histórico de ciclos encerrados usa estado atual dos documentos; não é fotografia imutável da data do encerramento.'};
}
