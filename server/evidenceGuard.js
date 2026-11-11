// Verifies workspace evidence references against server-stored original files.
// Call only after tenant-authenticated record lookup.
export function validateEvidenceReferences(previous,next,lookup){
 const before=Array.isArray(previous?.correctiveActions)?previous.correctiveActions:[];
 const after=Array.isArray(next?.correctiveActions)?next.correctiveActions:[];
 const known=new Map(before.map(a=>[a.id,a]));
 for(const action of after){
  const previousEvidence=new Set((known.get(action.id)?.evidences||[]).map(e=>e.id));
  for(const evidence of action.evidences||[]){
   if(previousEvidence.has(evidence.id))continue;
   if(typeof evidence.id!=="string"||!evidence.id)throw Error("EVIDENCE_ID_REQUIRED");
   const stored=lookup(evidence.id);
   if(!stored||stored.action_id!==action.id||stored.sha256!==evidence.hash||stored.name!==evidence.name)throw Error("EVIDENCE_ORIGINAL_NOT_VERIFIED");
  }
 }
}
