// V47 enterprise governance register: explicit records, no unverified external checks.
const list=x=>Array.isArray(x)?x:[];
const safe=x=>String(x??"").trim();
const validDate=x=>!x||Number.isFinite(Date.parse(x));
export function createGovernanceItem(input,actor,at=new Date().toISOString()){
 const kind=safe(input.kind);
 if(!["TERCEIRO","POLITICA","TREINAMENTO","AUDITORIA","DENUNCIA"].includes(kind))throw Error("INVALID_GOVERNANCE_KIND");
 if(!safe(input.id)||!safe(input.title)||!safe(actor))throw Error("REQUIRED_GOVERNANCE_FIELDS");
 if(!validDate(input.dueAt))throw Error("INVALID_DUE_DATE");
 return {id:safe(input.id),kind,title:safe(input.title),owner:safe(input.owner),dueAt:input.dueAt||null,description:safe(input.description).slice(0,2000),status:"ABERTO",createdAt:at,createdBy:actor,history:[{type:"CREATED",actor,at}],reviewedBy:null};
}
export function reviewGovernanceItem(item,decision,actor,at=new Date().toISOString()){
 if(!["EM ANÁLISE","APROVADO","REPROVADO"].includes(decision)||!safe(actor))throw Error("INVALID_REVIEW");
 if(decision==="APROVADO"&&actor===item.createdBy)throw Error("INDEPENDENT_REVIEW_REQUIRED");
 if(item.status==="APROVADO"||item.status==="REPROVADO")throw Error("FINAL_REVIEW_IMMUTABLE");
 return {...item,status:decision,reviewedBy:decision==="EM ANÁLISE"?null:actor,history:[...list(item.history),{type:decision,actor,at}]};
}
export function governancePortfolio(items=[],at=new Date().toISOString()){
 const now=Date.parse(at),out={total:0,open:0,approved:0,overdue:0,byKind:{},alerts:[]};
 for(const item of list(items)){
  out.total++;
  out.byKind[item.kind]=(out.byKind[item.kind]||0)+1;
  if(item.status==="APROVADO")out.approved++;
  if(!["APROVADO","REPROVADO"].includes(item.status)){
   out.open++;
   if(item.dueAt&&Date.parse(item.dueAt)<now){out.overdue++;out.alerts.push({id:item.id,kind:item.kind,title:item.title,owner:item.owner})}
  }
 }
 return out;
}
