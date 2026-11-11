// In-process throttle: bounded memory, short lockout and no account enumeration.
// A persistent shared rate limiter is recommended before horizontal scaling.
export function createLoginProtection({windowMs=15*60*1000,maxAttempts=8,maxKeys=10000,clock=()=>Date.now()}={}){
  const attempts=new Map();
  return {
    check(address,email){
      const now=clock();
      const normalized=String(email||"").trim().toLowerCase().slice(0,254);
      const key=`${String(address||"unknown").slice(0,128)}:${normalized}`;
      const prior=attempts.get(key);
      if(prior && now-prior.since<windowMs && prior.failures>=maxAttempts){
        return {allowed:false,retryAfter:Math.max(1,Math.ceil((prior.since+windowMs-now)/1000))};
      }
      if(attempts.size>=maxKeys){
        for(const [k,v] of attempts)if(now-v.since>=windowMs)attempts.delete(k);
        if(!attempts.has(key)&&attempts.size>=maxKeys)return {allowed:false,retryAfter:60};
      }
      return {allowed:true,key};
    },
    failure(key){
      if(!key)return;
      const now=clock();
      const prior=attempts.get(key);
      if(!prior||now-prior.since>=windowMs){attempts.set(key,{since:now,failures:1});return}
      prior.failures++;
    },
    success(key){if(key)attempts.delete(key)}
  };
}
