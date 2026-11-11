import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export function verifyEvidenceFile(filePath,expectedHash,expectedSize){
 if(typeof filePath!=="string"||!filePath||!/^sha256:[a-f0-9]{64}$/.test(expectedHash)||!Number.isSafeInteger(expectedSize)||expectedSize<1)return false;
 try{
  const stat=fs.statSync(filePath);
  if(!stat.isFile()||stat.size!==expectedSize)return false;
  const actual="sha256:"+crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(actual),Buffer.from(expectedHash));
 }catch{return false}
}

export function isEvidencePathInsideTenant(filePath,evidenceRoot,companyId){
 if(typeof filePath!=="string"||typeof evidenceRoot!=="string"||typeof companyId!=="string"||!companyId)return false;
 try{
  const tenant=crypto.createHash("sha256").update(companyId).digest("hex");
  const root=path.resolve(evidenceRoot,tenant);
  const target=path.resolve(filePath);
  return target.startsWith(root+path.sep)&&fs.realpathSync(target).startsWith(fs.realpathSync(root)+path.sep);
 }catch{return false}
}
