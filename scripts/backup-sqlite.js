import path from "node:path";
import {createVerifiedSnapshot} from "../server/backupSnapshot.js";

const source=process.env.DATABASE_PATH;
if(!source||!path.isAbsolute(source)){
  console.error("Configure DATABASE_PATH com caminho absoluto para realizar backup.");
  process.exitCode=1;
}else{
  const target=process.argv[2];
  if(!target||!path.isAbsolute(target)){
    console.error("Uso: node scripts/backup-sqlite.js /caminho/absoluto/backup.sqlite");
    process.exitCode=1;
  }else{
    try{
      const result=await createVerifiedSnapshot(source,target);
      console.log(JSON.stringify(result,null,2));
    }catch(error){console.error(error.message);process.exitCode=1}
  }
}
