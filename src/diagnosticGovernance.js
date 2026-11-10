// V46 governance helpers: deterministic, sector-scoped and free of browser dependencies.
export const VALID_DIAGNOSTIC_ANSWERS=Object.freeze(["Sim","Parcialmente","Não","N/A"]);
export function diagnosticProgress(questions,answers={}){
 const areas=new Map(),byId=new Set(questions.map(q=>q.id));
 let answered=0,compliant=0,partial=0,noncompliant=0,notApplicable=0;
 for(const q of questions){
  const a=answers[q.id];
  if(!areas.has(q.area))areas.set(q.area,{area:q.area,total:0,answered:0,noncompliant:0});
  const area=areas.get(q.area);area.total++;
  if(!VALID_DIAGNOSTIC_ANSWERS.includes(a))continue;
  answered++;area.answered++;
  if(a==="Sim")compliant++;
  else if(a==="Parcialmente")partial++;
  else if(a==="Não"){noncompliant++;area.noncompliant++;}
  else notApplicable++;
 }
 return {total:questions.length,answered,pending:questions.length-answered,compliant,partial,noncompliant,notApplicable,percent:Math.round(100*answered/Math.max(1,questions.length)),areas:[...areas.values()],ignoredLegacyAnswers:Object.keys(answers).filter(id=>!byId.has(id)).length};
}
export function recordDiagnosticAnswer(state,question,answer,actor="Usuário"){
 if(!question?.id)throw new Error("Pergunta inválida");
 if(!VALID_DIAGNOSTIC_ANSWERS.includes(answer))throw new Error("Resposta inválida");
 const previous=state.answers?.[question.id];
 if(previous===answer)return state;
 const event={id:"AUD-"+Date.now()+"-"+Math.random().toString(36).slice(2,10),type:"DIAGNOSTIC_ANSWER",at:new Date().toISOString(),actor,segment:question.segment,questionId:question.id,area:question.area,previous:previous??null,next:answer};
 return {...state,answers:{...state.answers,[question.id]:answer},auditTrail:[...(state.auditTrail||[]),event].slice(-10000),review:{...state.review,confirmedRisks:false,confirmedActions:false,confirmedLegal:false},workflow:{...state.workflow,questionario:false,riscos:false,acoes:false,juridico:false,relatorio:false}};
}
export function validateDiagnosticLinks(assessment,questions){
 const ids=new Set(),questionIds=new Set(questions.map(q=>q.id)),issues=[];
 for(const risk of assessment.risks||[]){
  if(ids.has(risk.id))issues.push("Risco duplicado: "+risk.id);
  ids.add(risk.id);
  if(!questionIds.has(risk.sourceQuestion)&&!String(risk.sourceQuestion).startsWith("ENGINE-GLOBAL:"))issues.push("Origem não identificada: "+risk.id);
 }
 for(const item of [...(assessment.actions||[]),...(assessment.legal||[])]){
  if(!ids.has(item.riskId))issues.push("Referência de risco inexistente: "+item.riskId);
 }
 return {valid:issues.length===0,issues,risks:assessment.risks?.length||0,actions:assessment.actions?.length||0,legal:assessment.legal?.length||0};
}
export function executiveDiagnosticSummary(questions,answers,assessment){
 const progress=diagnosticProgress(questions,answers);
 const counts={Crítico:0,Alto:0,Médio:0,Baixo:0};
 for(const risk of assessment.risks||[])if(Object.hasOwn(counts,risk.level))counts[risk.level]++;
 return {...progress,riskLevels:counts,risks:assessment.risks?.length||0,actions:assessment.actions?.length||0,legalReviews:assessment.legal?.length||0,integrity:validateDiagnosticLinks(assessment,questions)};
}
