import test from "node:test";
import assert from "node:assert/strict";
import { validateAiRequest, buildAiMessages } from "../server/aiSafety.js";
import { validateEvidenceReferences } from "../server/evidenceGuard.js";
import { compareRegulationSnapshot } from "../server/regulatoryMonitor.js";

test("AI rejects empty questions and malformed facts", () => {
  assert.throws(() => validateAiRequest({ question: " ", facts: {} }), /INVALID_QUESTION/);
  assert.throws(() => validateAiRequest({ question: "Avalie", facts: [] }), /INVALID_FACTS/);
  assert.throws(() => validateAiRequest({ question: "x".repeat(1801), facts: {} }), /INVALID_QUESTION/);
});
test("AI strips unapproved context fields and limits regulatory sources", () => {
  const data = validateAiRequest({
    question: "Quais riscos?",
    facts: { segment: "Hotelaria", secret: "private", regulations: Array(30).fill("x".repeat(300)) }
  });
  assert.equal(data.facts.secret, undefined);
  assert.equal(data.facts.regulations.length, 12);
  assert.ok(data.facts.regulations.every(x => x.length <= 160));
  const messages = buildAiMessages(data);
  assert.equal(messages[0].role, "system");
  assert.match(messages[0].content, /Não invente normas/);
});
test("evidence guard blocks unverified original documents", () => {
  const next = { correctiveActions: [{ id: "a1", evidences: [{ id: "e1", hash: "sha", name: "original.pdf" }] }] };
  assert.throws(() => validateEvidenceReferences({}, next, () => null), /EVIDENCE_ORIGINAL_NOT_VERIFIED/);
  assert.doesNotThrow(() => validateEvidenceReferences({}, next, () => ({
    action_id: "a1", sha256: "sha", name: "original.pdf"
  })));
  assert.throws(() => validateEvidenceReferences({}, next, () => ({
    action_id: "a2", sha256: "sha", name: "original.pdf"
  })), /EVIDENCE_ORIGINAL_NOT_VERIFIED/);
});
test("regulatory monitoring requires review when a source changes", () => {
  const before = { digest: "one" }, after = { digest: "two" };
  assert.equal(compareRegulationSnapshot(null, after), "BASELINE_CREATED");
  assert.equal(compareRegulationSnapshot(after, after), "UNCHANGED");
  assert.equal(compareRegulationSnapshot(before, after), "CONTENT_CHANGED_REVIEW_REQUIRED");
});

test("regulatory reviews do not carry across source revisions or other organizations", async () => {
  const {resolveRegulatoryReview,regulatoryReviewKey}=await import("../server/regulatoryReview.js");
  const a={source_id:"norma-1",digest:"v1",status:"CONTENT_CHANGED_REVIEW_REQUIRED"};
  const b={source_id:"norma-1",digest:"v2",status:"CONTENT_CHANGED_REVIEW_REQUIRED"};
  const reviews=[{source_id:"norma-1",digest:"v1",decision:"REVIEWED"}];
  assert.equal(resolveRegulatoryReview(a,reviews).status,"REVIEWED");
  assert.equal(resolveRegulatoryReview(b,reviews).status,"CONTENT_CHANGED_REVIEW_REQUIRED");
  assert.equal(resolveRegulatoryReview(a,[]).status,"CONTENT_CHANGED_REVIEW_REQUIRED");
  assert.notEqual(regulatoryReviewKey("empresa-a","norma-1","v1"),regulatoryReviewKey("empresa-b","norma-1","v1"));
});

test("evidence integrity detects tampering and mismatched size", async () => {
 const {verifyEvidenceFile}=await import("../server/evidenceIntegrity.js");
 const fs=await import("node:fs");
 const os=await import("node:os");
 const path=await import("node:path");
 const crypto=await import("node:crypto");
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"compliance-v47-"));
 try{
  const file=path.join(dir,"evidence.bin");
  fs.writeFileSync(file,"original");
  const hash="sha256:"+crypto.createHash("sha256").update("original").digest("hex");
  assert.equal(verifyEvidenceFile(file,hash,8),true);
  assert.equal(verifyEvidenceFile(file,hash,7),false);
  fs.writeFileSync(file,"tampered");
  assert.equal(verifyEvidenceFile(file,hash,8),false);
  assert.equal(verifyEvidenceFile(path.join(dir,"missing"),hash,8),false);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});

test("evidence download paths are restricted to the owning company", async () => {
 const {isEvidencePathInsideTenant}=await import("../server/evidenceIntegrity.js");
 const fs=await import("node:fs");
 const os=await import("node:os");
 const path=await import("node:path");
 const crypto=await import("node:crypto");
 const root=fs.mkdtempSync(path.join(os.tmpdir(),"compliance-tenants-"));
 try{
  const tenant=(id)=>path.join(root,crypto.createHash("sha256").update(id).digest("hex"));
  fs.mkdirSync(tenant("company-a"),{recursive:true});
  fs.mkdirSync(tenant("company-b"),{recursive:true});
  const own=path.join(tenant("company-a"),"file");
  const other=path.join(tenant("company-b"),"file");
  fs.writeFileSync(own,"own");
  fs.writeFileSync(other,"other");
  assert.equal(isEvidencePathInsideTenant(own,root,"company-a"),true);
  assert.equal(isEvidencePathInsideTenant(other,root,"company-a"),false);
  assert.equal(isEvidencePathInsideTenant(own,root,"company-b"),false);
  assert.equal(isEvidencePathInsideTenant(path.join(root,"outside"),root,"company-a"),false);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
