import { recordDiagnosticAnswer, validateDiagnosticLinks, diagnosticProgress, executiveDiagnosticSummary } from "./diagnosticGovernance";
import { assessDiagnostic } from "./diagnosticEngine";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { buildEnterpriseQuestions } from "./enterpriseQuestionBank";
import "./App.css";
import { apiGet, apiPost, apiPut, bootstrapCompany, login, logout as apiLogout } from "./api";
import NexusV125CommandCenter from "./NexusV125CommandCenter";
import NexusAICommandCenter from "./NexusAICommandCenter";
import NexusDecisionEngine from "./NexusDecisionEngine";
import NexusPredictiveIntelligence from "./NexusPredictiveIntelligence";
import NexusComplianceDNA from "./NexusComplianceDNA";
import NexusCommandGraph from "./NexusCommandGraph";
import NexusExecutiveIntelligence from "./NexusExecutiveIntelligence";
import NexusAutonomousActionCenter from "./NexusAutonomousActionCenter";

const KEY = "nexus-compliance-v124-final-enterprise";
const DOCUMENT_CATALOG = [
["Código de Ética e Conduta","Governança","Todos","Alta","Princípios, comportamentos, conflitos, responsabilidades e orientações."],
["Política Anticorrupção e Antissuborno","Integridade","Todos","Crítica","Prevenção de corrupção, pagamentos indevidos e interação com agentes públicos."],
["Política de Conflito de Interesses","Governança","Todos","Alta","Declaração, avaliação, tratamento e registro de conflitos."],
["Política de Brindes, Presentes e Hospitalidades","Integridade","Todos","Alta","Critérios de oferta, recebimento, registro e aprovação."],
["Due Diligence de Terceiros","Terceiros","Todos","Crítica","Classificação, pesquisa, aprovação, contratação e monitoramento."],
["Canal de Denúncias e Não Retaliação","Integridade","Todos","Crítica","Recebimento, protocolo, confidencialidade, triagem e investigação."],
["Proteção de Dados e Privacidade","Privacidade","Todos","Crítica","Governança, segurança, incidentes, direitos e retenção."],
["Plano de Resposta a Incidentes","Continuidade","Todos","Alta","Papéis, escalonamento, comunicação, evidências e recuperação."],
["Política de Gestão de Riscos","Riscos","Todos","Alta","Metodologia, apetite, avaliação, tratamento e monitoramento."],
["Gestão Documental e Evidências","Governança","Todos","Alta","Versionamento, aprovação, retenção e rastreabilidade."],
["Compras e Homologação","Operações","Todos","Alta","Segregação, cotações, aprovação e monitoramento de fornecedores."],
["Segurança da Informação","Tecnologia","Todos","Crítica","Acessos, autenticação, logs, backup e incidentes."],
["Código de Conduta para Terceiros","Terceiros","Todos","Alta","Integridade, direitos, segurança e consequências contratuais."],
["Matriz RACI","Governança","Todos","Média","Responsável, aprovador, consultado e informado."],
["Plano Anual de Compliance","Governança","Todos","Alta","Objetivos, indicadores, treinamentos, testes e calendário."],
["Monitoramento e Remediação","Auditoria","Todos","Alta","Achados, responsáveis, prazos, evidências e eficácia."],
["Política de Investigação Interna","Integridade","Todos","Crítica","Triagem, evidências, independência, confidencialidade e encerramento."],
["Retenção e Descarte","Privacidade","Todos","Alta","Prazos, exceções, descarte seguro e preservação."],
["Continuidade de Negócios","Continuidade","Todos","Alta","Processos críticos, contingência, testes e recuperação."],
["Socioambiental e Direitos Humanos","ESG","Todos","Alta","Prevenção de impactos, cadeia de valor e remediação."]
];
const SOURCE_LIBRARY = [
["CGU — Pró-Ética 2025-2026","Programa oficial de integridade privada, avaliação, documentos orientativos e critérios.","Oficial","https://www.gov.br/cgu/pt-br/assuntos/integridade-privada/avaliacao-e-promocao-da-integridade-privada/empresa-pro-etica/avaliacao/"],
["ISO — ISO 37301","Sistema de gestão de Compliance; referência internacional.","Oficial","https://www.iso.org/standard/75080.html"],
["ISO — ISO 37001","Sistema de gestão antissuborno.","Oficial","https://www.iso.org/standard/37001"],
["OECD — Responsible Business Conduct","Referência internacional para conduta empresarial responsável.","Internacional","https://www.oecd.org/en/publications/oecd-guidelines-for-multinational-enterprises-on-responsible-business-conduct_81f92357-en.html"],
["US DOJ — ECCP","Referência oficial para avaliação de efetividade de programas de Compliance nos EUA.","Oficial","https://www.justice.gov/criminal/corporate-enforcement"],
["STF — Jurisprudência","Pesquisa oficial de decisões e precedentes.","Oficial","https://jurisprudencia.stf.jus.br/"],
["ANPD — Guias","Orientações oficiais de proteção de dados.","Oficial","https://www.gov.br/anpd/pt-br"],
["NEXUS — Motor próprio","Biblioteca interna de riscos, controles, indicadores e templates originais.","Própria",""] 
];


const NEXUS_ROLES = [
  ["Administrador","Acesso completo, empresas, usuários e configurações."],
  ["Compliance","Diagnóstico, riscos, ações, documentos e monitoramento."],
  ["Jurídico","Triagem, documentos jurídicos, pareceres e encerramentos."],
  ["Auditoria","Evidências, testes, trilhas e histórico."],
  ["Diretoria","Indicadores, aprovações e relatórios executivos."],
  ["Financeiro","Controles financeiros e evidências autorizadas."],
  ["Colaborador","Tarefas, treinamentos e evidências atribuídas."]
];

function NexusComplianceOrchestrator({s,go}){
  const risks=Array.isArray(s.risks)?s.risks:[];
  const actions=Array.isArray(s.actions)?s.actions:[];
  const legal=Array.isArray(s.legal)?s.legal:[];
  const evidence=Array.isArray(s.evidence)?s.evidence:[];
  const questions=s.answers&&typeof s.answers==="object"?Object.keys(s.answers).length:0;
  const company=s.company||{};
  const critical=risks.filter(r=>/crítico|critico/i.test(String(r.level||r.nivel||""))).length;
  const openActions=actions.filter(a=>!/conclu|encerr|final/i.test(String(a.status||""))).length;
  const openLegal=legal.filter(x=>!/conclu|encerr|confirm/i.test(String(x.status||""))).length;
  const queue=[];
  if(!company.name) queue.push({p:"P0",t:"Cadastrar empresa",d:"Defina o contexto organizacional antes da análise.",go:"empresa"});
  if(!questions) queue.push({p:"P0",t:"Executar questionário",d:"Registre respostas para alimentar o motor de risco.",go:"questionario"});
  if(!risks.length) queue.push({p:"P0",t:"Gerar diagnóstico",d:"Produza a primeira matriz de exposição.",go:"diagnostico"});
  if(critical) queue.push({p:"P0",t:`Tratar ${critical} risco(s) crítico(s)`,d:"Priorize responsável, prazo, controle e evidência.",go:"riscos"});
  if(openActions) queue.push({p:"P1",t:`Acompanhar ${openActions} ação(ões)`,d:"Revise progresso e evidências do tratamento.",go:"acoes"});
  if(openLegal) queue.push({p:"P1",t:`Revisar ${openLegal} item(ns) jurídico(s)`,d:"Confirme encaminhamentos antes do fechamento.",go:"juridico"});
  if(risks.length&&!evidence.length) queue.push({p:"P1",t:"Fortalecer evidências",d:"Vincule documentos e registros aos controles.",go:"evidencias"});
  if(!queue.length) queue.push({p:"P2",t:"Preparar revisão executiva",d:"Consolide resultados e valide o ciclo de compliance.",go:"relatorio"});
  return <section className="nexus-compliance-orchestrator">
    <div className="nco-head"><div><span className="eyebrow">NEXUS COMPLIANCE ORCHESTRATOR</span><h3>Fila inteligente de prioridades</h3><p>Transforma o estado atual do sistema em próximos passos objetivos.</p></div><span className="nco-live">ORCHESTRATED</span></div>
    <div className="nco-queue">{queue.slice(0,4).map((x,i)=><button key={i} onClick={()=>go?.(x.go)}><span className={`nco-priority ${x.p.toLowerCase()}`}>{x.p}</span><div><b>{x.t}</b><p>{x.d}</p></div><strong>→</strong></button>)}</div>
    <div className="nco-summary"><span>Empresa: {company.name||"não cadastrada"}</span><span>Riscos: {risks.length}</span><span>Ações abertas: {openActions}</span><span>Jurídico aberto: {openLegal}</span></div>
  </section>
}

function NexusAdaptiveEngine({s,go}){
  const company=s.company||{};
  const answers=s.answers||{};
  const risks=Array.isArray(s.risks)?s.risks:[];
  const segment=company.segment||"segmento não informado";
  const size=company.size||"porte não informado";
  const answered=Object.keys(answers||{}).length;
  const riskCount=risks.length;
  const next=riskCount===0?"diagnostico":answered<1?"questionario":"riscos";
  const nextLabel=riskCount===0?"Executar diagnóstico":answered<1?"Continuar questionário":"Revisar matriz";
  const profile=`${company.name||"Empresa não cadastrada"} · ${segment} · ${size}`;
  return <section className="nexus-adaptive-engine">
    <div className="nae-head"><div><span className="eyebrow">NEXUS ADAPTIVE ENGINE</span><h3>Compliance que se adapta à empresa</h3><p>O próximo passo é calculado conforme o contexto e os dados já registrados.</p></div><span className="nae-badge">ADAPTIVE</span></div>
    <div className="nae-profile"><span>CONTEXTO</span><b>{profile}</b></div>
    <div className="nae-flow"><div><small>RESPOSTAS</small><strong>{answered}</strong></div><i>→</i><div><small>RISCOS</small><strong>{riskCount}</strong></div><i>→</i><div><small>PRÓXIMA ETAPA</small><strong>{nextLabel}</strong></div></div>
    <button className="nae-action" onClick={()=>go?.(next)}>Continuar jornada inteligente <b>→</b></button>
  </section>
}

function NexusAICore({s,go}){
  const company=s.company||{};
  const risks=Array.isArray(s.risks)?s.risks:[];
  const actions=Array.isArray(s.actions)?s.actions:[];
  const legal=Array.isArray(s.legal)?s.legal:[];
  const questions=Array.isArray(s.answers)?s.answers:[];
  const critical=risks.filter(r=>/crítico|critico/i.test(String(r.level||r.nivel||""))).length;
  const prompt=`Empresa: ${company.name||"não cadastrada"} | Setor: ${company.segment||"não informado"} | Porte: ${company.size||"não informado"} | Riscos: ${risks.length} | Críticos: ${critical} | Ações: ${actions.length} | Jurídico: ${legal.length}.`;
  const recommendation=critical
    ? "Priorize os riscos críticos e vincule cada tratamento a responsável, prazo e evidência."
    : risks.length
    ? "Aprofunde a avaliação dos controles e transforme os principais riscos em planos de tratamento verificáveis."
    : "Finalize o diagnóstico para que o NEXUS possa produzir recomendações específicas.";
  return <section className="nexus-ai-core">
    <div className="nai-head">
      <div><span className="eyebrow">NEXUS AI CORE</span><h3>Copiloto Executivo</h3><p>Camada de inteligência preparada para trabalhar sobre o contexto da empresa.</p></div>
      <span className="nai-mode">CORE READY</span>
    </div>
    <div className="nai-body">
      <div className="nai-orb">✦</div>
      <div><small>CONTEXTO ATUAL</small><p>{prompt}</p><small>RECOMENDAÇÃO PRIORITÁRIA</small><p className="nai-rec">{recommendation}</p></div>
    </div>
    <div className="nai-actions">
      <button onClick={()=>go?.("diagnostico")}>Analisar diagnóstico</button>
      <button onClick={()=>go?.("riscos")}>Explicar riscos</button>
      <button onClick={()=>go?.("documentos")}>Criar documento</button>
      <button onClick={()=>go?.("relatorio")}>Preparar relatório</button>
    </div>
    <div className="nai-note">Modo atual: inteligência local baseada nos dados registrados. A conexão com um provedor de IA generativa pode ser habilitada posteriormente no backend, com política de dados e chave segura.</div>
  </section>
}

function NexusExecutiveRadar({s,go}){
  const risks=Array.isArray(s.risks)?s.risks:[];
  const actions=Array.isArray(s.actions)?s.actions:[];
  const legal=Array.isArray(s.legal)?s.legal:[];
  const evidence=Array.isArray(s.evidence)?s.evidence:[];
  const docs=Array.isArray(s.documents)?s.documents:[];
  const confirmedRisks=risks.filter(r=>/confirm/i.test(String(r.status||""))).length;
  const completedActions=actions.filter(a=>/conclu|encerr|final/i.test(String(a.status||""))).length;
  const legalDone=legal.filter(x=>/confirm|conclu|encerr/i.test(String(x.status||""))).length;
  const evidenceScore=risks.length?Math.round((evidence.length/Math.max(risks.length,1))*100):0;
  const controlsScore=risks.length?Math.round((confirmedRisks/Math.max(risks.length,1))*100):0;
  const actionScore=actions.length?Math.round((completedActions/actions.length)*100):0;
  const legalScore=legal.length?Math.round((legalDone/legal.length)*100):0;
  const items=[
    ["RISCOS",controlsScore,go,"riscos"],
    ["AÇÕES",actionScore,go,"acoes"],
    ["JURÍDICO",legalScore,go,"juridico"],
    ["EVIDÊNCIAS",Math.min(100,evidenceScore),go,"evidencias"]
  ];
  return <section className="nexus-executive-radar">
    <div className="ner-head"><div><span className="eyebrow">NEXUS EXECUTIVE RADAR</span><h3>Saúde do Compliance</h3><p>Indicadores calculados a partir do estado atual do ambiente.</p></div><div className="ner-core"><b>{Math.round((controlsScore+actionScore+legalScore+Math.min(100,evidenceScore))/4)}%</b><span>HEALTH</span></div></div>
    <div className="ner-metrics">{items.map(([name,val,navigate,page])=><button key={name} onClick={()=>navigate?.(page)}><span>{name}</span><strong>{val}%</strong><i><em style={{width:`${val}%`}}/></i><small>Ver detalhes →</small></button>)}</div>
    <div className="ner-footer"><span>Documentos: {docs.length}</span><span>Riscos confirmados: {confirmedRisks}</span><span>Ações concluídas: {completedActions}</span></div>
  </section>
}

function NexusIntelligenceEngine({s,go}){
  const risks=Array.isArray(s.risks)?s.risks:[];
  const actions=Array.isArray(s.actions)?s.actions:[];
  const legal=Array.isArray(s.legal)?s.legal:[];
  const docs=Array.isArray(s.documents)?s.documents:[];
  const critical=risks.filter(r=>/crítico|critico/i.test(String(r.level||r.nivel||""))).length;
  const open=actions.filter(a=>!/conclu|encerr|final/i.test(String(a.status||""))).length;
  const legalOpen=legal.filter(x=>!/encerr|conclu|confirm/i.test(String(x.status||""))).length;
  const signals=[
    critical?{tone:"critical",title:"Prioridade executiva",text:`${critical} risco(s) crítico(s) identificado(s). Revise tratamento, responsável e evidência.`,page:"riscos"}:null,
    open?{tone:"warning",title:"Plano de ação",text:`${open} ação(ões) permanecem abertas. Verifique prazo, responsável e evidência.`,page:"acoes"}:null,
    legalOpen?{tone:"legal",title:"Revisão jurídica",text:`${legalOpen} item(ns) jurídicos aguardam conclusão ou confirmação.`,page:"juridico"}:null,
    !risks.length&&!actions.length?{tone:"info",title:"Pronto para diagnóstico",text:"Execute o diagnóstico para alimentar a matriz, os planos e os relatórios.",page:"diagnostico"}:null
  ].filter(Boolean).slice(0,3);
  return <section className="nexus-intelligence-engine">
    <div className="nie-head"><div><span className="eyebrow">NEXUS INTELLIGENCE ENGINE</span><h3>Leitura executiva do ambiente</h3><p>Os sinais abaixo são calculados a partir dos dados registrados no NEXUS.</p></div><span className="nie-badge">LIVE</span></div>
    <div className="nie-signals">{signals.map((x,i)=><button key={i} className={`nie-signal ${x.tone}`} onClick={()=>go?.(x.page)}><span>{x.title}</span><b>{x.text}</b><small>Abrir módulo →</small></button>)}</div>
    <div className="nie-footer"><span>Riscos {risks.length}</span><span>Ações {actions.length}</span><span>Jurídico {legal.length}</span><span>Documentos {docs.length}</span></div>
  </section>
}

function NexusEnterprisePanel({s, setPage}){
  const risks=Array.isArray(s.risks)?s.risks:[];
  const actions=Array.isArray(s.actions)?s.actions:[];
  const docs=Array.isArray(s.documents)?s.documents:[];
  const legal=Array.isArray(s.legal)?s.legal:[];
  const critical=risks.filter(r=>/crítico|critico/i.test(String(r.level||r.nivel||""))).length;
  const openActions=actions.filter(a=>!/(conclu|encerr|final)/i.test(String(a.status||""))).length;
  const pendingLegal=legal.filter(x=>!/(encerr|conclu|confirm)/i.test(String(x.status||""))).length;
  const maturity=Math.max(0,Math.min(100,Math.round((s.progress?.total||0))));
  const cards=[
    ["RISCOS",risks.length,"Matriz de exposição","riscos"],
    ["CRÍTICOS",critical,"prioridade executiva","riscos"],
    ["AÇÕES",openActions,"tratamentos em aberto","acoes"],
    ["JURÍDICO",pendingLegal,"triagens pendentes","juridico"],
  ];
  return <section className="nexus-enterprise-panel">
    <div className="nep-top">
      <div><span className="eyebrow">NEXUS ENTERPRISE INTELLIGENCE</span><h2>Command Center</h2><p>Uma camada executiva sobre o fluxo de compliance já existente.</p></div>
      <div className="nep-status"><i/> INTELLIGENCE CORE ONLINE</div>
    </div>
    <div className="nep-grid">{cards.map(([label,value,sub,page])=>
      <button key={label} className="nep-card" onClick={()=>setPage?.(page)}>
        <small>{label}</small><strong>{value}</strong><span>{sub} →</span>
      </button>)}</div>
    <div className="nep-bottom">
      <div><small>MATURIDADE OPERACIONAL</small><b>{maturity}%</b><div className="nep-meter"><i style={{width:`${maturity}%`}}/></div></div>
      <div className="nep-ai"><span>✦ NEXUS AI</span><p>{critical>0?`Existem ${critical} risco(s) crítico(s) que merecem atenção imediata.`:openActions>0?`Existem ${openActions} ações abertas para acompanhamento.`:"O ambiente está pronto para uma nova rodada de análise."}</p></div>
    </div>
  </section>
}

