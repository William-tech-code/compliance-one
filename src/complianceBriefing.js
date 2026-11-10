import {regulatoryIntelligenceSummary} from "./regulatoryIntelligence.js";
// Explainable, deterministic assistance; no model inference or real-time legal monitoring.
export function generateComplianceBriefing({segment,questions=[],answers={},risks=[],actions=[],reviews=[]}){
 const regulatory=regulatoryIntelligenceSummary(segment,questions,reviews);
 const missing=questions.filter(q=>answers[q.id]==="Não"||answers[q.id]==="Parcialmente");
 const ranked=[...risks].sort((a,b)=>(Number(b.score)||0)-(Number(a.score)||0)).slice(0,10);
 const actionIds=new Set(actions.map(a=>a.riskId));
 const items=ranked.map(r=>({
  riskId:r.id,title:r.title,level:r.level,score:r.score||null,
  questionId:r.sourceQuestion||null,
  nextStep:actionIds.has(r.id)?"Acompanhar ação vinculada e validar evidências":"Designar responsável, ação e evidência",
  source:"Diagnóstico interno; sujeito a validação humana"
 }));
 return {engine:"ASSISTÊNCIA BASEADA EM REGRAS (SEM MODELO DE IA GENERATIVA)",automatedLegalConclusion:false,liveLegalUpdates:false,
  overview:{answered:questions.filter(q=>Object.hasOwn(answers,q.id)).length,total:questions.length,noncompliant:missing.length,risks:risks.length,actions:actions.length},
  priorities:items,regulatory:{references:regulatory.entries.map(r=>({id:r.id,reference:r.reference,url:r.url,decision:r.review?.decision||"PENDENTE"})),pending:regulatory.pending},
  limitations:["Não substitui parecer jurídico ou auditoria","Referências normativas não verificadas em tempo real","Aplicabilidade requer validação humana"]};
}
