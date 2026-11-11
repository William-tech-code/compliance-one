import React, {useEffect, useState} from "react";
import {CURRENT_RELEASE, RELEASE_HISTORY} from "./releaseHistory";

const seenKey = version => "nexora-release-read:" + version;
const versionParts = value => String(value).split(".").map(Number);
const newerThan = (a,b) => {
  const x = versionParts(a), y = versionParts(b);
  for(let i=0;i<3;i++){if((x[i]||0)!==(y[i]||0))return (x[i]||0)>(y[i]||0)}
  return false;
};
const hasSeen = version => {try{return localStorage.getItem(seenKey(version))==="yes"}catch{return false}};
const markSeen = version => {try{localStorage.setItem(seenKey(version),"yes")}catch{}};

export default function ReleaseCenter(){
  const [latest,setLatest]=useState(CURRENT_RELEASE);
  const [open,setOpen]=useState(false);
  const [viewed,setViewed]=useState(()=>hasSeen(CURRENT_RELEASE));
  const [historyOpen,setHistoryOpen]=useState(false);
  const [selected,setSelected]=useState(CURRENT_RELEASE);
  const newer=newerThan(latest,CURRENT_RELEASE);
  const current=RELEASE_HISTORY.find(item=>item.version===selected)||RELEASE_HISTORY[0];
  useEffect(()=>{
    if(!hasSeen(CURRENT_RELEASE))setOpen(true);
    const onOpen=()=>{setHistoryOpen(false);setSelected(CURRENT_RELEASE);setOpen(true)};
    window.addEventListener("nexora:open-updates",onOpen);
    return()=>window.removeEventListener("nexora:open-updates",onOpen);
  },[]);
  useEffect(()=>{
    let active=true;
    const check=async()=>{
      try{
        const response=await fetch("/release-version.json?t="+Date.now(),{cache:"no-store"});
        if(!response.ok)return;
        const data=await response.json();
        if(active&&/^\d+\.\d+\.\d+$/.test(data.version)&&newerThan(data.version,CURRENT_RELEASE))setLatest(data.version);
      }catch{/* Offline does not interrupt work. */}
    };
    check();const timer=setInterval(check,5*60*1000);
    return()=>{active=false;clearInterval(timer)};
  },[]);
  useEffect(()=>{
    if(!open)return;
    const previous=document.body.style.overflow;
    document.body.style.overflow="hidden";
    const onKey=event=>{if(event.key==="Escape")dismiss()};
    window.addEventListener("keydown",onKey);
    return()=>{document.body.style.overflow=previous;window.removeEventListener("keydown",onKey)};
  },[open]);
  function dismiss(){
    markSeen(CURRENT_RELEASE);setViewed(true);setOpen(false);setHistoryOpen(false);
  }
  return <>
    {newer&&<div className="nx50-new-version" role="status">
      <span>Uma versão mais recente está disponível.</span>
      <button onClick={()=>window.location.reload()}>Atualizar agora ↗</button>
    </div>}
    {open&&<div className="nx50-release-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)dismiss()}}>
      <section className="nx50-release-dialog" role="dialog" aria-modal="true" aria-labelledby="nx50-release-title">
        <div className="nx50-release-glow" aria-hidden="true"/>
        <button className="nx50-release-close" onClick={dismiss} aria-label="Fechar novidades">×</button>
        <div className="nx50-release-brand"><span className="nx50-release-emblem">N</span><span>NEXORA <small>INTELLIGENCE UPDATE</small></span></div>
        <div className="nx50-release-main">
          <span className="nx50-release-label"><i/> EVOLUÇÃO DISPONÍVEL <b>V{CURRENT_RELEASE}</b></span>
          <h2 id="nx50-release-title">Uma nova experiência.<br/><em>Mais inteligência para decidir.</em></h2>
          <p>Conheça as melhorias entregues nesta versão do Compliance One. Interface mais objetiva, gestão organizada e controles ao alcance certo.</p>
          <div className="nx50-release-features">
            {(RELEASE_HISTORY[0]?.changes||[]).slice(0,4).map((change,index)=>
              <article key={change.module}>
                <span>{String(index+1).padStart(2,"0")}</span>
                <div><strong>{change.module}</strong><p>{change.benefit}</p></div>
              </article>)}
          </div>
          {historyOpen&&<div className="nx50-release-history">
            <div className="nx50-release-pills">{RELEASE_HISTORY.map(item=><button className={selected===item.version?"active":""} key={item.version} onClick={()=>setSelected(item.version)}>V{item.version}</button>)}</div>
            <h3>{current.title}</h3>
            {(current.changes||[]).map(change=><div className="nx50-release-history-item" key={change.module}><b>{change.module}</b><p>{change.after}</p></div>)}
          </div>}
          <div className="nx50-release-footer">
            <button className="nx50-release-primary" onClick={dismiss}>Explorar a plataforma <span>↗</span></button>
            <button className="nx50-release-secondary" onClick={()=>{setHistoryOpen(v=>!v);setSelected(CURRENT_RELEASE)}}>{historyOpen?"Ocultar detalhes":"Consultar versões"}</button>
          </div>
          <small className="nx50-release-note">Exibido uma única vez por versão neste navegador. Você pode consultar as novidades pelo ícone do cabeçalho.</small>
        </div>
      </section>
    </div>}
  </>;
}
