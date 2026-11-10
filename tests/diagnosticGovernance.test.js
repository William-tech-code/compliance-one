import test from "node:test";
import assert from "node:assert/strict";
import {buildEnterpriseQuestions} from "../src/enterpriseQuestionBank.js";
import {diagnosticProgress,recordDiagnosticAnswer,validateDiagnosticLinks,executiveDiagnosticSummary} from "../src/diagnosticGovernance.js";
import {assessDiagnostic} from "../src/diagnosticEngine.js";
const questions=buildEnterpriseQuestions("Cartórios / Tabelionatos de Notas");
const library={controls:{title:"Controle",cause:"Falha",consequence:"Risco",recommendation:"Corrigir",action:"Implementar",owner:"Compliance",legal:false},privacy:{title:"Privacidade",cause:"Falha",consequence:"Risco",recommendation:"Corrigir",action:"Adequar",owner:"DPO",legal:true}};
const level=(p,i)=>p*i>=12?"Alto":"Médio";
test("progress is scoped to current sector and excludes legacy answers",()=>{
 const answers=Object.fromEntries(questions.map(q=>[q.id,"Sim"]));
 answers["LEGACY-ID"]="Não";
 const p=diagnosticProgress(questions,answers);
 assert.equal(p.total,800);assert.equal(p.answered,800);assert.equal(p.percent,100);assert.equal(p.ignoredLegacyAnswers,1);assert.equal(p.areas.length,32);
});
test("audit logs changes and invalidates previous approvals",()=>{
 const q=questions[0],base={answers:{},review:{confirmedRisks:true,confirmedActions:true,confirmedLegal:true},workflow:{questionario:true,riscos:true,acoes:true,juridico:true,relatorio:true}};
 const updated=recordDiagnosticAnswer(base,q,"Não","Auditor");
 assert.equal(updated.answers[q.id],"Não");
 assert.equal(updated.auditTrail.length,1);
 assert.equal(updated.auditTrail[0].actor,"Auditor");
 assert.equal(updated.review.confirmedRisks,false);
 assert.equal(updated.workflow.relatorio,false);
 assert.equal(recordDiagnosticAnswer(updated,q,"Não"),updated);
 assert.equal(recordDiagnosticAnswer(updated,q,"Sim").auditTrail[1].previous,"Não");
 assert.throws(()=>recordDiagnosticAnswer(base,q,"Talvez"));
});
test("800 failures produce consistent executive summary and links",()=>{
 const answers=Object.fromEntries(questions.map(q=>[q.id,"Não"]));
 const assessment=assessDiagnostic(questions,answers,library,level);
 const summary=executiveDiagnosticSummary(questions,answers,assessment);
 assert.equal(summary.risks,800);assert.equal(summary.actions,800);
 assert.equal(summary.noncompliant,800);assert.equal(summary.pending,0);
 assert.equal(summary.integrity.valid,true);
});
test("integrity checker rejects orphaned actions and duplicate risks",()=>{
 const q=questions[0];
 const assessment={risks:[{id:"1",sourceQuestion:q.id},{id:"1",sourceQuestion:q.id}],actions:[{riskId:"unknown"}],legal:[]};
 const result=validateDiagnosticLinks(assessment,questions);
 assert.equal(result.valid,false);assert.ok(result.issues.length>=2);
});
