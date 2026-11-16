import React,{useState} from 'react';
import {apiGet} from './api';
import './V51ExecutiveDashboard.css';

const integer=(n)=>Number.isFinite(n)?n:0;
const percent=(n)=>Number.isFinite(n)?n.toFixed(1).replace(/\.0$/,'')+'%':'—';

export default function V51ExecutiveDashboard(){
  const [cycleId,setCycleId]=useState('');
  const [report,setReport]=useState(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  async function load(event){
    event.preventDefault();
    if(!cycleId.trim())return;
    setLoading(true);setError('');setReport(null);
    try{
      const data=await apiGet('/v51/assessment/cycles/'+encodeURIComponent(cycleId.trim())+'/executive');
      if(!data?.assessment||!data?.evidence||!data?.correctiveActions)
        throw new Error('Resposta incompleta da API');
      setReport(data);
    }catch(err){setError(err?.message||'Não foi possível consultar o ciclo.');}
    finally{setLoading(false);}
  }
  const totals=report?.assessment?.totals;
  const evidence=report?.evidence;
  const actions=report?.correctiveActions;
  const maturity=report?.assessment?.maturityByControl||[];
  const bands=[0,1,2,3,4,5].map(level=>({
    level,count:maturity.filter(control=>control.maturity===level).length
  }));
  return <section className="v51-executive" aria-label="Painel executivo V51">
    <header className="v51-executive-head">
      <div><small>NEXORA · V51 ENTERPRISE INTELLIGENCE</small>
        <h2>Indicadores executivos verificáveis</h2>
        <p>Dados reais do ciclo selecionado. Não substitui auditoria nem certificação de conformidade.</p></div>
      <span className="v51-status">RELATÓRIO PROVISÓRIO</span>
    </header>
    <form className="v51-lookup" onSubmit={load}>
      <label htmlFor="v51-cycle-id">Identificador do ciclo V51</label>
      <input id="v51-cycle-id" value={cycleId} onChange={e=>setCycleId(e.target.value)}
        placeholder="Cole o ID do ciclo de avaliação" maxLength={120}/>
      <button type="submit" disabled={loading||!cycleId.trim()}>
        {loading?'Consultando…':'Carregar indicadores'}
      </button>
    </form>
    {error&&<p role="alert" className="v51-error">{error}</p>}
    {!report&&!error&&<p className="v51-empty">Informe um ciclo existente para visualizar os indicadores. Nenhum dado fictício é exibido.</p>}
    {report&&<>
      <div className="v51-report-title"><strong>{report.cycle?.title}</strong>
        <span>{report.cycle?.status==='closed'?'Ciclo encerrado':'Ciclo em andamento'}</span></div>
      <div className="v51-kpis">
        <article><small>Cobertura avaliada</small><strong>{percent(report.assessment.coveragePercent)}</strong><span>{integer(totals?.assessed)} de {integer(totals?.applicable)} controles aplicáveis</span></article>
        <article><small>Evidências documentadas</small><strong>{percent(report.assessment.evidencePercent)}</strong><span>{integer(totals?.documented)} controles com comprovação íntegra</span></article>
        <article><small>Documentos aprovados e íntegros</small><strong>{integer(evidence.approvedAndIntact)}</strong><span>{integer(evidence.approvedButInvalid)} aprovação(ões) com integridade inválida</span></article>
        <article><small>Ações em atraso</small><strong>{integer(actions.overdue)}</strong><span>{integer(actions.open)} abertas · {integer(actions.inProgress)} em andamento</span></article>
      </div>
      <div className="v51-charts">
        <article><h3>Distribuição de maturidade</h3>
          <p>Escala operacional de 0 a 5. Testes e monitoramento ainda não integrados.</p>
          {bands.map(b=><div className="v51-bar-row" key={b.level}>
            <span>Nível {b.level}</span><div className="v51-bar-track"><i style={{width:(maturity.length?b.count/maturity.length*100:0)+'%'}}/></div><b>{b.count}</b>
          </div>)}
        </article>
        <article><h3>Fila de evidências e correções</h3>
          <div className="v51-detail"><span>Evidências aguardando revisão</span><strong>{integer(evidence.pending)}</strong></div>
          <div className="v51-detail"><span>Evidências rejeitadas</span><strong>{integer(evidence.rejected)}</strong></div>
          <div className="v51-detail"><span>Ações concluídas</span><strong>{integer(actions.completed)}</strong></div>
          <div className="v51-detail"><span>Controles testados</span><strong>{integer(totals?.testedAndPassed)}</strong></div>
        </article>
      </div>
      <p className="v51-disclaimer">Indicadores provisórios: documentos aprovados são revalidados no servidor. Nenhum indicador constitui certificação legal ou comprovação de eficácia dos controles.</p>
    </>}
  </section>;
}