function ProductionCenter({s,setS,notify}){
  const [tab,setTab]=useState("empresa");
  const [userName,setUserName]=useState("");
  const [userRole,setUserRole]=useState("Compliance");
  const [companyName,setCompanyName]=useState("");
  const companies=Array.isArray(s.companies)&&s.companies.length?s.companies:[{id:"CURRENT",name:s.company.name||"Empresa atual",status:"Ativa"}];
  const users=Array.isArray(s.users)?s.users:[];
  const audit=Array.isArray(s.history)?s.history.slice(-12).reverse():[];
  function addCompany(){
    if(!companyName.trim()) return notify("Informe o nome da empresa.");
    const c={id:uid("EMP"),name:companyName.trim(),status:"Ativa",created:now()};
    setS({...s,companies:[...companies,c]});
    setCompanyName(""); notify("Empresa adicionada ao portfólio NEXUS.");
  }
  function addUser(){
    if(!userName.trim()) return notify("Informe o nome do usuário.");
    const u={id:uid("USR"),name:userName.trim(),role:userRole,status:"Convite pendente",created:now()};
    setS({...s,users:[...users,u],history:[...s.history,{id:uid("LOG"),text:`Usuário ${u.name} criado com perfil ${u.role}.`,date:now()}]});
    setUserName(""); notify("Usuário criado. A etapa de autenticação real será conectada ao backend.");
  }
  return <div className="page">
    <div className="prod-hero"><div><small>NEXUS · PRODUCTION READINESS</small><h1>Centro de Operação Empresarial</h1><p>Preparação para múltiplas empresas, usuários, permissões, auditoria e operação comercial.</p></div><div className="prod-badge">CORE<br/><b>READY</b></div></div>
    <div className="prod-tabs">{[["empresa","Empresas"],["usuarios","Usuários"],["auditoria","Auditoria"],["arquitetura","Arquitetura"]].map(x=><button className={tab===x[0]?"active":""} onClick={()=>setTab(x[0])} key={x[0]}>{x[1]}</button>)}</div>
    {tab==="empresa"&&<Panel title="Portfólio de empresas" sub="Estrutura preparada para separar dados por organização.">
      <div className="prod-form"><input value={companyName} onChange={e=>setCompanyName(e.target.value)} placeholder="Nome da nova empresa"/><button className="primary" onClick={addCompany}>+ Adicionar empresa</button></div>
      <div className="prod-list">{companies.map(c=><div key={c.id}><div><b>{c.name}</b><span>{c.status} · {c.id}</span></div><strong>ABRIR →</strong></div>)}</div>
    </Panel>}
    {tab==="usuarios"&&<Panel title="Usuários e perfis" sub="Perfis separados para reduzir exposição indevida.">
      <div className="prod-form"><input value={userName} onChange={e=>setUserName(e.target.value)} placeholder="Nome do usuário"/><select value={userRole} onChange={e=>setUserRole(e.target.value)}>{NEXUS_ROLES.map(r=><option key={r[0]}>{r[0]}</option>)}</select><button className="primary" onClick={addUser}>+ Criar acesso</button></div>
      <div className="role-grid">{NEXUS_ROLES.map(r=><div key={r[0]}><b>{r[0]}</b><span>{r[1]}</span></div>)}</div>
      <div className="prod-list">{users.map(u=><div key={u.id}><div><b>{u.name}</b><span>{u.role} · {u.status}</span></div></div>)}</div>
    </Panel>}
    {tab==="auditoria"&&<Panel title="Trilha de auditoria" sub="Últimos eventos registrados pelo NEXUS.">
      <div className="audit-list">{audit.length?audit.map(x=><div key={x.id}><b>{x.date}</b><span>{x.text}</span></div>):<div className="empty-line">Nenhum evento registrado.</div>}</div>
    </Panel>}
    {tab==="arquitetura"&&<Panel title="Arquitetura comercial" sub="Checklist de preparação antes de colocar uma empresa real em produção.">
      <div className="readiness-grid">{[
        ["Multiempresa","Separação lógica por empresa",true],
        ["Perfis","Roles de acesso definidos",true],
        ["Auditoria","Histórico de eventos",true],
        ["Documentos","Versionamento e revisão",true],
        ["Jurídico","Fluxo segregado",true],
        ["Banco de dados","Backend persistente e isolado",false],
        ["Autenticação","Login seguro e recuperação",false],
        ["Armazenamento","Arquivos privados e backup",false],
        ["Monitoramento","Alertas e observabilidade",false]
      ].map(x=><div key={x[0]} className={x[2]?"done":"pending"}><span>{x[2]?"✓":"○"}</span><div><b>{x[0]}</b><small>{x[1]}</small></div></div>)}</div>
      <div className="prod-warning"><b>IMPORTANTE PARA CLIENTE REAL</b><p>A interface local está pronta para homologação, mas autenticação, banco de dados, armazenamento privado e isolamento multi-tenant ainda precisam ser implementados no backend antes de receber dados reais de clientes.</p></div>
    </Panel>}
  </div>
}

const NEXUS_DOCUMENT_TEMPLATES = {
  "Código de Ética e Conduta":{
    purpose:"Estabelecer princípios, comportamentos esperados, responsabilidades e mecanismos de reporte.",
    sections:["Objetivo e alcance","Princípios de integridade","Conflitos de interesses","Relacionamento com terceiros","Presentes e hospitalidades","Informações e ativos","Canal de denúncias e não retaliação","Medidas disciplinares","Responsabilidades","Revisão e aprovação"]
  },
  "Política Anticorrupção e Antissuborno":{
    purpose:"Prevenir, detectar e responder a práticas de corrupção e suborno de forma proporcional ao perfil da organização.",
    sections:["Objetivo","Abrangência","Definições","Interação com agentes públicos","Pagamentos e vantagens indevidas","Presentes e hospitalidades","Doações e patrocínios","Terceiros e intermediários","Controles financeiros","Denúncias, investigação e remediação","Treinamento","Monitoramento"]
  },
  "Política de Conflito de Interesses":{
    purpose:"Criar mecanismo formal para declarar, analisar, tratar e registrar conflitos reais, potenciais ou aparentes.",
    sections:["Objetivo","Abrangência","Declaração","Análise","Impedimentos","Aprovação de exceções","Registro","Monitoramento","Responsabilidades"]
  },
  "Due Diligence de Terceiros":{
    purpose:"Estabelecer diligência proporcional ao risco antes e durante o relacionamento com terceiros.",
    sections:["Classificação de risco","Cadastro","Pesquisa","Beneficiário final","Agentes públicos","Sanções e integridade","Aprovação","Cláusulas contratuais","Monitoramento","Renovação","Encerramento"]
  },
  "Canal de Denúncias e Não Retaliação":{
    purpose:"Estruturar recebimento, protocolo, triagem, investigação e remediação com confidencialidade e proteção contra retaliação.",
    sections:["Canais","Anonimato","Protocolo","Triagem","Conflitos de investigação","Preservação de evidências","Prazos","Comunicação","Não retaliação","Encerramento","Indicadores"]
  },
  "Proteção de Dados e Privacidade":{
    purpose:"Organizar governança, uso, segurança, retenção e resposta a incidentes envolvendo dados pessoais.",
    sections:["Governança","Inventário","Finalidades","Acessos","Compartilhamento","Retenção","Direitos","Incidentes","Terceiros","Transferências","Treinamento","Monitoramento"]
  },
  "Plano de Resposta a Incidentes":{
    purpose:"Definir papéis e ações para detectar, conter, investigar, comunicar e recuperar incidentes.",
    sections:["Classificação","Papéis","Detecção","Contenção","Preservação de evidências","Comunicação","Escalonamento jurídico","Recuperação","Lições aprendidas","Teste do plano"]
  },
  "Política de Gestão de Riscos":{
    purpose:"Definir método para identificar, avaliar, tratar, monitorar e reportar riscos.",
    sections:["Governança","Taxonomia","Identificação","Probabilidade","Impacto","Risco inerente","Controles","Eficácia","Risco residual","Apetite e tolerância","Monitoramento","Reporte"]
  },
  "Gestão Documental e Evidências":{
    purpose:"Garantir integridade, versionamento, aprovação, retenção, acesso e rastreabilidade dos documentos.",
    sections:["Classificação","Proprietário","Versionamento","Aprovação","Acesso","Retenção","Preservação","Descarte","Auditoria"]
  },
  "Segurança da Informação":{
    purpose:"Estabelecer controles de acesso, proteção, continuidade e resposta a incidentes tecnológicos.",
    sections:["Acessos","Autenticação","Privilégios","Logs","Backup","Vulnerabilidades","Incidentes","Terceiros","Continuidade","Testes"]
  },
  "Plano Anual de Compliance":{
    purpose:"Converter riscos e obrigações em agenda executiva de prevenção, testes, treinamento e monitoramento.",
    sections:["Objetivos","Riscos prioritários","Ações","Responsáveis","Treinamentos","Testes","Indicadores","Calendário","Reporte","Revisão"]
  }
};

function buildOfficialDocument(doc,s){
  const t=NEXUS_DOCUMENT_TEMPLATES[doc.name]||{purpose:doc.description||"Documento corporativo NEXUS.",sections:["Objetivo","Abrangência","Responsabilidades","Procedimentos","Controles","Evidências","Monitoramento","Revisão"]};
  const c=s.company||{};
  const fw=(s.globalProfile?.jurisdictions||["BR"]).join(", ");
  const riskCount=(s.risks||[]).length;
  return {
    title:doc.name,
    purpose:t.purpose,
    sections:t.sections.map((title,i)=>({
      title,
      body:
        i===0 ? `Este documento foi gerado pelo NEXUS para ${c.name||"a organização"}, considerando o ramo ${c.segment||"não informado"}, porte ${c.size||"não informado"} e jurisdições ${fw}.` :
        i===1 ? `Aplicação proporcional ao porte, setor, processos e exposição identificados no diagnóstico. Riscos registrados no ciclo: ${riskCount}.` :
        i===t.sections.length-1 ? "Revisar periodicamente, registrar aprovação, controlar versão e manter evidências da aplicação." :
        `Diretriz NEXUS: definir responsáveis, critérios objetivos, evidências e fluxo de aprovação para ${title.toLowerCase()}, mantendo rastreabilidade e escalonamento quando necessário.`
    })),
    disclaimer:"Template original NEXUS. Deve ser revisado e aprovado pela empresa e, quando houver questão legal/regulatória, pelo Jurídico. Não é cópia de documento de terceiros.",
    sources:SOURCE_LIBRARY.filter(x=>x[2]!=="Própria").slice(0,6)
  };
}

const PHILOSOPHY_LENSES = [
["Aristóteles","Virtude e hábito","Transformar controles em comportamento.","Cultura"],
["Kant","Dever e universalidade","Aplicar regras de forma consistente.","Ética"],
["Confúcio","Responsabilidade e exemplo","Liderança molda a cultura.","Liderança"],
["Maquiavel","Poder e controles","Criar contrapesos e alçadas.","Governança"],
["Sócrates","Pergunta e investigação","Perguntar antes de concluir.","Auditoria"],
["Platão","Ordem e propósito","Alinhar papéis e objetivos.","Estrutura"],
["Sun Tzu","Antecipação","Conhecer vulnerabilidades antes do evento.","Prevenção"],
["Hannah Arendt","Responsabilidade","Tornar decisões rastreáveis.","Accountability"]
];


const GLOBAL_FRAMEWORKS = [
  {id:"ISO37301",name:"ISO 37301",region:"Global",area:"Compliance Management System",tier:"Core",trigger:()=>true,desc:"Sistema de gestão de compliance, aplicável a organizações de diferentes portes e setores."},
  {id:"ISO37001",name:"ISO 37001",region:"Global",area:"Antissuborno",tier:"Core",trigger:p=>p.publicAgents||p.thirdParties||p.jurisdictions.includes("US")||p.jurisdictions.includes("UK"),desc:"Sistema de gestão antissuborno para prevenção, detecção e resposta."},
  {id:"ISO37002",name:"ISO 37002",region:"Global",area:"Whistleblowing",tier:"Core",trigger:()=>true,desc:"Referência para sistemas de gestão de denúncias."},
  {id:"ISO37008",name:"ISO 37008",region:"Global",area:"Investigações Internas",tier:"Advanced",trigger:p=>p.thirdParties||p.publicAgents,desc:"Orientação para investigações internas de organizações."},
  {id:"ISO37009",name:"ISO 37009",region:"Global",area:"Conflitos de Interesses",tier:"Advanced",trigger:()=>true,desc:"Orientação para gestão de conflitos de interesses."},
  {id:"ISO37302",name:"ISO 37302",region:"Global",area:"Efetividade",tier:"Advanced",trigger:()=>true,desc:"Orientação para avaliação da efetividade do sistema de compliance."},
  {id:"ISO37303",name:"ISO 37303",region:"Global",area:"Competência",tier:"Advanced",trigger:()=>true,desc:"Orientação para competência em compliance."},
  {id:"OECD_RBC",name:"OECD Responsible Business Conduct",region:"Global",area:"Conduta Responsável",tier:"Global",trigger:p=>p.jurisdictions.length>1||p.multinational,desc:"Referência internacional para empresas multinacionais e cadeia de valor."},
  {id:"DOJ_ECCP",name:"US DOJ — Evaluation of Corporate Compliance Programs",region:"EUA",area:"Efetividade",tier:"Jurisdictional",trigger:p=>p.jurisdictions.includes("US"),desc:"Referência para avaliar desenho, implementação, recursos, testes e eficácia prática."},
  {id:"FCPA",name:"FCPA",region:"EUA",area:"Anticorrupção",tier:"Jurisdictional",trigger:p=>p.jurisdictions.includes("US")||p.publicAgents,desc:"Camada de análise anticorrupção para exposição relacionada aos EUA."},
  {id:"UK_BRIBERY",name:"UK Bribery Act",region:"Reino Unido",area:"Antissuborno",tier:"Jurisdictional",trigger:p=>p.jurisdictions.includes("UK"),desc:"Camada de análise de exposição ao regime britânico de suborno."},
  {id:"EU_PRIVACY",name:"EU Privacy / GDPR",region:"União Europeia",area:"Privacidade",tier:"Jurisdictional",trigger:p=>p.jurisdictions.includes("EU")||p.personalDataEU,desc:"Camada de proteção de dados para operações e exposição europeias."},
  {id:"EU_SUSTAINABILITY",name:"EU Sustainability / Supply Chain",region:"União Europeia",area:"Sustentabilidade",tier:"Jurisdictional",trigger:p=>p.jurisdictions.includes("EU")&&p.largeOrMultinational,desc:"Camada de sustentabilidade e cadeia de valor conforme aplicabilidade."},
  {id:"BRAZIL_INTEGRITY",name:"Brasil — Integridade Privada / CGU",region:"Brasil",area:"Integridade",tier:"Jurisdictional",trigger:p=>p.jurisdictions.includes("BR"),desc:"Camada brasileira de gestão de riscos, integridade, terceiros, controles e transparência."},
  {id:"PACTO_BRASIL",name:"Pacto Brasil pela Integridade Empresarial",region:"Brasil",area:"Compromisso",tier:"Optional",trigger:p=>p.jurisdictions.includes("BR"),desc:"Módulo voluntário de autoavaliação e compromisso público com integridade."},
  {id:"PUBLIC_SECTOR",name:"Public Sector Integrity",region:"Brasil / Público",area:"Gestão Pública",tier:"Sector",trigger:p=>p.publicSector,desc:"Camada específica para contratações, transparência, controles e prestação de contas."}
];

const SECTOR_PACKS = {
  "Supermercados / Varejo":["Varejo e perdas","Segurança alimentar","Fornecedores","Caixa e antifraude","Consumidor","Privacidade"],
  "Logística / Transportes":["Frota e manutenção","Cadeia de custódia","Motoristas e jornada","Terceiros","Sinistros","Segurança operacional"],
  "Produção / Indústria":["Produção","Qualidade","Segurança operacional","Meio ambiente","Manutenção","Terceiros"],
  "Metalúrgica":["Máquinas","Soldagem e corte","Movimentação de cargas","Resíduos","Qualidade","Manutenção"],
  "Química / Petroquímica":["Produtos químicos","Process safety","Emergências","Meio ambiente","Resíduos perigosos","Terceiros"],
  "Hotelaria / Turismo":["Hóspedes","Segurança","Privacidade","Alimentos","Terceiros","Continuidade"],
  "Saúde / Hospitalar":["Paciente","Privacidade","Segurança assistencial","Qualidade","Terceiros","Incidentes"],
  "Construção":["Obras","Segurança","Subempreiteiros","Qualidade","Licenças","Meio ambiente"],
  "Gestão Pública":["Contratações","Transparência","Integridade","Conflitos","Terceiros","Prestação de contas"],
  "Agronegócio":["Rastreabilidade","Ambiental","Fornecedores","Produção","Armazenamento","Terceiros"],
  "Financeiro":["Fraude","Operações","Regulatório","Acessos","Terceiros","Continuidade"],
  "Educação":["Alunos","Privacidade","RH","Segurança","Terceiros","Qualidade"],
  "Tecnologia":["Cybersecurity","Privacidade","Cloud","Software","Terceiros","Continuidade"],
  "Serviços":["Operações","Terceiros","Qualidade","Privacidade","RH","Continuidade"],
  "Energia":["Ativos críticos","Segurança","Regulatório","Meio ambiente","Terceiros","Continuidade"],
  "Outro":["Operações","Pessoas","Terceiros","Financeiro","Regulatório","Continuidade"]
};

const UNIVERSAL_QUESTION_TEMPLATES = [
  ["Governança","Existe responsável formal pela decisão e supervisão do controle?","governance"],
  ["Governança","A alta administração recebe indicadores de compliance periodicamente?","governance"],
  ["Governança","As alçadas de aprovação estão documentadas e atualizadas?","governance"],
  ["Ética","Existe código de ética divulgado e atualizado?","integrity"],
  ["Ética","Conflitos de interesses são declarados e tratados?","integrity"],
  ["Integridade","Há controles para interação com agentes públicos?","integrity"],
  ["Integridade","Há regras para presentes, hospitalidades e patrocínios?","integrity"],
  ["Integridade","Há treinamento específico para funções de maior exposição?","training"],
  ["Terceiros","Há classificação de risco de terceiros antes da contratação?","thirdparty"],
  ["Terceiros","Há monitoramento periódico de terceiros de alto risco?","thirdparty"],
  ["Terceiros","Contratos possuem cláusulas de integridade quando aplicável?","thirdparty"],
  ["Terceiros","Existe processo para aprovação de exceções de terceiros?","thirdparty"],
  ["Financeiro","Existe segregação entre criação, aprovação e pagamento?","finance"],
  ["Financeiro","Transações excepcionais são revisadas independentemente?","finance"],
  ["Financeiro","Existe monitoramento de pagamentos fora do padrão?","finance"],
  ["Controles","Controles críticos possuem evidência verificável?","controls"],
  ["Controles","Controles críticos são testados periodicamente?","monitoring"],
  ["Controles","Falhas de controle possuem responsável e prazo?","controls"],
  ["Auditoria","Existe trilha de auditoria para decisões relevantes?","audit"],
  ["Auditoria","Achados são acompanhados até a remediação?","audit"],
  ["Documentação","Políticas possuem dono, versão, aprovação e revisão?","documentation"],
  ["Documentação","Documentos obsoletos são retirados de circulação?","documentation"],
  ["Jurídico","Existe inventário de obrigações legais e regulatórias?","legal"],
  ["Jurídico","Prazos legais e regulatórios possuem responsáveis?","legal"],
  ["Jurídico","Mudanças regulatórias são avaliadas quanto ao impacto?","legal"],
  ["Privacidade","Há inventário dos dados pessoais tratados?","privacy"],
  ["Privacidade","Acessos a dados sensíveis são revisados?","privacy"],
  ["Privacidade","Existe resposta documentada a incidentes de dados?","privacy"],
  ["Segurança","Acessos privilegiados são revisados periodicamente?","security"],
  ["Segurança","Existe plano de continuidade para processos críticos?","security"],
  ["Segurança","Backups e restauração são testados?","security"],
  ["Pessoas","Admissão, mudança e desligamento possuem controles integrados?","hr"],
  ["Pessoas","Treinamentos obrigatórios possuem evidência de conclusão?","training"],
  ["Pessoas","Há mecanismos contra retaliação e discriminação?","ethics"],
  ["Canal de Ética","O canal permite denúncia anônima quando apropriado?","ethics"],
  ["Canal de Ética","Existe protocolo único e rastreabilidade da denúncia?","ethics"],
  ["Canal de Ética","A triagem possui critérios de prioridade e conflito?","ethics"],
  ["Canal de Ética","Investigações preservam evidências e confidencialidade?","ethics"],
  ["Riscos","A matriz de riscos é revisada quando o contexto muda?","monitoring"],
  ["Riscos","Riscos críticos possuem plano de tratamento?","controls"],
  ["Riscos","Risco residual é avaliado após a implementação do controle?","monitoring"],
  ["Riscos","Há apetite/tolerância de risco definidos pela organização?","governance"],
  ["ESG","Riscos ambientais relevantes são identificados e monitorados?","environment"],
  ["ESG","Riscos de direitos humanos na cadeia são avaliados?","integrity"],
  ["ESG","Fornecedores críticos possuem critérios socioambientais?","thirdparty"],
  ["Operações","Processos críticos possuem indicadores de desempenho e risco?","controls"],
  ["Operações","Incidentes operacionais geram análise de causa raiz?","monitoring"],
  ["Operações","Ações corretivas são verificadas quanto à eficácia?","monitoring"],
  ["Qualidade","Não conformidades possuem tratamento e evidência de encerramento?","quality"],
  ["Qualidade","Mudanças de processo são avaliadas antes da implementação?","controls"],
  ["Compliance","Existe plano anual de compliance aprovado?","governance"],
  ["Compliance","O programa é revisado periodicamente quanto à efetividade?","monitoring"],
  ["Compliance","Recursos de compliance são proporcionais aos riscos?","governance"],
  ["Compliance","A independência da função de compliance é protegida?","governance"]
];
const SEGMENTS = [
  "Supermercados / Varejo","Logística / Transportes","Produção / Indústria",
  "Metalúrgica","Química / Petroquímica","Hotelaria / Turismo","Saúde / Hospitalar",
  "Construção","Gestão Pública","Agronegócio","Financeiro","Educação","Tecnologia",
  "Serviços","Energia","Cartórios / Tabelionatos de Notas","Outro"
];
const SIZES = ["Microempresa","Pequena empresa","Média empresa","Grande empresa","Órgão público"];
const MODES = ["SaaS","Assessoria","SaaS + Assessoria"];
const AREAS = [
  "Governança","Compliance","Ética e Integridade","Jurídico","Financeiro","Contabilidade",
  "Fiscal","RH","Operações","Logística","Compras","Suprimentos","Comercial","Tecnologia",
  "Segurança da Informação","Privacidade / LGPD","Auditoria","Terceiros","Saúde e Segurança",
  "Meio Ambiente","Qualidade","Diretoria"
];

