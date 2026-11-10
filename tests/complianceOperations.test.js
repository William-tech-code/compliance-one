import test from "node:test";
import assert from "node:assert/strict";
import {createCorrectiveAction,attachEvidence,transitionCorrectiveAction,complianceOperationsSummary,auditReadiness} from "../src/complianceOperations.js";
const at="2026-11-01T00:00:00Z";
test("action cannot be approved without evidence or independent verifier",()=>{
 let a=createCorrectiveAction({id:"A1",riskId:"R1",title:"Corrigir",owner:"Equipe",dueAt:"2026-11-05"}, "Auditor",at);
 a=transitionCorrectiveAction(a,"EM EXECUÇÃO","Equipe",at);
 a=transitionCorrectiveAction(a,"EM VALIDAÇÃO","Equipe",at);
 assert.throws(()=>transitionCorrectiveAction(a,"CONCLUÍDA","Auditor",at),/evidência/);
 a=attachEvidence(a,{id:"E1",name:"Relatório",hash:"sha256:"+"a".repeat(64),uploadedAt:at},"Equipe");
 assert.throws(()=>transitionCorrectiveAction(a,"CONCLUÍDA","Equipe",at),/independente/);
 const done=transitionCorrectiveAction(a,"CONCLUÍDA","Auditor",at);
 assert.equal(done.verifiedBy,"Auditor");
 assert.equal(done.events.length,5);
 assert.throws(()=>transitionCorrectiveAction(done,"EM EXECUÇÃO","Equipe",at));
});
test("overdue and audit readiness are computed from traceable state",()=>{
 const a=createCorrectiveAction({id:"A1",riskId:"R1",title:"Corrigir",owner:"Equipe",dueAt:"2026-11-05"},"Auditor",at);
 const summary=complianceOperationsSummary([a],"2026-11-09T00:00:00Z");
 assert.equal(summary.overdue,1);
 assert.equal(summary.alerts[0].actionId,"A1");
 assert.equal(auditReadiness({actions:[a],reviews:[]}).ready,false);
});
