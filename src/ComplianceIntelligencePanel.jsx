import React,{useState} from "react";
import {apiGet,apiPost} from "./api";
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
 return <section style={{padding:20,margin:"16px 0",border:"1px solid #526b81",borderRadius:12}}>
  <h2>NEXORA Intelligence · IA e monitor normativo</h2>
  <p>IA opcional com contexto resumido, sem enviar documentos. Respostas são orientativas e dependem de validação humana.</p>
  {!authenticated&&<p>Conecte uma sessão autenticada para acessar estes serviços.</p>}
  <textarea aria-label="Pergunta para a IA" placeholder="Pergunte sobre riscos, controles ou prioridades" value={question} onChange={e=>setQuestion(e.target.value)} maxLength={1800} style={{width:"100%",minHeight:80}}/>
  <button disabled={!authenticated||busy||!question.trim()} onClick={ask}>Gerar análise com IA</button>
  {answer&&<div style={{whiteSpace:"pre-wrap",padding:12}}><strong>Resposta preliminar — revisar juridicamente</strong><p>{answer}</p></div>}
  <hr/>
  <p>Monitoramento de alterações no conteúdo de fontes oficiais. Mudança de conteúdo não significa, por si só, alteração legislativa ou vigência.</p>
  <button disabled={!authenticated||busy} onClick={load}>Consultar monitor</button>
  <button disabled={!authenticated||busy} onClick={check}>Verificar fontes agora</button>
  {monitor?.sources?.map(s=><article key={s.id} style={{padding:10,borderBottom:"1px solid #526b81"}}>
   <strong>{s.reference}</strong> · {s.snapshot?.status||"Não verificada"} · {s.snapshot?.checked_at||"Sem verificação"}
   <p><a href={s.url} target="_blank" rel="noopener noreferrer">Fonte oficial</a></p>
   {s.snapshot?.status==="CONTENT_CHANGED_REVIEW_REQUIRED"&&<><textarea aria-label={"Análise "+s.id} placeholder="Fundamentação da revisão (mínimo 12 caracteres)" value={notes[s.id]||""} onChange={e=>setNotes(p=>({...p,[s.id]:e.target.value}))} style={{width:"100%"}}/>
    <button disabled={busy||(notes[s.id]||"").trim().length<12} onClick={()=>review(s.id,"REVIEWED")}>Revisado</button>
    <button disabled={busy||(notes[s.id]||"").trim().length<12} onClick={()=>review(s.id,"NEEDS_ACTION")}>Exige adequação</button></>}
  </article>)}
  {error&&<p role="alert">{error}</p>}
 </section>;
}
