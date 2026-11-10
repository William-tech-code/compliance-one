import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

// Produces a consistent SQLite snapshot, never modifying the source database.
export async function createVerifiedSnapshot(source,destination){
  const input=path.resolve(source),output=path.resolve(destination);
  if(input===output)throw Error("BACKUP_DESTINATION_EQUALS_SOURCE");
  if(!fs.existsSync(input))throw Error("BACKUP_SOURCE_NOT_FOUND");
  if(fs.existsSync(output))throw Error("BACKUP_DESTINATION_ALREADY_EXISTS");
  fs.mkdirSync(path.dirname(output),{recursive:true});
  const db=new Database(input,{readonly:true,fileMustExist:true});
  try{
    await db.backup(output);
  }finally{db.close()}
  try{
    const copy=new Database(output,{readonly:true,fileMustExist:true});
    try{
      const check=copy.pragma("integrity_check",{simple:true});
      if(check!=="ok")throw Error(`BACKUP_INTEGRITY_FAILED: ${check}`);
    }finally{copy.close()}
    const hash=crypto.createHash("sha256");
    for await(const chunk of fs.createReadStream(output))hash.update(chunk);
    return {path:output,sizeBytes:fs.statSync(output).size,sha256:hash.digest("hex"),integrity:"ok"};
  }catch(error){
    // Retain the file for forensic review instead of silently removing it.
    throw error;
  }
}
