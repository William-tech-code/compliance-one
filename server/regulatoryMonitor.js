import crypto from "node:crypto";
import {REGULATORY_CATALOG} from "../src/regulatoryIntelligence.js";
export const MONITOR_SOURCES=REGULATORY_CATALOG.map(({id,reference,url})=>({id,reference,url}));
export async function probeRegulation(source,fetcher=fetch){
 if(!MONITOR_SOURCES.some(x=>x.id===source.id&&x.url===source.url))throw Error("UNTRUSTED_SOURCE");
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),12000);
 try{
  const response=await fetcher(source.url,{signal:controller.signal,headers:{"User-Agent":"NEXORA-Compliance-Regulatory-Monitor/1.0","Accept":"text/html,application/pdf,text/plain"}});
  if(!response.ok)throw Error("SOURCE_HTTP_"+response.status);
  const length=Number(response.headers.get("content-length")||0);
  if(length>2_000_000)throw Error("SOURCE_TOO_LARGE");
  const reader=response.body?.getReader();
  if(!reader)throw Error("SOURCE_NO_BODY");
  const hash=crypto.createHash("sha256");
  let total=0;
  while(true){
   const {value,done}=await reader.read();
   if(done)break;
   total+=value.length;
   if(total>2_000_000){await reader.cancel();throw Error("SOURCE_TOO_LARGE")}
   hash.update(value);
  }
  return {sourceId:source.id,sourceUrl:source.url,digest:hash.digest("hex"),checkedAt:new Date().toISOString(),bytes:total};
 }finally{clearTimeout(timeout)}
}
export function compareRegulationSnapshot(previous,current){
 if(!previous)return "BASELINE_CREATED";
 if(previous.digest===current.digest)return "UNCHANGED";
 return "CONTENT_CHANGED_REVIEW_REQUIRED";
}