const BASE_QUESTIONS = [
  ["Governança","Existe código de ética e conduta formal?","governance"],
  ["Governança","As responsabilidades de compliance estão formalmente definidas?","governance"],
  ["Integridade","Existe política de conflito de interesses?","integrity"],
  ["Integridade","Existe política anticorrupção e de relacionamento com agentes públicos?","integrity"],
  ["Canal de Ética","Existe canal de denúncias acessível, protegido e independente?","ethics"],
  ["Controles","Os processos críticos possuem controles documentados?","controls"],
  ["Controles","Existe segregação adequada de funções nos processos sensíveis?","controls"],
  ["Terceiros","Existe diligência antes da contratação de terceiros?","thirdparty"],
  ["Terceiros","Terceiros recebem cláusulas e orientações de compliance?","thirdparty"],
  ["Privacidade","Existem procedimentos para proteção e tratamento de dados pessoais?","privacy"],
  ["Treinamento","São realizados treinamentos periódicos e registrados?","training"],
  ["Monitoramento","Os controles são monitorados por indicadores?","monitoring"],
  ["Auditoria","Existe trilha de auditoria para decisões relevantes?","audit"],
  ["Documentação","Políticas e procedimentos possuem controle de versão e aprovação?","documentation"],
  ["Jurídico","Obrigações legais e regulatórias aplicáveis são acompanhadas?","legal"],
  ["Financeiro","Existe conciliação e revisão independente de operações financeiras?","finance"],
  ["RH","Admissão, desligamento e acessos são controlados de forma documentada?","hr"],
  ["Segurança","Existe gestão formal de incidentes e contingências?","security"]
];

const SECTOR_QUESTIONS = {
  "Supermercados / Varejo": [
    ["Operações","Existe controle de perdas, inventário e divergências de estoque?","retail"],
    ["Caixa","Há controles de abertura, fechamento e conferência de caixas?","retail"],
    ["Compras","Fornecedores críticos passam por homologação e avaliação?","retail"],
    ["Qualidade","Produtos perecíveis possuem controle de validade, temperatura e rastreabilidade?","retail"],
    ["Regulatório","Licenças e requisitos sanitários são monitorados?","regulatory"]
  ],
  "Logística / Transportes": [
    ["Logística","Existe controle de frota, manutenção e documentação dos veículos?","logistics"],
    ["Operações","Cargas críticas possuem rastreamento e controles de custódia?","logistics"],
    ["Segurança","Existe gestão de acidentes, sinistros, roubos e desvios de carga?","logistics"],
    ["Terceiros","Transportadores terceirizados são avaliados antes e durante o contrato?","thirdparty"],
    ["RH","Jornadas, treinamentos e habilitações dos motoristas são monitorados?","hr"]
  ],
  "Produção / Indústria": [
    ["Operações","Processos produtivos críticos possuem instruções e controles documentados?","industry"],
    ["Qualidade","Existe rastreabilidade de lotes, não conformidades e ações corretivas?","quality"],
    ["Segurança","Máquinas e equipamentos passam por inspeções e manutenção preventiva?","safety"],
    ["Meio Ambiente","Resíduos, emissões e licenças ambientais são monitorados?","environment"],
    ["Terceiros","Prestadores que atuam na planta são controlados e treinados?","thirdparty"]
  ],
  "Metalúrgica": [
    ["Segurança","Existe controle de riscos de máquinas, corte, solda e movimentação de cargas?","safety"],
    ["Operações","Manutenção preventiva de equipamentos críticos é registrada?","maintenance"],
    ["Meio Ambiente","Resíduos metálicos, óleos e produtos perigosos são controlados?","environment"],
    ["Qualidade","Matéria-prima e produto acabado possuem rastreabilidade?","quality"]
  ],
  "Química / Petroquímica": [
    ["Segurança","Existe gestão formal de produtos químicos, armazenamento e emergências?","chemical"],
    ["Meio Ambiente","Licenças, emissões e resíduos perigosos são monitorados?","environment"],
    ["Operações","Processos críticos possuem procedimentos de emergência testados?","chemical"],
    ["Terceiros","Terceiros são treinados para riscos específicos da planta?","thirdparty"]
  ],
  "Hotelaria / Turismo": [
    ["Operações","Existe controle de acesso, chaves e áreas restritas?","hospitality"],
    ["Segurança","Existe plano de emergência e resposta a incidentes com hóspedes?","safety"],
    ["Privacidade","Dados de hóspedes e meios de pagamento possuem controles de proteção?","privacy"],
    ["Terceiros","Serviços terceirizados são avaliados e supervisionados?","thirdparty"]
  ],
  "Saúde / Hospitalar": [
    ["Qualidade","Existe gestão de incidentes, eventos adversos e ações corretivas?","health"],
    ["Privacidade","Dados de pacientes possuem controles de acesso e rastreabilidade?","privacy"],
    ["Segurança","Protocolos críticos e treinamentos são revisados periodicamente?","health"],
    ["Terceiros","Fornecedores e prestadores críticos são qualificados?","thirdparty"]
  ],
  "Construção": [
    ["Segurança","Existe gestão documentada de riscos de obra e equipamentos?","construction"],
    ["Terceiros","Subempreiteiros passam por homologação e controles de documentação?","thirdparty"],
    ["Qualidade","Inspeções e não conformidades da obra são registradas?","quality"],
    ["Meio Ambiente","Resíduos, licenças e impactos ambientais são monitorados?","environment"]
  ],
  "Gestão Pública": [
    ["Integridade","Existe programa de integridade e controles para contratações públicas?","public"],
    ["Compras","Licitações, contratos e dispensas possuem trilha de auditoria?","public"],
    ["Transparência","Informações obrigatórias possuem controles de publicação e revisão?","public"],
    ["Terceiros","Contratados e fornecedores são avaliados quanto a impedimentos e integridade?","public"]
  ],
  "Agronegócio": [
    ["Operações","Rastreabilidade de produção, insumos e armazenamento é mantida?","agro"],
    ["Meio Ambiente","Licenças, recursos naturais e resíduos são monitorados?","environment"],
    ["Terceiros","Prestadores e fornecedores críticos são homologados?","thirdparty"]
  ],
  "Financeiro": [
    ["Financeiro","Existe monitoramento de operações atípicas e controles antifraude?","finance"],
    ["Segurança","Acessos privilegiados e transações sensíveis são monitorados?","security"],
    ["Regulatório","Obrigações regulatórias são acompanhadas e evidenciadas?","regulatory"]
  ],
  "Educação": [
    ["Privacidade","Dados de alunos, responsáveis e colaboradores possuem controles adequados?","privacy"],
    ["RH","Credenciais, contratações e desligamentos são controlados?","hr"],
    ["Segurança","Planos de emergência e proteção de alunos são testados?","safety"]
  ],
  "Tecnologia": [
    ["Segurança da Informação","Existe gestão de vulnerabilidades, incidentes e continuidade?","security"],
    ["Privacidade","Privacidade e proteção de dados estão incorporadas ao desenvolvimento?","privacy"],
    ["Terceiros","Serviços cloud e fornecedores críticos passam por avaliação?","thirdparty"]
  ],
  "Serviços": [
    ["Terceiros","Prestadores críticos são homologados e monitorados?","thirdparty"],
    ["Operações","Processos essenciais possuem controles e indicadores?","controls"],
    ["Qualidade","Reclamações e não conformidades geram ações corretivas?","quality"]
  ],
  "Energia": [
    ["Operações","Ativos críticos possuem manutenção e monitoramento documentados?","maintenance"],
    ["Segurança","Existe resposta a incidentes operacionais e emergências?","safety"],
    ["Regulatório","Licenças e obrigações regulatórias são acompanhadas?","regulatory"]
  ],
  "Outro": [
    ["Operações","Os processos críticos do negócio possuem controles documentados?","controls"],
    ["Regulatório","As obrigações legais e regulatórias aplicáveis são monitoradas?","regulatory"]
  ]
};

const RISK_LIBRARY = {
  governance: { title:"Fragilidade de governança", category:"Governança", cause:"Responsabilidades e decisões de compliance não estão suficientemente formalizadas.", consequence:"Decisões inconsistentes, perda de rastreabilidade e aumento de exposição.", recommendation:"Formalizar responsabilidades, alçadas, políticas e trilha de decisões.", action:"Implantar matriz de responsabilidades e calendário de governança.", owner:"Diretoria / Compliance", legal:false },
  integrity: { title:"Exposição a conflito de interesses ou integridade", category:"Ética e Integridade", cause:"Políticas ou controles de integridade insuficientes.", consequence:"Conflitos, fraude, corrupção ou dano reputacional.", recommendation:"Reforçar políticas, declarações, treinamentos e controles de integridade.", action:"Implantar programa de conflito de interesses e revisão periódica.", owner:"Compliance / Jurídico", legal:true },
  ethics: { title:"Canal de denúncias sem proteção adequada", category:"Canal de Ética", cause:"Ausência ou fragilidade de mecanismo independente e rastreável.", consequence:"Subnotificação, perda de evidências e risco de retaliação.", recommendation:"Disponibilizar canal independente com protocolo, confidencialidade e trilha de auditoria.", action:"Configurar canal, protocolo e procedimento de apuração.", owner:"Compliance / Ouvidoria", legal:true },
  controls: { title:"Controles internos insuficientes", category:"Controles Internos", cause:"Processos críticos não possuem controles claros ou segregação adequada.", consequence:"Erros, fraudes, perdas e baixa capacidade de prevenção.", recommendation:"Mapear controles, responsáveis e evidências; reforçar segregação.", action:"Implantar matriz de controles e testes periódicos.", owner:"Controles Internos / Compliance", legal:false },
  thirdparty: { title:"Risco de terceiros", category:"Terceiros", cause:"Homologação, diligência ou monitoramento insuficientes.", consequence:"Risco financeiro, reputacional, regulatório e contratual.", recommendation:"Adotar due diligence proporcional ao risco e monitoramento contínuo.", action:"Classificar terceiros e implantar ciclo de homologação e revisão.", owner:"Compras / Compliance", legal:true },
  privacy: { title:"Exposição em privacidade e proteção de dados", category:"Privacidade / LGPD", cause:"Controles de acesso, retenção ou tratamento de dados insuficientes.", consequence:"Incidentes, sanções, reclamações e dano reputacional.", recommendation:"Revisar inventário, acessos, retenção, bases legais e resposta a incidentes.", action:"Executar plano de adequação de privacidade e testes de acesso.", owner:"Privacidade / TI / Jurídico", legal:true },
  training: { title:"Baixa efetividade de treinamento", category:"Treinamento", cause:"Treinamentos inexistentes, não periódicos ou sem evidência de conclusão.", consequence:"Condutas inadequadas e baixa cultura de controles.", recommendation:"Implantar calendário anual, trilhas por função e evidência de conclusão.", action:"Criar matriz de treinamento e indicadores de adesão.", owner:"RH / Compliance", legal:false },
  monitoring: { title:"Monitoramento insuficiente", category:"Monitoramento", cause:"Indicadores e testes de controles não são executados com periodicidade adequada.", consequence:"Falhas permanecem sem detecção e tratamento.", recommendation:"Definir indicadores, testes e rotina de acompanhamento.", action:"Criar painel de monitoramento e calendário de testes.", owner:"Compliance / Auditoria", legal:false },
  audit: { title:"Trilha de auditoria insuficiente", category:"Auditoria", cause:"Decisões e controles relevantes não deixam evidências suficientes.", consequence:"Dificuldade de comprovação, investigação e prestação de contas.", recommendation:"Padronizar evidências, logs, aprovações e retenção documental.", action:"Implantar trilha de auditoria e política de retenção.", owner:"Auditoria / TI", legal:false },
  documentation: { title:"Gestão documental inadequada", category:"Documentação", cause:"Políticas e procedimentos sem controle de versão, aprovação ou revisão.", consequence:"Uso de documentos desatualizados e inconsistência operacional.", recommendation:"Implantar governança documental com responsáveis e periodicidade.", action:"Catalogar documentos e estabelecer ciclo de revisão.", owner:"Compliance / Qualidade", legal:false },
  legal: { title:"Risco de descumprimento legal ou regulatório", category:"Jurídico", cause:"Obrigações aplicáveis não estão centralizadas, monitoradas ou evidenciadas.", consequence:"Sanções, multas, passivos e restrições operacionais.", recommendation:"Manter matriz de obrigações, responsáveis, prazos e evidências.", action:"Criar matriz legal e rotina de acompanhamento.", owner:"Jurídico / Compliance", legal:true },
  finance: { title:"Risco financeiro e antifraude", category:"Financeiro", cause:"Conciliação, segregação ou revisão independente insuficientes.", consequence:"Perdas, pagamentos indevidos e fraude.", recommendation:"Reforçar conciliações, alçadas, segregação e monitoramento.", action:"Implantar controles financeiros e testes de exceção.", owner:"Financeiro / Auditoria", legal:false },
  hr: { title:"Risco de acessos e processos de pessoas", category:"RH", cause:"Admissões, desligamentos e acessos não estão sincronizados.", consequence:"Acessos indevidos, passivos trabalhistas e vazamento de informação.", recommendation:"Integrar RH e TI com checklists de admissão, mudança e desligamento.", action:"Implantar workflow de ciclo de vida do colaborador.", owner:"RH / TI", legal:true },
  security: { title:"Risco de segurança e continuidade", category:"Segurança da Informação", cause:"Incidentes, acessos críticos ou contingência sem gestão suficiente.", consequence:"Indisponibilidade, perda de dados e impacto operacional.", recommendation:"Reforçar gestão de incidentes, acessos, backups e continuidade.", action:"Executar teste de continuidade e revisão de acessos críticos.", owner:"TI / Segurança", legal:true },
  regulatory: { title:"Risco regulatório específico do setor", category:"Regulatório", cause:"Requisitos regulatórios aplicáveis não estão plenamente monitorados.", consequence:"Autuações, multas, suspensão de atividade ou perda de licença.", recommendation:"Mapear obrigações e evidências regulatórias por processo.", action:"Implantar calendário regulatório e rotina de comprovação.", owner:"Jurídico / Compliance", legal:true },
  retail: { title:"Risco operacional e de perdas no varejo", category:"Operações / Varejo", cause:"Controles de estoque, caixa, perdas ou fornecedores insuficientes.", consequence:"Perdas financeiras, desvios e deterioração de margem.", recommendation:"Reforçar inventário, caixa, prevenção de perdas e homologação.", action:"Implantar rotina integrada de prevenção de perdas.", owner:"Operações / Financeiro", legal:false },
  logistics: { title:"Risco de transporte e custódia de carga", category:"Logística", cause:"Rastreamento, manutenção, documentação ou gestão de sinistros insuficientes.", consequence:"Roubo, acidentes, perdas e passivos contratuais.", recommendation:"Reforçar rastreamento, manutenção, documentação e resposta a sinistros.", action:"Implantar plano de controle de frota e custódia.", owner:"Logística / Segurança", legal:true },
  industry: { title:"Risco de processo produtivo", category:"Operações / Indústria", cause:"Controles produtivos, manutenção ou procedimentos críticos insuficientes.", consequence:"Paradas, defeitos, acidentes e perdas.", recommendation:"Fortalecer procedimentos, manutenção, qualidade e indicadores.", action:"Implantar plano de controles de processo e manutenção.", owner:"Operações / Qualidade", legal:false },
  quality: { title:"Risco de qualidade e não conformidade", category:"Qualidade", cause:"Inspeções, rastreabilidade ou tratamento de não conformidades insuficientes.", consequence:"Reclamações, retrabalho, perdas e riscos contratuais.", recommendation:"Padronizar inspeções, CAPA e indicadores de qualidade.", action:"Implantar ciclo de não conformidade e validação de eficácia.", owner:"Qualidade / Operações", legal:false },
  safety: { title:"Risco de saúde e segurança", category:"Saúde e Segurança", cause:"Controles preventivos, treinamentos ou resposta a emergências insuficientes.", consequence:"Acidentes, afastamentos, passivos e interrupções.", recommendation:"Reforçar análise de riscos, treinamentos, inspeções e emergência.", action:"Executar plano de segurança e validar controles críticos.", owner:"Segurança / RH", legal:true },
  environment: { title:"Risco ambiental", category:"Meio Ambiente", cause:"Gestão de resíduos, licenças ou controles ambientais insuficientes.", consequence:"Passivos, sanções, acidentes ambientais e dano reputacional.", recommendation:"Manter matriz ambiental, licenças, resíduos e planos de emergência.", action:"Implantar calendário ambiental e auditoria de conformidade.", owner:"Meio Ambiente / Jurídico", legal:true },
  maintenance: { title:"Risco de manutenção de ativos críticos", category:"Manutenção", cause:"Manutenção preventiva ou evidências de inspeção insuficientes.", consequence:"Falhas, paradas, acidentes e custos inesperados.", recommendation:"Classificar ativos críticos e executar manutenção preventiva baseada em risco.", action:"Implantar plano de manutenção e indicadores de aderência.", owner:"Manutenção / Operações", legal:false },
  chemical: { title:"Risco de produtos químicos e emergências", category:"Química / Segurança", cause:"Armazenamento, manuseio, treinamento ou resposta a emergências insuficientes.", consequence:"Acidentes graves, impactos ambientais e passivos.", recommendation:"Reforçar gestão de produtos, FISPQ, treinamentos e simulados.", action:"Executar plano de emergência e auditoria de armazenamento.", owner:"EHS / Operações", legal:true },
  hospitality: { title:"Risco operacional em hotelaria", category:"Hotelaria", cause:"Acessos, segurança, dados de hóspedes ou terceiros sem controles suficientes.", consequence:"Incidentes com hóspedes, perdas e dano reputacional.", recommendation:"Reforçar controles de acesso, incidentes, dados e fornecedores.", action:"Implantar controles de segurança e privacidade para hóspedes.", owner:"Operações / Segurança", legal:true },
  health: { title:"Risco assistencial e de segurança do paciente", category:"Saúde", cause:"Protocolos, incidentes ou controles de acesso e treinamento insuficientes.", consequence:"Eventos adversos, passivos e dano reputacional.", recommendation:"Reforçar protocolos, incidentes, treinamentos e rastreabilidade.", action:"Implantar ciclo de gestão de incidentes e eficácia.", owner:"Qualidade / Direção", legal:true },
  construction: { title:"Risco de obra e segurança operacional", category:"Construção", cause:"Gestão de riscos de obra, terceiros e qualidade insuficiente.", consequence:"Acidentes, atrasos, custos e passivos.", recommendation:"Reforçar controles de obra, terceiros, segurança e qualidade.", action:"Implantar painel integrado de riscos de obra.", owner:"Engenharia / Segurança", legal:true },
  public: { title:"Risco de integridade em contratações públicas", category:"Gestão Pública", cause:"Controles de contratação, transparência ou integridade insuficientes.", consequence:"Irregularidades, sanções, desperdício e dano institucional.", recommendation:"Reforçar segregação, transparência, trilha de auditoria e integridade.", action:"Implantar matriz de riscos de contratação e controles preventivos.", owner:"Controladoria / Jurídico", legal:true },
  agro: { title:"Risco de rastreabilidade e operação agro", category:"Agronegócio", cause:"Rastreabilidade, insumos, armazenamento ou controles ambientais insuficientes.", consequence:"Perdas, não conformidades e impactos regulatórios.", recommendation:"Reforçar rastreabilidade, fornecedores, estoque e controles ambientais.", action:"Implantar matriz de controles da cadeia produtiva.", owner:"Operações / Qualidade", legal:true }
};

