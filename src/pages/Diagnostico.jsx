import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

const VERSION = "V124 ENTERPRISE";
const STORAGE = "compliance_one_v45_state";
const LEGACY = "compliance_one_v40_state";

const PROFILES = {
  Administrador: { dashboard:true, empresas:true, diagnostico:true, riscos:true, plano:true, planilhas:true, relatorios:true, usuarios:true },
  Compliance: { dashboard:true, empresas:true, diagnostico:true, riscos:true, plano:true, planilhas:true, relatorios:true, usuarios:false },
  Gestor: { dashboard:true, empresas:true, diagnostico:true, riscos:true, plano:true, planilhas:true, relatorios:true, usuarios:false },
  Funcionário: { dashboard:true, empresas:false, diagnostico:false, riscos:false, plano:false, planilhas:true, relatorios:false, usuarios:false },
};

const NAV = [
  ["dashboard", "Visão geral", "⌂"],
  ["empresas", "Empresas", "▦"],
  ["diagnostico", "Diagnóstico", "◈"],
  ["riscos", "Matriz de riscos", "◆"],
  ["plano", "Plano de ação", "✓"],
  ["planilhas", "Planilhas", "▤"],
  ["relatorios", "Relatórios", "▥"],
  ["usuarios", "Usuários", "♙"],
];

const QUESTION_BANK = [
  { id:"governanca", domain:"Governança", question:"A empresa possui código de conduta e políticas de integridade formalmente aprovados?", weight:12, risk:"Ausência ou fragilidade do código de conduta e políticas de integridade", category:"Governança" },
  { id:"treinamento", domain:"Pessoas", question:"Os colaboradores recebem treinamentos periódicos sobre compliance e conduta?", weight:10, risk:"Treinamentos de compliance insuficientes ou desatualizados", category:"Trabalhista" },
  { id:"canal", domain:"Denúncias", question:"Existe canal de denúncias acessível, divulgado e com tratamento formal das manifestações?", weight:10, risk:"Canal de denúncias inexistente ou sem tratamento formal", category:"Reputacional" },
  { id:"terceiros", domain:"Terceiros", question:"A empresa realiza avaliação de integridade de fornecedores e parceiros relevantes?", weight:10, risk:"Ausência de due diligence de terceiros", category:"Regulatório" },
  { id:"contratos", domain:"Contratos", question:"Os contratos relevantes possuem cláusulas de integridade, responsabilidade e proteção adequadas?", weight:8, risk:"Contratos sem cláusulas essenciais de integridade", category:"Regulatório" },
  { id:"controles", domain:"Controles", question:"Existem controles internos documentados para processos financeiros e operacionais críticos?", weight:12, risk:"Controles internos insuficientes em processos críticos", category:"Operacional" },
  { id:"conflitos", domain:"Conflitos", question:"Há procedimento para identificação e tratamento de conflitos de interesses?", weight:8, risk:"Conflitos de interesses sem procedimento formal", category:"Governança" },
  { id:"dados", domain:"Dados", question:"A empresa mantém regras e controles para proteção de dados e acesso às informações?", weight:10, risk:"Controles insuficientes de proteção e acesso a dados", category:"Tecnologia" },
  { id:"auditoria", domain:"Monitoramento", question:"A organização monitora indicadores de compliance e realiza verificações periódicas?", weight:10, risk:"Monitoramento e auditoria de compliance insuficientes", category:"Processos" },
  { id:"documentacao", domain:"Evidências", question:"As políticas, treinamentos, aprovações e controles possuem evidências organizadas e rastreáveis?", weight:10, risk:"Evidências de compliance dispersas ou insuficientes", category:"Processos" },
];

const ANSWERS = [
  { value:0, label:"Não existe", score:0 },
  { value:1, label:"Em implantação", score:25 },
  { value:2, label:"Parcialmente", score:60 },
  { value:3, label:"Sim, mas precisa melhorar", score:80 },
  { value:4, label:"Sim, consolidado", score:100 },
];

const SEED = {
  companies:[{ id:"empresa-demo", nomeFantasia:"Empresa Modelo", razaoSocial:"Empresa Modelo Ltda.", cnpj:"12.345.678/0001-90", segmento:"Serviços", responsavel:"Administrador", email:"contato@empresa.com", status:"Ativa", createdAt:"2026-08-01" }],
  diagnostics:[{ id:"diag-demo", empresaId:"empresa-demo", titulo:"Diagnóstico inicial", percentual:62, observacoes:"Avaliação demonstrativa. Execute a avaliação guiada para gerar um diagnóstico completo.", createdAt:"2026-08-01" }],
  risks:[
    { id:"risk-demo-1", empresaId:"empresa-demo", nome:"Ausência de política formal de compliance", categoria:"Governança", probabilidade:4, impacto:5, nivel:"Crítico", status:"Aberto", origem:"Diagnóstico", responsavel:"Compliance", prazo:"2026-09-30", observacoes:"Formalizar política e aprovação da direção.", createdAt:"2026-08-01" },
    { id:"risk-demo-2", empresaId:"empresa-demo", nome:"Treinamentos obrigatórios desatualizados", categoria:"Trabalhista", probabilidade:3, impacto:4, nivel:"Alto", status:"Em tratamento", origem:"Diagnóstico", responsavel:"RH", prazo:"2026-10-15", observacoes:"Atualizar trilhas de treinamento.", createdAt:"2026-08-03" },
  ],
  plans:[{ id:"plan-demo", empresaId:"empresa-demo", riscoId:"risk-demo-1", riscoNome:"Ausência de política formal de compliance", acao:"Elaborar, aprovar e publicar a política de compliance.", responsavel:"Compliance", prazo:"2026-09-30", prioridade:"Crítica", status:"Em andamento", origem:"Matriz de riscos", observacoes:"Submeter à diretoria.", createdAt:"2026-08-02" }],
  users:[{ id:"user-admin", nome:"Administrador", email:"admin@empresa.com", perfil:"Administrador", status:"Ativo" },{ id:"user-comp", nome:"Compliance", email:"compliance@empresa.com", perfil:"Compliance", status:"Ativo" }],
  audit:[],
  activeCompanyId:"empresa-demo",
  profile:"Administrador",
  onboarding:{},
};

