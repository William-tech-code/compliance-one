import test from "node:test";
import assert from "node:assert/strict";
import {createLoginProtection} from "../server/loginProtection.js";

test("failed logins are temporarily limited per identity and address",()=>{
  let now=1000;
  const protection=createLoginProtection({maxAttempts:3,windowMs:60000,clock:()=>now});
  for(let i=0;i<3;i++){
    const attempt=protection.check("client-a","USER@example.com");
    assert.equal(attempt.allowed,true);
    protection.failure(attempt.key);
  }
  const blocked=protection.check("client-a","user@example.com");
  assert.equal(blocked.allowed,false);
  assert.equal(blocked.retryAfter,60);
  assert.equal(protection.check("client-a","other@example.com").allowed,true);
  assert.equal(protection.check("client-b","user@example.com").allowed,true);
  now+=60001;
  assert.equal(protection.check("client-a","user@example.com").allowed,true);
});

test("successful login clears failed attempts without exposing account state",()=>{
  const protection=createLoginProtection({maxAttempts:2});
  const first=protection.check("client-a","admin@example.com");
  protection.failure(first.key);
  protection.success(first.key);
  assert.equal(protection.check("client-a","admin@example.com").allowed,true);
});