const RISK_LEVEL = (p,i) => {
  const s = Number(p)*Number(i);
  return s >= 16 ? "Crítico" : s >= 10 ? "Alto" : s >= 5 ? "Médio" : "Baixo";
};
const now = () => new Date().toLocaleString("pt-BR");
const uid = p => `${p}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;

const DEEP_AUDIT_DIMENSIONS = [
  ["Responsabilidade","Existe um responsável nominalmente designado pelo controle de {topic}?"],
  ["Política","Há política formal aprovada que disciplina {topic}?"],
  ["Procedimento","O procedimento operacional de {topic} está documentado e disponível?"],
  ["Risco","Os riscos inerentes a {topic} foram identificados e avaliados?"],
  ["Criticidade","A criticidade dos riscos de {topic} considera probabilidade e impacto?"],
  ["Inventário","Existe inventário atualizado de ativos, operações ou registros de {topic}?"],
  ["Obrigação","Foram identificadas as obrigações legais e contratuais aplicáveis a {topic}?"],
  ["Evidência","A execução do controle de {topic} produz evidência verificável?"],
  ["Aprovação","As aprovações relevantes de {topic} seguem alçadas formalizadas?"],
  ["Segregação","Há segregação entre execução, aprovação e fiscalização de {topic}?"],
  ["Acesso","O acesso a informações e operações de {topic} é limitado por função?"],
  ["Revisão de acesso","Os acessos privilegiados relacionados a {topic} são revisados periodicamente?"],
  ["Treinamento","Os profissionais responsáveis por {topic} recebem capacitação específica?"],
  ["Competência","A competência técnica exigida para {topic} é comprovada e atualizada?"],
  ["Terceiros","Os terceiros envolvidos em {topic} são avaliados conforme seu risco?"],
  ["Contrato","Os contratos relativos a {topic} contêm obrigações e responsabilidades adequadas?"],
  ["Monitoramento","Existem indicadores objetivos para monitorar {topic}?"],
  ["Periodicidade","A periodicidade de revisão de {topic} está definida e é cumprida?"],
  ["Teste","A efetividade dos controles de {topic} é testada com metodologia documentada?"],
  ["Auditoria","Há auditoria independente ou revisão amostral de {topic}?"],
  ["Desvio","Os desvios identificados em {topic} são registrados e classificados?"],
  ["Correção","As falhas de {topic} geram planos de ação com responsável e prazo?"],
  ["Validação","A conclusão das ações corretivas de {topic} exige validação de eficácia?"],
  ["Incidente","Existe procedimento para detectar e comunicar incidentes ligados a {topic}?"],
  ["Resposta","Os incidentes críticos de {topic} possuem responsáveis e plano de resposta?"],
  ["Continuidade","Existe contingência para indisponibilidade de processos críticos de {topic}?"],
  ["Rastreabilidade","É possível rastrear decisões, alterações e evidências de {topic}?"],
  ["Retenção","Os registros de {topic} seguem critérios documentados de retenção e descarte?"],
  ["Reporte","A liderança recebe reporte periódico sobre riscos e resultados de {topic}?"],
  ["Exceções","As exceções aos controles de {topic} são justificadas, aprovadas e registradas?"],
  ["Melhoria","Os resultados de {topic} alimentam um ciclo formal de melhoria contínua?"],
  ["Verificação","Há verificação documentada de aderência de {topic} aos requisitos aplicáveis?"]
];

const ENTERPRISE_AUDIT_TOPICS = [
  ["Governança","governance"],["Direção executiva","governance"],
  ["Integridade e anticorrupção","integrity"],["Canal de denúncias","ethics"],
  ["Jurídico e regulatório","legal"],["Recursos humanos","hr"],
  ["Financeiro e tesouraria","finance"],["Contabilidade e fiscal","finance"],
  ["Compras e suprimentos","thirdparty"],["Gestão de terceiros","thirdparty"],
  ["Operações e processos","controls"],["Comercial e clientes","controls"],
  ["Tecnologia da informação","security"],["Segurança cibernética","security"],
  ["Privacidade e dados pessoais","privacy"],["Gestão da qualidade","quality"],
  ["Saúde e segurança ocupacional","safety"],["Gestão ambiental","environment"],
  ["Auditoria interna","audit"]
];

function questionBank(company={}, globalProfile={}) {
  const segment=company.segment||"Outro";
  const sectorTopics=(SECTOR_PACKS[segment]||SECTOR_PACKS["Outro"]).slice(0,6);
  const topics=[
    ...ENTERPRISE_AUDIT_TOPICS,
    ...sectorTopics.map(topic=>[topic,"sector"])
  ];
  // 25 áreas (19 corporativas + 6 setoriais) × 32 verificações = 800 itens.
  // IDs versionados impedem associar respostas antigas a perguntas diferentes.
  return topics.flatMap(([area,key],areaIndex)=>
    DEEP_AUDIT_DIMENSIONS.map(([dimension,template],dimensionIndex)=>({
      id:`V46-Q${String(areaIndex*DEEP_AUDIT_DIMENSIONS.length+dimensionIndex+1).padStart(3,"0")}`,
      area,
      dimension,
      sector:segment,
      key,
      text:template.replace("{topic}",area.toLowerCase()) ,
      evidenceHint:`Solicite documentos, registros ou evidências de ${dimension.toLowerCase()} referentes a ${area.toLowerCase()}.`
    }))
  );
}


const NEXUS_STANDARDS_UPDATES = [
  {id:"ISO37301",name:"ISO 37301:2021",edition:"Atual",status:"Confirmada em 2026",scope:"Sistema de Gestão de Compliance",priority:"Essencial",source:"https://www.iso.org/standard/75080.html"},
  {id:"ISO37001",name:"ISO 37001:2025",edition:"2ª edição",status:"Publicada em 2025",scope:"Sistema de Gestão Antissuborno",priority:"Alta",source:"https://www.iso.org/standard/37001"},
  {id:"ISO37002",name:"ISO 37002:2021",edition:"Atual",status:"Confirmada em 2026",scope:"Canal de denúncias / whistleblowing",priority:"Alta",source:"https://www.iso.org/standard/65035.html"},
  {id:"ISO37302",name:"ISO 37302:2025",edition:"Atual",status:"Publicada em 2025",scope:"Avaliação de eficácia do Compliance",priority:"Alta",source:"https://www.iso.org/committee/6266703/x/catalogue/"},
  {id:"ISO37303",name:"ISO 37303:2025",edition:"Atual",status:"Publicada em 2025",scope:"Competência em Compliance",priority:"Média",source:"https://www.iso.org/committee/6266703/x/catalogue/"},
  {id:"ISO37008",name:"ISO/TS 37008:2023",edition:"Atual",status:"Vigente",scope:"Investigações internas",priority:"Alta",source:"https://www.iso.org/ics/03.100.02/x/"},
  {id:"OECD",name:"OECD Guidelines for Multinational Enterprises",edition:"2023",status:"Referência global",scope:"Conduta empresarial responsável",priority:"Alta",source:"https://www.oecd.org/en/publications/oecd-guidelines-for-multinational-enterprises-on-responsible-business-conduct_81f92357-en.html"},
  {id:"DOJ",name:"DOJ Evaluation of Corporate Compliance Programs",edition:"Atualização contínua",status:"Referência EUA",scope:"Efetividade de programas de Compliance",priority:"Alta",source:"https://www.justice.gov/criminal/corporate-enforcement"}
];

function StandardsCenter({s,analysis,notify}){
  const [filter,setFilter]=useState("Todos");
  const [selected,setSelected]=useState(null);
  const filters=["Todos","Essencial","Alta","Média"];
  const list=NEXUS_STANDARDS_UPDATES.filter(x=>filter==="Todos"||x.priority===filter);
  return <div className="page">
    <div className="module-head"><div><small>NEXUS STANDARDS INTELLIGENCE</small><h1>Atualizações e Frameworks</h1><p>Registro de referências internacionais e sua aplicação contextual no diagnóstico.</p></div><button className="primary" onClick={()=>notify("Catálogo de referências atualizado.")}>↻ Atualizar catálogo</button></div>
    <div className="standards-hero"><div><b>ENGINE DE ATUALIZAÇÃO</b><h2>Compliance não pode ficar parado.</h2><p>O NEXUS mantém a arquitetura preparada para versões, revisões e novos referenciais. A aplicabilidade jurídica continua sendo validada conforme a empresa, jurisdição e atividade.</p></div><div className="standards-orb">SYNC<br/><strong>2026</strong></div></div>
    <div className="filter-row">{filters.map(f=><button className={filter===f?"active":""} onClick={()=>setFilter(f)} key={f}>{f}</button>)}</div>
    <div className="standards-grid">{list.map(x=><article className="standard-card" key={x.id} onClick={()=>setSelected(x)}>
      <div className="standard-top"><span>{x.priority}</span><small>{x.edition}</small></div><h3>{x.name}</h3><p>{x.scope}</p><b>{x.status}</b><a href={x.source} target="_blank" rel="noreferrer">Fonte oficial ↗</a>
    </article>)}</div>
    <Panel title="Aplicabilidade no diagnóstico" sub="Frameworks selecionados automaticamente pelo perfil atual.">
      <div className="kpis"><Metric title="Selecionados" value={analysis.selected.length} sub="Motor global"/><Metric title="Pacotes setoriais" value={analysis.packs.length} sub="Perfil da empresa"/><Metric title="Cobertura orientativa" value={analysis.score+"%"} sub="Não substitui análise jurídica"/></div>
      <div className="alert-list">{analysis.alerts.map((x,i)=><div key={i}>⚡ {x}</div>)}</div>
    </Panel>
    {selected&&<Modal title={selected.name} eyebrow="REFERÊNCIA OFICIAL" close={()=>setSelected(null)}><p><b>Escopo:</b> {selected.scope}</p><p><b>Status:</b> {selected.status}</p><p><b>Prioridade:</b> {selected.priority}</p><a className="primary" href={selected.source} target="_blank" rel="noreferrer">Abrir fonte oficial ↗</a></Modal>}
  </div>
}

function fresh() {
  return {
    company:{name:"",document:"",segment:"",size:"",city:"",mode:"",responsible:"",director:""},globalProfile:{jurisdictions:["BR"],multinational:false,publicSector:false,publicAgents:false,personalDataEU:false,largeOrMultinational:false,exportMarkets:[]},documents:[],documentReviews:[],firstAccess:true,
    answers:{}, risks:[], actions:[], evidence:[], legal:[], denunciations:[],
    workflow:{empresa:false,diagnostico:false,questionario:false,riscos:false,acoes:false,evidencias:false,juridico:false,relatorio:false},
    history:[{id:uid("LOG"),text:"NEXUS Intelligent Engine inicializado.",date:now()}],
    signatures:{consultant:"",director:""},
    review:{status:"Em análise",confirmedRisks:false,confirmedActions:false,confirmedLegal:false}
  };
}
function load() {
  try {
    // Com sessão API ativa, o backend é a fonte de verdade.
    // Nunca hidratar uma nova empresa com o workspace local de outra.
    if(localStorage.getItem("nexus_api_token")) return fresh();

    const current=JSON.parse(localStorage.getItem(KEY)||"null");
    if(current) return {...fresh(),...current,globalProfile:{...fresh().globalProfile,...(current.globalProfile||{})}};
    const legacy=JSON.parse(localStorage.getItem("nexus-compliance-v90")||"null");
    if(legacy) return {...fresh(),...legacy,globalProfile:{...fresh().globalProfile,...(legacy.globalProfile||{})},firstAccess:false};
    return fresh();
  } catch { return fresh(); }
}

function AppCore() {
  const [s,setS] = useState(load);
  const [showEntry,setShowEntry] = useState(()=>{ try { return sessionStorage.getItem("nexus-entry-v119") !== "1"; } catch { return true; } });
  const [page,setPage] = useState("dashboard");
  const [busy,setBusy] = useState(null);
  const [toast,setToast] = useState("");
  const [modal,setModal] = useState(null);
  const [detail,setDetail] = useState(null);
  const [apiUser,setApiUser] = useState(null);
  const [apiLoading,setApiLoading] = useState(true);
  const [apiSyncing,setApiSyncing] = useState(false);
  const [apiSyncError,setApiSyncError] = useState(false);
  const [remoteRecordId,setRemoteRecordId] = useState(null);
  const hydrationRef = useRef(false);
  const remoteRecordIdRef = useRef(null);
  const syncTimerRef = useRef(null);

  useEffect(()=>{
    // Enquanto a sessão/API ainda está sendo identificada, não sobrescrever
    // o armazenamento local com dados transitórios de outra empresa.
    if(apiLoading || apiUser) return;
    try{ localStorage.setItem(KEY,JSON.stringify(s)); }catch{}
  },[s,apiLoading,apiUser]);

  useEffect(()=>{
    let active=true;
    async function hydrateFromApi(){
      const token=localStorage.getItem("nexus_api_token");
      if(!token){
        hydrationRef.current=true;
        if(active) setApiLoading(false);
        return;
      }
      try{
        const me=await apiGet("/me");
        if(!active) return;
        const remote=await apiGet("/records/workspace");
        const record=remote?.records?.[0];
        if(record?.payload){
          const base=fresh();
          const payload=record.payload;
          const merged={
            ...base,
            ...payload,
            company:{...base.company,...(payload.company||{})},
            globalProfile:{...base.globalProfile,...(payload.globalProfile||{})},
            workflow:{...base.workflow,...(payload.workflow||{})},
            signatures:{...base.signatures,...(payload.signatures||{})},
            review:{...base.review,...(payload.review||{})}
          };
          setS(merged);
          setRemoteRecordId(record.id);
          remoteRecordIdRef.current=record.id;
        }
        hydrationRef.current=true;
        if(active) setApiUser(me.user||null);
      }catch(err){
        hydrationRef.current=true;
        if(active){
          setApiUser(null);
          notify("Sessão API indisponível. O workspace local continua funcionando.");
        }
      }finally{
        if(active) setApiLoading(false);
      }
    }
    hydrateFromApi();
    return ()=>{active=false};
  },[]);

  useEffect(()=>{
    if(!apiUser || !hydrationRef.current) return;
    clearTimeout(syncTimerRef.current);
    syncTimerRef.current=setTimeout(async()=>{
      try{
        setApiSyncing(true);
        const id=remoteRecordIdRef.current;
        if(id){
          await apiPut(`/records/${id}`,s);
        }else{
          const created=await apiPost("/records/workspace",s);
          remoteRecordIdRef.current=created?.id||null;
          setRemoteRecordId(created?.id||null);
        }
        setApiSyncError(false);
      }catch(err){
        setApiSyncError(true);
        console.warn("NEXUS API sync:",err);
      }finally{
        setApiSyncing(false);
      }
    },900);
    return ()=>clearTimeout(syncTimerRef.current);
  },[s,apiUser]);

  const questions = useMemo(()=>buildEnterpriseQuestions(s.company.segment),[s.company.segment]);
  const answered = diagnosticProgress(questions,s.answers).answered;
  const done = s.workflow;
  const progress = Math.round(Object.values(done).filter(Boolean).length / Object.keys(done).length * 100);

  const maturity = useMemo(()=>{
    if(!answered) return 18;
    const vals = questions.map(q=>s.answers[q.id]).filter(v=>v && v!=="N/A");
    const score = vals.reduce((a,v)=>a+(v==="Sim"?1:v==="Parcialmente"?0.5:0),0);
    return Math.round(18 + (score / Math.max(1,vals.length))*82);
  },[s.answers,questions]);

  const stats = useMemo(()=>{
    const out={total:s.risks.length,Crítico:0,Alto:0,Médio:0,Baixo:0};
    s.risks.forEach(r=>out[r.level||RISK_LEVEL(r.p,r.i)]++);
    return out;
  },[s.risks]);

  const companyReady = !!(s.company.name && s.company.segment && s.company.size && s.company.mode);

  const notify = msg => { setToast(msg); setTimeout(()=>setToast(""),2600); };
  const run = (text,cb) => {
    // Não simular processamento aleatório: a ação já está pronta.
    setBusy({text,p:100});
    window.setTimeout(()=>{
      setBusy(null);
      cb?.();
    },180);
  };
  const commit = (ns,msg) => {
    setS({...ns,history:[...(ns.history||s.history),{id:uid("LOG"),text:msg,date:now()}]});
    notify(msg);
  };

  async function connectApi(session,seedState=null){
    try{
      const me=session?.user ? session : await apiGet("/me");
      hydrationRef.current=false;
      const remote=await apiGet("/records/workspace");
      const record=remote?.records?.[0];
      if(record?.payload){
        const base=fresh();
        const payload=record.payload;
        setS({
          ...base,
          ...payload,
          company:{...base.company,...(payload.company||{})},
          globalProfile:{...base.globalProfile,...(payload.globalProfile||{})},
          workflow:{...base.workflow,...(payload.workflow||{})},
          signatures:{...base.signatures,...(payload.signatures||{})},
          review:{...base.review,...(payload.review||{})}
        });
        setRemoteRecordId(record.id);
        remoteRecordIdRef.current=record.id;
      }else{
        const seed=seedState||s;
        const created=await apiPost("/records/workspace",seed);
        setRemoteRecordId(created?.id||null);
        remoteRecordIdRef.current=created?.id||null;
      }
      hydrationRef.current=true;
      setApiUser(me?.user||null);
      notify("NEXUS conectado à API V124.");
    }catch(err){
      setApiUser(null);
      throw err;
    }
  }

  async function handleApiLogin(email,password){
    const session=await login(email,password);
    await connectApi(session);
    setModal(null);
    setShowEntry(false);
    try{sessionStorage.setItem("nexus-entry-v119","1")}catch{}
  }

  async function handleApiBootstrap(data){
    const session=await bootstrapCompany(data);

    // NOVA EMPRESA = NOVO WORKSPACE.
    // Nunca reutilizar answers/riscos/auditoria/documentos da empresa anterior.
    const base=fresh();
    const company={
      ...base.company,
      name:data.companyName||"",
      segment:data.segment||"",
      size:data.size||"",
      responsible:data.adminName||"",
    };
    const nextState={
      ...base,
      company,
      firstAccess:false,
      workflow:{...base.workflow,empresa:true},
      history:[
        ...base.history,
        {
          id:uid("LOG"),
          text:`Workspace inicial criado para ${company.name}.`,
          date:now()
        }
      ]
    };

    try{ localStorage.removeItem(KEY); }catch{}
    setS(nextState);
    await connectApi(session,nextState);

    setModal(null);
    setShowEntry(false);
    setPage("diagnostico");
    try{sessionStorage.setItem("nexus-entry-v119","1")}catch{}
    notify("Nova empresa criada com workspace limpo. NEXUS V124 conectado.");
  }

  function disconnectApi(){
    apiLogout();
    setApiUser(null);
    setRemoteRecordId(null);
    remoteRecordIdRef.current=null;
    notify("API desconectada. O workspace local permanece preservado.");
  }

  function generateFromAnswers(answerMap=s.answers) {
    return assessDiagnostic(questions,answerMap,RISK_LIBRARY,RISK_LEVEL,frameworkAnalysis().selected);
  }


  const steps = [
    ["empresa","Empresa"],["diagnostico","Diagnóstico"],["questionario","Questionário"],
    ["riscos","Matriz de Riscos"],["acoes","Plano de Ação"],["evidencias","Evidências"],
    ["juridico","Jurídico"],["relatorio","Relatório Final"]
  ];

  function nextStep() {
    const i=steps.findIndex(x=>x[0]===page);
    return steps[i+1]?.[0] || null;
  }

  function finish() {
    if(page==="diagnostico" && !companyReady) return notify("Cadastre a empresa antes de avançar.");
    if(page==="questionario"){
      if(answered<questions.length) return notify("Responda todas as perguntas antes de gerar o diagnóstico automático.");
      const generated=generateFromAnswers(s.answers);
      const integrity=validateDiagnosticLinks(generated,questions);
      if(!integrity.valid) return notify("Diagnóstico inconsistente: revise os vínculos antes de concluir.");
      const ns={...s,risks:generated.risks,actions:generated.actions,legal:generated.legal,review:{status:"Aguardando confirmação",confirmedRisks:false,confirmedActions:false,confirmedLegal:false},workflow:{...s.workflow,questionario:true},history:[...s.history,{id:uid("LOG"),text:`Diagnóstico consolidado instantaneamente: ${generated.risks.length} riscos, ${generated.actions.length} ações e ${generated.legal.length} triagens jurídicas.`,date:now()}]};
      setS(ns); notify(`Diagnóstico concluído: ${generated.risks.length} riscos, ${generated.actions.length} ações e ${generated.legal.length} triagens. Matriz atualizada.`);
      run("Atualizando matriz, plano e triagem",()=>setPage("riscos"));
      return;
    }
    if(page==="riscos" && !s.review.confirmedRisks) return notify("Revise e confirme a matriz automática antes de avançar.");
    if(page==="acoes" && !s.review.confirmedActions) return notify("Revise e confirme o plano automático antes de avançar.");
    if(page==="juridico" && !s.review.confirmedLegal) return notify("Confirme os encaminhamentos jurídicos necessários antes de finalizar.");
    const n=nextStep();
    const ns={...s,workflow:{...s.workflow,[page]:true}};
    commit(ns,`Etapa concluída: ${steps.find(x=>x[0]===page)?.[1]||page}.`);
    if(n) run("Consolidando próxima etapa",()=>setPage(n));
  }


  function go(k) {
    if(k==="dashboard" || k==="denuncias" || k==="documentos" || k==="matriz-filosofica" || k==="global") return setPage(k);
    const i=steps.findIndex(x=>x[0]===k);
    if(i>0 && !steps.slice(0,i).every(([key])=>s.workflow[key])) {
      return notify(`Conclua primeiro: ${steps.find(([key])=>!s.workflow[key])?.[1]||"etapa anterior"}.`);
    }
    setPage(k);
  }

  function frameworkAnalysis(){
    const p={...s.globalProfile,largeOrMultinational:/Grande|Órgão público/i.test(s.company.size)||s.globalProfile.multinational};
    const selected=GLOBAL_FRAMEWORKS.filter(f=>{try{return f.trigger(p)}catch{return false}}).map(f=>({...f,status:f.tier==="Optional"?"Opcional":f.tier==="Jurisdictional"?"Aplicável por jurisdição":"Recomendado"}));
    const packs=SECTOR_PACKS[s.company.segment]||SECTOR_PACKS["Outro"];
    const score=Math.min(100,Math.round(35+selected.length*4+packs.length*3+(p.multinational?10:0)+(p.publicAgents?8:0)+(p.personalDataEU?5:0)));
    return {selected,packs,score,alerts:[
      p.jurisdictions.length>1?"Operação multijurisdicional: revisar obrigações locais com Jurídico.":null,
      p.publicAgents?"Exposição a agentes públicos: reforçar anticorrupção, terceiros e registros.":null,
      p.personalDataEU?"Tratamento/exposição de dados na UE: revisar aplicabilidade de regras europeias de privacidade.":null,
      p.multinational?"Empresa multinacional: aplicar camada OECD e governança de grupo.":null
    ].filter(Boolean)};
  }

  function saveCompany(c) {
    const sectorChanged = s.company.segment && (s.company.segment !== c.segment || s.company.size !== c.size);
    const ns = {
      ...s,
      company:c,
      answers: sectorChanged ? {} : s.answers,
      risks: sectorChanged ? [] : s.risks,
      actions: sectorChanged ? [] : s.actions,
      legal: sectorChanged ? [] : s.legal,
      evidence: sectorChanged ? [] : s.evidence,
      documents: sectorChanged ? [] : s.documents,
      documentReviews: sectorChanged ? [] : s.documentReviews,
      workflow: sectorChanged
        ? {...s.workflow,empresa:true,diagnostico:false,questionario:false,riscos:false,acoes:false,evidencias:false,juridico:false,relatorio:false}
        : {...s.workflow,empresa:true},
      review: sectorChanged
        ? {status:"Reanálise necessária",confirmedRisks:false,confirmedActions:false,confirmedLegal:false}
        : s.review
    };
    commit(ns, sectorChanged
      ? "Perfil da empresa alterado. O sistema bloqueou a consolidação anterior e solicitou nova análise setorial."
      : "Empresa cadastrada/atualizada com sucesso.");
    setModal(null);
    run(sectorChanged ? "Reconfigurando diagnóstico e matrizes" : "Salvando perfil da empresa",()=>setPage("diagnostico"));
  }

  function answer(id,v) {
    const question=questions.find(q=>q.id===id);
    if(!question) return notify("Pergunta não encontrada no ramo atual.");
    setS(prev=>recordDiagnosticAnswer(prev,question,v,apiUser?.name||apiUser?.email||"Usuário local"));
  }

  function confirmRisks() {
    setS(prev=>({...prev,review:{...prev.review,confirmedRisks:true},risks:prev.risks.map(r=>({...r,status:"Confirmado"})),history:[...(prev.history||[]),{id:uid("LOG"),text:"Matriz de riscos confirmada pelo responsável.",date:now()}]}));
    notify("Matriz automática confirmada.");
  }
  function confirmActions() {
    setS(prev=>({...prev,review:{...prev.review,confirmedActions:true},actions:prev.actions.map(a=>({...a,status:"Plano gerado"})),history:[...(prev.history||[]),{id:uid("LOG"),text:"Plano de ação confirmado pelo responsável.",date:now()}]}));
    notify("Plano de ação automático confirmado.");
  }
  function confirmLegal() {
    setS(prev=>({...prev,review:{...prev.review,confirmedLegal:true},legal:prev.legal.map(j=>({...j,status:"Encaminhamento confirmado"})),history:[...(prev.history||[]),{id:uid("LOG"),text:"Triagem jurídica confirmada pelo responsável.",date:now()}]}));
    notify(s.legal.length ? "Encaminhamentos jurídicos confirmados." : "Nenhum encaminhamento jurídico necessário.");
  }

  function generateDocuments(){
    const docs=DOCUMENT_CATALOG.map(d=>{
      const base={id:uid("DOC"),name:d[0],area:d[1],priority:d[3],description:d[4],status:"Rascunho para análise jurídica",version:"1.0",automatic:true,created:now(),legalReview:true};
      return {...base,content:buildOfficialDocument(base,s)};
    });
    const reviews=docs.map(d=>({id:uid("DR"),documentId:d.id,title:"Análise jurídica — "+d.name,status:"Aguardando Jurídico",responsible:"Jurídico",created:now()}));
    setS(prev=>({...prev,documents:docs,documentReviews:reviews,history:[...(prev.history||[]),{id:uid("LOG"),text:"Documentos oficiais NEXUS gerados automaticamente e prontos para revisão/impressão.",date:now()}]}));
    notify("Pacote NEXUS gerado: "+docs.length+" documentos utilizáveis.");
  }


function attach(files,owner,ownerId) {
    const fs=[...files].map(f=>({id:uid("EVD"),name:f.name,type:f.type,size:f.size,owner,ownerId,created:now()}));
    commit({...s,evidence:[...fs,...s.evidence]},`${fs.length} evidência(s) anexada(s).`);
  }

  function printReport() {
    const w=window.open("","_blank","width=1200,height=900");
    if(!w){ notify("Permita pop-ups para gerar o relatório."); return; }
    const esc=(v)=>String(v==null?"—":v).replace(/[&<>"']/g,function(m){return ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]);});
    const company=s.company||{};
    const risks=s.risks||[], actions=s.actions||[], legal=s.legal||[], evidence=s.evidence||[], docs=s.documents||[];
    const answers=s.answers||{};
    const qlist=questions||[];
    const fw=(frameworkAnalysis().selected||[]);
    const answeredCount=Object.keys(answers).length;
    const riskCount=risks.length, actionCount=actions.length, legalCount=legal.length, evidenceCount=evidence.length;
    const riskTable=risks.length?risks.map(function(r){return "<tr><td>"+esc(r.id)+"</td><td>"+esc(r.title)+"</td><td>"+esc(r.area)+"</td><td>"+esc(r.level)+"</td><td>"+esc(r.score)+"</td><td>"+esc(r.responsible||"Compliance")+"</td></tr>";}).join(""):"<tr><td colspan='6'>Nenhum risco registrado.</td></tr>";
    const actionTable=actions.length?actions.map(function(x){return "<tr><td>"+esc(x.title)+"</td><td>"+esc(x.priority)+"</td><td>"+esc(x.status)+"</td><td>"+esc(x.responsible||"Não definido")+"</td><td>"+esc(x.deadline||"—")+"</td></tr>";}).join(""):"<tr><td colspan='5'>Nenhuma ação registrada.</td></tr>";
    const legalTable=legal.length?legal.map(function(x){return "<tr><td>"+esc(x.title)+"</td><td>"+esc(x.status)+"</td><td>"+esc(x.responsible||"Jurídico")+"</td><td>"+esc(x.reason||"Análise jurídica")+"</td></tr>";}).join(""):"<tr><td colspan='4'>Nenhum encaminhamento jurídico registrado.</td></tr>";
    const evidenceTable=evidence.length?evidence.map(function(x){return "<tr><td>"+esc(x.name||x.title)+"</td><td>"+esc(x.owner||x.responsible||"—")+"</td><td>"+esc(x.status||"Registrado")+"</td></tr>";}).join(""):"<tr><td colspan='3'>Nenhuma evidência registrada.</td></tr>";
    const docTable=docs.length?docs.map(function(x){return "<tr><td>"+esc(x.name)+"</td><td>"+esc(x.area)+"</td><td>"+esc(x.priority)+"</td><td>"+esc(x.status)+"</td></tr>";}).join(""):"<tr><td colspan='4'>Nenhum documento registrado.</td></tr>";
    const qTable=qlist.length?qlist.map(function(q,i){return "<tr><td>"+(i+1)+"</td><td>"+esc(q.area)+"</td><td>"+esc(q.text)+"</td><td>"+esc(answers[q.id]||"Não respondida")+"</td></tr>";}).join(""):"<tr><td colspan='4'>Questionário indisponível.</td></tr>";
    const frameworkTable=fw.length?fw.map(function(x){return "<tr><td>"+esc(x.name||x[0]) +"</td><td>"+esc(x.reason||"Aplicabilidade contextual")+"</td></tr>";}).join(""):"<tr><td colspan='2'>Nenhum framework selecionado.</td></tr>";
    const table=function(head,rows){return "<table><thead><tr>"+head.map(function(h){return "<th>"+h+"</th>";}).join("")+"</tr></thead><tbody>"+rows+"</tbody></table>";};
    const page=function(n,title,body){return "<section class='page'><div class='page-head'><span>NEXUS COMPLIANCE ONE</span><b>"+String(n).padStart(2,"0")+"/60</b></div><h1>"+title+"</h1>"+body+"<div class='page-foot'>Relatório Premium Executivo · "+esc(company.name||"Empresa")+" · Página "+n+"</div></section>";};
    const pages=[];
    const add=function(title,body){pages.push(page(pages.length+1,title,body));};
    add("Capa Executiva","<div class='cover'><div class='brandmark'>N</div><p class='kicker'>COMPLIANCE ONE · NEXUS</p><h2>Relatório Premium Executivo de Compliance</h2><p class='lead'>"+esc(company.name||"Empresa")+" · "+esc(company.segment||"Segmento")+" · "+esc(company.size||"Porte")+"</p><div class='cover-grid'><b>Maturidade<strong>"+maturity+"%</strong></b><b>Progresso<strong>"+progress+"%</strong></b><b>Riscos<strong>"+riskCount+"</strong></b><b>Frameworks<strong>"+fw.length+"</strong></b></div><p>Documento consolidado do ciclo de Compliance. A validação final depende das áreas responsáveis e do Jurídico quando aplicável.</p></div>");
    add("Sumário Executivo","<p>Panorama da avaliação, riscos, causas, soluções, responsáveis, evidências, documentos, jurídico, frameworks e indicadores.</p><div class='callout'><b>Missão NEXUS</b><p>Prevenir perdas, aumentar a capacidade de decisão e transformar Compliance em inteligência.</p></div>"+table(["Indicador","Resultado"],"<tr><td>Maturidade</td><td>"+maturity+"%</td></tr><tr><td>Perguntas respondidas</td><td>"+answeredCount+"/"+qlist.length+"</td></tr><tr><td>Riscos</td><td>"+riskCount+"</td></tr><tr><td>Ações</td><td>"+actionCount+"</td></tr><tr><td>Jurídico</td><td>"+legalCount+"</td></tr><tr><td>Evidências</td><td>"+evidenceCount+"</td></tr>"));
    add("Perfil da Empresa","<div class='facts'><b>Empresa<small>"+esc(company.name)+"</small></b><b>Segmento<small>"+esc(company.segment)+"</small></b><b>Porte<small>"+esc(company.size)+"</small></b><b>Localidade<small>"+esc(company.city)+"</small></b><b>Responsável<small>"+esc(company.responsible)+"</small></b><b>Diretor<small>"+esc(company.director)+"</small></b></div>");
    add("Escopo e Metodologia","<p>O diagnóstico observa a empresa como um todo: governança, integridade, operações, terceiros, tecnologia, privacidade, segurança, auditoria, documentos, continuidade, pessoas, ESG e Jurídico.</p><div class='callout'><b>Importante</b><p>Recomendações automatizadas não substituem parecer jurídico ou validação profissional.</p></div>");
    add("Frameworks e Referências",table(["Framework","Aplicabilidade"],frameworkTable));
    add("Matriz de Cobertura", "<div class='matrix'>"+["Governança","Integridade","Riscos","Terceiros","Privacidade","Segurança","Operações","Pessoas","Auditoria","Jurídico","ESG","Continuidade"].map(function(x,i){var v=Math.max(25,Math.min(100,maturity+(i%4)*5-5));return "<div><b>"+x+"</b><span>"+v+"%</span><i><em style='width:"+v+"%'></em></i></div>";}).join("")+"</div>");
    add("Diagnóstico Geral","<div class='score'>"+maturity+"%<small>Maturidade</small></div><p>O índice deve ser interpretado junto às evidências, riscos e criticidade.</p>");
    add("Matriz de Riscos",table(["ID","Risco","Área","Nível","Score","Responsável"],riskTable));
    add("Riscos e Soluções",table(["Risco","Causa","Solução","Responsável"],risks.length?risks.map(function(r,i){var a=actions[i%Math.max(actions.length,1)];return "<tr><td>"+esc(r.title)+"</td><td>"+esc(r.cause||"Validar causa")+"</td><td>"+esc(a?a.title:"Definir ação preventiva")+"</td><td>"+esc(a?a.responsible:(r.responsible||"Compliance"))+"</td></tr>";}).join(""):"<tr><td colspan='4'>Nenhum risco registrado.</td></tr>"));
    add("Plano de Ação Executivo",table(["Ação","Prioridade","Status","Responsável","Prazo"],actionTable));
    add("Evidências e Rastreabilidade",table(["Evidência","Responsável","Status"],evidenceTable));
    add("Documentos Inteligentes",table(["Documento","Área","Prioridade","Status"],docTable));
    add("Triagem Jurídica",table(["Encaminhamento","Status","Responsável","Motivo"],legalTable));
    const topics=["Governança e Conselho","Direção Executiva","Código de Ética e Conduta","Anticorrupção e Antissuborno","Conflitos de Interesses","Terceiros e Due Diligence","Compras e Suprimentos","Financeiro e Controles","Recursos Humanos","Treinamento e Cultura","Operações","Logística","Comercial e Vendas","Tecnologia e Segurança","Privacidade e Dados","Qualidade","Saúde e Segurança","Meio Ambiente","ESG e Direitos Humanos","Continuidade de Negócios","Auditoria e Monitoramento","Investigação Interna","Gestão Documental","Matriz RACI","Indicadores de Compliance","Plano de Treinamentos","Plano de Monitoramento","Plano de Remediação","Recomendações Prioritárias","Matriz de Soluções","Matriz de Risco Residual","Plano 30 / 60 / 90 Dias","Mapa de Dependências","Cenários de Perda","Prevenção Financeira","Prevenção Operacional","Prevenção Jurídica","Conclusão Executiva","Declaração de Validação","Fontes e Referências","Anexo — Questionário Completo","Controle do Documento"];
    const advancedTopics=[
      "Mapa de Obrigações e Evidências","Apetite e Tolerância a Riscos","KRIs — Indicadores de Risco","KPIs — Indicadores de Compliance","KCI — Indicadores de Controles","Heatmap Executivo","Tendência de Risco","Risco Inerente x Residual","Eficácia de Controles","Testes de Controles","Plano de Testes de Compliance","Calendário Regulatório","Mudanças Regulatórias","Obrigações Contratuais Críticas","Risco de Terceiros Críticos","Due Diligence Reforçada","Conflitos e Independência","Presentes e Hospitalidades","Patrocínios e Doações","Interações com Agentes Públicos","Fraude e Red Flags","Investigações e Preservação de Evidências","Privacidade e Incidentes","Cyber Risk","Continuidade e Recuperação","Crise e Comunicação","Cultura e Speak Up","Proteção contra Retaliação","Remediação e Eficácia","Governança de Dados"
    ];
    advancedTopics.forEach(function(t){
      add(t,"<p>Esta seção foi incluída no pacote Premium para aprofundar <b>"+esc(t)+"</b> conforme o perfil, respostas, riscos e frameworks acionados pela organização.</p><div class='three'><div><b>EXPOSIÇÃO</b><p>Identificar fontes de exposição e processos relacionados.</p></div><div><b>CONTROLE</b><p>Verificar desenho, execução, evidência e eficácia.</p></div><div><b>REMEDIAÇÃO</b><p>Definir responsável, prazo, evidência e validação.</p></div></div><div class='callout'><b>Critério NEXUS</b><p>Nenhum achado crítico deve ser encerrado apenas por declaração: deve existir evidência e validação apropriada.</p></div>");
    });
    topics.forEach(function(t){
      if(t==="Matriz RACI") add(t,"<div class='matrix'>"+["Compliance","Jurídico","Direção","RH","Financeiro","Compras","TI","Operações"].map(function(x){return "<div><b>"+x+"</b><span>R / A / C / I</span><i><em style='width:"+Math.max(30,maturity)+"%'></em></i></div>";}).join("")+"</div><p>Os papéis devem ser formalmente confirmados pela organização.</p>");
      else if(t==="Matriz de Soluções") add(t,table(["Risco","Causa","Prevenção","Ação","Evidência"],risks.length?risks.map(function(r,i){var a=actions[i%Math.max(actions.length,1)],e=evidence[i%Math.max(evidence.length,1)];return "<tr><td>"+esc(r.title)+"</td><td>"+esc(r.cause||"Validar causa")+"</td><td>Controle preventivo proporcional ao risco</td><td>"+esc(a?a.title:"Definir")+"</td><td>"+esc(e?e.name:"Definir evidência")+"</td></tr>";}).join(""):"<tr><td colspan='5'>Sem dados suficientes.</td></tr>"));
      else if(t.indexOf("Questionário")>=0) add(t,table(["#","Área","Pergunta","Resposta"],qTable));
      else add(t,"<p>Esta seção apresenta orientações, critérios de prevenção e pontos de validação relacionados a <b>"+esc(t)+"</b>, adaptados ao perfil da empresa e aos achados registrados no ciclo.</p><div class='callout'><b>Próximo passo</b><p>Priorizar os itens classificados como críticos ou altos, atribuir responsável, prazo e evidência, e validar com a área competente.</p></div>");
    });
    while(pages.length<90) add("Anexo Executivo "+(pages.length+1),"<p>Seção complementar do relatório Premium Executivo, destinada a evidências, indicadores, controles, recomendações e rastreabilidade do ciclo.</p>");
    if(pages.length>90) pages.length=90;
    const style="@page{size:A4;margin:0}*{box-sizing:border-box}body{margin:0;font-family:Arial,Helvetica,sans-serif;color:#17213c;background:#e9edf2}.page{width:100%;min-height:auto;background:#fff;margin:0 auto;padding:18mm 17mm 20mm;position:relative;overflow:visible}.page:last-child{page-break-after:auto}.page-head{display:flex;justify-content:space-between;border-bottom:2px solid #10243a;padding-bottom:8px;color:#49627d;font-size:8px;letter-spacing:.12em}h1{font-size:25px;margin:24px 0 14px;color:#0b2037}h2{font-size:24px;color:#0b2037}.lead{font-size:17px;color:#50647a}.kicker{font-size:9px;letter-spacing:.2em;color:#008fb0}.cover{padding:12mm 8mm;border:1px solid #ccd7e2;border-radius:10px;margin-top:10mm}.brandmark{width:58px;height:58px;border-radius:14px;background:#0b2037;color:#5de6ff;display:grid;place-items:center;font-size:32px;font-weight:900}.cover-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:22px 0}.cover-grid b,.facts b{background:#f2f6fa;padding:13px;border-radius:7px;font-size:9px;color:#64768a}.cover-grid strong{display:block;font-size:22px;color:#0b2037;margin-top:5px}.page p,.page li{font-size:10px;line-height:1.7}.callout{background:#edf8fb;border-left:4px solid #00a6c7;padding:13px;margin:14px 0}.facts{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:14px 0}.facts small{display:block;font-size:13px;color:#0b2037;margin-top:6px}table{width:100%;border-collapse:collapse;margin-top:12px;font-size:8px}th{background:#0b2037;color:#fff}th,td{border:1px solid #d4dce5;padding:7px;vertical-align:top}tr:nth-child(even){background:#f7f9fb}.score{width:140px;height:140px;border-radius:50%;border:14px solid #dceff4;display:grid;place-items:center;align-content:center;font-size:34px;font-weight:800;color:#0b2037;margin:25px auto}.score small{font-size:8px;font-weight:400;color:#64768a}.matrix{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}.matrix div{padding:11px;border:1px solid #d6e0e8;border-radius:7px}.matrix b,.matrix span{display:block}.matrix span{font-size:17px;font-weight:bold;margin:5px 0}.matrix i{height:5px;background:#e7edf2;display:block}.matrix em{display:block;height:100%;background:#00a6c7}.page-foot{position:absolute;bottom:8mm;left:17mm;right:17mm;border-top:1px solid #e0e5ea;padding-top:5px;font-size:7px;color:#8493a3;text-align:right}@media print{body{background:#fff}.page{margin:0;box-shadow:none;width:100%;min-height:auto}}";
    w.document.write("<!doctype html><html><head><meta charset='utf-8'><title>NEXUS — Relatório Premium Executivo</title><style>"+style+"</style></head><body>"+pages.join("")+"</body></html>");
    w.document.close();
  }

  function exportBackup(){
    const blob=new Blob([JSON.stringify(s,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;
    a.download=`nexus-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify("Backup NEXUS exportado.");
  }
  function restoreBackup(file){
    if(!file) return;
    const reader=new FileReader();
    reader.onload=()=>{
      try{
        const imported=JSON.parse(String(reader.result||""));
        if(!imported || typeof imported!=="object" || !imported.company || !imported.workflow) throw new Error("Formato de backup inválido.");
        setS({...fresh(),...imported,globalProfile:{...fresh().globalProfile,...(imported.globalProfile||{})}});
        notify("Backup restaurado com sucesso.");
      }catch(err){notify(String(err.message||"Não foi possível restaurar o backup."));}
    };
    reader.readAsText(file);
  }
  function resetWorkspace(){
    if(!window.confirm("Isso apagará os dados deste navegador. O backup externo não será alterado. Continuar?")) return;
    const ns=fresh();
    setS(ns);
    setPage("empresa");
    try{localStorage.setItem(KEY,JSON.stringify(ns));}catch{}
    notify("Workspace local reiniciado.");
  }

  const nav=[["dashboard","⌂","Dashboard"],["global","◎","Global Compliance"],["empresa","▣","Empresa"],...steps.slice(1).map(([k,l],i)=>[k,["◈","☑","△","✓","📎","§","▤"][i],l]),["documentos","▤","Documentos Inteligentes"],["standards","◌","Atualizações & Frameworks"],["producao","⌘","Operação Empresarial"],["matriz-filosofica","◉","Matriz Filosófica"],["denuncias","⚑","Canal de Denúncias"]];

  const enterExperience=()=>{ try { sessionStorage.setItem("nexus-entry-v119","1"); } catch {} setS(prev=>({...prev,firstAccess:false,history:[...(prev.history||[]),{id:uid("LOG"),text:"Experiência inteligente iniciada.",date:now()}]})); setPage("empresa"); setShowEntry(false); };
  const enterDemo=()=>{ try { sessionStorage.setItem("nexus-entry-v119","1"); } catch {} const demo={name:"Empresa Demo NEXUS",document:"TESTE-0001",segment:"Supermercados / Varejo",size:"Média empresa",city:"São Paulo / SP",mode:"SaaS + Assessoria",responsible:"Usuário Teste",director:"Diretor Demo"}; setS(prev=>({...prev,firstAccess:false,company:demo,workflow:{...prev.workflow,empresa:true},history:[...(prev.history||[]),{id:uid("LOG"),text:"Ambiente DEMO iniciado.",date:now()}]})); setPage("diagnostico"); setShowEntry(false); };
  if (showEntry) return <FirstAccess onStart={enterExperience} onDemo={enterDemo}/>;

  return <div className="app">
    <aside>
      <div className="brand"><b>N</b><div><strong>NEXUS</strong><small>COMPLIANCE ONE · V124</small></div></div>
      <div className="company"><small>EMPRESA ATIVA</small><strong>{s.company.name||"Novo projeto"}</strong><span>{s.company.segment||"Aguardando cadastro"}</span></div>
      <nav>{nav.map(([k,ic,l])=><button key={k} className={page===k?"active":""} onClick={()=>go(k)}><i>{ic}</i><span>{l}</span>{s.workflow[k]&&<em>✓</em>}</button>)}</nav>
      <div className="engine">● NEXUS INTELLIGENCE ENGINE <b>ONLINE</b></div>
    </aside>

    <main className="nexus-main">
      <header><div><small>NEXUS / INTELLIGENCE CENTER / {page.toUpperCase()}</small><strong>{nav.find(x=>x[0]===page)?.[2]||"Command Center"}</strong></div>
        <div className="top-actions">
          <button onClick={()=>setModal("company")}>✎ Editar empresa</button>
          <button onClick={exportBackup}>↓ Backup</button>
          <label className="top-file">↑ Restaurar<input hidden type="file" accept="application/json,.json" onChange={e=>restoreBackup(e.target.files?.[0])}/></label>
          <button onClick={resetWorkspace}>↺ Reiniciar</button>
          {apiUser
            ? <button onClick={disconnectApi}>● API V124 · {apiUser.role}</button>
            : <button onClick={()=>setModal("auth")}>⇄ Conectar API</button>}
          <span>{apiUser?(apiSyncing?"● Sincronizando":apiSyncError?"⚠ Falha ao salvar na API":"● API conectada"):"● Modo local"}</span>
        </div>
      </header>

      <div className="content">
        <div className="steps">{steps.map(([k,l],i)=><button key={k} className={`${page===k?"current ":""}${s.workflow[k]?"done":""}`} onClick={()=>go(k)}><b>{s.workflow[k]?"✓":i+1}</b><span>{l}</span></button>)}</div>

        {page==="dashboard" && <Dashboard s={s} maturity={maturity} progress={progress} stats={stats} go={go}/>}
        {page==="global" && <GlobalCompliance s={s} setS={setS} analysis={frameworkAnalysis()} notify={notify}/>}{page==="empresa" && <CompanyPage s={s} open={()=>setModal("company")} />}
        {page==="diagnostico" && <Diagnosis s={s} maturity={maturity} finish={finish}/>}
        {page==="questionario" && <Questionnaire s={s} questions={questions} answered={answered} answer={answer} finish={finish}/>}
        {page==="riscos" && <AutoRisks s={s} stats={stats} confirm={confirmRisks} finish={finish} select={x=>setDetail({type:"risk",item:x})}/>}
        {page==="acoes" && <AutoActions s={s} confirm={confirmActions} finish={finish}/>}
        {page==="evidencias" && <Evidence s={s} attach={attach} finish={finish}/>}
        {page==="juridico" && <AutoLegal s={s} confirm={confirmLegal} finish={finish}/>}
        {page==="matriz-filosofica" && <PhilosophyMatrix s={s} openDocument={d=>setDetail({type:"document",item:d})} />}
        {page==="documentos" && <DocumentCenter s={s} generate={generateDocuments} openDocument={d=>setDetail({type:"document",item:d})} />}{page==="standards" && <StandardsCenter s={s} analysis={frameworkAnalysis()} notify={notify}/>}{page==="producao" && <ProductionCenter s={s} setS={setS} notify={notify}/>} 
        {page==="relatorio" && <Report s={s} maturity={maturity} progress={progress} print={printReport} setS={setS} framework={frameworkAnalysis()}/>}
        {page==="denuncias" && <Denunciations s={s} open={()=>setModal("den")} select={x=>setDetail({type:"den",item:x})}/>}
      </div>
    </main>

    {modal==="auth" && <AuthModal close={()=>setModal(null)} onLogin={handleApiLogin} onBootstrap={handleApiBootstrap}/>}
    {modal==="company" && <CompanyModal close={()=>setModal(null)} save={saveCompany} current={s.company}/>}
    {modal==="den" && <DenModal close={()=>setModal(null)} save={d=>{
      const protocol=`DEN-${new Date().getFullYear()}-${String(Date.now()).slice(-8)}`;
      const x={...d,id:protocol,protocol,status:"Recebida",created:now(),history:[{id:uid("H"),text:"Denúncia recebida.",date:now()}]};
      commit({...s,denunciations:[x,...s.denunciations]},`Protocolo ${protocol} criado.`);setModal(null);run("Registrando protocolo seguro",()=>setDetail({type:"den",item:x}));
    }}/>}
    {detail && <Detail detail={detail} s={s} setS={setS} close={()=>setDetail(null)} attach={attach}/>}
    {busy && <div className="loading"><div className="loading-card"><div className="orb"><b>{busy.p}%</b><small>PROCESSANDO</small></div><h2>{busy.text}</h2><p>Gerando, analisando e registrando automaticamente.</p><div className="bar"><i style={{width:busy.p+"%"}}/></div></div></div>}
    {toast && <div className="toast">✓ {toast}</div>}
  </div>;
}

