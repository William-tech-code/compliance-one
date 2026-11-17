// V51 tenant-owned organization API. No cross-tenant portfolio or automatic provisioning.
export function configureV51Organization({app,db,authenticate,audit}){
  const requireAdmin=(req,res,next)=>req.user.role==="Administrador"?next():res.status(403).json({error:"ADMIN_REQUIRED"});
  app.get("/api/v51/organization",authenticate,(req,res)=>{
    const company=db.prepare("SELECT id,name,segment,size,created_at FROM companies WHERE id=?").get(req.user.companyId);
    if(!company)return res.status(404).json({error:"ORGANIZATION_NOT_FOUND"});
    res.setHeader("Cache-Control","no-store");
    return res.json({company});
  });
  app.patch("/api/v51/organization",authenticate,requireAdmin,(req,res)=>{
    const raw=req.body||{};
    const allowed=["name","segment","size"];
    if(Object.keys(raw).some(key=>!allowed.includes(key))||!allowed.some(key=>Object.hasOwn(raw,key)))return res.status(400).json({error:"INVALID_ORGANIZATION_FIELDS"});
    const updated={};
    for(const field of allowed){
      if(!Object.hasOwn(raw,field))continue;
      if(typeof raw[field]!=="string"||raw[field].trim().length>(field==="name"?140:100)||(field==="name"&&raw[field].trim().length<2))
        return res.status(400).json({error:"INVALID_"+field.toUpperCase()});
      updated[field]=raw[field].trim();
    }
    const current=db.prepare("SELECT id,name,segment,size FROM companies WHERE id=?").get(req.user.companyId);
    if(!current)return res.status(404).json({error:"ORGANIZATION_NOT_FOUND"});
    const change={...current,...updated};
    db.prepare("UPDATE companies SET name=?,segment=?,size=? WHERE id=?").run(change.name,change.segment,change.size,req.user.companyId);
    audit(req,"V51_ORGANIZATION_UPDATED","company",req.user.companyId,{fields:Object.keys(updated)});
    res.setHeader("Cache-Control","no-store");
    return res.json({company:db.prepare("SELECT id,name,segment,size,created_at FROM companies WHERE id=?").get(req.user.companyId)});
  });
  app.get("/api/v51/organization/users",authenticate,(req,res)=>{
    if(!["Administrador","Compliance"].includes(req.user.role))return res.status(403).json({error:"FORBIDDEN"});
    const users=db.prepare("SELECT id,name,email,role,active,created_at FROM users WHERE company_id=? ORDER BY name COLLATE NOCASE").all(req.user.companyId);
    res.setHeader("Cache-Control","no-store");
    return res.json({users});
  });
  app.get("/api/v51/organization/audit",authenticate,(req,res)=>{
    if(!["Administrador","Auditoria","Compliance"].includes(req.user.role))return res.status(403).json({error:"FORBIDDEN"});
    const events=db.prepare("SELECT id,action,entity,entity_id,created_at FROM audit_log WHERE company_id=? ORDER BY created_at DESC LIMIT 50").all(req.user.companyId);
    res.setHeader("Cache-Control","no-store");
    return res.json({events});
  });
}
