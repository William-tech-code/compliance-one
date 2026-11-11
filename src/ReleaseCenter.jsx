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
    if(active&&/^\\d+\\.\\d+\\.\\d+$/.test(data.version)&&compare(data.version,CURRENT_RELEASE)>0)setLatest(data.version);
   }catch{/* No notification on connectivity failures. */}
  }
  check();
  const timer=setInterval(check,5*60*1000);
  return()=>{active=false;clearInterval(timer)};
 },[]);
 const newer=compare(latest,CURRENT_RELEASE)>0;
 const visible=newer||!read;
 const current=RELEASE_HISTORY.find(item=>item.version===selected)||RELEASE_HISTORY[0];
 const markRead=()=>{
  try{localStorage.setItem(key(CURRENT_RELEASE),"yes")}catch{}
  setRead(true);setOpen(false);
 };
 return <div style={{margin:"12px 16px"}}>
  {visible&&<section role="status" style={{padding:16,border:"1px solid #526b81",borderRadius:12}}>
   <strong>{newer?"Nova versão disponível: "+latest:"O que mudou no Compliance One "+CURRENT_RELEASE}</strong>
   <p>{newer?"Uma nova versão foi publicada. Recarregue para receber a interface atualizada.":"Consulte o relatório detalhado das alterações realmente entregues nesta versão."}</p>
   <button onClick={()=>newer?window.location.reload():setOpen(true)}>{newer?"Atualizar agora":"Ver alterações detalhadas"}</button>
   {!newer&&<button style={{marginLeft:12}} onClick={markRead}>Marcar como lido</button>}
  </section>}
  <button style={{marginTop:8}} onClick={()=>setOpen(true)}>Histórico detalhado de atualizações</button>
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