function Panel({title,sub,children}){return <section className="panel"><div className="panel-head"><div><h2>{title}</h2><p>{sub}</p></div></div>{children}</section>}
function Metric({title,value,sub,tone=""}){return <div className={"metric "+tone}><small>{title}</small><b>{value}</b><span>{sub}</span></div>}
function Advance({title,text,onClick,disabled=false,label="Avançar →"}){return <div className="advance"><div><b>{title}</b><span>{text}</span></div><button className="primary" disabled={disabled} onClick={onClick}>{disabled?"Aguardando confirmação":label}</button></div>}

function FirstAccess({onStart,onDemo}){
  const [boot,setBoot]=useState(false),[stage,setStage]=useState(0);
  useEffect(()=>{if(!boot)return;const t=setInterval(()=>setStage(x=>Math.min(4,x+1)),130);return()=>clearInterval(t)},[boot]);
  const lines=["Inicializando Intelligence Core","Mapeando arquitetura de Compliance","Preparando Risk Engine","Preparando Legal Intelligence","Ambiente pronto"];
  return <div className={"ai-entry "+(boot?"booting":"")}>
    <div className="ai-stars"/><div className="ai-grid-floor"/><div className="ai-vignette"/>
    <div className="ai-top"><span><i/> NEXUS INTELLIGENCE</span><small>SECURE ENVIRONMENT · ONLINE</small></div>
    <div className="ai-center"><div className="ai-core"><div className="core-scan"/><b>N</b><span>AI</span></div><div className="ai-orbit a"/><div className="ai-orbit b"/><div className="ai-orbit c"/>
      <div className="ai-node n1">RISK<br/><b>ENGINE</b></div><div className="ai-node n2">LEGAL<br/><b>CORE</b></div><div className="ai-node n3">DATA<br/><b>INTELLIGENCE</b></div>
    </div>
    <div className="ai-copy"><div className="ai-kicker"><span/> SISTEMA INTELIGENTE DE GOVERNANÇA</div>
      <h1>Compliance.<br/><em>Elevado pela inteligência.</em></h1>
      <p>Uma experiência clean e tecnológica para diagnosticar a empresa, antecipar riscos e conduzir todo o processo até a conclusão.</p>
      {!boot?<div className="ai-actions"><button className="ai-start" onClick={()=>{setBoot(true);setTimeout(onStart,650)}}>INICIAR EXPERIÊNCIA <b>→</b></button><button className="ai-demo" onClick={onDemo}>Acessar ambiente DEMO</button><button className="ai-skip" onClick={onStart}>Entrar no sistema</button></div>:
      <div className="ai-boot"><div className="bootbar"><i style={{width:(stage+1)*20+"%"}}/></div>{lines.map((x,i)=><div className={"bootline "+(i<=stage?"on":"")} key={x}><span>{i<=stage?"✓":"○"}</span>{x}</div>)}</div>}
      <div className="ai-caps">{["IA & ANALYTICS","RISK ENGINE","LEGAL INTELLIGENCE","EXECUTIVE REPORT"].map(x=><span key={x}>● {x}</span>)}</div>
    </div>
    <div className="ai-bottom"><span>ENCRYPTED WORKSPACE</span><span>REAL-TIME AUDIT TRAIL</span><span>VERSION 124 · PREMIUM ENTERPRISE CORE</span></div>
  </div>
}

