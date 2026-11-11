import React,{useState} from "react";
import {createGovernanceItem,reviewGovernanceItem,governancePortfolio} from "./enterpriseGovernance.js";
const categories=[["TERCEIRO","Due diligence de terceiros"],["POLITICA","Políticas e controles"],["TREINAMENTO","Compliance Academy"],["AUDITORIA","Auditoria contínua"],["DENUNCIA","Ética e integridade (indisponível até proteção de sigilo)"]];
export default function EnterpriseGovernanceCenter({workspace,setWorkspace,reviewer,notify}){
 const items=workspace.governanceItems||[];
 const [kind,setKind]=useState("TERCEIRO"),[title,setTitle]=useState(""),[owner,setOwner]=useState(""),[dueAt,setDueAt]=useState(""),[description,setDescription]=useState(""),[error,setError]=useState("");
 const summary=governancePortfolio(items);
 const save=next=>setWorkspace(s=>({...s,governanceItems:next}));
 const create=()=>{try{
  if(kind==="DENUNCIA")throw Error("Canal sigiloso exige backend isolado e permissões específicas");
  if(!reviewer)throw Error("Sessão autenticada obrigatória");
  const id=globalThis.crypto?.randomUUID?.()||"GOV-"+Date.now();
  save([...items,createGovernanceItem({id,kind,title,owner,dueAt,description},reviewer)]);
  setTitle("");setDescription("");setError("");notify("Registro criado");
 }catch(e){setError(e.message)}};
 const review=(item,decision)=>{try{if(!reviewer)throw Error("Sessão autenticada obrigatória");save(items.map(x=>x.id===item.id?reviewGovernanceItem(item,decision,reviewer):x));setError("");notify("Revisão registrada")}catch(e){setError(e.message)}};
 return <section className="nx-governance-panel">
  <h2>Governança Enterprise · V47</h2>
  <p>Cadastros internos de terceiros, políticas, treinamentos, auditorias e integridade. Nenhuma verificação externa é presumida.</p>
  <div className="nx-governance-stats"><span><strong>{summary.total}</strong> registros</span><span><strong>{summary.open}</strong> em andamento</span><span><strong>{summary.overdue}</strong> vencidos</span><span><strong>{summary.approved}</strong> aprovados</span></div>
  <div className="nx-governance-form">
   <select aria-label="Tipo de registro" value={kind} onChange={e=>setKind(e.target.value)}>{categories.map(([id,label])=><option key={id} value={id} disabled={id==="DENUNCIA"}>{label}</option>)}</select>
   <input aria-label="Título" placeholder="Título" value={title} onChange={e=>setTitle(e.target.value)}/>
   <input aria-label="Responsável" placeholder="Responsável" value={owner} onChange={e=>setOwner(e.target.value)}/>
   <input aria-label="Prazo" type="date" value={dueAt} onChange={e=>setDueAt(e.target.value)}/>
   <input aria-label="Descrição" placeholder="Descrição" value={description} onChange={e=>setDescription(e.target.value)}/>
   <button className="nx-primary-action" disabled={!reviewer} onClick={create}>+ Adicionar registro</button>
  </div>
  {error&&<p className="nx-form-error" role="alert">{error}</p>}
  {items.map(item=><article className="nx-governance-record" key={item.id}>
   <strong>{item.kind} · {item.title}</strong><p>{item.status} · Responsável: {item.owner||"Não atribuído"} · Prazo: {item.dueAt||"Não definido"}</p>
   <p>{item.description}</p>
   {item.status!=="APROVADO"&&item.status!=="REPROVADO"&&<div className="nx-governance-record-actions">
    <button disabled={!reviewer} onClick={()=>review(item,"EM ANÁLISE")}>Em análise</button>
    <button disabled={!reviewer||reviewer===item.createdBy} onClick={()=>review(item,"APROVADO")}>Aprovar</button>
    <button disabled={!reviewer} onClick={()=>review(item,"REPROVADO")}>Reprovar</button>
   </div>}
   <details><summary>Histórico</summary>{item.history.map((event,i)=><p key={i}>{event.type} · {event.actor} · {event.at}</p>)}</details>
  </article>)}
  <p style={{fontSize:12}}>Registros de denúncias exigem controle de confidencialidade específico antes de uso com relatos reais. Não utilize este formulário para dados sensíveis.</p>
 </section>;
}
