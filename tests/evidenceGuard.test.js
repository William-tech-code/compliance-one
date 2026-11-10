import test from "node:test";
import assert from "node:assert/strict";
import {validateEvidenceReferences} from "../server/evidenceGuard.js";
const action={id:"a1",evidences:[{id:"file1",name:"contrato.pdf",hash:"sha256:"+"a".repeat(64)}]};
const lookup=id=>id==="file1"?{action_id:"a1",name:"contrato.pdf",sha256:"sha256:"+"a".repeat(64)}:null;
test("only tenant-backed original evidence may be linked",()=>{
 assert.doesNotThrow(()=>validateEvidenceReferences({}, {correctiveActions:[action]},lookup));
 assert.throws(()=>validateEvidenceReferences({}, {correctiveActions:[action]},()=>null),/NOT_VERIFIED/);
 assert.throws(()=>validateEvidenceReferences({}, {correctiveActions:[action]},()=>({...lookup("file1"),action_id:"a2"})),/NOT_VERIFIED/);
 assert.throws(()=>validateEvidenceReferences({}, {correctiveActions:[{...action,evidences:[{...action.evidences[0],hash:"sha256:"+"b".repeat(64)}]}]},lookup),/NOT_VERIFIED/);
});