function NexusPremiumOverview({s,maturity,progress,stats,go}){
  const risks=Array.isArray(s.risks)?s.risks:[];
  const actions=Array.isArray(s.actions)?s.actions:[];
  const legal=Array.isArray(s.legal)?s.legal:[];
  const evidence=Array.isArray(s.evidence)?s.evidence:[];
  const critical=stats.Crítico||0;
  const high=stats.Alto||0;
  const medium=stats.Médio||0;
  const low=stats.Baixo||0;
  const exposure=Math.min(100,critical*18+high*10+medium*5+low*2);
  const actionDone=actions.length?Math.round(actions.filter(a=>/(conclu|encerr|final)/i.test(String(a.status||""))).length/actions.length*100):0;
  const legalReady=legal.length?Math.round(legal.filter(x=>/(conclu|encerr|confirm)/i.test(String(x.status||""))).length/legal.length*100):100;
  const evidenceScore=Math.min(100,evidence.length*12);
  const health=Math.max(0,Math.min(100,Math.round(maturity*0.5+(100-exposure)*0.2+actionDone*0.12+legalReady*0.08+evidenceScore*0.1)));
  const recommendation=critical>0
    ? `Atenção imediata: ${critical} risco(s) crítico(s). O próximo melhor passo é revisar tratamento, responsável e evidência.`
    : high>0
    ? `O motor identificou ${high} risco(s) alto(s). Priorize controles preventivos e planos com prazo verificável.`
    : !s.company.name
    ? "Cadastre a empresa para ativar a inteligência contextual e adaptar o diagnóstico ao seu perfil."
    : !Object.keys(s.answers||{}).length
    ? "O contexto está pronto. Inicie o diagnóstico para ativar Risk Engine, Legal Intelligence e recomendações automáticas."
    : "O ambiente está estável. Use a revisão executiva para transformar os sinais atuais em decisões e evidências.";
  const bars=[maturity,Math.max(0,100-exposure),actionDone,legalReady,evidenceScore];
  const labels=["Maturidade","Exposição controlada","Execução","Jurídico","Evidências"];
  const history=(s.history||[]).slice(-8).map((x,i)=>25+((i*17+(x.text||"").length*3)%55));
  const points=history.map((v,i)=>`${i*(100/Math.max(1,history.length-1))},${100-v}`).join(" ");
  return <section className="premium-command">
    <div className="premium-command-bg"/>
    <div className="premium-topbar">
      <div><span className="premium-kicker"><i/> NEXUS INTELLIGENCE · COMMAND CENTER</span><h1>{s.company.name?`Olá, ${s.company.name}.`:`Seu Compliance, em tempo real.`}</h1><p>Uma camada executiva que transforma dados, riscos, ações, evidências e sinais jurídicos em decisões práticas.</p></div>
      <div className="premium-live"><span/><b>CORE ONLINE</b><small>V124 · ENTERPRISE</small></div>
    </div>
    <div className="premium-grid">
      <div className="premium-health">
        <div className="premium-health-head"><div><small>COMPLIANCE HEALTH SCORE</small><strong>{health}<em>/100</em></strong><span>{health>=80?"Ambiente saudável":health>=60?"Atenção recomendada":"Intervenção prioritária"}</span></div><div className="health-ring" style={{"--score":`${health}%`}}><b>{health}%</b><small>HEALTH</small></div></div>
        <div className="premium-bars">{bars.map((v,i)=><div key={labels[i]}><span>{labels[i]}</span><b>{v}%</b><i><em style={{width:`${v}%`}}/></i></div>)}</div>
        <div className="premium-spark"><div><small>AUDIT MOMENTUM</small><span>atividade registrada</span></div><svg viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true"><polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.8" vectorEffect="non-scaling-stroke"/><polyline points={`0,40 ${points} 100,40`} fill="currentColor" opacity=".08"/></svg></div>
      </div>
      <div className="premium-ai">
        <div className="premium-ai-head"><span className="ai-chip">✦ AI CORE</span><span className="ai-pulse">● LIVE</span></div>
        <div className="premium-ai-orb"><span>✦</span><i/><i/><i/></div>
        <small>RECOMENDAÇÃO INTELIGENTE</small><h2>O NEXUS está observando o ciclo.</h2><p>{recommendation}</p>
        <div className="premium-ai-actions"><button className="primary" onClick={()=>go?.(critical?"riscos":s.company.name?"diagnostico":"empresa")}>{critical?"Tratar prioridade":"Continuar jornada"} →</button><button className="ghost" onClick={()=>go?.("relatorio")}>Visão executiva</button></div>
      </div>
    </div>
    <div className="premium-kpis">
      <button onClick={()=>go?.("riscos")}><span className="pk-icon risk">◆</span><small>EXPOSIÇÃO</small><strong>{risks.length}</strong><em>{critical} críticos · {high} altos</em></button>
      <button onClick={()=>go?.("acoes")}><span className="pk-icon action">✓</span><small>EXECUÇÃO</small><strong>{actionDone}%</strong><em>{actions.length} ações no ciclo</em></button>
      <button onClick={()=>go?.("juridico")}><span className="pk-icon legal">§</span><small>LEGAL INTELLIGENCE</small><strong>{legalReady}%</strong><em>{legal.length} itens analisados</em></button>
      <button onClick={()=>go?.("evidencias")}><span className="pk-icon evidence">▦</span><small>EVIDÊNCIAS</small><strong>{evidence.length}</strong><em>rastreabilidade registrada</em></button>
    </div>
    <div className="premium-bottom">
      <div className="premium-heat"><div className="premium-section-title"><div><small>RISK ENGINE</small><h3>Mapa de exposição</h3></div><button onClick={()=>go?.("riscos")}>Abrir matriz →</button></div><div className="risk-heat-strip">{[["Crítico",critical,"critical"],["Alto",high,"high"],["Médio",medium,"medium"],["Baixo",low,"low"]].map(([name,value,tone])=><div key={name} className={tone}><b>{value}</b><span>{name}</span><i style={{width:`${Math.min(100,value*20)}%`}}/></div>)}</div></div>
      <div className="premium-automation"><div className="premium-section-title"><div><small>AUTOMATION FABRIC</small><h3>O sistema trabalha por você</h3></div><span>ACTIVE</span></div><div className="automation-flow"><span>Dados</span><b>→</b><span>IA</span><b>→</b><span>Risco</span><b>→</b><span>Ação</span><b>→</b><span>Evidência</span></div><p>Respostas alimentam automaticamente análises, prioridades e trilhas. Cada decisão pode voltar para a evidência e para o relatório.</p></div>
    </div>
  </section>
}

function Dashboard({s,maturity,progress,stats,go}){
  const hasCompany=!!s.company.name;
  return <div className="command-center">
    <NexusV125CommandCenter s={s} maturity={maturity} progress={progress} stats={stats} go={go}/>
    <NexusAICommandCenter s={s} maturity={maturity} progress={progress} stats={stats} go={go}/>
    <NexusDecisionEngine s={s} maturity={maturity} go={go}/>
    <NexusPredictiveIntelligence s={s} maturity={maturity} go={go}/>
    <NexusComplianceDNA s={s} maturity={maturity} go={go}/>
    <NexusCommandGraph s={s} go={go}/>
    <NexusExecutiveIntelligence s={s} maturity={maturity} go={go}/>
    <NexusAutonomousActionCenter s={s} go={go}/>
      <NexusPremiumOverview s={s} maturity={maturity} progress={progress} stats={stats} go={go}/>
      <NexusExecutiveRadar s={s} go={go}/>
      <NexusAICore s={s} go={go}/>
      <NexusAdaptiveEngine s={s} go={go}/>
      <NexusComplianceOrchestrator s={s} go={go}/>
      <NexusIntelligenceEngine s={s} go={go}/>
      <NexusEnterprisePanel s={s} setPage={go}/>
    <div className="command-hero">
      <div className="hero-glow glow-a"></div><div className="hero-glow glow-b"></div>
      <div className="hero-copy">
        <div className="eyebrow-line"><span className="pulse-dot"></span> NEXUS INTELLIGENCE CORE · ONLINE</div>
        <h1>{hasCompany?`Olá, ${s.company.name}.`:"Bem-vindo ao NEXUS."}</h1>
        <p>{hasCompany
          ?"Seu centro de comando de Compliance está pronto. O sistema conduz o diagnóstico, identifica riscos, recomenda ações e consolida o relatório executivo."
          :"Uma nova geração de Compliance começa aqui. Cadastre a empresa e deixe o NEXUS conduzir o processo inteligente, etapa por etapa."}</p>
        <div className="command-actions">
          <button className="primary command-primary" onClick={()=>go(hasCompany?"diagnostico":"empresa")}>
            <span className="btn-orbit">✦</span>{hasCompany?"Continuar Compliance":"Iniciar Compliance Inteligente"} <b>→</b>
          </button>
          {hasCompany&&<button className="ghost" onClick={()=>go("empresa")}>✎ Editar empresa</button>}
        </div>
      </div>
      <div className="core-visual">
        <div className="core-ring ring-one"></div><div className="core-ring ring-two"></div><div className="core-ring ring-three"></div>
        <div className="core-center"><b>{maturity}%</b><small>MATURIDADE</small></div>
        <span className="node node-1">RISK</span><span className="node node-2">AI</span><span className="node node-3">LEGAL</span>
      </div>
    </div>

    <div className="command-grid">
      <button className="command-card featured" onClick={()=>go(hasCompany?"diagnostico":"empresa")}><div className="card-icon">◈</div><div><small>JORNADA PRINCIPAL</small><h3>{hasCompany?"Continuar diagnóstico":"Novo Compliance"}</h3><p>Fluxo inteligente e guiado.</p></div><b>→</b></button>
      <button className="command-card" onClick={()=>go("riscos")}><div className="card-icon danger">△</div><div><small>INTELLIGENCE</small><h3>Central de Riscos</h3><p>{stats.total} riscos identificados.</p></div><b>→</b></button>
      <button className="command-card" onClick={()=>go("juridico")}><div className="card-icon legal">§</div><div><small>LEGAL CORE</small><h3>Núcleo Jurídico</h3><p>{s.legal.length} triagens pendentes.</p></div><b>→</b></button>
      <button className="command-card" onClick={()=>go("denuncias")}><div className="card-icon secure">⚑</div><div><small>SECURE CHANNEL</small><h3>Canal de Denúncias</h3><p>Ambiente independente.</p></div><b>→</b></button>
    </div>

    <div className="command-section-head"><div><small>EXECUTIVE MONITOR</small><h2>Visão geral</h2></div><span>{progress}% do ciclo concluído</span></div>
    <div className="command-kpis">
      <div className="kpi-card"><small>MATURIDADE</small><strong>{maturity}%</strong><div className="mini-track"><i style={{width:maturity+"%"}}></i></div><span>Índice estimado</span></div>
      <div className="kpi-card risk-kpi"><small>EXPOSIÇÃO</small><strong>{stats.total}</strong><span>{stats.Crítico} críticos · {stats.Alto} altos</span><div className="risk-dots"><i></i><i></i><i></i><i></i></div></div>
      <div className="kpi-card"><small>AÇÕES</small><strong>{s.actions.length}</strong><span>geradas pelo sistema</span><div className="mini-track"><i style={{width:Math.min(100,s.actions.length*8)+"%"}}></i></div></div>
      <div className="kpi-card"><small>EVIDÊNCIAS</small><strong>{s.evidence.length}</strong><span>documentos registrados</span><div className="mini-track"><i style={{width:Math.min(100,s.evidence.length*12)+"%"}}></i></div></div>
    </div>

    <div className="command-lower">
      <section className="activity-panel"><div className="section-title"><div><small>AUDIT STREAM</small><h3>Atividade recente</h3></div><span>LIVE</span></div>
        {s.history.slice(-6).reverse().map((h,i)=><div className="activity-line" key={h.id}><i className={i===0?"live":""}></i><div><b>{h.text}</b><small>{h.date}</small></div></div>)}
      </section>
      <section className="readiness-panel"><div className="section-title"><div><small>COMPLIANCE READINESS</small><h3>Status do processo</h3></div></div>
        {[["Cadastro da empresa",s.workflow.empresa],["Diagnóstico",s.workflow.diagnostico],["Questionário",s.workflow.questionario],["Matriz de riscos",s.workflow.riscos],["Plano de ação",s.workflow.acoes],["Jurídico",s.workflow.juridico],["Relatório final",s.workflow.relatorio]].map(([x,ok])=><div className="readiness-line" key={x}><span>{x}</span><b className={ok?"ok":""}>{ok?"✓":"○"}</b></div>)}
      </section>
    </div>
  </div>
}

