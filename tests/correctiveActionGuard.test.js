import test from "node:test";
import assert from "node:assert/strict";
import {validateCorrectiveActionMutation} from "../server/correctiveActionGuard.js";
const actor="reviewer@example.com",owner="operator@example.com";
const base={id:"A",riskId:"R",owner,evidenceRequired:true,status:"ABERTA",evidences:[],events:[{type:"CRIADA",actor}]};
test("rejects forged approvals, deletions and modified audit trails",()=>{
 assert.doesNotThrow(()=>validateCorrectiveActionMutation({}, {correctiveActions:[base]},actor));
 assert.throws(()=>validateCorrectiveActionMutation({correctiveActions:[base]},{correctiveActions:[]},actor),/DELETION/);
 const forged={...base,status:"CONCLUÍDA",verifiedBy:actor,events:[...base.events,{type:"STATUS_CONCLUÍDA",actor}]};
 assert.throws(()=>validateCorrectiveActionMutation({correctiveActions:[base]},{correctiveActions:[forged]},actor),/TRANSITION/);
 const tampered={...base,events:[{type:"CRIADA",actor:"hacker"}]};
 assert.throws(()=>validateCorrectiveActionMutation({correctiveActions:[base]},{correctiveActions:[tampered]},actor),/TAMPERED/);
});
test("requires independent verifier and evidence to complete action",()=>{
 const inReview={...base,status:"EM VALIDAÇÃO"};
 const noEvidence={...inReview,status:"CONCLUÍDA",verifiedBy:actor,events:[...inReview.events,{type:"STATUS_CONCLUÍDA",actor}]};
 assert.throws(()=>validateCorrectiveActionMutation({correctiveActions:[inReview]},{correctiveActions:[noEvidence]},actor),/EVIDENCE/);
 const good={...noEvidence,evidences:[{hash:"sha256:"+"a".repeat(64),uploadedBy:actor}]};
 assert.doesNotThrow(()=>validateCorrectiveActionMutation({correctiveActions:[inReview]},{correctiveActions:[good]},actor));
 assert.throws(()=>validateCorrectiveActionMutation({correctiveActions:[{...inReview,owner:actor}]},{correctiveActions:[{...good,owner:actor}]},actor),/INDEPENDENT/);
});
