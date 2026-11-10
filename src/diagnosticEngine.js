// Deterministic diagnostic assessment, independent of React and browser storage.
// Outputs are recommendations pending review, never confirmed legal findings.
export function assessDiagnostic(questions, answers, riskLibrary, riskLevel, frameworkItems = []) {
 const risks=[],actions=[],legal=[];
 let seq=0;
 const next=(prefix)=>prefix+"-AUTO-"+String(++seq).padStart(5,"0");
 for(const q of questions){
  const answer=answers?.[q.id];
  if(answer!=="Não" && answer!=="Parcialmente")continue;
  const lib=riskLibrary[q.key]||riskLibrary.controls;
  if(!lib)throw new Error("Risk library missing fallback controls");
  const probability=answer==="Não"?4:3;
  const impact=lib.legal?4:3;
  const level=riskLevel(probability,impact);
  const id=next("RISCO");
  risks.push({id,title:lib.title+" — "+q.area,category:q.area,sourceQuestion:q.id,sourceText:q.text,answer,p:probability,i:impact,score:probability*impact,level,status:"Pendente de confirmação",cause:lib.cause,consequence:lib.consequence,control:"Controle a validar no diagnóstico.",recommendation:lib.recommendation,responsible:lib.owner,created:new Date().toISOString(),automatic:true});
  actions.push({id:next("ACAO"),riskId:id,title:lib.action,description:lib.recommendation,responsible:lib.owner,priority:level,deadline:"",status:"Pendente de confirmação",evidenceRequired:"Evidência documental da implementação e eficácia.",automatic:true,created:new Date().toISOString()});
  if(lib.legal)legal.push({id:next("JUR"),riskId:id,title:"Avaliação jurídica — "+lib.title,reason:"Achado "+level.toLowerCase()+" relacionado a "+q.area+". Potencial impacto legal, regulatório, contratual ou de responsabilidade.",status:"Aguardando confirmação",responsible:"Jurídico",automatic:true,created:new Date().toISOString()});
 }
 // Applicable frameworks are review obligations, not evidence of non-compliance.
 // Only explicit confirmed gap findings can generate automatic risk candidates.
 for(const f of frameworkItems.filter(x=>x.gapConfirmed===true && x.applicabilityReviewed===true).slice(0,8)){
  const id=next("RISCO");
  const impact=f.tier==="Jurisdictional"?4:3;
  risks.push({id,title:"Lacuna confirmada de framework — "+f.name,category:f.area,sourceQuestion:"ENGINE-GLOBAL:"+f.id,sourceText:"Lacuna revisada: "+f.name,answer:"Lacuna confirmada",p:3,i:impact,score:3*impact,level:riskLevel(3,impact),status:"Pendente de confirmação",cause:"Lacuna identificada em avaliação de aplicabilidade.",consequence:"Exposição regulatória, contratual ou operacional a validar.",control:"Controle com lacuna documentada.",recommendation:"Definir tratamento, responsável e evidência de eficácia.",responsible:"Compliance / Jurídico",created:new Date().toISOString(),automatic:true});
  actions.push({id:next("ACAO"),riskId:id,title:"Tratar lacuna — "+f.name,description:"Validar e corrigir a lacuna identificada.",responsible:"Compliance / Jurídico",priority:riskLevel(3,impact),deadline:"",status:"Pendente de confirmação",evidenceRequired:"Matriz de aplicabilidade e evidências.",automatic:true,created:new Date().toISOString()});
  legal.push({id:next("JUR"),riskId:id,title:"Validação jurídica — "+f.name,reason:"Lacuna de framework previamente revisada.",status:"Aguardando confirmação",responsible:"Jurídico",automatic:true,created:new Date().toISOString()});
 }
 return {risks,actions,legal};
}
