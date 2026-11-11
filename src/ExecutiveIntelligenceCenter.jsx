import React,{useMemo,useState} from "react";
import {executiveIntelligence,exportExecutiveSnapshot} from "./executiveIntelligence.js";
const chip={border:"1px solid #334d65",borderRadius:12,padding:16,background:"linear-gradient(135deg,#101f31,#182d43)",color:"#eaf4ff"};
const caption={fontSize:12,color:"#a9c0d6",margin:0};
function KPI({title,value,sub}){return <div style={chip}><p style={caption}>{title}</p><strong style={{fontSize:30,display:"block",margin:"7px 0"}}>{value??"—"}</strong><p style={caption}>{sub}</p></div>}
export default function ExecutiveIntelligenceCenter({workspace,onNavigate}){
 const data=useMemo(()=>executiveIntelligence(workspace),[workspace]);
 const [filter,setFilter]=useState("Todos");
 const alerts=data.alerts.filter(a=>filter==="Todos"||a.severity===filter);
 const download=()=>{
  const blob=new Blob([exportExecutiveSnapshot(data)],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");a.href=url;a.download="nexora-executive-v47.json";a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
 };
 return <section className="nx-executive-panel">
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
   <div><p style={{...caption,letterSpacing:2}}>NEXORA · EXECUTIVE INTELLIGENCE V47</p><h2 style={{margin:"6px 0"}}>Centro de comando de governança</h2><p style={caption}>{data.company} · Indicadores operacionais com rastreabilidade</p></div>
   <button className="nx-secondary-action" onClick={download}>Exportar snapshot executivo</button>
  </div>
  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(165px,1fr))",gap:12,marginTop:18}}>
   <KPI title="Riscos registrados" value={data.risks.total} sub={data.risks.pendingReview+" aguardando confirmação"}/>
   <KPI title="Riscos críticos" value={data.risks.bySeverity.Crítico} sub="Classificação declarada"/>
   <KPI title="Ações vencidas" value={data.actions.overdue} sub="Aguardando regularização"/>
   <KPI title="Aprovações pendentes" value={data.actions.pendingValidation} sub="Validação independente"/>
   <KPI title="Ações concluídas" value={data.actions.completionRate===null?"—":data.actions.completionRate+"%"} sub={data.actions.completed+" de "+data.actions.total}/>
   <KPI title="Evidências vinculadas" value={data.evidence.attachedToActions} sub="Registros associados a ações"/>
  </div>
  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(250px,1fr))",gap:16,marginTop:18}}>
   <div style={chip}>
    <h3>Exposição por criticidade</h3>
    {Object.entries(data.risks.bySeverity).map(([level,count])=><div key={level} style={{margin:"12px 0"}}>
     <div style={{display:"flex",justifyContent:"space-between"}}><span>{level}</span><strong>{count}</strong></div>
     <div style={{height:7,background:"#294058",borderRadius:10,marginTop:6}}><div style={{width:(data.risks.total?count/data.risks.total*100:0)+"%",height:7,borderRadius:10,background:level==="Crítico"?"#ef7777":level==="Alto"?"#f4bd6a":"#6cbfcb"}}/></div>
    </div>)}
    <button className="nx-secondary-action" onClick={()=>onNavigate("riscos")}>Abrir matriz de riscos →</button>
   </div>
   <div style={chip}>
    <h3>Prioridades da diretoria</h3>
    <label style={caption}>Filtrar alertas: <select value={filter} onChange={e=>setFilter(e.target.value)}><option>Todos</option><option>Crítico</option><option>Alto</option><option>Médio</option></select></label>
    {alerts.length===0?<p style={caption}>Nenhum alerta operacional registrado neste filtro.</p>:alerts.slice(0,12).map(a=><div key={a.id} style={{padding:"10px 0",borderBottom:"1px solid #34516b"}}><strong>{a.severity} · {a.title}</strong><p style={caption}>{a.detail} · {a.owner}</p></div>)}
    {alerts.length>12&&<p style={caption}>Exibindo 12 de {alerts.length} alertas</p>}
    <button className="nx-secondary-action" onClick={()=>onNavigate("acoes")}>Abrir ações corretivas →</button>
   </div>
  </div>
  <details style={{marginTop:16}}><summary>Metodologia e limitações</summary>{data.limitations.map(x=><p key={x} style={caption}>{x}</p>)}</details>
 </section>;
}
