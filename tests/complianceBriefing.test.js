import test from "node:test";
import assert from "node:assert/strict";
import {generateComplianceBriefing} from "../src/complianceBriefing.js";
import {buildEnterpriseQuestions} from "../src/enterpriseQuestionBank.js";
test("briefing traces internal risk priorities and avoids legal claims",()=>{
 const questions=buildEnterpriseQuestions("Cartórios / Tabelionatos de Notas");
 const q=questions[0];
 const briefing=generateComplianceBriefing({segment:"Cartórios / Tabelionatos de Notas",questions,answers:{[q.id]:"Não"},risks:[{id:"R1",title:"Risco",level:"Alto",score:15,sourceQuestion:q.id}],actions:[]});
 assert.equal(briefing.overview.noncompliant,1);
 assert.equal(briefing.priorities[0].questionId,q.id);
 assert.equal(briefing.automatedLegalConclusion,false);
 assert.equal(briefing.liveLegalUpdates,false);
 assert.ok(briefing.regulatory.references.some(r=>r.id==="BR-CNJ-149"));
});
