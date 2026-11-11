import test from "node:test";
import assert from "node:assert/strict";
import {executiveIntelligence,exportExecutiveSnapshot} from "../src/executiveIntelligence.js";
test("executive dashboard prioritizes real overdue actions without inventing compliance",()=>{
 const w={company:{name:"Unidade A"},risks:[{id:"r1",level:"Crítico",status:"Pendente de confirmação",score:16}],correctiveActions:[{id:"a1",title:"Revisar política",owner:"Compliance",status:"EM VALIDAÇÃO",dueAt:"2026-01-01",evidences:[{id:"e1"}]}],answers:{"q1":"Não","q2":"Sim"}};
 const out=executiveIntelligence(w,"2026-11-09T12:00:00.000Z");
 assert.equal(out.risks.pendingReview,1);
 assert.equal(out.risks.confirmed,0);
 assert.equal(out.actions.overdue,1);
 assert.equal(out.actions.pendingValidation,1);
 assert.equal(out.evidence.attachedToActions,1);
 assert.equal(out.alerts[0].severity,"Crítico");
 assert.equal(out.diagnostic.completionRate,100);
 assert.match(exportExecutiveSnapshot(out),/NEXORA-EXECUTIVE-V47/);
});
test("empty workspace shows unavailable scores instead of false perfect compliance",()=>{
 const out=executiveIntelligence({});
 assert.equal(out.risks.averageScore,null);
 assert.equal(out.actions.completionRate,null);
 assert.equal(out.diagnostic.completionRate,null);
 assert.deepEqual(out.alerts,[]);
});
