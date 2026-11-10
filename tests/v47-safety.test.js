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
