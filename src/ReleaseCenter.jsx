import React,{useEffect,useState} from "react";
import {CURRENT_RELEASE,RELEASE_HISTORY} from "./releaseHistory";

const key=version=>"nexora-release-read:"+version;
const compare=(a,b)=>String(a).split(".").map(Number).reduce((n,v,i)=>n||v-(Number(String(b).split(".")[i])||0),0);

export default function ReleaseCenter(){
 const [latest,setLatest]=useState(CURRENT_RELEASE);
 const [open,setOpen]=useState(false);
 const [selected,setSelected]=useState(CURRENT_RELEASE);
 const [read,setRead]=useState(()=>{try{return localStorage.getItem(key(CURRENT_RELEASE))==="yes"}catch{return false}});
 useEffect(()=>{
  let active=true;
  async function check(){
   try{
    const response=await fetch("/release-version.json?t="+Date.now(),{cache:"no-store"});
    if(!response.ok)return;
    const data=await response.json();
    if(active&&/^\d+\.\d+\.\d+$/.test(data.version)&&compare(data.version,CURRENT_RELEASE)>0)setLatest(data.version);
   }catch{/* No notification on connectivity failures. */}
  }
  check();
  const timer=setInterval(check,5*60*1000);
  return()=>{active=false;clearInterval(timer)};
 },[]);
 const newer=compare(latest,CURRENT_RELEASE)>0;
 const visible=true;
 const current=RELEASE_HISTORY.find(item=>item.version===selected)||RELEASE_HISTORY[0];
 const markRead=()=>{
  try{localStorage.setItem(key(CURRENT_RELEASE),"yes")}catch{}
  setRead(true);setOpen(false);
 };
 return <div className="nexora-mobile-release">
  <section className="nexora-mobile-release-card" role="region" aria-label="Central de atualizações">
   <div className="nexora-mobile-release-heading"><span className="nexora-mobile-release-kicker">NEXORA UPDATE CENTER</span><span className="nexora-mobile-release-version">V{newer?latest:CURRENT_RELEASE}</span></div>
   <strong>{newer?"Atualização disponível":read?"Histórico de melhorias":"Veja o que mudou"}</strong>
   <p>{newer?"Uma nova versão foi publicada. Atualize a página para recebê-la.":read?"Consulte as alterações entregues em cada versão.":"Confira as melhorias, correções e benefícios desta versão."}</p>
   <div className="nexora-mobile-release-actions">
    <button className="nexora-mobile-release-primary" onClick={()=>newer?window.location.reload():setOpen(true)}>{newer?"Atualizar agora":"Ver novidades"}</button>
    {!newer&&!read&&<button className="nexora-mobile-release-secondary" onClick={markRead}>Marcar como lido</button>}
    <button className="nexora-mobile-release-link" onClick={()=>setOpen(true)}>Histórico de versões</button>
   </div>
  </section>
  {open&&<section role="dialog" aria-modal="true" aria-label="Histórico de atualizações" style={{position:"fixed",inset:0,zIndex:99999,background:"rgba(4,12,22,.96)",overflowY:"auto",padding:"min(5vw,40px)",color:"#f2f6fc"}}>
   <div style={{maxWidth:840,margin:"0 auto"}}>
    <button onClick={()=>setOpen(false)} style={{float:"right"}} aria-label="Fechar atualizações">Fechar ×</button>
    <h2>NEXORA Update Center</h2>
    <p>Registro técnico de alterações entregues. Cada item explica o comportamento anterior, a mudança e seu benefício.</p>
    <nav aria-label="Versões">{RELEASE_HISTORY.map(item=><button key={item.version} style={{marginRight:8}} onClick={()=>setSelected(item.version)} aria-pressed={selected===item.version}>V{item.version}</button>)}</nav>
    <h3>{current.title}</h3><p>Versão {current.version} · {current.date}</p>
    {current.changes.map(change=><article key={change.module} style={{padding:16,margin:"12px 0",border:"1px solid #526b81",borderRadius:12}}>
     <h4>{change.module}</h4><p><strong>Antes:</strong> {change.before}</p><p><strong>Agora:</strong> {change.after}</p><p><strong>Benefício:</strong> {change.benefit}</p>
    </article>)}
    <button onClick={markRead}>Entendi as alterações</button>
   </div>
  </section>}
 </div>;
}