function DocumentCenter({s,generate,openDocument}){
  const docs=Array.isArray(s.documents)?s.documents:[];
  const [filter,setFilter]=useState("Todos");
  const areas=["Todos",...Array.from(new Set(docs.map(d=>d.area).filter(Boolean)))];
  const list=filter==="Todos"?docs:docs.filter(d=>d.area===filter);
  return <section className="module-page">
    <div className="module-hero">
      <div><span className="module-kicker">DOCUMENT INTELLIGENCE · NEXUS</span><h1>Documentos Inteligentes</h1><p>Documentos originais gerados dentro do NEXUS, contextualizados para a empresa e prontos para revisar, editar e imprimir sem depender de outro aplicativo.</p></div>
      <button className="primary" type="button" onClick={generate}>✦ GERAR DOCUMENTOS</button>
    </div>
    <div className="module-toolbar"><div><b>{docs.length}</b><span> documentos</span></div><div className="module-filters">{areas.map(a=><button type="button" className={filter===a?"active":""} key={a} onClick={()=>setFilter(a)}>{a}</button>)}</div></div>
    {docs.length===0
      ? <div className="module-empty"><div className="empty-orb">▤</div><h2>Biblioteca pronta para ser criada</h2><p>O NEXUS gera o documento, estrutura conteúdo, registra a revisão jurídica e permite impressão direta.</p><button className="primary" type="button" onClick={generate}>GERAR BIBLIOTECA AGORA</button></div>
      : <div className="doc-grid">{list.map(d=><article className="doc-card clickable-doc" key={d.id} onClick={()=>openDocument(d)}><div className="doc-top"><span>{d.area}</span><b>{d.priority}</b></div><h3>{d.name}</h3><p>{d.description}</p><div className="doc-status">● {d.status||"Rascunho para análise jurídica"}</div><div className="doc-foot"><small>v{d.version||"1.0"}</small><strong>↗ ABRIR / IMPRIMIR</strong></div></article>)}</div>}
    <div className="module-sources"><h2>Fontes de referência</h2>{SOURCE_LIBRARY.map(x=><div className="source-row" key={x[0]}><div><b>{x[0]}</b><span>{x[1]}</span>{x[3]&&<a href={x[3]} target="_blank" rel="noreferrer">Fonte oficial ↗</a>}</div><small>{x[2]}</small></div>)}</div>
  </section>
}

function PhilosophyMatrix({openDocument}){
  return <section className="module-page">
    <div className="module-hero"><div><span className="module-kicker">THINKING ENGINE · NEXUS</span><h1>Matriz Filosófica</h1><p>Lentes de reflexão para apoiar ética, cultura, governança, prevenção e responsabilidade. Clique em uma lente para abrir o documento e imprimir.</p></div><button className="primary" type="button" onClick={()=>openDocument({id:"PHI-GERAL",name:"Matriz Filosófica — NEXUS",area:"Matriz Filosófica",priority:"Média",description:"Documento consolidado das lentes filosóficas.",content:{title:"Matriz Filosófica — NEXUS",purpose:"Lentes de reflexão para decisões de integridade.",sections:PHILOSOPHY_LENSES.map(x=>({title:x[0]+" · "+x[3],body:x[1]+". "+x[2]})),disclaimer:"Ferramenta original NEXUS; não substitui legislação ou parecer jurídico.",sources:[]}})}>🖨 Abrir matriz completa</button></div>
    <div className="philosophy-grid">{PHILOSOPHY_LENSES.map(x=><article key={x[0]} onClick={()=>openDocument({id:"PHI-"+x[0],name:"Matriz Filosófica — "+x[0],area:"Matriz Filosófica",priority:"Média",description:x[2],content:{title:"Matriz Filosófica — "+x[0],purpose:x[2],sections:[{title:"Princípio",body:x[1]},{title:"Aplicação NEXUS",body:`Aplicar a lente ${x[0]} em ${x[3]} como ferramenta de reflexão, prevenção e governança. Esta lente não substitui normas ou parecer jurídico.`},{title:"Perguntas de reflexão",body:"Qual decisão está sendo tomada? Quem responde por ela? Que evidência existe? Qual risco pode ser antecipado? Que consequência precisa ser evitada?"},{title:"Registro",body:"Registrar decisão, responsável, evidência e revisão."}],disclaimer:"Matriz filosófica original NEXUS; ferramenta de reflexão e governança.",sources:[]}})}><span>{x[3]}</span><div className="phi-mark">{x[0][0]}</div><h3>{x[0]}</h3><b>{x[1]}</b><p>{x[2]}</p><small>↗ Abrir documento e imprimir</small></article>)}</div>
    <div className="nexus-principles">{[["ANTECIPAR","Identificar vulnerabilidades antes do evento."],["EVIDENCIAR","Nenhum controle crítico sem evidência."],["RESPONSABILIZAR","Todo risco relevante possui responsável."],["ESCALONAR","Potencial jurídico segue ao Jurídico."],["REMEDIAR","Ação termina com comprovação e validação."],["APRENDER","Achados alimentam novas análises."]].map(x=><div key={x[0]}><b>{x[0]}</b><span>{x[1]}</span></div>)}</div>
  </section>
}

function GlobalCompliance({s,setS,analysis,notify}){
  const gp=s.globalProfile||{jurisdictions:["BR"],multinational:false,publicSector:false,publicAgents:false,personalDataEU:false,largeOrMultinational:false,exportMarkets:[]};
  const toggleJur=k=>setS(prev=>({...prev,globalProfile:{...gp,jurisdictions:gp.jurisdictions.includes(k)?gp.jurisdictions.filter(x=>x!==k):[...gp.jurisdictions,k]}}));
  const setFlag=(k,v)=>setS(prev=>({...prev,globalProfile:{...gp,[k]:v}}));
  const jurisdictions=[["BR","🇧🇷 Brasil"],["US","🇺🇸 Estados Unidos"],["UK","🇬🇧 Reino Unido"],["EU","🇪🇺 União Europeia"],["CA","🇨🇦 Canadá"],["AU","🇦🇺 Austrália"]];
  return <div className="page">
    <div className="global-hero"><div><small>GLOBAL COMPLIANCE ENGINE · V124</small><h1>Mapa Global de Aplicabilidade</h1><p>O NEXUS cruza jurisdição, porte, setor, exposição e operação para recomendar camadas de Compliance. Ele sinaliza aplicabilidade; não substitui parecer jurídico local.</p></div><div className="global-score"><b>{analysis.score}</b><span>Índice de cobertura inicial</span></div></div>
    <Panel title="1 · Onde a empresa opera?" sub="Selecione as jurisdições relevantes para sede, filiais, clientes, fornecedores, dados ou operações.">
      <div className="jurisdiction-grid">{jurisdictions.map(([k,l])=><button key={k} className={gp.jurisdictions.includes(k)?"selected":""} onClick={()=>toggleJur(k)}>{l}<span>{gp.jurisdictions.includes(k)?"✓":"+"}</span></button>)}</div>
      <div className="global-switches">
        {[["multinational","Empresa multinacional / grupo"],["publicSector","Gestão pública / entidade pública"],["publicAgents","Interação com agentes públicos"],["personalDataEU","Tratamento de dados com exposição à UE"]].map(([k,l])=><label key={k}><input type="checkbox" checked={!!gp[k]} onChange={e=>setFlag(k,e.target.checked)}/><span>{l}</span></label>)}
      </div>
    </Panel>
    <Panel title="2 · Frameworks recomendados" sub={`${analysis.selected.length} camadas identificadas automaticamente`}>
      <div className="framework-grid">{analysis.selected.map(f=><article key={f.id}><div><span>{f.region}</span><b>{f.status}</b></div><h3>{f.name}</h3><small>{f.area} · {f.tier}</small><p>{f.desc}</p></article>)}</div>
    </Panel>
    <Panel title="3 · Pacote setorial" sub={`${s.company.segment||"Setor não definido"} · ${analysis.packs.length} domínios de risco`}>
      <div className="pack-chips">{analysis.packs.map(p=><span key={p}>◈ {p}</span>)}</div>
    </Panel>
    <Panel title="4 · Alertas inteligentes" sub="O NEXUS não transforma automaticamente um alerta em conclusão jurídica.">
      <div className="global-alerts">{analysis.alerts.length?analysis.alerts.map((a,i)=><div key={i}>⚠ <span>{a}</span></div>):<div className="empty">Nenhum alerta adicional identificado no perfil atual.</div>}</div>
    </Panel>
  </div>
}
function CompanyPage({s,open}){return <div className="page"><Panel title="Cadastro inteligente da empresa" sub="O perfil pode ser revisado a qualquer momento. Alterações importantes exigem uma nova análise para evitar inconsistências.">{s.company.name?<><div className="company-toolbar"><div><b>{s.company.name}</b><span>Perfil ativo · {s.company.segment} · {s.company.size}</span></div><button className="primary" onClick={open}>✎ Editar empresa</button></div><div className="grid-info">{Object.entries(s.company).filter(([k])=>k!=="responsible"&&k!=="director").map(([k,v])=><div key={k}><small>{k}</small><b>{v||"—"}</b></div>)}</div><div className="chips">{AREAS.map(a=><span key={a}>{a}</span>)}</div><div className="auto-note">✓ Perfil setorial carregado automaticamente. Você pode editar a empresa sem perder o histórico; ao mudar segmento ou porte, o NEXUS solicitará uma nova análise do questionário e das matrizes.</div></>:<div className="empty"><h3>Cadastre a empresa para iniciar.</h3><button className="primary" onClick={open}>+ Cadastrar empresa</button></div>}</Panel></div>}

function Diagnosis({s,maturity,finish}){return <div className="page"><div className="hero compact"><div><small>NEXUS DIAGNOSTIC ENGINE</small><h1>Diagnóstico de maturidade</h1><p>{s.company.segment} · {s.company.size}</p></div><div className="orb"><b>{maturity}%</b><small>estimativa inicial</small></div></div><Panel title="O que será automatizado" sub="Você não precisará montar manualmente a matriz ou o plano de ação."><div className="auto-grid">{["Questionário setorial","Matriz automática","Causas prováveis","Recomendações","Plano de ação","Triagem jurídica","Relatório executivo"].map(x=><div key={x}><b>✓</b><span>{x}</span></div>)}</div></Panel><Advance title="Etapa 1 · Diagnóstico" text="Perfil carregado. Avance para responder o questionário inteligente." onClick={finish}/></div>}

function Questionnaire({s,questions,answered,answer,finish}){
  const firstUnanswered=(()=>{const n=questions.findIndex(q=>!Object.prototype.hasOwnProperty.call(s.answers,q.id));return n<0?Math.max(0,questions.length-1):n})();
  const answeredByArea=useMemo(()=>{const counts=new Map();for(const question of questions){if(Object.prototype.hasOwnProperty.call(s.answers,question.id))counts.set(question.area,(counts.get(question.area)||0)+1)}return counts},[questions,s.answers]);
  const [index,setIndex]=useState(firstUnanswered);
  useEffect(()=>setIndex(firstUnanswered),[s.company.segment]);

  const areas=useMemo(()=>[...new Set(questions.map(item=>item.area))],[questions]);
  const q=questions[Math.min(index,questions.length-1)];
  const value=q ? s.answers[q.id] : null;
  const isLast=index>=questions.length-1;
  const completed=answered===questions.length;
  const pct=Math.round(answered/Math.max(1,questions.length)*100);

  function choose(v){
    answer(q.id,v);
    if(index<questions.length-1){
      setTimeout(()=>setIndex(i=>Math.min(i+1,questions.length-1)),140);
    }
  }
  function previous(){
    if(index>0) setIndex(i=>i-1);
  }

  return <div className="page questionnaire-page">
    <div className="questionnaire-hero">
      <div>
        <small>NEXUS · DIAGNÓSTICO ADAPTATIVO</small>
        <h1>Vamos conhecer a empresa inteira.</h1>
        <p>{s.company.name||"Empresa"} · {s.company.segment||"Setor"} · {s.company.size||"Porte"} · perguntas adaptadas ao perfil e às áreas da organização.</p>
      </div>
      <div className="q-progress-ring"><b>{pct}%</b><small>{answered}/{questions.length}</small></div>
    </div>

    <div className="q-linear"><i style={{width:pct+"%"}}/></div>

    <div className="q-area-toolbar" style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",margin:"20px 0",padding:"16px",background:"rgba(12,29,49,.9)",border:"1px solid #27445e",borderRadius:16}}>
      <label htmlFor="diagnostic-area" style={{fontWeight:700}}>Área de avaliação</label>
      <select id="diagnostic-area" value={q?.area||""} onChange={e=>{const next=questions.findIndex(item=>item.area===e.target.value);if(next>=0)setIndex(next)}} style={{minWidth:240,maxWidth:"100%",padding:12,borderRadius:10,background:"#10253c",color:"#fff",border:"1px solid #35526d"}}>
        {areas.map(area=><option key={area} value={area}>{area} ({answeredByArea.get(area)||0}/25)</option>)}
      </select>
      <span style={{color:"#9db5ce"}}>32 áreas · 25 verificações por área · 800 perguntas por ramo</span>
      <button className="secondary" onClick={()=>setIndex(firstUnanswered)}>Continuar de onde parei</button>
    </div>
    {q && <section className="single-question-card" key={q.id}>
      <div className="q-meta"><span>PERGUNTA {index+1} DE {questions.length}</span><b>{q.area}</b></div>
      <div className="q-number">{String(index+1).padStart(2,"0")}</div>
      <h2>{q.text}</h2>
      <p className="q-hint">{q.evidenceHint||"Selecione uma resposta."} Responda com base em evidências verificáveis; N/A deve ser justificado na revisão.</p>
      <div className="q-options">
        {["Sim","Parcialmente","Não","N/A"].map(v=>
          <button className={value===v?"q-option selected":"q-option"} key={v} onClick={()=>choose(v)}>
            <span>{v==="Sim"?"✓":v==="Parcialmente"?"◐":v==="Não"?"×":"—"}</span>
            <strong>{v}</strong>
            {value===v && <small>Selecionado</small>}
          </button>
        )}
      </div>
      <div className="q-navigation">
        <button className="secondary" onClick={previous} disabled={index===0}>← Anterior</button>
        <span>{completed?"✓ Questionário completo":`Próxima: ${Math.min(index+2,questions.length)} / ${questions.length}`}</span>
        {completed ? <button className="primary" onClick={finish}>Gerar análise automática →</button> :
          <button className="secondary" onClick={()=>value&&setIndex(i=>Math.min(i+1,questions.length-1))} disabled={!value}>Próxima →</button>}
      </div>
    </section>}

    <div className="q-footer-info">
      <div><b>IA ADAPTATIVA</b><span>As perguntas são selecionadas conforme ramo, porte, operação, jurisdição e perfil da empresa.</span></div>
      <div><b>VISÃO 360°</b><span>O diagnóstico percorre liderança, operação, suporte, terceiros, tecnologia, jurídico, pessoas e controles.</span></div>
      <div><b>AUTOMAÇÃO</b><span>As respostas alimentam automaticamente riscos, causas, recomendações, ações e triagem jurídica.</span></div>
    </div>
  </div>
}

function AutoRisks({s,stats,confirm,finish,select}={}){
  const [tick,setTick]=useState(Date.now());
  const [filter,setFilter]=useState({level:"Todos",area:"Todos"});
  useEffect(()=>{const t=setInterval(()=>setTick(Date.now()),1000);return()=>clearInterval(t)},[]);

  const levels=["Todos","Crítico","Alto","Médio","Baixo"];
  const areas=["Todos",...Array.from(new Set((s.risks||[]).map(r=>r.category||r.area||"Sem área")))];
  const filtered=(s.risks||[]).filter(r=>(filter.level==="Todos"||r.level===filter.level)&&(filter.area==="Todos"||(r.category||r.area||"Sem área")===filter.area));
  const cellCount=(p,i)=>filtered.filter(r=>Number(r.p)===p&&Number(r.i)===i).length;
  const cellTop=(p,i)=>filtered.filter(r=>Number(r.p)===p&&Number(r.i)===i).sort((a,b)=>Number(b.score||0)-Number(a.score||0))[0];
  const lastEvents=[...(s.history||[]),...(s.risks||[]),...(s.actions||[]),...(s.evidence||[]),...(s.legal||[])].map(x=>x.date||x.created).filter(Boolean).sort().slice(-1)[0];
  const liveClock=new Date(tick).toLocaleTimeString("pt-BR");
  const dataClock=lastEvents?new Date(lastEvents).toLocaleString("pt-BR"):liveClock;
  const completion=s.risks?.length?Math.round(((s.risks||[]).filter(r=>r.status==="Confirmado"||r.status==="Concluído").length/s.risks.length)*100):0;
  const topRisk=[...(s.risks||[])].sort((a,b)=>Number(b.score||0)-Number(a.score||0))[0];

  return <div className="page">
    <div className="module-head live-risk-head">
      <div><small>NEXUS RISK INTELLIGENCE ENGINE · LIVE</small><h1>Matriz de Riscos em Tempo Real</h1><p>Os indicadores abaixo são recalculados imediatamente quando o diagnóstico, riscos, ações, evidências ou triagem jurídica mudam.</p></div>
      <div className="live-status"><i/> LIVE <b>{liveClock}</b></div>
    </div>

    <div className="live-toolbar">
      <div><b>● DADOS ATUALIZADOS</b><span>Último evento registrado: {dataClock}</span></div>
      <div className="live-filters"><select value={filter.level} onChange={e=>setFilter({...filter,level:e.target.value})}>{levels.map(x=><option key={x}>{x}</option>)}</select><select value={filter.area} onChange={e=>setFilter({...filter,area:e.target.value})}>{areas.map(x=><option key={x}>{x}</option>)}</select></div>
    </div>

    <div className="metrics"><Metric title="Riscos visíveis" value={filtered.length} sub={`de ${s.risks.length} totais`}/><Metric title="Críticos" value={filtered.filter(r=>r.level==="Crítico").length} sub="Prioridade máxima" tone="red"/><Metric title="Altos" value={filtered.filter(r=>r.level==="Alto").length} sub="Exposição" tone="orange"/><Metric title="Score máximo" value={topRisk?.score||0} sub={topRisk?.title||"Sem risco"}/><Metric title="Cobertura" value={completion+"%"} sub="Riscos confirmados"/></div>

    <Panel title="Matriz 5 × 5 — atualização instantânea" sub="Cada célula mostra a quantidade de riscos naquele cruzamento. Clique para abrir o risco de maior score da célula.">
      <div className="matrix-live-wrap"><div className="matrix-axis-title">IMPACTO →</div><div className="matrix-live"><div className="matrix-live-y">PROBABILIDADE ↑</div>{[5,4,3,2,1].map(p=><div className="mrow-live" key={p}><b>{p}</b>{[1,2,3,4,5].map(i=>{const n=cellCount(p,i),r=cellTop(p,i),lv=RISK_LEVEL(p,i);return <button className={lv.toLowerCase()} key={i} onClick={()=>r&&select(r)} disabled={!r}><strong>{p*i}</strong><span>{n?n+" risco"+(n>1?"s":""):"—"}</span></button>})}</div>)}<div className="matrix-xlabels"><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span></div></div></div>
    </Panel>

    <Panel title="Fluxo vivo de exposição" sub="O painel acompanha a situação atual sem exigir atualização manual da página.">
      <div className="live-bars">{[["Crítico","Crítico"],["Alto","Alto"],["Médio","Médio"],["Baixo","Baixo"]].map(([label,key])=>{const n=filtered.filter(r=>r.level===key).length;const max=Math.max(1,filtered.length);return <div className="live-bar" key={key}><span>{label}</span><i><em style={{width:Math.round(n/max*100)+"%"}}/></i><b>{n}</b></div>})}</div>
    </Panel>

    <Panel title="Achados em tempo real" sub="Ordenados pelo score. O clique abre causa, consequência, recomendação e evidências.">{filtered.length?filtered.sort((a,b)=>Number(b.score||0)-Number(a.score||0)).map(r=><button className="list-row live-risk-row" key={r.id} onClick={()=>select(r)}><div><small>{r.id} · {r.sourceQuestion} · {r.created||"sem data"}</small><strong>{r.title}</strong></div><span>{r.category||r.area}</span><b className={String(r.level).toLowerCase()}>{r.level}</b><span>Score {r.score}</span><span>{r.status||"Pendente"}</span></button>):<div className="empty">Nenhum risco corresponde aos filtros atuais.</div>}</Panel>

    <div className="live-note"><b>⚡ MOTOR AO VIVO</b><span>Esta matriz usa os dados atuais do ciclo. Para dados externos — legislação, jurisprudência, indicadores de mercado ou fontes regulatórias — o NEXUS precisará de uma API/backend de atualização oficial; não simulamos dados externos como se fossem tempo real.</span></div>

    <div className="confirm-box"><div><b>Revisão da matriz</b><span>{s.review.confirmedRisks?"✓ Confirmada":"O sistema gerou a matriz. Revise e confirme para liberar o plano."}</span></div>{!s.review.confirmedRisks&&<button className="primary" onClick={confirm}>Confirmar matriz automática</button>}</div><Advance title="Etapa 3 · Matriz" text={s.review.confirmedRisks?"Matriz confirmada. O plano de ação já foi gerado pelo sistema.":"Aguardando sua confirmação."} onClick={finish} disabled={!s.review.confirmedRisks}/>
  </div>
}
function AutoActions({s,confirm,finish}){
  const [filter,setFilter]=useState("Todos");
  const statuses=["Todos","Pendente de confirmação","Plano gerado","Em andamento","Concluída","Encerrada"];
  const list=(s.actions||[]).filter(a=>filter==="Todos"||a.status===filter);
  return <div className="page"><div className="module-head"><div><small>NEXUS ACTION ENGINE</small><h1>Plano de Ação Automático</h1></div><span className="auto-pill">⚡ GERADO PELO SISTEMA</span></div>
    <Panel title="Ações recomendadas" sub="Cada risco relevante recebeu uma ação, responsável sugerido, prioridade e evidência esperada.">
      <div className="live-filters action-filter">{statuses.map(x=><button type="button" key={x} className={filter===x?"active":""} onClick={()=>setFilter(x)}>{x}</button>)}</div>
      {list.map(a=><article className="auto-action" key={a.id}><div><small>{a.riskId} · {a.priority}</small><h3>{a.title}</h3><p>{a.description}</p><span>Responsável sugerido: <b>{a.responsible}</b></span><span>Evidência esperada: {a.evidenceRequired}</span><label className="status-edit">Status<select value={a.status||"Plano gerado"} onChange={e=>{const v=e.target.value;setS({...s,actions:s.actions.map(x=>x.id===a.id?{...x,status:v,updated:now()}:x),history:[...(s.history||[]),{id:uid("LOG"),text:`Ação ${a.id} atualizada para ${v}.`,date:now()}]})}}>{statuses.slice(1).map(x=><option key={x}>{x}</option>)}</select></label></div><strong>{a.status}</strong></article>)}
      {!list.length&&<div className="empty">Nenhuma ação corresponde ao filtro atual.</div>}
    </Panel>
    <div className="confirm-box"><div><b>Revisão do plano</b><span>{s.review.confirmedActions?"✓ Confirmado":"O plano foi criado automaticamente. Você pode revisar e confirmar."}</span></div>{!s.review.confirmedActions&&<button className="primary" onClick={confirm}>Confirmar plano automático</button>}</div><Advance title="Etapa 4 · Plano de Ação" text={s.review.confirmedActions?"Plano confirmado.":"Aguardando confirmação do plano."} onClick={finish} disabled={!s.review.confirmedActions}/></div>}

