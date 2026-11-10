import test from "node:test";
import assert from "node:assert/strict";
import {createGovernanceItem,reviewGovernanceItem,governancePortfolio} from "../src/enterpriseGovernance.js";
test("enterprise governance tracks categories, expiry and independent review",()=>{
 const created=createGovernanceItem({id:"T-1",kind:"TERCEIRO",title:"Fornecedor",owner:"Compras",dueAt:"2026-01-01"},"author","2025-01-01T00:00:00Z");
 assert.equal(governancePortfolio([created],"2026-11-09T00:00:00Z").overdue,1);
 assert.throws(()=>reviewGovernanceItem(created,"APROVADO","author"),/INDEPENDENT/);
 const reviewed=reviewGovernanceItem(created,"APROVADO","auditor");
 assert.equal(governancePortfolio([reviewed]).approved,1);
 assert.throws(()=>reviewGovernanceItem(reviewed,"REPROVADO","auditor"),/IMMUTABLE/);
});
test("governance rejects unknown types and incomplete entries",()=>{
 assert.throws(()=>createGovernanceItem({id:"x",kind:"OTHER",title:"X"},"author"),/INVALID/);
 assert.throws(()=>createGovernanceItem({id:"x",kind:"AUDITORIA",title:""},"author"),/REQUIRED/);
});
