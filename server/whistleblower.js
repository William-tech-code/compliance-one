import crypto from "node:crypto";

const CATEGORIES=new Set(["Corrupção e suborno","Fraude","Assédio","Discriminação","Conflito de interesses","Violação de políticas","Segurança","Privacidade","Outros"]);
const STATUSES=new Set(["Recebida","Em triagem","Em apuração","Revisão independente","Encerrada"]);
const fingerprint=value=>crypto.createHash("sha256").update(value).digest("hex");
const random=()=>crypto.randomBytes(32).toString("base64url");
const now=()=>new Date().toISOString();

export function configureWhistleblower({app,db,authenticate,audit}){
  app.use("/api/ethics",(req,res,next)=>{res.setHeader("Cache-Control","no-store, private");res.setHeader("Referrer-Policy","no-referrer");next()});
  db.exec(`
    CREATE TABLE IF NOT EXISTS whistleblower_channels(company_id TEXT PRIMARY KEY, public_key_hash TEXT NOT NULL UNIQUE, public_key TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS whistleblower_cases(id TEXT PRIMARY KEY, company_id TEXT NOT NULL, protocol TEXT NOT NULL UNIQUE, access_hash TEXT NOT NULL, category TEXT NOT NULL, ciphertext TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS idx_whistleblower_company ON whistleblower_cases(company_id,created_at);
    CREATE TABLE IF NOT EXISTS whistleblower_events(id TEXT PRIMARY KEY, company_id TEXT NOT NULL, case_id TEXT NOT NULL, actor_id TEXT NOT NULL, event TEXT NOT NULL, created_at TEXT NOT NULL);
  `);
  const secret=process.env.WHISTLEBLOWER_ENCRYPTION_KEY||"";
  const enabled=/^[a-f\d]{64}$/i.test(secret);
  const key=enabled?Buffer.from(secret,"hex"):null;
  const encrypt=payload=>{const iv=crypto.randomBytes(12);const cipher=crypto.createCipheriv("aes-256-gcm",key,iv);const ct=Buffer.concat([cipher.update(JSON.stringify(payload),"utf8"),cipher.final()]);return [iv,cipher.getAuthTag(),ct].map(x=>x.toString("base64url")).join(".")};
  const decrypt=value=>{const [a,b,c]=value.split(".");const decipher=crypto.createDecipheriv("aes-256-gcm",key,Buffer.from(a,"base64url"));decipher.setAuthTag(Buffer.from(b,"base64url"));return JSON.parse(Buffer.concat([decipher.update(Buffer.from(c,"base64url")),decipher.final()]).toString("utf8"))};
  const ready=(req,res,next)=>enabled?next():res.status(503).json({error:"CANAL_AGUARDANDO_CHAVE_SEGURA"});
  const team=(req,res,next)=>req.user?.role==="Equipe de Apuração"?next():res.status(403).json({error:"ACESSO_RESTRITO_EQUIPE_APURACAO"});
  const manager=(req,res,next)=>req.user?.role==="Administrador"?next():res.status(403).json({error:"ACESSO_RESTRITO_ADMINISTRADOR"});
  const hits=new Map();
  const limit=(req,res,next)=>{const address=req.ip||"unknown";const cutoff=Date.now()-3600000;for(const [k,v] of hits){if(v.start<cutoff)hits.delete(k)}if(hits.size>5000)hits.clear();const key=`${address}:${req.method}:${req.path.split("/").slice(0,5).join("/")}`;const item=hits.get(key)||{start:Date.now(),count:0};item.count++;hits.set(key,item);const max=req.method==="GET"?100:15;if(item.count>max)return res.status(429).json({error:"MUITAS_TENTATIVAS_TENTE_MAIS_TARDE"});next()};
  app.get("/api/ethics/channel",authenticate,manager,ready,(req,res)=>{const channel=db.prepare("SELECT public_key FROM whistleblower_channels WHERE company_id=?").get(req.user.companyId);res.json({publicPath:channel?`/denunciar/${channel.public_key}`:null})});
  app.post("/api/ethics/channel",authenticate,manager,ready,(req,res)=>{let channel=db.prepare("SELECT public_key FROM whistleblower_channels WHERE company_id=?").get(req.user.companyId);if(!channel){const publicKey=random();db.prepare("INSERT INTO whistleblower_channels VALUES (?,?,?,?)").run(req.user.companyId,fingerprint(publicKey),publicKey,now());channel={public_key:publicKey};audit(req,"ETHICS_CHANNEL_ACTIVATED","whistleblower_channel",req.user.companyId)}res.status(201).json({publicPath:`/denunciar/${channel.public_key}`})});
  app.get("/api/ethics/public/:key",limit,ready,(req,res)=>{const channel=db.prepare("SELECT c.name FROM whistleblower_channels wc JOIN companies c ON c.id=wc.company_id WHERE wc.public_key_hash=?").get(fingerprint(String(req.params.key)));if(!channel)return res.status(404).json({error:"CANAL_NAO_ENCONTRADO"});res.json({organization:channel.name,categories:[...CATEGORIES]})});
  app.post("/api/ethics/public/:key/report",limit,ready,(req,res)=>{
    const channel=db.prepare("SELECT company_id FROM whistleblower_channels WHERE public_key_hash=?").get(fingerprint(String(req.params.key)));
    if(!channel)return res.status(404).json({error:"CANAL_NAO_ENCONTRADO"});
    const {category,description,identity=""}=req.body||{};
    if(!CATEGORIES.has(category)||typeof description!=="string"||description.trim().length<30||description.length>12000||typeof identity!=="string"||identity.length>500)return res.status(422).json({error:"RELATO_INVALIDO"});
    const id=crypto.randomUUID(),protocol=`NX-${crypto.randomBytes(7).toString("hex").toUpperCase()}`,accessKey=random();
    db.prepare("INSERT INTO whistleblower_cases VALUES (?,?,?,?,?,?,?,?,?)").run(id,channel.company_id,protocol,fingerprint(accessKey),category,encrypt({description:description.trim(),identity:identity.trim()}),"Recebida",now(),now());
    res.status(201).json({protocol,accessKey,notice:"Guarde o protocolo e a chave. Por segurança, a chave não será mostrada novamente."});
  });
  app.post("/api/ethics/track",limit,ready,(req,res)=>{const {protocol,accessKey}=req.body||{};if(typeof protocol!=="string"||typeof accessKey!=="string")return res.status(400).json({error:"CREDENCIAIS_INVALIDAS"});const item=db.prepare("SELECT status,access_hash,updated_at FROM whistleblower_cases WHERE protocol=?").get(protocol.trim().toUpperCase());if(!item||item.access_hash!==fingerprint(accessKey))return res.status(404).json({error:"PROTOCOLO_OU_CHAVE_INVALIDOS"});res.json({status:item.status,updatedAt:item.updated_at})});
  app.get("/api/ethics/team/cases",authenticate,team,ready,(req,res)=>{const cases=db.prepare("SELECT id,protocol,category,status,created_at,updated_at FROM whistleblower_cases WHERE company_id=? ORDER BY created_at DESC LIMIT 150").all(req.user.companyId);res.setHeader("Cache-Control","no-store");res.json({cases})});
  app.get("/api/ethics/team/cases/:id",authenticate,team,ready,(req,res)=>{const item=db.prepare("SELECT * FROM whistleblower_cases WHERE id=? AND company_id=?").get(req.params.id,req.user.companyId);if(!item)return res.status(404).json({error:"CASO_NAO_ENCONTRADO"});audit(req,"ETHICS_CASE_ACCESSED","whistleblower_case",item.id);res.setHeader("Cache-Control","no-store");res.json({id:item.id,protocol:item.protocol,category:item.category,status:item.status,createdAt:item.created_at,report:decrypt(item.ciphertext)})});
  app.post("/api/ethics/team/cases/:id/status",authenticate,team,ready,(req,res)=>{const status=req.body?.status;if(!STATUSES.has(status))return res.status(422).json({error:"STATUS_INVALIDO"});const item=db.prepare("SELECT id,status FROM whistleblower_cases WHERE id=? AND company_id=?").get(req.params.id,req.user.companyId);if(!item)return res.status(404).json({error:"CASO_NAO_ENCONTRADO"});db.transaction(()=>{db.prepare("UPDATE whistleblower_cases SET status=?,updated_at=? WHERE id=? AND company_id=?").run(status,now(),item.id,req.user.companyId);db.prepare("INSERT INTO whistleblower_events VALUES (?,?,?,?,?,?)").run(crypto.randomUUID(),req.user.companyId,item.id,req.user.sub,`${item.status} → ${status}`,now())})();audit(req,"ETHICS_CASE_STATUS_CHANGED","whistleblower_case",item.id,{status});res.json({ok:true,status})});
}
