import test from "node:test";
import assert from "node:assert/strict";
import {canCreateUser, canReadUserDirectory, validateNewUser} from "../server/v51UserAccess.js";
import {secureTokenMatches, validateAsaasEvent, sessionVersionValid, evaluateSandboxEntitlement} from "../server/v50Integrations.js";
import {compareRegulationSnapshot} from "../server/regulatoryMonitor.js";

test("only administrators can create users", () => {
  for (const role of ["Compliance","Jurídico","Auditoria","Diretoria","Financeiro","Colaborador","Equipe de Apuração"]) {
    assert.equal(canCreateUser(role), false, role);
  }
  assert.equal(canCreateUser("Administrador"), true);
  assert.equal(canReadUserDirectory("Colaborador"), false);
});

test("new user validation enforces password length and known role", () => {
  const valid = {name:"Pessoa Teste",email:"teste@example.com",password:"senha-forte-1234",role:"Auditoria"};
  assert.equal(validateNewUser(valid).ok,true);
  assert.equal(validateNewUser({...valid,password:"curta"}).ok,false);
  assert.equal(validateNewUser({...valid,role:"SuperAdmin"}).ok,false);
});

test("webhook requires configured token and rejects invalid payload", () => {
  assert.equal(secureTokenMatches("x","x"),false);
  assert.equal(secureTokenMatches("a".repeat(32),"b".repeat(32)),false);
  assert.equal(secureTokenMatches("a".repeat(32),"a".repeat(32)),true);
  assert.throws(()=>validateAsaasEvent({id:"evt1",event:"paid"}));
});

test("webhook cannot itself activate a subscription", () => {
  const result=evaluateSandboxEntitlement({
    payment:{subscription:"s1",customer:"c1",externalReference:"another-tenant",status:"RECEIVED",value:100},
    companyId:"tenant1",subscriptionId:"s1",customerId:"c1",minimumValue:100
  });
  assert.equal(result.eligible,false);
});

test("revoked sessions are rejected", () => {
  assert.equal(sessionVersionValid({sessionVersion:1},{active:1,session_version:2}),false);
  assert.equal(sessionVersionValid({sessionVersion:2},{active:0,session_version:2}),false);
});

test("regulatory changes require human review", () => {
  assert.equal(compareRegulationSnapshot(null,{digest:"a"}),"BASELINE_CREATED");
  assert.equal(compareRegulationSnapshot({digest:"a"},{digest:"b"}),"CONTENT_CHANGED_REVIEW_REQUIRED");
});