function uid(prefix){ if(typeof crypto!=="undefined" && crypto.randomUUID) return `${prefix}-${crypto.randomUUID()}`; return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`; }
function dateKey(){ return new Date().toISOString().slice(0,10); }
function formatDate(v){ if(!v) return "—"; const d=new Date(`${v}T00:00:00`); return Number.isNaN(d.getTime())?v:d.toLocaleDateString("pt-BR"); }
function riskLevel(p,i){ const s=Number(p||0)*Number(i||0); return s>=16?"Crítico":s>=10?"Alto":s>=5?"Moderado":"Baixo"; }
function riskScore(r){ return Number(r?.probabilidade||0)*Number(r?.impacto||0); }
function clamp(n,min,max){ return Math.min(max,Math.max(min,n)); }
function csvCell(v){ const text=String(v??"").replace(/"/g,'""'); return `"${text}"`; }
function safeParse(key){ try{return JSON.parse(localStorage.getItem(key)||"null");}catch{return null;} }
function initialState(){
  const current=safeParse(STORAGE);
  if(current) return normalize(current);
  const legacy=safeParse(LEGACY);
  if(legacy) return normalize({ ...SEED, ...legacy, audit:Array.isArray(legacy.audit)?legacy.audit:[] });
  return normalize(SEED);
}
function normalize(s){
  const n={
    companies:Array.isArray(s.companies)&&s.companies.length?s.companies:SEED.companies,
    diagnostics:Array.isArray(s.diagnostics)?s.diagnostics:[],
    risks:Array.isArray(s.risks)?s.risks:[],
    plans:Array.isArray(s.plans)?s.plans:[],
    users:Array.isArray(s.users)&&s.users.length?s.users:SEED.users,
    audit:Array.isArray(s.audit)?s.audit:[],
    activeCompanyId:s.activeCompanyId||"",
    profile:s.profile||"Administrador",
    onboarding:s.onboarding||{},
  };
  return n;
}

function App(){
  const [state,setState]=useState(initialState);
  const [page,setPage]=useState("dashboard");
  const [loading,setLoading]=useState(true);
  const [loadingText,setLoadingText]=useState("Preparando ambiente...");
  const [toast,setToast]=useState("");
  const [mobile,setMobile]=useState(false);
  const [palette,setPalette]=useState(false);
  const [onboarding,setOnboarding]=useState(false);
  const [savedAt,setSavedAt]=useState(null);
  const [globalSearch,setGlobalSearch]=useState("");

  useEffect(()=>{
    const phases=[
      [0,"INICIALIZANDO NEXUS"],
      [1500,"CARREGANDO GOVERNANÇA"],
      [3000,"MAPEANDO RISCOS E CONTROLES"],
      [4800,"PREPARANDO INTELIGÊNCIA DE COMPLIANCE"],
      [6300,"SINCRONIZANDO AMBIENTE EMPRESARIAL"],
      [7600,"AMBIENTE PRONTO"]
    ];
    const timers=phases.map(([ms,text])=>setTimeout(()=>setLoadingText(text),ms));
    const done=setTimeout(()=>setLoading(false),8000);
    return()=>{timers.forEach(clearTimeout);clearTimeout(done);};
  },[]);

  useEffect(()=>{
    localStorage.setItem(STORAGE,JSON.stringify(state));
    localStorage.setItem("compliance_empresa_ativa_v31",state.activeCompanyId||"");
    setSavedAt(new Date());
  },[state]);

  useEffect(()=>{
    const key=(e)=>{
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();setPalette(true);}
      if(e.key==="Escape"){setPalette(false);setMobile(false);}
    };
    window.addEventListener("keydown",key); return()=>window.removeEventListener("keydown",key);
  },[]);

  useEffect(()=>{ if(!toast)return; const t=setTimeout(()=>setToast(""),3000);return()=>clearTimeout(t); },[toast]);

  const activeCompany=state.companies.find(c=>String(c.id)===String(state.activeCompanyId));
  const permissions=PROFILES[state.profile]||PROFILES.Administrador;
  const can=(module)=>permissions[module]!==false;
  const title=NAV.find(n=>n[0]===page)?.[1]||"Visão geral";

  function busy(text,fn){
    setLoadingText(text);setLoading(true);
    setTimeout(()=>{ try{fn();}finally{setLoading(false);} },280);
  }
  function audit(action){ return {id:uid("audit"),action,user:state.profile,date:new Date().toISOString()}; }
  function patch(partial,action){ setState(prev=>{const next={...prev,...partial};if(action)next.audit=[audit(action),...prev.audit].slice(0,150);return next;}); }
  function notify(msg){setToast(msg);}
  function go(next){ if(!can(next)){notify("Seu perfil não possui acesso a este módulo.");return;}setPage(next);setMobile(false); }
  function selectCompany(id){patch({activeCompanyId:id},"Alterou empresa ativa");}

  function backup(){
    const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`compliance-one-backup-${dateKey()}.json`;a.click();URL.revokeObjectURL(url);notify("Backup JSON exportado.");
  }
  function importBackup(file){
    if(!file)return; const reader=new FileReader();
    reader.onload=()=>{try{const data=JSON.parse(reader.result);setState(normalize(data));notify("Backup restaurado com sucesso.");}catch{notify("Arquivo de backup inválido.");}};reader.readAsText(file);
  }

  const commands=[...NAV.filter(n=>can(n[0])).map(n=>({id:n[0],label:n[1],run:()=>go(n[0])})),{id:"assessment",label:"Iniciar avaliação guiada",run:()=>setOnboarding(true)},{id:"backup",label:"Exportar backup",run:backup}];
  const commandsFiltered=commands.filter(c=>c.label.toLowerCase().includes(globalSearch.toLowerCase()));

  return <div className="app-shell">
    {loading&&<LoadingOverlay text={loadingText}/>} 
    <aside className={`sidebar ${mobile?"open":""}`}>
      <div className="brand"><div className="brand-mark">C</div><div><strong>COMPLIANCE<span> ONE</span></strong><small>Governança · Riscos · Integridade</small></div></div>
      <div className="company-card"><span>EMPRESA ATIVA</span><strong>{activeCompany?.nomeFantasia||"Visão consolidada"}</strong><small>{activeCompany?.cnpj||"Todas as empresas"}</small></div>
      <nav className="nav"><span className="nav-label">CENTRAL</span>{NAV.map(([key,label,icon])=>can(key)&&<button key={key} className={page===key?"active":""} onClick={()=>go(key)}><span className="nav-icon">{icon}</span><span>{label}</span>{page===key&&<i/>}</button>)}</nav>
      <div className="sidebar-bottom"><span className="live"><i/> Sistema operacional</span><small>{VERSION} · Autosave ativo</small></div>
    </aside>
    {mobile&&<button className="mobile-backdrop" onClick={()=>setMobile(false)} aria-label="Fechar menu"/>}
    <main className="main-area">
      <header className="topbar">
        <div className="topbar-left"><button className="mobile-menu" onClick={()=>setMobile(true)}>☰</button><div><span className="breadcrumb">COMPLIANCE ONE / {title.toUpperCase()}</span><strong>{title}</strong></div></div>
        <div className="topbar-actions">
          <button className="command-btn" onClick={()=>setPalette(true)}>⌘ K <span>Pesquisar</span></button>
          <div className="switcher"><small>EMPRESA</small><select value={state.activeCompanyId} onChange={e=>selectCompany(e.target.value)}><option value="">Todas as empresas</option>{state.companies.map(c=><option key={c.id} value={c.id}>{c.nomeFantasia||c.razaoSocial}</option>)}</select></div>
          <div className="avatar" title={state.profile}>{state.profile.charAt(0)}</div>
        </div>
      </header>
      <div className="autosave"><span><i/> Dados salvos automaticamente</span>{savedAt&&<small>última atualização {savedAt.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</small>}</div>
      <div className="content-wrap">
        {page==="dashboard"&&<Dashboard state={state} activeCompany={activeCompany} go={go} setOnboarding={setOnboarding}/>} 
        {page==="empresas"&&<Empresas state={state} patch={patch} notify={notify}/>} 
        {page==="diagnostico"&&<Diagnostico state={state} patch={patch} activeCompany={activeCompany} notify={notify} setOnboarding={setOnboarding}/>} 
        {page==="riscos"&&<Matriz state={state} patch={patch} activeCompany={activeCompany} notify={notify} go={go}/>} 
        {page==="plano"&&<Plano state={state} patch={patch} activeCompany={activeCompany} notify={notify}/>} 
        {page==="planilhas"&&<Planilhas state={state} activeCompany={activeCompany} notify={notify}/>} 
        {page==="relatorios"&&<Relatorios state={state} activeCompany={activeCompany} notify={notify}/>} 
        {page==="usuarios"&&<Usuarios state={state} patch={patch} notify={notify}/>} 
      </div>
    </main>
    {toast&&<div className="toast">✓ {toast}</div>}
    {palette&&<CommandPalette query={globalSearch} setQuery={setGlobalSearch} commands={commandsFiltered} onClose={()=>{setPalette(false);setGlobalSearch("");}}/>}
    {onboarding&&<Assessment state={state} patch={patch} activeCompany={activeCompany} notify={notify} onClose={()=>setOnboarding(false)}/>} 
  </div>;
}

function Header({eyebrow,title,description,action}){return <div className="module-header"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{action}</div>}
function Panel({children,className=""}){return <section className={`panel ${className}`}>{children}</section>}
function PanelTitle({eyebrow,title,action}){return <div className="panel-title"><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div>{action}</div>}
function Kpi({label,value,meta,icon,tone=""}){return <div className={`kpi ${tone}`}><div className="kpi-icon">{icon}</div><div><span>{label}</span><strong>{value}</strong><small>{meta}</small></div></div>}
function Badge({value}){const c=String(value||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g,"-");return <span className={`badge badge-${c}`}>{value||"—"}</span>}
function Empty({text}){return <div className="empty"><span>○</span><strong>{text}</strong></div>}
function Notice({children,type="warning"}){return <div className={`notice ${type}`}>ⓘ <span>{children}</span></div>}
function LoadingOverlay({text}){
  return <div className="cinema-intro" role="status" aria-live="polite">
    <div className="cinema-grid"/>
    <div className="cinema-glow cinema-glow-a"/>
    <div className="cinema-glow cinema-glow-b"/>
    <div className="cinema-content">
      <div className="cinema-mark"><span>N</span></div>
      <div className="cinema-kicker">COMPLIANCE ONE · NEXUS</div>
      <h1>Inteligência que<br/><em>previne perdas.</em></h1>
      <p>{text}</p>
      <div className="cinema-progress"><i/></div>
      <div className="cinema-status"><span>ENTERPRISE COMPLIANCE PLATFORM</span><b>V124</b></div>
    </div>
    <div className="cinema-scan"/>
  </div>}
function Modal({title,onClose,children,wide=false}){return <div className="modal-backdrop" onMouseDown={onClose}><div className={`modal ${wide?"wide":""}`} onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><div><span className="eyebrow">COMPLIANCE ONE</span><h2>{title}</h2></div><button className="close" onClick={onClose}>×</button></div>{children}</div></div>}
function Field({label,children,full=false}){return <label className={full?"full":""}><span>{label}</span>{children}</label>}

function Dashboard({state,activeCompany,go,setOnboarding}){
  const risks=state.risks.filter(r=>!state.activeCompanyId||String(r.empresaId)===String(state.activeCompanyId));
  const plans=state.plans.filter(p=>!state.activeCompanyId||String(p.empresaId)===String(state.activeCompanyId));
  const diags=state.diagnostics.filter(d=>!state.activeCompanyId||String(d.empresaId)===String(state.activeCompanyId));
  const compliance=diags.length?Math.round(diags.reduce((a,d)=>a+Number(d.percentual||0),0)/diags.length):0;
  const critical=risks.filter(r=>r.nivel==="Crítico").length;
  const high=risks.filter(r=>r.nivel==="Alto").length;
  const done=plans.filter(p=>p.status==="Concluída").length;
  const overdue=plans.filter(p=>p.prazo&&new Date(`${p.prazo}T23:59:59`)<new Date()&&p.status!=="Concluída").length;
  const completion=plans.length?Math.round(done/plans.length*100):0;
  const domains=["Governança","Operacional","Regulatório","Trabalhista","Tecnologia","Processos","Reputacional","Financeiro"].map(x=>({x,n:risks.filter(r=>r.categoria===x).length}));
  const max=Math.max(1,...domains.map(d=>d.n));
  return <div className="page">
    <Header eyebrow="COMMAND CENTER · TEMPO REAL" title={activeCompany?.nomeFantasia||"Visão executiva"} description="Uma central dinâmica para acompanhar conformidade, riscos, planos de ação e evolução da organização." action={<div className="header-actions"><button className="ghost-btn" onClick={()=>go("relatorios")}>Relatório</button><button className="primary-btn" onClick={()=>setOnboarding(true)}>✦ Avaliação guiada</button></div>}/>
    <div className="hero"><div><span>ÍNDICE DE CONFORMIDADE</span><strong>{compliance}%</strong><small>{compliance>=80?"Maturidade consolidada":compliance>=60?"Evolução em andamento":"Prioridade de melhoria"}</small></div><div className="hero-progress"><i style={{width:`${clamp(compliance,0,100)}%`}}/></div><div className="hero-side"><span>EXPOSIÇÃO</span><strong>{critical+high}</strong><small>altos + críticos</small></div><div className="hero-side"><span>EXECUÇÃO</span><strong>{completion}%</strong><small>planos concluídos</small></div></div>
    <div className="kpi-grid"><Kpi label="Riscos" value={risks.length} meta={`${critical} críticos · ${high} altos`} icon="◆" tone="danger"/><Kpi label="Planos abertos" value={plans.length-done} meta={`${overdue} atrasados`} icon="✓" tone="warning"/><Kpi label="Diagnósticos" value={diags.length} meta="avaliações registradas" icon="◈" tone="info"/><Kpi label="Empresas" value={state.companies.length} meta="estrutura cadastrada" icon="▦"/></div>
    <div className="dashboard-grid"><Panel><PanelTitle eyebrow="EXPOSIÇÃO" title="Mapa de risco" action={<button className="ghost-btn" onClick={()=>go("riscos")}>Abrir matriz →</button>}/><RiskMatrixMini risks={risks}/></Panel><Panel><PanelTitle eyebrow="EXECUÇÃO" title="Planos de ação" action={<button className="ghost-btn" onClick={()=>go("plano")}>Acompanhar →</button>}/><div className="donut-wrap"><div className="donut" style={{"--value":`${completion}%`}}><div><strong>{completion}%</strong><span>concluído</span></div></div><div className="legend-list"><Legend color="green" label="Concluídos" value={done}/><Legend color="yellow" label="Em andamento" value={plans.filter(p=>p.status==="Em andamento").length}/><Legend color="gray" label="Pendentes" value={plans.filter(p=>p.status==="Pendente").length}/><Legend color="red" label="Atrasados" value={overdue}/></div></div></Panel></div>
    <div className="dashboard-grid lower"><Panel><PanelTitle eyebrow="INTELIGÊNCIA" title="Riscos por categoria"/><div className="category-bars">{domains.map(d=><div className="cat-bar" key={d.x}><span>{d.x}</span><div><i style={{width:`${d.n/max*100}%`}}/></div><b>{d.n}</b></div>)}</div></Panel><Panel><PanelTitle eyebrow="PRIORIDADES" title="Atenção imediata"/><div className="priority-list">{risks.filter(r=>["Crítico","Alto"].includes(r.nivel)).sort((a,b)=>riskScore(b)-riskScore(a)).slice(0,5).map(r=><div className="priority-row" key={r.id}><div className={`priority-dot ${r.nivel.toLowerCase()}`}/><div><strong>{r.nome}</strong><small>{r.categoria} · Score {riskScore(r)}</small></div><Badge value={r.nivel}/></div>)}{!risks.some(r=>["Crítico","Alto"].includes(r.nivel))&&<Empty text="Nenhum risco prioritário."/>}</div></Panel></div>
    <Panel className="activity-panel"><PanelTitle eyebrow="RASTREABILIDADE" title="Atividade recente"/><div className="activity-grid">{state.audit.slice(0,8).map(a=><div className="activity" key={a.id}><i/><div><strong>{a.action}</strong><small>{a.user} · {new Date(a.date).toLocaleString("pt-BR")}</small></div></div>)}{!state.audit.length&&<Empty text="As atividades do sistema aparecerão aqui."/>}</div></Panel>
  </div>;
}
function Legend({color,label,value}){return <div className="legend"><i className={color}/><span>{label}</span><b>{value}</b></div>}
function RiskMatrixMini({risks}){const cells=[];for(let p=5;p>=1;p--){for(let i=1;i<=5;i++){const count=risks.filter(r=>Number(r.probabilidade)===p&&Number(r.impacto)===i).length;cells.push(<div className={`matrix-cell ${riskLevel(p,i).toLowerCase()}`} key={`${p}-${i}`}><small>{p}×{i}</small>{count>0&&<b>{count}</b>}</div>);}}return <div className="mini-matrix"><div className="matrix-axis-y">PROBABILIDADE</div><div className="matrix-cells">{cells}</div><div className="matrix-axis-x">IMPACTO</div></div>}

function Empresas({state,patch,notify}){
  const [search,setSearch]=useState("");const [modal,setModal]=useState(false);const [editing,setEditing]=useState(null);
  const empty={nomeFantasia:"",razaoSocial:"",cnpj:"",segmento:"",responsavel:"",email:"",status:"Ativa"};const [form,setForm]=useState(empty);
  const list=state.companies.filter(c=>`${c.nomeFantasia} ${c.razaoSocial} ${c.cnpj} ${c.segmento}`.toLowerCase().includes(search.toLowerCase()));
  function open(c){setEditing(c);setForm(c?{...c}:empty);setModal(true)}
  function save(e){e.preventDefault();if(!form.nomeFantasia.trim()||!form.razaoSocial.trim())return;const item={...form,id:editing?.id||uid("empresa"),createdAt:editing?.createdAt||dateKey()};patch({companies:editing?state.companies.map(c=>c.id===editing.id?item:c):[...state.companies,item],activeCompanyId:state.activeCompanyId||item.id},editing?"Atualizou empresa":"Cadastrou empresa");setModal(false);setEditing(null);setForm(empty);notify(editing?"Empresa atualizada.":"Empresa cadastrada.")}
  return <div className="page"><Header eyebrow="ESTRUTURA CORPORATIVA" title="Empresas" description="Gerencie organizações e mantenha todos os dados de compliance isolados por empresa." action={<button className="primary-btn" onClick={()=>open(null)}>＋ Nova empresa</button>}/><Panel><div className="toolbar"><div className="search"><span>⌕</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar empresa, CNPJ ou segmento..."/></div><span className="counter">{list.length} registro(s)</span></div><div className="table-scroll"><table><thead><tr><th>Empresa</th><th>CNPJ</th><th>Segmento</th><th>Responsável</th><th>Status</th><th/></tr></thead><tbody>{list.map(c=><tr key={c.id}><td><strong>{c.nomeFantasia}</strong><small>{c.razaoSocial}</small></td><td>{c.cnpj||"—"}</td><td>{c.segmento||"—"}</td><td>{c.responsavel||"—"}</td><td><Badge value={c.status}/></td><td><button className="icon-btn" onClick={()=>open(c)}>Editar</button></td></tr>)}</tbody></table></div>{!list.length&&<Empty text="Nenhuma empresa encontrada."/>}</Panel>{modal&&<Modal title={editing?"Editar empresa":"Nova empresa"} onClose={()=>setModal(false)}><form className="form-grid" onSubmit={save}>{[["nomeFantasia","Nome fantasia"],["razaoSocial","Razão social"],["cnpj","CNPJ"],["segmento","Segmento"],["responsavel","Responsável"],["email","E-mail"]].map(([k,l])=><Field key={k} label={l}><input value={form[k]||""} onChange={e=>setForm({...form,[k]:e.target.value})} required={k==="nomeFantasia"||k==="razaoSocial"}/></Field>)}<Field label="Status"><select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option>Ativa</option><option>Inativa</option></select></Field><div className="modal-actions"><button type="button" onClick={()=>setModal(false)}>Cancelar</button><button className="primary-btn">Salvar</button></div></form></Modal>}</div>;
}

function Diagnostico({state,patch,activeCompany,notify,setOnboarding}){
  const [modal,setModal]=useState(false);const [form,setForm]=useState({titulo:"",percentual:"",observacoes:""});
  const diagnostics=state.diagnostics.filter(d=>!state.activeCompanyId||String(d.empresaId)===String(state.activeCompanyId));
  function save(e){e.preventDefault();if(!state.activeCompanyId)return notify("Selecione uma empresa antes de registrar o diagnóstico.");const item={id:uid("diag"),empresaId:state.activeCompanyId,titulo:form.titulo,percentual:Number(form.percentual),observacoes:form.observacoes,createdAt:dateKey()};patch({diagnostics:[item,...state.diagnostics]},"Registrou diagnóstico");setForm({titulo:"",percentual:"",observacoes:""});setModal(false);notify("Diagnóstico registrado.")}
  return <div className="page"><Header eyebrow="AVALIAÇÃO DE MATURIDADE" title="Diagnóstico" description="Avalie a organização manualmente ou use a avaliação guiada para transformar respostas em indicadores e riscos." action={<button className="primary-btn" onClick={()=>setOnboarding(true)}>✦ Iniciar avaliação guiada</button>}/>{!activeCompany&&<Notice>Selecione uma empresa ativa para registrar informações.</Notice>}<div className="assessment-callout"><div><span>AVALIAÇÃO INTELIGENTE</span><strong>Responda perguntas e deixe o sistema calcular a maturidade.</strong><small>O motor gera diagnóstico, score, riscos prioritários e recomendações.</small></div><button className="ghost-btn" onClick={()=>setOnboarding(true)}>Começar agora →</button></div><Panel><PanelTitle eyebrow="HISTÓRICO" title="Diagnósticos registrados" action={<button className="ghost-btn" onClick={()=>setModal(true)}>＋ Registro manual</button>}/>{diagnostics.map(d=><div className="diagnostic-row" key={d.id}><div><strong>{d.titulo}</strong><small>{formatDate(d.createdAt)}</small><p>{d.observacoes||"Sem observações."}</p></div><div className="score-ring" style={{"--score": d.percentual}}><strong>{d.percentual}%</strong><span>conformidade</span></div></div>)}{!diagnostics.length&&<Empty text="Nenhum diagnóstico registrado."/>}</Panel>{modal&&<Modal title="Registro manual de diagnóstico" onClose={()=>setModal(false)}><form className="stack-form" onSubmit={save}><Field label="Título"><input value={form.titulo} onChange={e=>setForm({...form,titulo:e.target.value})} required/></Field><Field label="Índice de conformidade (%)"><input type="number" min="0" max="100" value={form.percentual} onChange={e=>setForm({...form,percentual:e.target.value})} required/></Field><Field label="Observações"><textarea value={form.observacoes} onChange={e=>setForm({...form,observacoes:e.target.value})}/></Field><div className="modal-actions"><button type="button" onClick={()=>setModal(false)}>Cancelar</button><button className="primary-btn">Salvar diagnóstico</button></div></form></Modal>}</div>;
}

function Assessment({state,patch,activeCompany,notify,onClose}){
  const [step,setStep]=useState(0);const [answers,setAnswers]=useState({});const [processing,setProcessing]=useState(false);
  if(!activeCompany)return <Modal title="Avaliação guiada" onClose={onClose}><Notice>Selecione uma empresa ativa antes de iniciar.</Notice><button className="primary-btn" onClick={onClose}>Fechar</button></Modal>;
  const q=QUESTION_BANK[step];const answered=answers[q.id]!==undefined;const total=QUESTION_BANK.length;const progress=Math.round(step/total*100);
  function answer(v){setAnswers({...answers,[q.id]:Number(v)})}
  function finish(){
    if(Object.keys(answers).length<total)return notify("Responda todas as perguntas antes de concluir.");
    setProcessing(true);
    setTimeout(()=>{
      const scores=QUESTION_BANK.map(item=>({item,answer:Number(answers[item.id]),score:ANSWERS.find(a=>a.value===Number(answers[item.id]))?.score||0}));
      const weighted=Math.round(scores.reduce((sum,x)=>sum+x.score*x.item.weight,0)/QUESTION_BANK.reduce((sum,x)=>sum+x.weight,0));
      const diagnosis={id:uid("diag"),empresaId:activeCompany.id,titulo:`Avaliação guiada · ${new Date().toLocaleDateString("pt-BR")}`,percentual:weighted,observacoes:`Avaliação automática com ${total} perguntas e ${weighted}% de maturidade média.`,createdAt:dateKey(),answers};
      const newRisks=scores.filter(x=>x.score<80).map(x=>{const gap=100-x.score;const p=gap>=75?5:gap>=50?4:gap>=30?3:2;const impact=x.item.weight>=11?5:x.item.weight>=9?4:3;return {id:uid("risk"),empresaId:activeCompany.id,nome:x.item.risk,categoria:x.item.category,probabilidade:p,impacto:impact,nivel:riskLevel(p,impact),status:"Aberto",origem:"Avaliação guiada",responsavel:"Compliance",prazo:"",observacoes:`Achado identificado na pergunta: ${x.item.question}`,createdAt:dateKey()};});
      const newPlans=newRisks.filter(r=>["Crítico","Alto"].includes(r.nivel)).map(r=>({id:uid("plan"),empresaId:activeCompany.id,riscoId:r.id,riscoNome:r.nome,acao:`Definir e implementar medida para tratar: ${r.nome}`,responsavel:"Compliance",prazo:"",prioridade:r.nivel,status:"Pendente",origem:"Avaliação guiada",observacoes:"Plano gerado automaticamente; definir responsável e prazo.",createdAt:dateKey()}));
      patch({diagnostics:[diagnosis,...state.diagnostics],risks:[...newRisks,...state.risks],plans:[...newPlans,...state.plans],onboarding:{...state.onboarding,lastRun:new Date().toISOString(),companyId:activeCompany.id,score:weighted}},`Concluiu avaliação guiada (${weighted}%)`);
      setProcessing(false);onClose();notify(`Avaliação concluída: ${weighted}%. ${newRisks.length} risco(s) e ${newPlans.length} plano(s) gerados.`);
    },900);
  }
  return <Modal title="Avaliação guiada de compliance" onClose={processing?()=>{}:onClose} wide><div className="wizard-head"><div><span>PERGUNTA {step+1} DE {total}</span><strong>{q.domain}</strong></div><b>{progress}%</b></div><div className="wizard-progress"><i style={{width:`${Math.max(4,progress)}%`}}/></div><div className="question-card"><span className="question-domain">{q.domain}</span><h3>{q.question}</h3><div className="answer-grid">{ANSWERS.map(a=><button key={a.value} className={answers[q.id]===a.value?"selected":""} onClick={()=>answer(a.value)}><strong>{a.label}</strong><small>{a.score}% de maturidade</small></button>)}</div></div><div className="wizard-actions"><button disabled={step===0} onClick={()=>setStep(step-1)}>← Anterior</button>{step<total-1?<button className="primary-btn" disabled={!answered} onClick={()=>setStep(step+1)}>Próxima →</button>:<button className="primary-btn" disabled={!answered||processing} onClick={finish}>{processing?"Processando...":"Concluir avaliação"}</button>}</div>{processing&&<div className="processing-inline"><div className="loader-ring small"/><span>Calculando maturidade, riscos e planos...</span></div>}</Modal>;
}

function Matriz({state,patch,activeCompany,notify,go}){
  const [search,setSearch]=useState("");const [level,setLevel]=useState("Todos");const [status,setStatus]=useState("Todos");const [modal,setModal]=useState(false);const [planModal,setPlanModal]=useState(null);
  const empty={nome:"",categoria:"Governança",probabilidade:3,impacto:3,status:"Aberto",responsavel:"",prazo:"",observacoes:""};const [form,setForm]=useState(empty);
  const risks=state.risks.filter(r=>!state.activeCompanyId||String(r.empresaId)===String(state.activeCompanyId));
  const filtered=risks.filter(r=>{const t=search.toLowerCase();return(!t||`${r.nome} ${r.categoria} ${r.responsavel}`.toLowerCase().includes(t))&&(level==="Todos"||r.nivel===level)&&(status==="Todos"||r.status===status)});
  function save(e){e.preventDefault();if(!state.activeCompanyId)return notify("Selecione uma empresa ativa.");const risk={...form,id:uid("risk"),empresaId:state.activeCompanyId,probabilidade:Number(form.probabilidade),impacto:Number(form.impacto),nivel:riskLevel(form.probabilidade,form.impacto),origem:"Cadastro manual",createdAt:dateKey()};patch({risks:[risk,...state.risks]},"Cadastrou risco manual");setForm(empty);setModal(false);notify("Risco criado na matriz.")}
  function openPlan(r){setPlanModal({risco:r,acao:`Tratar risco: ${r.nome}`,responsavel:r.responsavel||"Compliance",prazo:r.prazo||"",prioridade:r.nivel,status:"Pendente",observacoes:""})}
  function createPlan(e){e.preventDefault();const x=planModal;const plan={id:uid("plan"),empresaId:state.activeCompanyId,riscoId:x.risco.id,riscoNome:x.risco.nome,acao:x.acao,responsavel:x.responsavel,prazo:x.prazo,prioridade:x.prioridade,status:x.status,observacoes:x.observacoes,origem:"Matriz de riscos",createdAt:dateKey()};patch({plans:[plan,...state.plans]},"Criou plano a partir do risco");setPlanModal(null);notify("Plano de ação criado.")}
  function changeRiskStatus(id,statusValue){patch({risks:state.risks.map(r=>r.id===id?{...r,status:statusValue}:r)},"Atualizou status de risco");notify("Status do risco atualizado.")}
  return <div className="page"><Header eyebrow="GESTÃO DE RISCOS · 5×5" title="Matriz de riscos" description="Classifique probabilidade e impacto, acompanhe o tratamento e gere planos diretamente dos riscos." action={<button className="primary-btn" onClick={()=>setModal(true)}>＋ Novo risco</button>}/><Panel className="matrix-panel"><PanelTitle eyebrow="MAPA DE EXPOSIÇÃO" title="Matriz 5 × 5"/><RiskMatrixMini risks={risks}/></Panel><Panel><div className="toolbar"><div className="search"><span>⌕</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar risco, categoria ou responsável..."/></div><select value={level} onChange={e=>setLevel(e.target.value)}><option>Todos</option><option>Baixo</option><option>Moderado</option><option>Alto</option><option>Crítico</option></select><select value={status} onChange={e=>setStatus(e.target.value)}><option>Todos</option><option>Aberto</option><option>Em tratamento</option><option>Monitorado</option><option>Encerrado</option></select><span className="counter">{filtered.length} risco(s)</span></div><div className="table-scroll"><table><thead><tr><th>Risco</th><th>Categoria</th><th>P</th><th>I</th><th>Score</th><th>Nível</th><th>Status</th><th>Prazo</th><th/></tr></thead><tbody>{filtered.map(r=><tr key={r.id}><td><strong>{r.nome}</strong><small>{r.origem||"—"}</small></td><td>{r.categoria}</td><td>{r.probabilidade}</td><td>{r.impacto}</td><td><b>{riskScore(r)}</b></td><td><Badge value={r.nivel}/></td><td><select value={r.status||"Aberto"} onChange={e=>changeRiskStatus(r.id,e.target.value)}><option>Aberto</option><option>Em tratamento</option><option>Monitorado</option><option>Encerrado</option></select></td><td>{formatDate(r.prazo)}</td><td><button className="icon-btn" onClick={()=>openPlan(r)}>＋ Plano</button></td></tr>)}</tbody></table></div>{!filtered.length&&<Empty text="Nenhum risco encontrado."/>}</Panel>{modal&&<Modal title="Novo risco" onClose={()=>setModal(false)}><form className="form-grid" onSubmit={save}><Field label="Risco identificado"><input value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})} required/></Field><Field label="Categoria"><select value={form.categoria} onChange={e=>setForm({...form,categoria:e.target.value})}>{["Governança","Operacional","Regulatório","Financeiro","Trabalhista","Tecnologia","Processos","Reputacional"].map(x=><option key={x}>{x}</option>)}</select></Field><Field label="Probabilidade"><select value={form.probabilidade} onChange={e=>setForm({...form,probabilidade:e.target.value})}>{[1,2,3,4,5].map(x=><option key={x}>{x}</option>)}</select></Field><Field label="Impacto"><select value={form.impacto} onChange={e=>setForm({...form,impacto:e.target.value})}>{[1,2,3,4,5].map(x=><option key={x}>{x}</option>)}</select></Field><Field label="Responsável"><input value={form.responsavel} onChange={e=>setForm({...form,responsavel:e.target.value})}/></Field><Field label="Prazo"><input type="date" value={form.prazo} onChange={e=>setForm({...form,prazo:e.target.value})}/></Field><Field label="Observações" full><textarea value={form.observacoes} onChange={e=>setForm({...form,observacoes:e.target.value})}/></Field><div className="risk-preview"><span>Score automático</span><strong>{Number(form.probabilidade)*Number(form.impacto)}</strong><Badge value={riskLevel(form.probabilidade,form.impacto)}/></div><div className="modal-actions"><button type="button" onClick={()=>setModal(false)}>Cancelar</button><button className="primary-btn">Criar risco</button></div></form></Modal>}{planModal&&<Modal title="Criar plano de ação" onClose={()=>setPlanModal(null)}><form className="stack-form" onSubmit={createPlan}><Notice>Risco: <b>{planModal.risco.nome}</b></Notice><Field label="Ação"><textarea value={planModal.acao} onChange={e=>setPlanModal({...planModal,acao:e.target.value})} required/></Field><Field label="Responsável"><input value={planModal.responsavel} onChange={e=>setPlanModal({...planModal,responsavel:e.target.value})} required/></Field><Field label="Prazo"><input type="date" value={planModal.prazo} onChange={e=>setPlanModal({...planModal,prazo:e.target.value})}/></Field><Field label="Prioridade"><select value={planModal.prioridade} onChange={e=>setPlanModal({...planModal,prioridade:e.target.value})}><option>Crítica</option><option>Alta</option><option>Moderada</option><option>Baixa</option></select></Field><Field label="Observações"><textarea value={planModal.observacoes} onChange={e=>setPlanModal({...planModal,observacoes:e.target.value})}/></Field><div className="modal-actions"><button type="button" onClick={()=>setPlanModal(null)}>Cancelar</button><button className="primary-btn">Criar plano</button></div></form></Modal>}</div>;
}

function Plano({state,patch,activeCompany,notify}){
  const [search,setSearch]=useState("");const [status,setStatus]=useState("Todos");
  const plans=state.plans.filter(p=>!state.activeCompanyId||String(p.empresaId)===String(state.activeCompanyId));
  const filtered=plans.filter(p=>{const t=search.toLowerCase();return(!t||`${p.acao} ${p.riscoNome} ${p.responsavel}`.toLowerCase().includes(t))&&(status==="Todos"||p.status===status)});
  const overdue=plans.filter(p=>p.prazo&&new Date(`${p.prazo}T23:59:59`)<new Date()&&p.status!=="Concluída").length;const done=plans.filter(p=>p.status==="Concluída").length;const completion=plans.length?Math.round(done/plans.length*100):0;
  function update(id,statusValue){patch({plans:state.plans.map(p=>p.id===id?{...p,status:statusValue}:p)},`Atualizou plano para ${statusValue}`);notify("Plano atualizado.")}
  return <div className="page"><Header eyebrow="TRATAMENTO E MONITORAMENTO" title="Plano de ação" description="Transforme riscos em medidas objetivas, acompanhe prazos e monitore a execução."/><div className="kpi-grid"><Kpi label="Total" value={plans.length} meta="ações" icon="✓"/><Kpi label="Concluídos" value={done} meta={`${completion}% de execução`} icon="●" tone="info"/><Kpi label="Em andamento" value={plans.filter(p=>p.status==="Em andamento").length} meta="em execução" icon="↗" tone="warning"/><Kpi label="Atrasados" value={overdue} meta="exigem atenção" icon="!" tone="danger"/></div><Panel><div className="toolbar"><div className="search"><span>⌕</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar ação, risco ou responsável..."/></div><select value={status} onChange={e=>setStatus(e.target.value)}><option>Todos</option><option>Pendente</option><option>Em andamento</option><option>Concluída</option><option>Atrasada</option></select><span className="counter">{filtered.length} ação(ões)</span></div>{filtered.map(p=>{const late=p.prazo&&new Date(`${p.prazo}T23:59:59`)<new Date()&&p.status!=="Concluída";return <div className="plan-row" key={p.id}><div className="plan-main"><div className="plan-icon">✓</div><div><span className="eyebrow">{p.riscoNome}</span><strong>{p.acao}</strong><small>{p.responsavel||"Sem responsável"} · Prazo {formatDate(p.prazo)}</small></div></div><div className="plan-side"><Badge value={late?"Atrasada":p.status}/><select value={p.status} onChange={e=>update(p.id,e.target.value)}><option>Pendente</option><option>Em andamento</option><option>Concluída</option><option>Atrasada</option></select></div></div>})}{!filtered.length&&<Empty text="Nenhum plano encontrado."/>}</Panel></div>;
}

function Planilhas({state,activeCompany,notify}){
  const [tab,setTab]=useState("riscos");const [search,setSearch]=useState("");
  const data=useMemo(()=>{const risks=state.risks.filter(r=>!state.activeCompanyId||String(r.empresaId)===String(state.activeCompanyId));const plans=state.plans.filter(p=>!state.activeCompanyId||String(p.empresaId)===String(state.activeCompanyId));const diags=state.diagnostics.filter(d=>!state.activeCompanyId||String(d.empresaId)===String(state.activeCompanyId));return {riscos:risks,planos:plans,diagnosticos:diags}},[state]);
  const source=data[tab];const filtered=source.filter(x=>JSON.stringify(x).toLowerCase().includes(search.toLowerCase()));
  function exportCsv(){let headers=[],rows=[];if(tab==="riscos"){headers=["Risco","Categoria","Probabilidade","Impacto","Score","Nível","Status","Responsável","Prazo"];rows=filtered.map(r=>[r.nome,r.categoria,r.probabilidade,r.impacto,riskScore(r),r.nivel,r.status,r.responsavel,r.prazo]);}else if(tab==="planos"){headers=["Ação","Risco","Responsável","Prazo","Prioridade","Status"];rows=filtered.map(p=>[p.acao,p.riscoNome,p.responsavel,p.prazo,p.prioridade,p.status]);}else{headers=["Diagnóstico","Conformidade","Data","Observações"];rows=filtered.map(d=>[d.titulo,d.percentual,d.createdAt,d.observacoes]);}const csv=[headers,...rows].map(r=>r.map(csvCell).join(";")).join("\n");const blob=new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`compliance-one-${tab}-${dateKey()}.csv`;a.click();URL.revokeObjectURL(url);notify("Planilha exportada para Excel.")}
  return <div className="page"><Header eyebrow="DADOS OPERACIONAIS" title="Planilhas automatizadas" description="Tabelas vivas: filtros, indicadores e exportações são recalculados automaticamente conforme os registros mudam." action={<button className="primary-btn" onClick={exportCsv}>⇩ Exportar Excel</button>}/><div className="sheet-tabs">{[["riscos","Riscos"],["planos","Planos"],["diagnosticos","Diagnósticos"]].map(([k,l])=><button key={k} className={tab===k?"active":""} onClick={()=>setTab(k)}>{l}<b>{data[k].length}</b></button>)}</div><Panel><div className="toolbar"><div className="search"><span>⌕</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Filtrar qualquer coluna..."/></div><span className="counter">{filtered.length} de {source.length}</span></div><div className="table-scroll"><table><thead>{tab==="riscos"?<tr><th>Risco</th><th>Categoria</th><th>P</th><th>I</th><th>Score</th><th>Nível</th><th>Status</th><th>Prazo</th></tr>:tab==="planos"?<tr><th>Ação</th><th>Risco</th><th>Responsável</th><th>Prazo</th><th>Prioridade</th><th>Status</th></tr>:<tr><th>Diagnóstico</th><th>Conformidade</th><th>Data</th><th>Observações</th></tr>}</thead><tbody>{filtered.map(x=>tab==="riscos"?<tr key={x.id}><td>{x.nome}</td><td>{x.categoria}</td><td>{x.probabilidade}</td><td>{x.impacto}</td><td><b>{riskScore(x)}</b></td><td><Badge value={x.nivel}/></td><td>{x.status}</td><td>{formatDate(x.prazo)}</td></tr>:tab==="planos"?<tr key={x.id}><td>{x.acao}</td><td>{x.riscoNome}</td><td>{x.responsavel||"—"}</td><td>{formatDate(x.prazo)}</td><td>{x.prioridade||"—"}</td><td>{x.status}</td></tr>:<tr key={x.id}><td>{x.titulo}</td><td><b>{x.percentual}%</b></td><td>{formatDate(x.createdAt)}</td><td>{x.observacoes||"—"}</td></tr>)}</tbody></table></div></Panel><div className="automation-note"><strong>⚡ Planilha inteligente</strong><span>Os dados são derivados diretamente da base ativa. Alterações aparecem automaticamente sem recadastro.</span></div></div>;
}

function Relatorios({state,activeCompany,notify}){
  const risks=state.risks.filter(r=>!state.activeCompanyId||String(r.empresaId)===String(state.activeCompanyId));const plans=state.plans.filter(p=>!state.activeCompanyId||String(p.empresaId)===String(state.activeCompanyId));const ds=state.diagnostics.filter(d=>!state.activeCompanyId||String(d.empresaId)===String(state.activeCompanyId));const compliance=ds.length?Math.round(ds.reduce((a,d)=>a+Number(d.percentual||0),0)/ds.length):0;const critical=risks.filter(r=>r.nivel==="Crítico").length;const high=risks.filter(r=>r.nivel==="Alto").length;const done=plans.filter(p=>p.status==="Concluída").length;
  function print(){window.print();notify("Janela de impressão aberta.")}
  return <div className="page"><Header eyebrow="GOVERNANÇA · EXECUTIVO" title="Relatórios" description="Relatório executivo atualizado automaticamente com os dados da empresa ativa." action={<button className="primary-btn" onClick={print}>⎙ Imprimir / PDF</button>}/><div className="report-paper"><div className="report-cover"><div><span>COMPLIANCE ONE · {VERSION}</span><h2>Relatório Executivo de Compliance</h2><p>{activeCompany?.nomeFantasia||"Consolidado corporativo"}</p></div><strong>{new Date().toLocaleDateString("pt-BR")}</strong></div><div className="report-metrics"><div><span>CONFORMIDADE</span><strong>{compliance}%</strong></div><div><span>RISCOS</span><strong>{risks.length}</strong></div><div><span>CRÍTICOS</span><strong>{critical}</strong></div><div><span>PLANOS CONCLUÍDOS</span><strong>{done}</strong></div></div><div className="report-section"><h3>Resumo executivo</h3><p>Índice médio de conformidade de <b>{compliance}%</b>, com <b>{critical}</b> risco(s) crítico(s), <b>{high}</b> risco(s) alto(s) e <b>{plans.length}</b> plano(s) de ação.</p></div><div className="report-section"><h3>Riscos prioritários</h3>{risks.filter(r=>["Crítico","Alto"].includes(r.nivel)).sort((a,b)=>riskScore(b)-riskScore(a)).slice(0,8).map(r=><div className="report-line" key={r.id}><span>{r.nome}</span><Badge value={r.nivel}/></div>)}{!critical&&!high&&<Empty text="Nenhum risco prioritário."/>}</div></div></div>;
}

function Usuarios({state,patch,notify}){const [modal,setModal]=useState(false);const [form,setForm]=useState({nome:"",email:"",perfil:"Funcionário",status:"Ativo"});function save(e){e.preventDefault();const user={id:uid("user"),...form};patch({users:[...state.users,user]},"Cadastrou usuário");setModal(false);setForm({nome:"",email:"",perfil:"Funcionário",status:"Ativo"});notify("Usuário cadastrado.")}return <div className="page"><Header eyebrow="CONTROLE DE ACESSOS" title="Usuários e acessos" description="Perfis operacionais e segregação de funções." action={<button className="primary-btn" onClick={()=>setModal(true)}>＋ Novo usuário</button>}/><Panel><div className="table-scroll"><table><thead><tr><th>Usuário</th><th>E-mail</th><th>Perfil</th><th>Status</th></tr></thead><tbody>{state.users.map(u=><tr key={u.id}><td><div className="user-cell"><span>{u.nome.charAt(0)}</span><strong>{u.nome}</strong></div></td><td>{u.email}</td><td><Badge value={u.perfil}/></td><td><Badge value={u.status}/></td></tr>)}</tbody></table></div></Panel>{modal&&<Modal title="Novo usuário" onClose={()=>setModal(false)}><form className="form-grid" onSubmit={save}><Field label="Nome"><input value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})} required/></Field><Field label="E-mail"><input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} required/></Field><Field label="Perfil"><select value={form.perfil} onChange={e=>setForm({...form,perfil:e.target.value})}>{Object.keys(PROFILES).map(p=><option key={p}>{p}</option>)}</select></Field><Field label="Status"><select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option>Ativo</option><option>Inativo</option></select></Field><div className="modal-actions"><button type="button" onClick={()=>setModal(false)}>Cancelar</button><button className="primary-btn">Criar usuário</button></div></form></Modal>}</div>}

function CommandPalette({query,setQuery,commands,onClose}){const input=useRef(null);useEffect(()=>input.current?.focus(),[]);return <div className="palette-backdrop" onMouseDown={onClose}><div className="palette" onMouseDown={e=>e.stopPropagation()}><div className="palette-search"><span>⌕</span><input ref={input} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Pesquisar módulos e ações..."/><kbd>ESC</kbd></div><div className="command-list">{commands.map(c=><button key={c.id} onClick={()=>{c.run();onClose()}}><span>→</span>{c.label}</button>)}{!commands.length&&<Empty text="Nenhum comando encontrado."/>}</div><small className="palette-foot">Atalho: Ctrl + K</small></div></div>}

export default App;
