import test from "node:test";
import assert from "node:assert/strict";
import {REGULATORY_CATALOG,applicableRegulations,createRegulatoryReview,regulatoryIntelligenceSummary} from "../src/regulatoryIntelligence.js";
import {buildEnterpriseQuestions} from "../src/enterpriseQuestionBank.js";
test("official-source catalog contains reviewable non-live references",()=>{
 assert.ok(REGULATORY_CATALOG.length>=5);
 for(const item of REGULATORY_CATALOG){assert.match(item.url,/^https:\/\//);assert.ok(item.reference);assert.ok(item.review)}
 const cartorio=applicableRegulations("Cartórios / Tabelionatos de Notas",buildEnterpriseQuestions("Cartórios / Tabelionatos de Notas"));
 assert.ok(cartorio.some(x=>x.id==="BR-CNJ-149"));
 assert.ok(cartorio.some(x=>x.id==="BR-PLD"));
 assert.ok(cartorio.every(x=>x.currency==="NÃO VERIFICADA EM TEMPO REAL"));
 const generic=applicableRegulations("Serviços");
 assert.equal(generic.some(x=>x.id==="BR-CNJ-149"),false);
});
test("review decisions require accountable human approval",()=>{
 const item=REGULATORY_CATALOG[0];
 assert.throws(()=>createRegulatoryReview(item,"","APLICÁVEL",""));
 assert.throws(()=>createRegulatoryReview(item,"Jurídico","CONFIRMADA",""));
 const review=createRegulatoryReview(item,"Jurídico","EM ANÁLISE","Rever escopo","2026-11-09T00:00:00.000Z");
 const summary=regulatoryIntelligenceSummary("Serviços",[],[review]);
 assert.equal(summary.liveUpdates,false);
 assert.equal(summary.reviewed,1);
 assert.equal(summary.entries.find(x=>x.id===item.id).review.reviewer,"Jurídico");
});
