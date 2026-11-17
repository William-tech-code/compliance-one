import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import Database from 'better-sqlite3';

test('operator backup gate verifies a consistent snapshot and refuses overwrite',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'v51-backup-'));
 const secure=path.join(dir,'private');fs.mkdirSync(secure,{mode:0o700});
 const source=path.join(dir,'source.sqlite'),target=path.join(secure,'snapshot.sqlite');
 try{
  const db=new Database(source);
  db.exec('CREATE TABLE items(id INTEGER PRIMARY KEY, value TEXT)');
  db.prepare('INSERT INTO items(value) VALUES (?)').run('original');
  db.close();
  const run=()=>spawnSync(process.execPath,['scripts/v51-verify-sqlite-backup.mjs',source,target],{encoding:'utf8'});
  const first=run();
  assert.equal(first.status,0,first.stderr);
  const result=JSON.parse(first.stdout);
  assert.equal(result.status,'SNAPSHOT_INTEGRITY_OK');
  assert.equal(result.integrityCheck,'ok');
  assert.equal(result.restoreTested,false);
  assert.equal(result.goLiveApproved,false);
  assert.match(result.sha256,/^[a-f0-9]{64}$/);
  const backup=new Database(target,{readonly:true});
  assert.equal(backup.prepare('SELECT value FROM items').get().value,'original');
  backup.close();
  const second=run();
  assert.notEqual(second.status,0);
  assert.match(second.stderr,/DESTINATION_ALREADY_EXISTS/);
  assert.equal(fs.existsSync(target),true,'existing snapshot must never be deleted');
  const untouched=new Database(target,{readonly:true});
  assert.equal(untouched.prepare('SELECT COUNT(*) AS n FROM items').get().n,1);
  untouched.close();
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
