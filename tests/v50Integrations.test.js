import test from 'node:test';
import assert from 'node:assert/strict';
import {secureTokenMatches,validateAsaasEvent,createAsaasSandboxClient,sendResendEmail,hashResetToken,generateResetToken,sessionVersionValid,evaluateSandboxEntitlement} from '../server/v50Integrations.js';

test('Asaas webhook validates auth token without accepting short or missing secrets',()=>{
 const token='a'.repeat(40);assert.equal(secureTokenMatches(token,token),true);
 assert.equal(secureTokenMatches('b'.repeat(40),token),false);assert.equal(secureTokenMatches(token,''),false);
});
test('Asaas webhook is strict and extracts identifiers without granting entitlement',()=>{
 assert.throws(()=>validateAsaasEvent({id:'a',event:'PAYMENT_RECEIVED'}));
 const event=validateAsaasEvent({id:'evt_1234',event:'PAYMENT_RECEIVED',payment:{id:'pay_1234',subscription:'sub_1234'}});
 assert.deepEqual(event,{id:'evt_1234',event:'PAYMENT_RECEIVED',paymentId:'pay_1234',subscriptionId:'sub_1234'});
 assert.equal('active' in event,false);
});
test('Asaas client can only read allowlisted sandbox endpoints',async()=>{
 let url;
 const client=createAsaasSandboxClient({apiKey:'sandbox-test',fetcher:async input=>{url=input;return new Response('{}',{status:200})}});
 await client.get('/subscriptions/sub_123');assert.equal(url,'https://api-sandbox.asaas.com/v3/subscriptions/sub_123');
 await assert.rejects(()=>client.get('https://api.asaas.com/v3/payments'),/ASAAS_PATH_REJECTED/);
});
test('Resend adapter refuses missing credentials and sends text-only message',async()=>{
 await assert.rejects(()=>sendResendEmail({to:'test@example.com',text:'test'}),/RESEND_NOT_CONFIGURED/);
 let body;await sendResendEmail({apiKey:'test-key',from:'test@example.com',to:'user@example.com',subject:'Teste',text:'Olá',fetcher:async(_url,options)=>{body=JSON.parse(options.body);return new Response('{}',{status:200})}});
 assert.deepEqual(body.to,['user@example.com']);assert.equal(body.text,'Olá');assert.equal('html' in body,false);
});
test('reset tokens are unpredictable and only hashes should be stored',()=>{
 const a=generateResetToken(),b=generateResetToken();assert.notEqual(a,b);assert.equal(hashResetToken(a).length,64);assert.notEqual(hashResetToken(a),a);
});
test('password reset revokes all JWTs issued before session version increases',()=>{
 assert.equal(sessionVersionValid({}, {active:1,session_version:0}),true);
 assert.equal(sessionVersionValid({sessionVersion:0},{active:1,session_version:1}),false);
 assert.equal(sessionVersionValid({sessionVersion:1},{active:1,session_version:1}),true);
 assert.equal(sessionVersionValid({sessionVersion:1},{active:0,session_version:1}),false);
});
test('Asaas sandbox entitlement requires verified ownership, subscription, status and amount',()=>{
 const payment={subscription:'sub1',customer:'cus1',externalReference:'company1',status:'RECEIVED',value:100};
 const params={payment,companyId:'company1',subscriptionId:'sub1',customerId:'cus1',minimumValue:100};
 assert.equal(evaluateSandboxEntitlement(params).eligible,true);
 assert.equal(evaluateSandboxEntitlement({...params,companyId:'company2'}).eligible,false);
 assert.equal(evaluateSandboxEntitlement({...params,payment:{...payment,status:'PENDING'}}).eligible,false);
 assert.equal(evaluateSandboxEntitlement({...params,payment:{...payment,value:50}}).eligible,false);
});