function Evidence({s,attach,finish}){return <div className="page"><Panel title="Central de Evidências" sub="Anexe documentos que comprovem os controles e as ações."><label className="upload">📎 Selecionar arquivos<input hidden type="file" multiple onChange={e=>attach(e.target.files,"processo","GERAL")}/></label><div className="evidence-list">{s.evidence.map(f=><div key={f.id}>📎 <b>{f.name}</b><small>{f.type||"Arquivo"} · {Math.ceil(f.size/1024)} KB</small></div>)}</div><div className="auto-note">As evidências são complementares: o motor não exige preenchimento de matriz ou plano manual.</div></Panel><Advance title="Etapa 5 · Evidências" text="Anexos são opcionais nesta etapa." onClick={finish} label="Continuar →"/></div>}

function AutoLegal({s,confirm,finish}){return <div className="page"><div className="legal-banner"><div><small>NEXUS LEGAL TRIAGE ENGINE</small><h1>Triagem Jurídica Automática</h1><p>Somente os achados com potencial jurídico, regulatório, contratual ou de responsabilidade são encaminhados para confirmação.</p></div><b>§</b></div><Panel title="Encaminhamentos sugeridos" sub="O sistema explica por que cada caso foi direcionado ao Jurídico.">{s.legal.length?s.legal.map(j=><article className="legal-card" key={j.id}><div><small>{j.riskId}</small><h3>{j.title}</h3><p>{j.reason}</p></div><strong>{j.status}</strong></article>):<div className="empty">Nenhum encaminhamento jurídico foi identificado pelo motor.</div>}</Panel><div className="confirm-box"><div><b>Decisão jurídica</b><span>{s.review.confirmedLegal?"✓ Triagem confirmada":s.legal.length?"Confirme os encaminhamentos sugeridos.":"Confirme que não há encaminhamento jurídico necessário."}</span></div>{!s.review.confirmedLegal&&<button className="primary" onClick={confirm}>Confirmar triagem jurídica</button>}</div><Advance title="Etapa 6 · Jurídico" text={s.review.confirmedLegal?"Triagem concluída. Relatório pronto para finalização.":"Aguardando confirmação."} onClick={finish} disabled={!s.review.confirmedLegal}/></div>}

function Report({s,maturity,progress,print,setS,framework={selected:[]}}){
  const ready=s.workflow.juridico&&s.review.confirmedLegal;
  const risks=s.risks||[], actions=s.actions||[], legal=s.legal||[], docs=s.documents||[], evidence=s.evidence||[];
  const diagnostic=executiveDiagnosticSummary(buildEnterpriseQuestions(s.company.segment),s.answers||{},{risks,actions,legal});
  const actionsByRisk=new Map(actions.map(a=>[a.riskId,a]));
  const sections=[
    ["01","Resumo Executivo",`A empresa ${s.company.name||"organização"} apresenta maturidade estimada em ${maturity}%, com ${diagnostic.answered}/${diagnostic.total} respostas válidas (${diagnostic.percent}% concluído), ${diagnostic.noncompliant} não conformidades, ${diagnostic.partial} controles parciais, ${risks.length} riscos, ${actions.length} ações, ${legal.length} triagens jurídicas e ${evidence.length} evidências registradas.`],
    ["02","Perfil e Escopo",`Segmento: ${s.company.segment||"—"} · Porte: ${s.company.size||"—"} · Modelo: ${s.company.mode||"—"} · Jurisdições: ${(s.globalProfile?.jurisdictions||["BR"]).join(", ")}.`],
    ["03","Matriz de Riscos",risks.length?risks.slice(0,12).map(r=>`${r.level} · ${r.title} · Score ${r.score} · Responsável ${r.responsible||"Compliance"}`).join(" | "):"Nenhum risco registrado."],
    ["04","Causas e Soluções",risks.length?risks.slice(0,12).map((r,i)=>`${r.title}: causa — ${r.cause||"validar"}; solução — ${actionsByRisk.get(r.id)?.title||r.recommendation||"definir"}.`).join(" "):"Sem achados."],
    ["05","Plano de Ação",actions.length?actions.slice(0,12).map(a=>`${a.priority} · ${a.title} · ${a.responsible||"Não definido"} · ${a.status}`).join(" | "):"Nenhuma ação gerada."],
    ["06","Jurídico",legal.length?legal.map(j=>`${j.title} · ${j.status}`).join(" | "):"Nenhum encaminhamento jurídico identificado pelo motor."],
    ["07","Documentos",docs.length?docs.map(d=>d.name).join(" · "):"Biblioteca documental ainda não gerada."],
    ["08","Evidências",evidence.length?evidence.map(e=>e.name).join(" · "):"Nenhuma evidência anexada."],
    ["09","Frameworks",framework.selected.length?framework.selected.map(f=>f.name).join(" · "):"Nenhum framework selecionado."],
    ["10","Prevenção e Perdas","Priorizar riscos críticos, ações com evidência, terceiros de maior exposição, controles financeiros, continuidade, privacidade e obrigações regulatórias aplicáveis."],
    ["11","Governança","Responsabilidades, alçadas, decisões críticas, conflitos, reporte e supervisão devem permanecer rastreáveis."],
    ["12","Monitoramento","A matriz deve ser revisada quando respostas, riscos, ações, evidências ou perfil da empresa forem alterados."],
    ["13","Auditoria e Integridade",`${(s.auditTrail||[]).length} alterações de respostas registradas. Vínculos entre riscos e ações: ${diagnostic.integrity.valid?"consistentes":"necessitam revisão"}. Respostas pendentes: ${diagnostic.pending}. Registros anteriores ignorados no progresso: ${diagnostic.ignoredLegacyAnswers}.`],
  ];
  return <div className="page">
    <div className={"final "+(ready?"ready":"")}><div><small>{ready?"PROCESSO PRONTO":"PROCESSO EM ANDAMENTO"}</small><h1>{ready?"Relatório Executivo Liberado":"Finalize as etapas anteriores"}</h1><p>{progress}% concluído.</p></div><button className="primary" disabled={!ready} onClick={print}>🖨 Gerar / Imprimir Relatório Premium</button></div>
    <section className="continuous-report">
      <div className="report-section"><small>NEXUS COMPLIANCE ONE · PREMIUM EXECUTIVE</small><h1>Relatório Executivo Contínuo</h1><h2>{s.company.name||"Empresa"}</h2><p>Documento consolidado em uma única sequência visual. Na impressão, o navegador pagina automaticamente conforme o conteúdo, sem criar uma folha artificial para cada seção.</p><div className="metrics"><Metric title="Maturidade" value={maturity+"%"} sub="Índice"/><Metric title="Riscos" value={risks.length} sub="Gerados"/><Metric title="Ações" value={actions.length} sub="Automáticas"/><Metric title="Jurídico" value={legal.length} sub="Triagens"/><Metric title="Documentos" value={docs.length} sub="Gerados"/></div></div>
      <div className="report-section"><h2>Índice do documento</h2><div className="report-index">{sections.map(x=><span key={x[0]}>{x[0]} · {x[1]}</span>)}</div></div>
      {sections.map(x=><div className="report-section" key={x[0]}><small>SEÇÃO {x[0]}</small><h2>{x[1]}</h2><p>{x[2]}</p></div>)}
      <div className="report-section"><h2>Controle e validação</h2><p>Este relatório consolida dados registrados no NEXUS. Requisitos legais e conclusões jurídicas devem ser validados por profissional competente.</p><div className="signatures"><label>Responsável pelo Compliance<input value={s.signatures.consultant} onChange={e=>setS({...s,signatures:{...s.signatures,consultant:e.target.value}})}/></label><label>Diretor da Empresa<input value={s.signatures.director} onChange={e=>setS({...s,signatures:{...s.signatures,director:e.target.value}})}/></label></div></div>
    </section>
  </div>
}

function AuthModal({close,onLogin,onBootstrap}){
  const [mode,setMode]=useState("login");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [companyName,setCompanyName]=useState("");
  const [adminName,setAdminName]=useState("");
  const [segment,setSegment]=useState("Serviços");
  const [size,setSize]=useState("Pequena empresa");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");

  async function submit(e){
    e.preventDefault();
    setError("");
    if(!email.trim()||!password) return setError("Informe e-mail e senha.");
    if(mode==="bootstrap"&&!companyName.trim()) return setError("Informe o nome da empresa.");
    if(mode==="bootstrap"&&!adminName.trim()) return setError("Informe o nome do administrador.");
    setBusy(true);
    try{
      if(mode==="login"){
        await onLogin(email,password);
      }else{
        await onBootstrap({companyName:companyName.trim(),segment,size,adminName:adminName.trim(),email:email.trim(),password});
      }
    }catch(err){
      setError(String(err?.message||"Não foi possível concluir a operação."));
    }finally{
      setBusy(false);
    }
  }

  return <Modal title="Conectar NEXUS V124" close={close}>
    <div className="form">
      <div className="live-filters action-filter">
        <button type="button" className={mode==="login"?"active":""} onClick={()=>{setMode("login");setError("")}}>Entrar</button>
        <button type="button" className={mode==="bootstrap"?"active":""} onClick={()=>{setMode("bootstrap");setError("")}}>Criar empresa</button>
      </div>
      {mode==="bootstrap"&&<>
        <label>Empresa<input value={companyName} onChange={e=>setCompanyName(e.target.value)} placeholder="Razão social / nome"/></label>
        <label>Administrador<input value={adminName} onChange={e=>setAdminName(e.target.value)} placeholder="Nome do administrador"/></label>
        <label>Segmento<select value={segment} onChange={e=>setSegment(e.target.value)}>{SEGMENTS.map(x=><option key={x}>{x}</option>)}</select></label>
        <label>Porte<select value={size} onChange={e=>setSize(e.target.value)}>{SIZES.map(x=><option key={x}>{x}</option>)}</select></label>
      </>}
      <label>E-mail<input type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="username" placeholder="administrador@empresa.com"/></label>
      <label>Senha<input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete={mode==="login"?"current-password":"new-password"} placeholder="••••••••"/></label>
      {error&&<div className="secure-note">⚠ {error}</div>}
      <div className="form-note">🔐 A autenticação usa JWT no backend V124. O workspace permanece local quando a API não estiver conectada.</div>
      <button className="primary" disabled={busy} onClick={submit}>{busy?"Conectando...":mode==="login"?"Entrar com segurança":"Criar empresa e entrar"}</button>
    </div>
  </Modal>
}

function CompanyModal({close,save,current}){const [f,setF]=useState(current);return <Modal title="Cadastro da empresa" close={close}><div className="form">{[["name","Nome / Razão social"],["document","CNPJ / Identificação"],["city","Cidade / UF"],["responsible","Responsável pelo Compliance"],["director","Diretor"]].map(([k,l])=><label key={k}>{l}<input value={f[k]||""} onChange={e=>setF({...f,[k]:e.target.value})}/></label>)}<label>Segmento<select value={f.segment} onChange={e=>setF({...f,segment:e.target.value})}><option value="">Selecione</option>{SEGMENTS.map(x=><option key={x}>{x}</option>)}</select></label><label>Porte<select value={f.size} onChange={e=>setF({...f,size:e.target.value})}><option value="">Selecione</option>{SIZES.map(x=><option key={x}>{x}</option>)}</select></label><label>Modelo<select value={f.mode} onChange={e=>setF({...f,mode:e.target.value})}><option value="">Selecione</option>{MODES.map(x=><option key={x}>{x}</option>)}</select></label><div className="form-note">🌎 Depois do cadastro, use <b>Global Compliance</b> para informar jurisdições e exposição internacional. O motor recalcula os frameworks automaticamente.</div><button className="primary" onClick={()=>save(f)}>Salvar e iniciar</button></div></Modal>}

function DenModal({close,save}){const [f,setF]=useState({mode:"Anônima",category:"Conflito de interesses",severity:"Média",description:"",location:"",involved:""});return <Modal title="Registrar denúncia" close={close}><div className="secure-note">🔐 Canal independente · a identidade não é exigida na modalidade anônima.</div><div className="form"><label>Modalidade<select value={f.mode} onChange={e=>setF({...f,mode:e.target.value})}><option>Anônima</option><option>Identificada</option></select></label><label>Categoria<select value={f.category} onChange={e=>setF({...f,category:e.target.value})}>{["Conflito de interesses","Fraude","Assédio","Corrupção","Violação de políticas","Lavagem de dinheiro","Privacidade / Dados","Meio ambiente","Segurança","Outros"].map(x=><option key={x}>{x}</option>)}</select></label><label>Gravidade<select value={f.severity} onChange={e=>setF({...f,severity:e.target.value})}><option>Baixa</option><option>Média</option><option>Alta</option><option>Crítica</option></select></label><label>Local<input value={f.location} onChange={e=>setF({...f,location:e.target.value})}/></label><label>Envolvidos / referência<input value={f.involved} onChange={e=>setF({...f,involved:e.target.value})}/></label><label>Relato<textarea value={f.description} onChange={e=>setF({...f,description:e.target.value})}/></label><button className="primary" onClick={()=>save(f)}>Gerar protocolo</button></div></Modal>}

function Denunciations({s,open,select}){return <div className="page"><div className="secure"><div><small>NEXUS SECURE ETHICS CHANNEL</small><h1>Canal de Denúncias</h1><p>Separado do fluxo operacional. Anônimo ou identificado, com protocolo e rastreabilidade.</p></div><button className="primary" onClick={open}>+ Nova denúncia</button></div><Panel title="Protocolos" sub="Acesso independente e histórico por ocorrência.">{s.denunciations.map(d=><button className="case" key={d.id} onClick={()=>select(d)}><div><strong>{d.protocol}</strong><span>{d.category}</span></div><b>{d.severity}</b><span>{d.status}</span><small>{d.mode}</small></button>)}{!s.denunciations.length&&<div className="empty">Nenhuma denúncia registrada.</div>}</Panel></div>}

function PrintableDocument({doc,close}){
  const c=doc.content||{title:doc.name,purpose:doc.description,sections:[],disclaimer:""};
  return <Modal title={c.title||doc.name} close={close}>
    <div className="generated-document">
      <div className="generated-doc-head"><small>NEXUS OFFICIAL DOCUMENT ENGINE</small><h1>{c.title||doc.name}</h1><p>{c.purpose}</p><div className="generated-doc-actions"><button className="primary" onClick={()=>window.print()}>🖨 Imprimir documento</button><button className="secondary" onClick={()=>navigator.clipboard?.writeText([c.title,c.purpose,...(c.sections||[]).map(x=>x.title+"\\n"+x.body)].join("\\n\\n"))}>⧉ Copiar conteúdo</button></div></div>
      {(c.sections||[]).map((x,i)=><section className="generated-section" key={i}><span>{String(i+1).padStart(2,"0")}</span><div><h2>{x.title}</h2><p>{x.body}</p></div></section>)}
      <div className="generated-disclaimer"><b>Controle</b><p>{c.disclaimer}</p></div>
      {c.sources?.length>0&&<div className="generated-sources"><h3>Referências oficiais</h3>{c.sources.map((x,i)=><div key={i}><b>{x[0]}</b><span>{x[1]}</span>{x[3]&&<a href={x[3]} target="_blank" rel="noreferrer">Fonte ↗</a>}</div>)}</div>}
    </div>
  </Modal>
}

function Detail({detail,s,setS,close,attach}){if(detail.type==="document") return <PrintableDocument doc={detail.item} close={close}/>; const x=s[detail.type==="risk"?"risks":"denunciations"].find(v=>v.id===detail.item.id)||detail.item;if(detail.type==="risk")return <Modal title={x.id} close={close}><div className="detail"><h2>{x.title}</h2><p><b>Origem:</b> {x.sourceQuestion} · {x.sourceText}</p><p><b>Causa:</b> {x.cause}</p><p><b>Consequência:</b> {x.consequence}</p><p><b>Recomendação:</b> {x.recommendation}</p><Metric title="Nível" value={x.level} sub={`Score ${x.score}`}/><label className="upload">📎 Anexar evidência<input hidden type="file" multiple onChange={e=>attach(e.target.files,"risk",x.id)}/></label></div></Modal>;
return <Modal title={x.protocol} close={close}><div className="detail"><h2>{x.category}</h2><p>{x.description}</p><div className="status-flow">{["Recebida","Triagem","Em apuração","Aguardando evidências","Em análise jurídica","Plano de ação","Encerrada"].map(st=><button className={x.status===st?"active":""} key={st} onClick={()=>setS({...s,denunciations:s.denunciations.map(d=>d.id===x.id?{...d,status:st}:d)})}>{st}</button>)}</div><label className="upload">📎 Anexar evidência<input hidden type="file" multiple onChange={e=>attach(e.target.files,"denuncia",x.id)}/></label></div></Modal>}

function Modal({title,close,children}){return <div className="modal-bg" onMouseDown={close}><div className="modal" onMouseDown={e=>e.stopPropagation()}><header><h2>{title}</h2><button onClick={close}>×</button></header>{children}</div></div>}

class NexusErrorBoundary extends React.Component { constructor(p){super(p);this.state={error:null}} static getDerivedStateFromError(error){return {error}} render(){if(this.state.error)return <div style={{minHeight:'100vh',background:'#06101d',color:'#eaf3ff',padding:'40px',fontFamily:'system-ui'}}><h1>NEXUS encontrou um erro de execução</h1><p style={{color:'#8fa6bf'}}>A aplicação não ficou em branco silenciosamente. O erro abaixo identifica o ponto que precisa ser corrigido.</p><pre style={{whiteSpace:'pre-wrap',background:'#0b192a',padding:'18px',borderRadius:'12px',color:'#ff9e9e'}}>{String(this.state.error?.stack||this.state.error)}</pre><button onClick={()=>location.reload()} style={{padding:'12px 18px',borderRadius:'8px',border:0}}>Recarregar</button></div>;return this.props.children}} function App(){return <NexusErrorBoundary><AppCore/></NexusErrorBoundary>} export default App;
