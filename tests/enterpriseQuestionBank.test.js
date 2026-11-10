import test from "node:test";
import assert from "node:assert/strict";
import { buildEnterpriseQuestions, ENTERPRISE_AREAS, DIAGNOSTIC_DIMENSIONS } from "../src/enterpriseQuestionBank.js";

test("every supported sector generates 800 unique questions across 32 areas",()=>{
  const sectors=["Supermercados / Varejo","Logística / Transportes","Produção / Indústria","Metalúrgica","Química / Petroquímica","Hotelaria / Turismo","Saúde / Hospitalar","Construção","Gestão Pública","Agronegócio","Financeiro","Educação","Tecnologia","Serviços","Energia","Outro"];
  for(const sector of sectors){
    const questions=buildEnterpriseQuestions(sector);
    assert.equal(questions.length,800,sector);
    assert.equal(new Set(questions.map(q=>q.id)).size,800,sector);
    const areas=[...new Set(questions.map(q=>q.area))];
    assert.equal(areas.length,32,sector);
    for(const area of areas)assert.equal(questions.filter(q=>q.area===area).length,25,sector+" "+area);
    assert.ok(questions.every(q=>q.text.endsWith("?") && q.text.length>35),sector);
    assert.equal(questions.filter(q=>q.scope==="transversal").length,550,sector);
    assert.equal(questions.filter(q=>q.scope==="setorial").length,250,sector);
  }
});
test("question identifiers do not collide between sectors",()=>{
  const a=new Set(buildEnterpriseQuestions("Hotelaria / Turismo").map(q=>q.id));
  const b=buildEnterpriseQuestions("Logística / Transportes");
  assert.ok(b.every(q=>!a.has(q.id)));
});
test("questions preserve area and control dimensions",()=>{
  assert.equal(ENTERPRISE_AREAS.length,22);
  assert.equal(DIAGNOSTIC_DIMENSIONS.length,25);
  assert.ok(buildEnterpriseQuestions("Gestão Pública").some(q=>q.text.includes("licitações")));
});

test("risk mapping produces differentiated specialist categories",()=>{
 const questions=buildEnterpriseQuestions("Hotelaria / Turismo");
 const byDimension=new Map(questions.map(q=>[q.dimension,q.key]));
 assert.equal(byDimension.get("privacidade"),"privacy");
 assert.equal(byDimension.get("terceiros"),"thirdparty");
 assert.equal(byDimension.get("auditoria"),"audit");
 assert.equal(byDimension.get("treinamento"),"training");
 assert.equal(byDimension.get("requisitos"),"legal");
 assert.ok(new Set(questions.map(q=>q.key)).size>=8);
});
