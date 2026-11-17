import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {resolveMfaEncryptionKey} from "../server/v51MfaKey.js";

test("existing base64 MFA keys remain byte-for-byte compatible",()=>{
 const key=crypto.randomBytes(32);
 assert.deepEqual(resolveMfaEncryptionKey(key.toString("base64")),key);
});
test("Render high-entropy text secret deterministically yields 32-byte key",()=>{
 const secret=crypto.randomBytes(48).toString("hex");
 const a=resolveMfaEncryptionKey(secret),b=resolveMfaEncryptionKey(secret);
 assert.equal(a.length,32);assert.deepEqual(a,b);
 assert.notDeepEqual(a,resolveMfaEncryptionKey(crypto.randomBytes(48).toString("hex")));
});
test("missing or weak MFA keys fail closed",()=>{
 for(const key of [undefined,null,"", "demo-key","12345678901234567890"]) assert.equal(resolveMfaEncryptionKey(key),null);
});
