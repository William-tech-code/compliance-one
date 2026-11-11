import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import {createVerifiedSnapshot} from "../server/backupSnapshot.js";

test("consistent backup passes integrity check without modifying source",async()=>{
  const dir=mkdtempSync(path.join(tmpdir(),"nexora-backup-"));
  try{
    const source=path.join(dir,"source.sqlite"),target=path.join(dir,"snap.sqlite");
    const db=new Database(source);
    db.exec("CREATE TABLE records(id INTEGER PRIMARY KEY, value TEXT); INSERT INTO records(value) VALUES('original');");
    db.close();
    const result=await createVerifiedSnapshot(source,target);
    assert.equal(result.integrity,"ok");
    assert.match(result.sha256,/^[0-9a-f]{64}$/);
    const copy=new Database(target,{readonly:true});
    try{assert.equal(copy.prepare("SELECT value FROM records").get().value,"original")}
    finally{copy.close()}
    await assert.rejects(createVerifiedSnapshot(source,target),/BACKUP_DESTINATION_ALREADY_EXISTS/);
  }finally{rmSync(dir,{recursive:true,force:true,maxRetries:8,retryDelay:100})}
});
