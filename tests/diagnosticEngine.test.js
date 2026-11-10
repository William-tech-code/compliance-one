import test from "node:test";
import assert from "node:assert/strict";
import {buildEnterpriseQuestions} from "../src/enterpriseQuestionBank.js";
import {assessDiagnostic} from "../src/diagnosticEngine.js";
const library={
 controls:{title:"Falha de controle",cause:"Ausência de controle",consequence:"Exposição",recommendation:"Corrigir controle",action:"Implementar controle",owner:"Compliance",legal:false},
 privacy:{title:"Privacidade",cause:"Falha",consequence:"Exposição",recommendation:"Revisar",action:"Adequar",owner:"DPO",legal:true}
};
const riskLevel=(p,i)=>p*i>=12?"Alto":"Médio";
test("800 affirmative answers create no false nonconformity",()=>{
 const q=buildEnterpriseQuestions("Hotelaria / Turismo");
 const answers=Object.fromEntries(q.map(x=>[x.id,"Sim"]));
 const out=assessDiagnostic(q,answers,library,riskLevel);
 assert.equal(out.risks.length,0);assert.equal(out.actions.length,0);assert.equal(out.legal.length,0);
});
test("800 negative answers create 800 linked actions with unique IDs",()=>{
 const q=buildEnterpriseQuestions("Logística / Transportes");
 const answers=Object.fromEntries(q.map(x=>[x.id,"Não"]));
 const out=assessDiagnostic(q,answers,library,riskLevel);
 assert.equal(out.risks.length,800);assert.equal(out.actions.length,800);
 assert.equal(new Set(out.risks.map(x=>x.sourceQuestion)).size,800);
 assert.equal(new Set(out.risks.map(x=>x.id)).size,800);
 const riskIds=new Set(out.risks.map(x=>x.id));
 assert.ok(out.actions.every(x=>riskIds.has(x.riskId)));
 assert.ok(out.risks.every(x=>x.status==="Pendente de confirmação"));
});
test("unanswered and N/A are not considered failures",()=>{
 const q=buildEnterpriseQuestions("Gestão Pública");
 const answers={[q[0].id]:"Não",[q[1].id]:"Parcialmente",[q[2].id]:"N/A"};
 const out=assessDiagnostic(q,answers,library,riskLevel);
 assert.equal(out.risks.length,2);assert.equal(out.actions.length,2);
});
test("specialized legal reviews are linked to risks",()=>{
 const q=buildEnterpriseQuestions("Cartórios / Tabelionatos de Notas");
 const privacy=q.find(x=>x.key==="privacy");
 const out=assessDiagnostic(q,{[privacy.id]:"Não"},library,riskLevel);
 assert.equal(out.legal.length,1);
 assert.equal(out.legal[0].riskId,out.risks[0].id);
});

test("framework recommendations preserve risk-to-action priority and traceability",()=>{
 const q=buildEnterpriseQuestions("Educação");
 const frameworks=[{id:"F-A",name:"Framework A",area:"Governança",tier:"Optional"},{id:"F-B",name:"Framework B",area:"Legal",tier:"Jurisdictional"}];
 const pending=assessDiagnostic(q,{},library,riskLevel,frameworks);
 assert.equal(pending.risks.length,0);
 const reviewed=frameworks.map(f=>({...f,applicabilityReviewed:true,gapConfirmed:true}));
 const out=assessDiagnostic(q,{},library,riskLevel,reviewed);
 assert.equal(out.risks.length,2);assert.equal(out.actions.length,2);assert.equal(out.legal.length,2);
 for(let i=0;i<2;i++){
  assert.equal(out.actions[i].riskId,out.risks[i].id);
  assert.equal(out.actions[i].priority,out.risks[i].level);
  assert.equal(out.legal[i].riskId,out.risks[i].id);
  assert.equal(out.risks[i].sourceQuestion,"ENGINE-GLOBAL:"+frameworks[i].id);
 }
});
