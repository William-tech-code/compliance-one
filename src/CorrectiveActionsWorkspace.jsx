import {apiPost} from "./api";
import React,{useState} from "react";
import {createCorrectiveAction,attachEvidence,transitionCorrectiveAction,complianceOperationsSummary} from "./complianceOperations.js";
const makeId=()=>globalThis.crypto?.randomUUID?.()||("NEX-"+Date.now()+"-"+Math.random().toString(36).slice(2));
export default function CorrectiveActionsWorkspace({workspace,setWorkspace,reviewer,notify}){
 const actions=workspace.correctiveActions||[];
 const [title,setTitle]=useState("");
 const [riskId,setRiskId]=useState("");
 const [owner,setOwner]=useState("");
 const [dueAt,setDueAt]=useState("");
 const actor=reviewer||"";
 const [error,setError]=useState("");
 const summary=complianceOperationsSummary(actions);
 const commit=(next)=>setWorkspace(prev=>({...prev,correctiveActions:next,history:[...(prev.history||[]),{id:makeId(),text:"Ações corretivas atualizadas",date:new Date().toISOString()}]}));
 const create=()=>{
  try{const action=createCorrectiveAction({id:makeId(),riskId,title,owner,dueAt:dueAt||null},actor);commit([...actions,action]);setTitle("");setError("");notify("Ação registrada")}
  catch(e){setError(e.message)}
 };
 const transition=(action,status)=>{
  if(status==="CONCLUÍDA"&&!reviewer){setError("A aprovação exige sessão autenticada");return;}
  try{const next=transitionCorrectiveAction(action,status,actor);commit(actions.map(a=>a.id===action.id?next:a));setError("");notify("Estado atualizado")}
  catch(e){setError(e.message)}
 };
 const evidence=async(action,file)=>{
  if(!file)return;
  try{
   if(file.size>5*1024*1024)throw Error("Limite de 5 MB por arquivo");
   if(!reviewer)throw Error("Sessão autenticada obrigatória");
   const base64=await new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(String(reader.result).split(",")[1]);
    reader.onerror=()=>reject(Error("Falha na leitura do arquivo"));
    reader.readAsDataURL(file);
   });
   const uploaded=await apiPost("/evidence/upload",{actionId:action.id,name:file.name,mime:file.type,base64});
   const next=attachEvidence(action,{id:uploaded.id,name:file.name,hash:uploaded.hash,source:"Arquivo original armazenado em disco persistente protegido",uploadedAt:uploaded.uploadedAt},actor);
   commit(actions.map(a=>a.id===action.id?next:a));setError("");notify("Arquivo original armazenado; hash registrado");

  }catch(e){setError(e.message)}
 };
 return <section style={{padding:20,border:"1px solid #526b81",borderRadius:12,margin:"12px 0"}}>
  <h2>Gestão de ações corretivas e evidências</h2>
  <p>Fluxo auditável: aberta → execução → validação independente → concluída.</p>
  <p>{summary.total} ações · {summary.overdue} vencidas · {summary.pendingValidation} aguardando validação · {summary.completed} concluídas</p>
  <p><strong>Atenção:</strong> o arquivo original é enviado ao servidor autenticado e armazenado em disco persistente após a configuração do Render. O registro inclui SHA-256.</p>
  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
   <span>Operador autenticado: {reviewer||"Conecte a API para operações auditáveis"}</span>
   <select aria-label="Risco vinculado" value={riskId} onChange={e=>setRiskId(e.target.value)}><option value="">Selecionar risco</option>{(workspace.risks||[]).map(r=><option key={r.id} value={r.id}>{r.title||r.id}</option>)}</select>
   <input aria-label="Título da ação" value={title} onChange={e=>setTitle(e.target.value)} placeholder="Ação corretiva"/>
   <input aria-label="Responsável pela ação" value={owner} onChange={e=>setOwner(e.target.value)} placeholder="Responsável"/>
   <input aria-label="Prazo" type="date" value={dueAt} onChange={e=>setDueAt(e.target.value)}/>
   <button disabled={!reviewer} onClick={create}>Criar ação</button>
  </div>
  {error&&<p role="alert">{error}</p>}
  {actions.map(a=><article key={a.id} style={{padding:12,marginTop:12,border:"1px solid #526b81",borderRadius:8}}>
   <strong>{a.title}</strong><p>Risco {a.riskId} · Responsável {a.owner} · Estado {a.status} · Evidências {a.evidences.length} · Prazo {a.dueAt||"não definido"}</p>
   <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
    {a.status==="ABERTA"&&<button onClick={()=>transition(a,"EM EXECUÇÃO")}>Iniciar execução</button>}
    {a.status==="EM EXECUÇÃO"&&<button onClick={()=>transition(a,"EM VALIDAÇÃO")}>Enviar para validação</button>}
    {a.status==="EM VALIDAÇÃO"&&<><button disabled={!reviewer} onClick={()=>transition(a,"CONCLUÍDA")}>Aprovar conclusão</button><button onClick={()=>transition(a,"EM EXECUÇÃO")}>Devolver para correção</button></>}
    {!["CONCLUÍDA","CANCELADA"].includes(a.status)&&<label>Enviar arquivo original de evidência <input type="file" onChange={e=>e.target.files?.[0]&&evidence(a,e.target.files[0])}/></label>}
   </div>
   {a.evidences.map(e=><p key={e.id}><small>{e.name} · {e.hash} · registrado por {e.uploadedBy}</small></p>)}
   <details><summary>Trilha de auditoria</summary>{a.events.map((e,i)=><p key={i}>{e.at} · {e.actor} · {e.type}</p>)}</details>
  </article>)}
 </section>;
}
