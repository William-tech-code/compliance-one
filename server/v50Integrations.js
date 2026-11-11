import crypto from 'node:crypto';

export function secureTokenMatches(received, expected) {
  if (typeof received !== 'string' || typeof expected !== 'string' || expected.length < 32) return false;
  const a = crypto.createHash('sha256').update(received).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

export function validateAsaasEvent(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('INVALID_WEBHOOK');
  if (typeof value.id !== 'string' || value.id.length < 4 || value.id.length > 128) throw Error('INVALID_WEBHOOK_ID');
  if (typeof value.event !== 'string' || !/^[A-Z_]{4,80}$/.test(value.event)) throw Error('INVALID_WEBHOOK_TYPE');
  // Never grant access merely because a webhook claims a payment event.
  return {id:value.id,event:value.event,paymentId:typeof value.payment?.id==='string'?value.payment.id:null,
    subscriptionId:typeof value.payment?.subscription==='string'?value.payment.subscription:null};
}

export function createAsaasSandboxClient({apiKey,fetcher=fetch}={}) {
  if (!apiKey || typeof apiKey !== 'string') throw Error('ASAAS_SANDBOX_KEY_REQUIRED');
  const base='https://api-sandbox.asaas.com/v3';
  return {async get(path) {
    if (!/^\/(?:customers|subscriptions|payments)(?:\/[A-Za-z0-9_-]+)?$/.test(path)) throw Error('ASAAS_PATH_REJECTED');
    const response=await fetcher(base+path,{headers:{access_token:apiKey,accept:'application/json'},signal:AbortSignal.timeout(12000)});
    if (!response.ok) throw Error('ASAAS_HTTP_'+response.status);
    return response.json();
  }};
}

export async function sendResendEmail({apiKey,from,to,subject,text,fetcher=fetch}={}) {
  if (!apiKey || !from) throw Error('RESEND_NOT_CONFIGURED');
  if (typeof to!=='string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) throw Error('INVALID_RECIPIENT');
  if (typeof text!=='string' || text.length>10000) throw Error('INVALID_MAIL_BODY');
  const response=await fetcher('https://api.resend.com/emails',{
    method:'POST',headers:{Authorization:'Bearer '+apiKey,'Content-Type':'application/json'},
    body:JSON.stringify({from,to:[to],subject,text}),signal:AbortSignal.timeout(12000)
  });
  if (!response.ok) throw Error('RESEND_HTTP_'+response.status);
  return response.json();
}

export function hashResetToken(raw) {return crypto.createHash('sha256').update(raw).digest('hex')}
export function generateResetToken(){return crypto.randomBytes(32).toString('base64url')}
