import React, { useMemo, useState } from "react";
import "./NexusAICommandCenter.css";

export default function NexusAICommandCenter({
  s,
  maturity = 0,
  progress = 0,
  stats = {},
  go,
}) {
  const [activeInsight, setActiveInsight] = useState("executive");

  const risks = Array.isArray(s?.risks) ? s.risks : [];
  const actions = Array.isArray(s?.actions) ? s.actions : [];
  const evidence = Array.isArray(s?.evidence) ? s.evidence : [];
  const legal = Array.isArray(s?.legal) ? s.legal : [];
  const answers = s?.answers || {};

  const answered = Object.keys(answers).length;

  const criticalRisks = risks.filter((risk) =>
    /crítico|critico/i.test(
      String(risk.level || risk.riskLevel || "")
    )
  );

  const highRisks = risks.filter((risk) =>
    /alto/i.test(
      String(risk.level || risk.riskLevel || "")
    )
  );

  const actionsOpen = actions.filter(
    (action) =>
      !/(conclu|encerr|finaliz|cancel)/i.test(
        String(action.status || "")
      )
  );

  const actionsWithoutOwner = actions.filter(
    (action) =>
      !action.owner &&
      !action.responsible &&
      !action.responsavel
  );

  const risksWithoutEvidence = criticalRisks.filter(
    (risk) => {
      const riskId =
        risk.id ||
        risk._id ||
        risk.riskId;

      return !evidence.some(
        (item) =>
          item.riskId === riskId ||
          item.risk_id === riskId
      );
    }
  );

  const health = useMemo(() => {
    let score = Number(maturity || 0);

    if (criticalRisks.length) {
      score -= criticalRisks.length * 8;
    }

    if (highRisks.length) {
      score -= highRisks.length * 3;
    }

    if (actionsWithoutOwner.length) {
      score -= actionsWithoutOwner.length * 2;
    }

    if (evidence.length) {
      score += Math.min(10, evidence.length);
    }

    return Math.max(
      0,
      Math.min(100, Math.round(score))
    );
  }, [
    maturity,
    criticalRisks.length,
    highRisks.length,
    actionsWithoutOwner.length,
    evidence.length,
  ]);

  const attentionLevel =
    criticalRisks.length >= 3
      ? "CRÍTICO"
      : criticalRisks.length > 0
      ? "ALTO"
      : highRisks.length > 3
      ? "MODERADO"
      : "CONTROLADO";

  const attentionClass =
    attentionLevel === "CRÍTICO"
      ? "critical"
      : attentionLevel === "ALTO"
      ? "high"
      : attentionLevel === "MODERADO"
      ? "medium"
      : "low";

  const executiveMessage =
    criticalRisks.length > 0
      ? `Foram identificados ${criticalRisks.length} risco(s) crítico(s) que exigem tratamento prioritário.`
      : highRisks.length > 0
      ? `O ambiente apresenta ${highRisks.length} risco(s) alto(s). Recomenda-se atuação preventiva imediata.`
      : answered === 0
      ? "O diagnóstico ainda não possui respostas suficientes para uma leitura completa."
      : "O ambiente apresenta nível de atenção controlado. Continue fortalecendo controles e evidências.";

  const insights = {
    executive: {
      title: "Visão Executiva",
      text: executiveMessage,
      action:
        criticalRisks.length > 0
          ? "Priorizar riscos críticos"
          : "Continuar evolução do programa",
      target:
        criticalRisks.length > 0
          ? "riscos"
          : "questionario",
    },

    risk: {
      title: "Inteligência de Risco",
      text:
        risks.length === 0
          ? "Nenhum risco registrado ainda. O motor de risco será ativado conforme o diagnóstico evoluir."
          : `${risks.length} risco(s) registrados, sendo ${criticalRisks.length} crítico(s) e ${highRisks.length} alto(s).`,
      action: "Abrir Matriz de Riscos",
      target: "riscos",
    },

    execution: {
      title: "Inteligência de Execução",
      text:
        actions.length === 0
          ? "Ainda não existem ações registradas."
          : `${actionsOpen.length} ação(ões) permanecem abertas e ${actionsWithoutOwner.length} estão sem responsável definido.`,
      action: "Abrir Plano de Ação",
      target: "acoes",
    },

    legal: {
      title: "Inteligência Jurídica",
      text:
        legal.length === 0
          ? "Nenhuma triagem jurídica registrada no momento."
          : `${legal.length} item(ns) jurídico(s) estão registrados para análise.`,
      action: "Abrir Jurídico",
      target: "juridico",
    },

    evidence: {
      title: "Inteligência de Evidências",
      text:
        evidence.length === 0
          ? "O programa ainda não possui evidências registradas."
          : `${evidence.length} evidência(s) estão vinculadas ao ambiente.`,
      action: "Abrir Evidências",
      target: "evidencias",
    },
  };

  const current =
    insights[activeInsight] ||
    insights.executive;

  return (
    <section className="nexus-ai-command">

      {/* FUNDO INTELIGENTE */}

      <div className="nexus-ai-stars" />
      <div className="nexus-ai-orbit nexus-ai-orbit-one" />
      <div className="nexus-ai-orbit nexus-ai-orbit-two" />

      {/* HEADER */}

      <header className="nexus-ai-header">

        <div>

          <div className="nexus-ai-label">
            NEXUS AI · COMMAND CENTER
          </div>

          <h2>
            Intelligence
            <span>Core</span>
          </h2>

          <p>
            Inteligência executiva aplicada aos dados
            reais de compliance da organização.
          </p>

        </div>

        <div className="nexus-ai-status">

          <span className="nexus-ai-status-dot" />

          <div>
            <strong>AI CORE ONLINE</strong>
            <small>
              ANÁLISE CONTÍNUA · V125
            </small>
          </div>

        </div>

      </header>

      {/* SCORE CENTRAL */}

      <div className="nexus-ai-overview">

        <div className="nexus-ai-score">

          <div
            className="nexus-ai-score-ring"
            style={{
              "--score": `${health * 3.6}deg`,
            }}
          >
            <div className="nexus-ai-score-inner">

              <strong>{health}</strong>

              <span>/100</span>

              <small>
                HEALTH
              </small>

            </div>
          </div>

          <div className="nexus-ai-score-info">

            <span>
              NÍVEL DE ATENÇÃO
            </span>

            <strong
              className={`nexus-ai-attention ${attentionClass}`}
            >
              {attentionLevel}
            </strong>

            <p>
              Score calculado a partir de maturidade,
              riscos, ações e evidências disponíveis.
            </p>

          </div>

        </div>

        {/* INDICADORES */}

        <div className="nexus-ai-metrics">

          <div>
            <small>DIAGNÓSTICO</small>
            <strong>
              {answered}
              <em>/120</em>
            </strong>
          </div>

          <div>
            <small>RISCOS</small>
            <strong>
              {risks.length}
            </strong>
          </div>

          <div className="danger">
            <small>CRÍTICOS</small>
            <strong>
              {criticalRisks.length}
            </strong>
          </div>

          <div>
            <small>AÇÕES</small>
            <strong>
              {actionsOpen.length}
            </strong>
          </div>

          <div>
            <small>EVIDÊNCIAS</small>
            <strong>
              {evidence.length}
            </strong>
          </div>

        </div>

      </div>

      {/* INTELLIGENCE GRID */}

      <div className="nexus-ai-grid">

        {/* MENU */}

        <aside className="nexus-ai-nav">

          <div className="nexus-ai-nav-title">
            INTELLIGENCE LAYERS
          </div>

          {Object.entries(insights).map(
            ([key, item]) => (

              <button
                key={key}
                className={
                  activeInsight === key
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setActiveInsight(key)
                }
              >

                <span>
                  {key === "executive"
                    ? "◈"
                    : key === "risk"
                    ? "△"
                    : key === "execution"
                    ? "✓"
                    : key === "legal"
                    ? "§"
                    : "◉"}
                </span>

                <div>
                  <strong>
                    {item.title}
                  </strong>

                  <small>
                    Analisar
                  </small>
                </div>

              </button>

            )
          )}

        </aside>

        {/* INSIGHT */}

        <main className="nexus-ai-insight">

          <div className="nexus-ai-insight-top">

            <div>

              <span>
                AI INSIGHT
              </span>

              <h3>
                {current.title}
              </h3>

            </div>

            <div className="nexus-ai-pulse">
              <i />
              LIVE
            </div>

          </div>

          <div className="nexus-ai-thinking">

            <div className="nexus-ai-brain">
              N
            </div>

            <div>

              <small>
                NEXUS AI ANALYSIS
              </small>

              <p>
                {current.text}
              </p>

            </div>

          </div>

          <div className="nexus-ai-recommendation">

            <span>
              RECOMENDAÇÃO
            </span>

            <strong>
              {current.action}
            </strong>

            <button
              onClick={() =>
                go?.(current.target)
              }
            >
              Executar →
            </button>

          </div>

        </main>

      </div>

      {/* ALERTAS */}

      <div className="nexus-ai-alerts">

        <div className="nexus-ai-alert-title">
          <span>REAL-TIME INTELLIGENCE</span>
          <small>
            {criticalRisks.length +
              actionsWithoutOwner.length +
              risksWithoutEvidence.length}
            sinal(is)
          </small>
        </div>

        <div className="nexus-ai-alert-list">

          {criticalRisks.length > 0 && (

            <button
              className="nexus-ai-alert critical"
              onClick={() =>
                go?.("riscos")
              }
            >
              <b>!</b>

              <div>
                <strong>
                  Riscos críticos detectados
                </strong>

                <small>
                  {criticalRisks.length} item(ns)
                  necessitam tratamento prioritário.
                </small>
              </div>

              <span>→</span>
            </button>

          )}

          {actionsWithoutOwner.length > 0 && (

            <button
              className="nexus-ai-alert warning"
              onClick={() =>
                go?.("acoes")
              }
            >
              <b>!</b>

              <div>
                <strong>
                  Ações sem responsável
                </strong>

                <small>
                  {actionsWithoutOwner.length} ação(ões)
                  precisam de responsável definido.
                </small>
              </div>

              <span>→</span>
            </button>

          )}

          {risksWithoutEvidence.length > 0 && (

            <button
              className="nexus-ai-alert warning"
              onClick={() =>
                go?.("evidencias")
              }
            >
              <b>!</b>

              <div>
                <strong>
                  Riscos sem evidência
                </strong>

                <small>
                  {risksWithoutEvidence.length} risco(s)
                  precisam de comprovação.
                </small>
              </div>

              <span>→</span>
            </button>

          )}

          {criticalRisks.length === 0 &&
            actionsWithoutOwner.length === 0 &&
            risksWithoutEvidence.length === 0 && (

              <div className="nexus-ai-clear">

                <span>✓</span>

                <div>
                  <strong>
                    Nenhum alerta crítico identificado
                  </strong>

                  <small>
                    O ambiente está sem sinais
                    prioritários no momento.
                  </small>
                </div>

              </div>

            )}

        </div>

      </div>

    </section>
  );
}