// Server-side validation of audit-sensitive workspace mutations.
// No UI-only approval can bypass these rules.
const statuses=new Set(["ABERTA","EM EXECUÇÃO","EM VALIDAÇÃO","CONCLUÍDA","CANCELADA"]);
const isObject=x=>x!==null&&typeof x==="object"&&!Array.isArray(x);
export function validateCorrectiveActionMutation(previous,next,actor){
 const before=Array.isArray(previous?.correctiveActions)?previous.correctiveActions:[];
 const after=Array.isArray(next?.correctiveActions)?next.correctiveActions:[];
 if(after.length>2000)throw Error("TOO_MANY_ACTIONS");
 const old=new Map(before.map(a=>[a.id,a]));
 const seen=new Set();
 for(const action of after){
  if(!isObject(action)||!action.id||!action.riskId||!action.owner||!statuses.has(action.status)||seen.has(action.id))throw Error("INVALID_CORRECTIVE_ACTION");
  seen.add(action.id);
  if(!Array.isArray(action.evidences)||!Array.isArray(action.events))throw Error("INVALID_AUDIT_TRAIL");
  const prior=old.get(action.id);
  if(!prior){
   if(action.status!=="ABERTA"||action.events.length!==1||action.events[0]?.type!=="CRIADA"||action.events[0]?.actor!==actor)throw Error("INVALID_ACTION_CREATION");
   continue;
  }
  if(prior.status==="CONCLUÍDA"||prior.status==="CANCELADA"){
   if(JSON.stringify(prior)!==JSON.stringify(action))throw Error("FINAL_ACTION_IMMUTABLE");
   continue;
  }
  if(action.events.length<prior.events.length||JSON.stringify(action.events.slice(0,prior.events.length))!==JSON.stringify(prior.events))throw Error("AUDIT_TRAIL_TAMPERED");
  if(action.evidences.length<prior.evidences.length||JSON.stringify(action.evidences.slice(0,prior.evidences.length))!==JSON.stringify(prior.evidences))throw Error("EVIDENCE_TAMPERED");
  const additions=action.events.slice(prior.events.length);
  if(additions.some(e=>e.actor!==actor))throw Error("AUDIT_ACTOR_MISMATCH");
  if(action.status!==prior.status){
   const allowed={ABERTA:["EM EXECUÇÃO","CANCELADA"],"EM EXECUÇÃO":["EM VALIDAÇÃO","CANCELADA"],"EM VALIDAÇÃO":["EM EXECUÇÃO","CONCLUÍDA"]};
   if(!allowed[prior.status]?.includes(action.status))throw Error("INVALID_STATUS_TRANSITION");
   if(!additions.some(e=>e.type==="STATUS_"+action.status))throw Error("STATUS_EVENT_REQUIRED");
   if(action.status==="CONCLUÍDA"){
    if(action.evidenceRequired&&!action.evidences.length)throw Error("EVIDENCE_REQUIRED");
    if(actor===action.owner||action.verifiedBy!==actor)throw Error("INDEPENDENT_VERIFIER_REQUIRED");
   }
  }
  for(const evidence of action.evidences.slice(prior.evidences.length)){
   if(!/^sha256:[a-f0-9]{64}$/i.test(String(evidence.hash||""))||evidence.uploadedBy!==actor)throw Error("INVALID_EVIDENCE");
  }
 }
 if(before.some(a=>!seen.has(a.id)))throw Error("ACTION_DELETION_FORBIDDEN");
}
