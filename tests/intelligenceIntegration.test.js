import test from "node:test";
import assert from "node:assert/strict";
import {validateAiRequest,buildAiMessages} from "../server/aiSafety.js";
import {MONITOR_SOURCES,probeRegulation,compareRegulationSnapshot} from "../server/regulatoryMonitor.js";
test("AI request strips unapproved private fields and requires bounded question",()=>{
 assert.throws(()=>validateAiRequest({question:"",facts:{}}));
 assert.throws(()=>validateAiRequest({question:"a".repeat(1801),facts:{}}));
 const safe=validateAiRequest({question:"Como priorizar?",facts:{segment:"Cartório",password:"never send",regulations:["Lei 13.709"]}});
 assert.equal(safe.facts.password,undefined);
 assert.equal(buildAiMessages(safe)[0].role,"system");
 assert.equal(buildAiMessages(safe)[1].content.includes("never send"),false);
});
test("monitor only checks allowlisted official sources and detects content changes",async()=>{
 const source=MONITOR_SOURCES[0];
 const mock=async()=>new Response("texto oficial",{status:200,headers:{"content-type":"text/plain"}});
 const snapshot=await probeRegulation(source,mock);
 assert.match(snapshot.digest,/^[a-f0-9]{64}$/);
 assert.equal(compareRegulationSnapshot(null,snapshot),"BASELINE_CREATED");
 assert.equal(compareRegulationSnapshot(snapshot,snapshot),"UNCHANGED");
 assert.equal(compareRegulationSnapshot(snapshot,{...snapshot,digest:"b".repeat(64)}),"CONTENT_CHANGED_REVIEW_REQUIRED");
 await assert.rejects(()=>probeRegulation({...source,url:"http://127.0.0.1/private"},mock),/UNTRUSTED_SOURCE/);
});
