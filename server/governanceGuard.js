// Server-side validation for the V47 enterprise governance register.
// All workspace writes are checked against the authenticated user's identity.
const kinds=new Set(["TERCEIRO","POLITICA","TREINAMENTO","AUDITORIA"]);
const statuses=new Set(["ABERTO","EM ANÁLISE","APROVADO","REPROVADO"]);
const obj=x=>x!==null&&typeof x==="object"&&!Array.isArray(x);
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const required=x=>typeof x==="string"&&x.trim().length>0;
export function validateGovernanceMutation(previous,next,actor){
 const old=Array.isArray(previous?.governanceItems)?previous.governanceItems:[];
 const items=Array.isArray(next?.governanceItems)?next.governanceItems:[];
 if(items.length>1000)throw Error("GOVERNANCE_LIMIT_EXCEEDED");
 const prior=new Map(old.map(x=>[x.id,x])),seen=new Set();
 for(const item of items){
  if(!obj(item)||!required(item.id)||!required(item.title)||!kinds.has(item.kind)||!statuses.has(item.status)||seen.has(item.id)||!Array.isArray(item.history))throw Error("INVALID_GOVERNANCE_ITEM");
  seen.add(item.id);
  const before=prior.get(item.id);
  if(!before){
   if(item.status!=="ABERTO"||item.createdBy!==actor||item.reviewedBy!==null||item.history.length!==1||item.history[0]?.type!=="CREATED"||item.history[0]?.actor!==actor)throw Error("GOVERNANCE_CREATION_FORGED");
   continue;
  }
  if(["APROVADO","REPROVADO"].includes(before.status)&&!same(before,item))throw Error("GOVERNANCE_FINAL_IMMUTABLE");
  for(const field of ["id","kind","title","owner","dueAt","description","createdAt","createdBy"]){
   if(!same(before[field],item[field]))throw Error("GOVERNANCE_CORE_IMMUTABLE");
  }
  if(item.history.length<before.history.length||!same(item.history.slice(0,before.history.length),before.history))throw Error("GOVERNANCE_AUDIT_TAMPERED");
  const added=item.history.slice(before.history.length);
  if(item.status===before.status){
   if(added.length||item.reviewedBy!==before.reviewedBy)throw Error("GOVERNANCE_REVIEW_FORGED");
   continue;
  }
  if(added.length!==1||added[0].type!==item.status||added[0].actor!==actor)throw Error("GOVERNANCE_REVIEW_FORGED");
  if(item.status==="ABERTO")throw Error("GOVERNANCE_REOPEN_FORBIDDEN");
  if(item.status==="APROVADO"&&actor===before.createdBy)throw Error("GOVERNANCE_INDEPENDENT_REVIEW_REQUIRED");
  if(item.reviewedBy!==(item.status==="EM ANÁLISE"?null:actor))throw Error("GOVERNANCE_REVIEWER_FORGED");
 }
 if(old.some(x=>!seen.has(x.id)))throw Error("GOVERNANCE_DELETION_FORBIDDEN");
}
