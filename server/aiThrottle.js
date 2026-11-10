// Per-user AI request throttle with bounded, expiring state.
export function createAiThrottle({intervalMs=15000,maxEntries=10000,clock=()=>Date.now()}={}){
 const attempts=new Map();
 return {
  check(userId){
   if(typeof userId!=="string"||!userId)return {allowed:false,retryAfter:intervalMs};
   const time=clock();
   const previous=attempts.get(userId);
   if(previous!==undefined&&time-previous<intervalMs)return {allowed:false,retryAfter:Math.max(1,intervalMs-(time-previous))};
   attempts.delete(userId);
   if(attempts.size>=maxEntries){
    for(const [key,at] of attempts)if(time-at>=intervalMs)attempts.delete(key);
    while(attempts.size>=maxEntries)attempts.delete(attempts.keys().next().value);
   }
   attempts.set(userId,time);
   return {allowed:true,retryAfter:0};
  },
  size(){return attempts.size}
 };
}
