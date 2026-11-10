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
 for(const f of frameworkItems.slice(0,8)){
  const id=next("RISCO");
  const impact=f.tier==="Jurisdictional"?4:3;
  risks.push({id,title:"Exposição de framework — "+f.name,category:f.area,sourceQuestion:"ENGINE-GLOBAL",sourceText:"Camada recomendada: "+f.name,answer:"Detecção automática",p:3,i:impact,score:3*impact,level:riskLevel(3,impact),status:"Pendente de confirmação",cause:"O perfil da organização aciona uma camada de Compliance que precisa ser avaliada.",consequence:"Lacunas podem gerar exposição regulatória, contratual, operacional ou reputacional.",control:"Mapeamento de aplicabilidade a validar.",recommendation:"Executar gap assessment e encaminhar pontos jurídicos aplicáveis para validação.",responsible:"Compliance / Jurídico",created:new Date().toISOString(),automatic:true});
  actions.push({id:next("ACAO"),riskId:id,title:"Gap assessment — "+f.name,description:"Avaliar aplicabilidade, controles, evidências e lacunas.",responsible:"Compliance / Jurídico",priority:"Alto",deadline:"",status:"Pendente de confirmação",evidenceRequired:"Matriz de aplicabilidade e evidências.",automatic:true,created:new Date().toISOString()});
  legal.push({id:next("JUR"),riskId:id,title:"Validação jurídica — "+f.name,reason:"Framework acionado automaticamente pelo perfil global.",status:"Aguardando confirmação",responsible:"Jurídico",automatic:true,created:new Date().toISOString()});
 }
 return {risks,actions,legal};
}
