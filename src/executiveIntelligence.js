// V47 Executive Intelligence: deterministic, explainable metrics from tenant workspace.
const list=x=>Array.isArray(x)?x:[];
const num=x=>Number.isFinite(Number(x))?Number(x):0;
const isoDate=x=>{const t=Date.parse(x||"");return Number.isFinite(t)?t:null};
const levels={Crítico:4,Alto:3,Médio:2,Baixo:1};
export function executiveIntelligence(workspace={},at=new Date().toISOString()){
 const risks=list(workspace.risks),actions=list(workspace.correctiveActions),evidence=list(workspace.evidence);
 const now=Date.parse(at);
 const confirmed=risks.filter(r=>r.status==="Confirmado"||r.confirmed===true);
 const pending=risks.filter(r=>!confirmed.includes(r));
 const bySeverity=Object.fromEntries(Object.keys(levels).map(level=>[level,risks.filter(r=>r.level===level).length]));
 const overdue=actions.filter(a=>a.dueAt&&isoDate(a.dueAt)!==null&&isoDate(a.dueAt)<now&&!["CONCLUÍDA","CANCELADA"].includes(a.status));
 const waiting=actions.filter(a=>a.status==="EM VALIDAÇÃO");
 const completed=actions.filter(a=>a.status==="CONCLUÍDA");
 const unassigned=actions.filter(a=>!String(a.owner||"").trim());
 const totalQuestions=Object.keys(workspace.answers||{}).length;
 const answered=Object.values(workspace.answers||{}).filter(a=>a!==null&&a!==undefined&&a!=="").length;
 const completion=totalQuestions?Math.round(answered/totalQuestions*100):null;
 const score=risks.length?Math.round(risks.reduce((s,r)=>s+num(r.score||num(r.p)*num(r.i)),0)/risks.length*10)/10:null;
 const alerts=[
  ...overdue.map(a=>({id:"overdue-"+a.id,severity:"Crítico",title:"Ação corretiva vencida",detail:a.title||a.id,owner:a.owner||"Não atribuído",kind:"action"})),
  ...waiting.map(a=>({id:"review-"+a.id,severity:"Alto",title:"Aprovação independente pendente",detail:a.title||a.id,owner:a.owner||"Não atribuído",kind:"action"})),
  ...unassigned.map(a=>({id:"owner-"+a.id,severity:"Médio",title:"Ação sem responsável",detail:a.title||a.id,owner:"Não atribuído",kind:"action"}))
 ].sort((a,b)=>(levels[b.severity]||0)-(levels[a.severity]||0));
 return {
  company:workspace.company?.name||"Organização não identificada",
  asOf:at,
  risks:{total:risks.length,confirmed:confirmed.length,pendingReview:pending.length,bySeverity,averageScore:score},
  actions:{total:actions.length,overdue:overdue.length,pendingValidation:waiting.length,completed:completed.length,completionRate:actions.length?Math.round(completed.length/actions.length*100):null},
  evidence:{records:evidence.length,attachedToActions:actions.reduce((sum,a)=>sum+list(a.evidences).length,0)},
  diagnostic:{answered,questionsInWorkspace:totalQuestions,completionRate:completion},
  alerts,
  limitations:["Indicadores calculados a partir dos dados registrados, sem auditoria independente","Riscos não confirmados não constituem infrações legais comprovadas","Percentual de respostas refere-se apenas às perguntas registradas no workspace"]
 };
}
export function exportExecutiveSnapshot(snapshot){
 return JSON.stringify({format:"NEXORA-EXECUTIVE-V47",generatedAt:snapshot.asOf,...snapshot},null,2);
}
