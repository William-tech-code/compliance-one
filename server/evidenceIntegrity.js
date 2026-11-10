import crypto from "node:crypto";
import fs from "node:fs";

export function verifyEvidenceFile(filePath,expectedHash,expectedSize){
 if(typeof filePath!=="string"||!filePath||!/^sha256:[a-f0-9]{64}$/.test(expectedHash)||!Number.isSafeInteger(expectedSize)||expectedSize<1)return false;
 try{
  const stat=fs.statSync(filePath);
  if(!stat.isFile()||stat.size!==expectedSize)return false;
  const actual="sha256:"+crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(actual),Buffer.from(expectedHash));
 }catch{return false}
}
