// Operational compliance controls: traceable, deterministic, auditable, no external side effects.
const STATES=["ABERTA","EM EXECUÇÃO","EM VALIDAÇÃO","CONCLUÍDA","CANCELADA"];
const safe=s=>String(s||"").trim();
const iso=(value)=>{const t=Date.parse(value);if(!Number.isFinite(t))throw Error("Data inválida");return new Date(t).toISOString()};
export function createCorrectiveAction({id,riskId,title,owner,dueAt,evidenceRequired=true},actor,at=new Date().toISOString()){
 if(!safe(id)||!safe(riskId)||!safe(title)||!safe(owner)||!safe(actor))throw Error("Identificação, risco, título, responsável e autor obrigatórios");
 return {id,riskId,title,owner,dueAt:dueAt?iso(dueAt):null,evidenceRequired,status:"ABERTA",evidences:[],events:[{type:"CRIADA",actor,at:iso(at)}],verifiedBy:null,verifiedAt:null};
}
export function attachEvidence(action,{id,name,hash,source,uploadedAt},actor){
 if(!safe(actor)||!safe(id)||!safe(name)||!/^sha256:[a-f0-9]{64}$/i.test(safe(hash)))throw Error("Evidência exige identificador, nome, SHA-256 e responsável");
 if(action.evidences.some(e=>e.id===id))throw Error("Evidência duplicada");
 const at=iso(uploadedAt||new Date().toISOString());
 return {...action,evidences:[...action.evidences,{id,name,hash,source:safe(source),uploadedAt:at,uploadedBy:actor}],events:[...action.events,{type:"EVIDÊNCIA_ANEXADA",actor,at,reference:id}]};
}
export function transitionCorrectiveAction(action,next,actor,at=new Date().toISOString()){
 if(!STATES.includes(next)||!safe(actor))throw Error("Estado ou responsável inválido");
 const allowed={"ABERTA":["EM EXECUÇÃO","CANCELADA"],"EM EXECUÇÃO":["EM VALIDAÇÃO","CANCELADA"],"EM VALIDAÇÃO":["EM EXECUÇÃO","CONCLUÍDA"],"CONCLUÍDA":[],"CANCELADA":[]};
 if(!allowed[action.status]?.includes(next))throw Error("Transição não autorizada");
 if(next==="CONCLUÍDA"){
  if(action.evidenceRequired&&!action.evidences.length)throw Error("Conclusão exige evidência");
  if(actor===action.owner)throw Error("Aprovação deve ser independente do responsável");
 }
 const timestamp=iso(at);
 return {...action,status:next,verifiedBy:next==="CONCLUÍDA"?actor:null,verifiedAt:next==="CONCLUÍDA"?timestamp:null,events:[...action.events,{type:"STATUS_"+next,actor,at:timestamp}]};
}
export function complianceOperationsSummary(actions=[],asOf=new Date().toISOString()){
 const today=Date.parse(iso(asOf));
 const overdue=actions.filter(a=>a.dueAt&&Date.parse(a.dueAt)<today&&!["CONCLUÍDA","CANCELADA"].includes(a.status));
 const unverified=actions.filter(a=>a.status==="EM VALIDAÇÃO");
 return {total:actions.length,open:actions.filter(a=>a.status==="ABERTA").length,inProgress:actions.filter(a=>a.status==="EM EXECUÇÃO").length,pendingValidation:unverified.length,completed:actions.filter(a=>a.status==="CONCLUÍDA").length,overdue:overdue.length,overdueIds:overdue.map(a=>a.id),alerts:overdue.map(a=>({actionId:a.id,type:"PRAZO_VENCIDO",owner:a.owner,dueAt:a.dueAt}))};
}
export function auditReadiness({actions=[],reviews=[]}){
 const summary=complianceOperationsSummary(actions);
 return {ready:summary.overdue===0&&summary.pendingValidation===0&&reviews.length>0,openFindings:summary.overdue+summary.pendingValidation,pendingLegalReview:reviews.filter(r=>r.decision==="EM ANÁLISE").length,limitations:["Indicador operacional, não certificação nem parecer jurídico"]};
}
