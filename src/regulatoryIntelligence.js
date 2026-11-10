// Official-source regulatory registry. This is a curated baseline, NOT a live legal update feed.
// Every item requires a human applicability and currency review before legal conclusions.
export const REGULATORY_CATALOG_VERSION="2026-11-baseline-1";
export const REGULATORY_CATALOG=Object.freeze([
 {id:"BR-LGPD",name:"Lei Geral de Proteção de Dados Pessoais",reference:"Lei 13.709/2018",authority:"Presidência da República",url:"https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm",segments:["*"],topics:["privacy","security","documentation"],review:"Verificar base legal, agentes de tratamento, direitos e segurança aplicáveis"},
 {id:"BR-ANTICORRUPCAO",name:"Lei Anticorrupção",reference:"Lei 12.846/2013",authority:"Presidência da República",url:"https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/lei/l12846.htm",segments:["*"],topics:["ethics","governance","thirdparty"],review:"Analisar integridade, interações com administração pública e terceiros"},
 {id:"BR-DEC-INTEGRIDADE",name:"Regulamentação federal da Lei Anticorrupção",reference:"Decreto 11.129/2022",authority:"Presidência da República",url:"https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2022/decreto/d11129.htm",segments:["*"],topics:["ethics","governance","monitoring"],review:"Examinar critérios do programa de integridade e escopo aplicável"},
 {id:"BR-PLD",name:"Prevenção à lavagem de dinheiro",reference:"Lei 9.613/1998",authority:"Presidência da República",url:"https://www.planalto.gov.br/ccivil_03/leis/l9613.htm",segments:["Cartórios / Tabelionatos de Notas","Serviços Financeiros"],topics:["legal","controls","monitoring"],review:"Confirmar enquadramento, deveres de identificação, registros e comunicações"},
 {id:"BR-CNJ-149",name:"Código Nacional de Normas do Foro Extrajudicial",reference:"Provimento CNJ 149/2023",authority:"Conselho Nacional de Justiça",url:"https://atos.cnj.jus.br/atos/detalhar/5243",segments:["Cartórios / Tabelionatos de Notas"],topics:["legal","documentation","security"],review:"Consultar texto consolidado e normas da corregedoria estadual"},
 {id:"BR-LICITACOES",name:"Lei de Licitações e Contratos Administrativos",reference:"Lei 14.133/2021",authority:"Presidência da República",url:"https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm",segments:["Administração Pública / Órgãos Públicos"],topics:["legal","thirdparty","governance"],review:"Verificar âmbito de aplicação, fase contratual e regulamentos locais"}
]);
const norm=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
export function applicableRegulations(segment,questions=[]){
 const sector=norm(segment);
 const terms=questions.map(q=>norm(q.topic+" "+q.area+" "+q.text)).join(" ");
 return REGULATORY_CATALOG.filter(r=>r.segments.includes("*")||r.segments.some(s=>norm(s)===sector)).map(r=>({
  ...r,status:"REVISÃO HUMANA NECESSÁRIA",currency:"NÃO VERIFICADA EM TEMPO REAL",
  matches:questions.filter(q=>r.topics.includes(q.key)).length,
  relevant: r.topics.some(t=>terms.includes(norm(t)))||r.segments.includes("*"),
  checkedAt:null
 }));
}
export function createRegulatoryReview(item,reviewer,decision,notes,at=new Date().toISOString()){
 if(!REGULATORY_CATALOG.some(x=>x.id===item.id))throw Error("Norma não catalogada");
 if(!["APLICÁVEL","NÃO APLICÁVEL","EM ANÁLISE"].includes(decision))throw Error("Decisão inválida");
 if(!String(reviewer||"").trim())throw Error("Responsável obrigatório");
 return {id:item.id,reference:item.reference,decision,reviewer:String(reviewer).trim(),notes:String(notes||""),at,sourceUrl:item.url,catalogVersion:REGULATORY_CATALOG_VERSION};
}
export function regulatoryIntelligenceSummary(segment,questions=[],reviews=[]){
 const entries=applicableRegulations(segment,questions);
 const latest=new Map(reviews.map(r=>[r.id,r]));
 return {catalogVersion:REGULATORY_CATALOG_VERSION,liveUpdates:false,entries:entries.map(e=>({...e,review:latest.get(e.id)||null})),reviewed:entries.filter(e=>latest.has(e.id)).length,pending:entries.filter(e=>!latest.has(e.id)).length};
}
