import React,{useState} from "react";
import {apiGet,apiPost} from "./api";
import "./ComplianceIntelligencePanel.css";
export default function ComplianceIntelligencePanel({workspace,authenticated,notify}){
 const [question,setQuestion]=useState("");
 const [answer,setAnswer]=useState("");
 const [busy,setBusy]=useState(false);
 const [monitor,setMonitor]=useState(null);
 const [notes,setNotes]=useState({});
 const [error,setError]=useState("");
 const facts={
  segment:workspace.company?.segment||"",
  riskCount:(workspace.risks||[]).length,
  actionCount:(workspace.actions||[]).length,
  nonconformities:Object.values(workspace.answers||{}).filter(x=>x==="Não"||x==="Parcialmente").length,
  regulations:(workspace.regulatoryReviews||[]).map(r=>r.reference).slice(0,12)
 };
 const ask=async()=>{
  setBusy(true);setError("");
  try{const r=await apiPost("/ai/compliance-briefing",{question,facts});setAnswer(r.answer)}
  catch(e){setError(e.message||"IA indisponível. Configure a chave no servidor.")}
  finally{setBusy(false)}
 };
 const load=async()=>{
  setBusy(true);setError("");
  try{setMonitor(await apiGet("/regulatory/monitor"))}catch(e){setError(e.message)}
  finally{setBusy(false)}
 };
 const check=async()=>{
  setBusy(true);setError("");
  try{await apiPost("/regulatory/monitor/run",{});await load();notify("Verificação concluída; alterações exigem revisão humana")}
  catch(e){setError(e.message)}finally{setBusy(false)}
 };
 const review=async(id,decision)=>{
  setBusy(true);setError("");
  try{await apiPost("/regulatory/monitor/"+encodeURIComponent(id)+"/review",{decision,notes:notes[id]||""});await load();notify("Revisão registrada")}
  catch(e){setError(e.message)}finally{setBusy(false)}
 };
 return <section className="nexora-intel-panel" aria-label="Inteligência regulatória NEXORA">
  <div className="nexora-intel-head"><div><span className="nexora-intel-eyebrow">✦ NEXORA INTELLIGENCE · REGULATORY COMMAND</span><h2>Inteligência regulatória</h2><p>IA aplicada a riscos e acompanhamento verificável de fontes oficiais.</p></div><span className="nexora-intel-status">{authenticated?"● Sessão autenticada":"○ Conexão necessária"}</span></div>
  {!authenticated&&<div className="nexora-intel-alert" role="status"><b>Conecte sua API para ativar os recursos.</b><span>Use o botão “Conectar API” na barra superior. Sua pergunta permanece no navegador até que você solicite a análise.</span></div>}
  <div className="nexora-intel-grid">
   <section className="nexora-intel-card"><div className="nexora-intel-card-title"><span className="nexora-intel-icon">✦</span><div><small>ASSISTENTE DE PRIORIDADES</small><h3>Análise orientativa com IA</h3></div></div><p>Contexto resumido, sem envio de documentos. As respostas exigem revisão humana e não substituem parecer jurídico.</p>
    <label htmlFor="nexora-ai-question">Sua pergunta</label><textarea id="nexora-ai-question" aria-label="Pergunta para a IA" placeholder="Ex.: Quais controles devo priorizar para mitigar os riscos identificados?" value={question} onChange={e=>setQuestion(e.target.value)} maxLength={1800}/>
    <div className="nexora-intel-actions"><span>{question.length} / 1800 caracteres</span><button className="nexora-intel-primary" disabled={!authenticated||busy||!question.trim()} onClick={ask}>{busy?"Processando…":"✦ Gerar análise com IA"}</button></div>
    {answer&&<div className="nexora-intel-result" aria-live="polite"><strong>Resposta preliminar · revisão obrigatória</strong><p>{answer}</p></div>}
   </section>
   <section className="nexora-intel-card"><div className="nexora-intel-card-title"><span className="nexora-intel-icon">◉</span><div><small>REGULATORY MONITOR</small><h3>Monitoramento normativo</h3></div></div><p>Detecta mudanças no conteúdo das fontes oficiais cadastradas. A identificação de mudanças não comprova, isoladamente, alteração da legislação ou vigência.</p>
    <div className="nexora-intel-monitor"><span>FONTES OFICIAIS</span><strong>{monitor?.sources?.length??"—"}</strong><small>{monitor?"Fontes retornadas pelo monitor":"Aguardando consulta autenticada"}</small></div>
    <div className="nexora-intel-actions"><button className="nexora-intel-secondary" disabled={!authenticated||busy} onClick={load}>Consultar monitor</button><button className="nexora-intel-primary" disabled={!authenticated||busy} onClick={check}>↻ Verificar fontes</button></div>
   </section>
  </div>
  {monitor?.sources?.length>0&&<section className="nexora-intel-sources"><h3>Fontes em acompanhamento</h3>{monitor.sources.map(s=><article key={s.id}><div><strong>{s.reference}</strong><span>{s.snapshot?.status||"Não verificada"} · {s.snapshot?.checked_at||"Sem verificação"}</span></div><a href={s.url} target="_blank" rel="noopener noreferrer">Abrir fonte oficial ↗</a>{s.snapshot?.status==="CONTENT_CHANGED_REVIEW_REQUIRED"&&<div className="nexora-intel-review"><textarea aria-label={"Análise "+s.id} placeholder="Fundamentação da revisão (mínimo 12 caracteres)" value={notes[s.id]||""} onChange={e=>setNotes(p=>({...p,[s.id]:e.target.value}))}/><button disabled={busy||(notes[s.id]||"").trim().length<12} onClick={()=>review(s.id,"REVIEWED")}>Revisado</button><button disabled={busy||(notes[s.id]||"").trim().length<12} onClick={()=>review(s.id,"NEEDS_ACTION")}>Exige adequação</button></div>}</article>)}</section>}
  {error&&<p className="nexora-intel-error" role="alert">⚠ {error}</p>}
 </section>;
}
