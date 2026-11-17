#!/usr/bin/env node
// Offline operator-only SQLite snapshot verification. Never deploys or modifies production.
import Database from 'better-sqlite3';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const [source,destination]=process.argv.slice(2);
const fail=(message)=>{console.error('BACKUP_GATE_FAILED:',message);process.exitCode=1;};
if(!source||!destination||!path.isAbsolute(source)||!path.isAbsolute(destination)){
 fail('Usage: node scripts/v51-verify-sqlite-backup.mjs /absolute/source.sqlite /absolute/backup.sqlite');
}else{
 const src=path.resolve(source),dst=path.resolve(destination);
 let db,copy;
 try{
  if(src===dst)throw Error('SOURCE_EQUALS_DESTINATION');
  if(!fs.statSync(src).isFile())throw Error('SOURCE_NOT_FILE');
  if(fs.existsSync(dst))throw Error('DESTINATION_ALREADY_EXISTS');
  if(!fs.statSync(path.dirname(dst)).isDirectory())throw Error('DESTINATION_PARENT_MISSING');
  const mode=fs.statSync(path.dirname(dst)).mode&0o777;
  if((mode&0o077)!==0)throw Error('DESTINATION_DIRECTORY_NOT_PRIVATE');
  db=new Database(src,{readonly:true,fileMustExist:true});
  // better-sqlite3 online backup API provides a consistent SQLite snapshot.
  await db.backup(dst);
  fs.chmodSync(dst,0o600);
  copy=new Database(dst,{readonly:true,fileMustExist:true});
  const result=copy.pragma('integrity_check',{simple:true});
  if(result!=='ok')throw Error('BACKUP_INTEGRITY_CHECK_FAILED');
  const bytes=fs.readFileSync(dst);
  const sha256=crypto.createHash('sha256').update(bytes).digest('hex');
  console.log(JSON.stringify({status:'SNAPSHOT_INTEGRITY_OK',
   backupPath:dst,bytes:bytes.length,sha256,integrityCheck:result,
   restoreTested:false,externalCopyVerified:false,
   attachmentsVerified:false,goLiveApproved:false},null,2));
 }catch(error){
  fail(error.message);
  // Never leave a failed, potentially misleading snapshot at the target path.
  if(copy){copy.close();copy=null;}
  if(fs.existsSync(dst))try{fs.unlinkSync(dst);}catch{}
 }finally{if(copy)copy.close();if(db)db.close();}
}
