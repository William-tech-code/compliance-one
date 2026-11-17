import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {encodeBase32,decodeBase32,generateTotpSecret,totpCode,verifyTotp,encryptTotpSecret,decryptTotpSecret} from '../server/v50Mfa.js';

test('TOTP secret encoding preserves bytes',()=>{
 const bytes=crypto.randomBytes(20);assert.deepEqual(decodeBase32(encodeBase32(bytes)),bytes);
});
test('TOTP accepts valid code in clock window but rejects replay and malformed codes',()=>{
 const secret=generateTotpSecret(),now=1762880000000,counter=Math.floor(now/30000),code=totpCode(secret,counter);
 assert.equal(verifyTotp(secret,code,{now}),counter);
 assert.equal(verifyTotp(secret,code,{now,lastCounter:counter}),null);
 assert.equal(verifyTotp(secret,'123',{now}),null);
 assert.equal(verifyTotp(secret,code,{now:now+180000}),null);
});
test('MFA enrollment secret is encrypted and authenticated',()=>{
 const secret=generateTotpSecret(),key=crypto.randomBytes(32),encrypted=encryptTotpSecret(secret,key);
 assert.notEqual(encrypted,secret);assert.equal(decryptTotpSecret(encrypted,key),secret);
 assert.throws(()=>decryptTotpSecret(encrypted,crypto.randomBytes(32)));
 assert.throws(()=>encryptTotpSecret(secret,Buffer.alloc(16)),/MFA_KEY_NOT_CONFIGURED/);
});
