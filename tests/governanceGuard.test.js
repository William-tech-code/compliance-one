import test from "node:test";
import assert from "node:assert/strict";
import {validateGovernanceMutation} from "../server/governanceGuard.js";
const actor="author@example.com",reviewer="auditor@example.com";
const base={id:"G1",kind:"TERCEIRO",title:"Fornecedor",owner:"Compras",dueAt:null,description:"",createdAt:"2026-01-01",createdBy:actor,status:"ABERTO",reviewedBy:null,history:[{type:"CREATED",actor,at:"2026-01-01"}]};
test("server rejects forged governance approvals, audit edits and deletion",()=>{
 assert.doesNotThrow(()=>validateGovernanceMutation({}, {governanceItems:[base]},actor));
 assert.throws(()=>validateGovernanceMutation({governanceItems:[base]},{governanceItems:[]},reviewer),/DELETION/);
 const approved={...base,status:"APROVADO",reviewedBy:reviewer,history:[...base.history,{type:"APROVADO",actor:reviewer,at:"2026-02-01"}]};
 assert.doesNotThrow(()=>validateGovernanceMutation({governanceItems:[base]},{governanceItems:[approved]},reviewer));
 assert.throws(()=>validateGovernanceMutation({governanceItems:[base]},{governanceItems:[{...approved,reviewedBy:actor}]},reviewer),/FORGED/);
 assert.throws(()=>validateGovernanceMutation({governanceItems:[base]},{governanceItems:[{...approved,history:[{type:"CREATED",actor:"hacker"},approved.history[1]]}]},reviewer),/TAMPERED/);
 assert.throws(()=>validateGovernanceMutation({governanceItems:[base]},{governanceItems:[{...approved,reviewedBy:actor,history:[...base.history,{type:"APROVADO",actor,at:"2026-02-01"}]}]},actor),/INDEPENDENT/);
 assert.throws(()=>validateGovernanceMutation({governanceItems:[approved]},{governanceItems:[base]},reviewer),/IMMUTABLE/);
});
test("server rejects whistleblower entries until dedicated confidentiality exists",()=>{
 assert.throws(()=>validateGovernanceMutation({}, {governanceItems:[{...base,kind:"DENUNCIA"}]},actor),/INVALID/);
});
