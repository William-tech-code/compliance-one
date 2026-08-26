import React, { useMemo } from "react";
import "./NexusDecisionEngine.css";

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function isCritical(risk) {
  return normalize(risk?.level || risk?.nivel) === "critico";
}

function isHigh(risk) {
  return normalize(risk?.level || risk?.nivel) === "alto";
}

function isOpen(value) {
  return !/(conclu|encerr|final|confirm)/i.test(
    String(value || "")
  );
}

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default function NexusDecisionEngine({
  s,
  maturity = 0,
  go,
}) {
  const company = s?.company || {};

  const risks = Array.isArray(s?.risks)
    ? s.risks
    : [];

  const actions = Array.isArray(s?.actions)
    ? s.actions
    : [];

  const legal = Array.isArray(s?.legal)
    ? s.legal
    : [];

  const evidence = Array.isArray(s?.evidence)
    ? s.evidence
    : [];

  const answers =
    s?.answers &&
    typeof s.answers === "object"
      ? s.answers
      : {};

  const history = Array.isArray(s?.history)
    ? s.history
    : [];

  /*
   * =====================================================
   * NEXUS DECISION SCORING
   *
   * O objetivo não é substituir análise humana.
   * O motor apenas prioriza os dados existentes.
   * =====================================================
   */

  const decisions = useMemo(() => {
    return risks.map((risk) => {
      const score = number(risk.score);

      const critical = isCritical(risk);
      const high = isHigh(risk);

      const relatedAction = actions.find(
        (action) =>
          action.riskId === risk.id
      );

      const relatedLegal = legal.find(
        (item) =>
          item.riskId === risk.id
      );

      const relatedEvidence = evidence.filter(
        (item) =>
          item.riskId === risk.id ||
          item.risk_id === risk.id ||
          item.sourceRiskId === risk.id
      );

      let priority = 0;

      priority += score;

      if (critical) {
        priority += 20;
      } else if (high) {
        priority += 10;
      }

      if (relatedLegal) {
        priority += 8;
      }

      if (!relatedEvidence.length) {
        priority += 7;
      }

      if (
        relatedAction &&
        isOpen(relatedAction.status)
      ) {
        priority += 5;
      }

      let level = "BAIXA";

      if (priority >= 30) {
        level = "CRÍTICA";
      } else if (priority >= 20) {
        level = "ALTA";
      } else if (priority >= 12) {
        level = "MÉDIA";
      }

      return {
        risk,
        score,
        priority,
        level,
        action: relatedAction,
        legal: relatedLegal,
        evidence: relatedEvidence,
      };
    });
  }, [
    risks,
    actions,
    legal,
    evidence,
  ]);

  const ordered = useMemo(
    () =>
      [...decisions].sort(
        (a, b) =>
          b.priority - a.priority
      ),
    [decisions]
  );

  const top = ordered[0];

  const criticalCount = risks.filter(
    isCritical
  ).length;

  const highCount = risks.filter(
    isHigh
  ).length;

  const openActions = actions.filter(
    (action) => isOpen(action.status)
  ).length;

  const openLegal = legal.filter(
    (item) => isOpen(item.status)
  ).length;

  const missingEvidence = risks.filter(
    (risk) =>
      !evidence.some(
        (item) =>
          item.riskId === risk.id ||
          item.risk_id === risk.id ||
          item.sourceRiskId === risk.id
      )
  ).length;

  const answerCount =
    Object.keys(answers).length;

  const health = useMemo(() => {
    let value = number(maturity);

    if (criticalCount) {
      value -= criticalCount * 8;
    }

    if (highCount) {
      value -= highCount * 3;
    }

    if (openActions) {
      value -= Math.min(
        15,
        openActions * 2
      );
    }

    if (missingEvidence) {
      value -= Math.min(
        15,
        missingEvidence
      );
    }

    if (
      answerCount > 0 &&
      risks.length > 0
    ) {
      value += 3;
    }

    return Math.max(
      0,
      Math.min(
        100,
        Math.round(value)
      )
    );
  }, [
    maturity,
    criticalCount,
    highCount,
    openActions,
    missingEvidence,
    answerCount,
    risks.length,
  ]);

  /*
   * =====================================================
   * RECOMENDAÇÃO EXECUTIVA
   * =====================================================
   */

  const recommendation = useMemo(() => {
    if (!risks.length) {
      return {
        title:
          "Executar diagnóstico de Compliance",
        text:
          "Ainda não existem riscos consolidados. O próximo passo recomendado é concluir o diagnóstico para ativar a matriz de exposição.",
        action:
          "Abrir diagnóstico",
        page:
          "diagnostico",
        tone:
          "info",
      };
    }

    if (top?.level === "CRÍTICA") {
      return {
        title:
          "Tratar prioridade crítica",
        text:
          `O risco "${top.risk.title}" apresenta a maior prioridade calculada pelo Decision Engine.`,
        action:
          "Abrir matriz de riscos",
        page:
          "riscos",
        tone:
          "critical",
      };
    }

    if (openLegal > 0) {
      return {
        title:
          "Revisar exposição jurídica",
        text:
          `${openLegal} encaminhamento(s) jurídico(s) permanecem pendentes de confirmação ou conclusão.`,
        action:
          "Abrir núcleo jurídico",
        page:
          "juridico",
        tone:
          "legal",
      };
    }

    if (missingEvidence > 0) {
      return {
        title:
          "Fortalecer rastreabilidade",
        text:
          `${missingEvidence} risco(s) não possuem evidência vinculada identificada pelo motor.`,
        action:
          "Abrir evidências",
        page:
          "evidencias",
        tone:
          "warning",
      };
    }

    if (openActions > 0) {
      return {
        title:
          "Acelerar execução",
        text:
          `${openActions} ação(ões) permanecem abertas no ciclo atual.`,
        action:
          "Abrir plano de ação",
        page:
          "acoes",
        tone:
          "warning",
      };
    }

    return {
      title:
        "Ambiente sob controle",
      text:
        "Não foram identificados sinais prioritários suficientes para gerar uma recomendação crítica.",
      action:
        "Abrir visão executiva",
      page:
        "relatorio",
      tone:
        "success",
    };
  }, [
    risks.length,
    top,
    openLegal,
    missingEvidence,
    openActions,
  ]);

  const radar = [
    {
      name:
        "Maturidade",
      value:
        number(maturity),
    },
    {
      name:
        "Controle de riscos",
      value:
        risks.length
          ? Math.round(
              ((risks.length -
                criticalCount) /
                risks.length) *
                100
            )
          : 100,
    },
    {
      name:
        "Execução",
      value:
        actions.length
          ? Math.round(
              ((actions.length -
                openActions) /
                actions.length) *
                100
            )
          : 100,
    },
    {
      name:
        "Jurídico",
      value:
        legal.length
          ? Math.round(
              ((legal.length -
                openLegal) /
                legal.length) *
                100
            )
          : 100,
    },
    {
      name:
        "Evidências",
      value:
        risks.length
          ? Math.min(
              100,
              Math.round(
                (evidence.length /
                  risks.length) *
                  100
              )
            )
          : 100,
    },
  ];

  return (
    <section className="nexus-decision">

      <div className="nexus-decision-glow" />
      <div className="nexus-decision-grid" />

      {/* HEADER */}

      <header className="nexus-decision-header">

        <div>

          <span className="nexus-decision-eyebrow">
            NEXUS DECISION ENGINE · 2.0
          </span>

          <h2>
            Decision
            <strong>Intelligence</strong>
          </h2>

          <p>
            Motor de priorização executiva baseado
            nos dados reais do ambiente de Compliance.
          </p>

        </div>

        <div className="nexus-decision-company">

          <small>
            ORGANIZAÇÃO
          </small>

          <strong>
            {company.name ||
              "Empresa não cadastrada"}
          </strong>

          <span>
            {company.segment ||
              "Segmento não informado"}
          </span>

        </div>

      </header>

      {/* SCORE */}

      <div className="nexus-decision-main">

        <div className="nexus-decision-health">

          <div className="decision-orb">

            <div>

              <strong>
                {health}
              </strong>

              <small>
                HEALTH
              </small>

            </div>

          </div>

          <div>

            <span>
              DECISION HEALTH
            </span>

            <h3>
              {health >= 80
                ? "Ambiente saudável"
                : health >= 60
                ? "Atenção necessária"
                : health >= 40
                ? "Exposição relevante"
                : "Exposição crítica"}
            </h3>

            <p>
              Score executivo calculado a partir
              de maturidade, criticidade, execução,
              jurídico e evidências.
            </p>

          </div>

        </div>

        {/* MÉTRICAS */}

        <div className="nexus-decision-metrics">

          <article>
            <small>
              PERGUNTAS
            </small>

            <strong>
              {answerCount}
            </strong>

            <span>
              respostas registradas
            </span>
          </article>

          <article>
            <small>
              CRÍTICOS
            </small>

            <strong className="red">
              {criticalCount}
            </strong>

            <span>
              prioridade máxima
            </span>
          </article>

          <article>
            <small>
              ALTOS
            </small>

            <strong className="orange">
              {highCount}
            </strong>

            <span>
              exposição elevada
            </span>
          </article>

          <article>
            <small>
              PENDÊNCIAS
            </small>

            <strong>
              {openActions +
                openLegal}
            </strong>

            <span>
              ações + jurídico
            </span>
          </article>

        </div>

      </div>

      {/* DECISION */}

      <div
        className={`nexus-decision-recommendation ${recommendation.tone}`}
      >

        <div className="decision-icon">
          {recommendation.tone ===
          "critical"
            ? "!"
            : recommendation.tone ===
              "success"
            ? "✓"
            : "✦"}
        </div>

        <div className="decision-copy">

          <small>
            DECISÃO RECOMENDADA
          </small>

          <h3>
            {recommendation.title}
          </h3>

          <p>
            {recommendation.text}
          </p>

        </div>

        <button
          onClick={() =>
            go?.(recommendation.page)
          }
        >
          {recommendation.action}
          <span>→</span>
        </button>

      </div>

      {/* PRIORIDADE */}

      <div className="nexus-decision-columns">

        <div className="nexus-priority-panel">

          <div className="panel-title">

            <div>
              <span>
                TOP PRIORITY
              </span>

              <h3>
                O que merece atenção agora
              </h3>
            </div>

            <b>
              AI
            </b>

          </div>

          {top ? (

            <div className="top-risk">

              <div className="top-risk-number">
                01
              </div>

              <div className="top-risk-content">

                <small>
                  {top.risk.category ||
                    top.risk.area ||
                    "Compliance"}
                </small>

                <h4>
                  {top.risk.title}
                </h4>

                <p>
                  {top.risk.consequence ||
                    top.risk.recommendation ||
                    "Risco identificado pelo motor automático."}
                </p>

                <div className="top-risk-tags">

                  <span>
                    {top.level}
                  </span>

                  <span>
                    Score {top.score}
                  </span>

                  {top.legal && (
                    <span>
                      Jurídico
                    </span>
                  )}

                  {!top.evidence.length && (
                    <span>
                      Sem evidência
                    </span>
                  )}

                </div>

              </div>

              <button
                onClick={() =>
                  go?.("riscos")
                }
              >
                →
              </button>

            </div>

          ) : (

            <div className="decision-empty">

              <span>
                ✦
              </span>

              <strong>
                Nenhuma prioridade calculada
              </strong>

              <small>
                Execute o diagnóstico para
                alimentar o Decision Engine.
              </small>

            </div>

          )}

        </div>

        {/* RADAR */}

        <div className="nexus-radar-panel">

          <div className="panel-title">

            <div>
              <span>
                DECISION RADAR
              </span>

              <h3>
                Perfil operacional
              </h3>
            </div>

          </div>

          <div className="decision-bars">

            {radar.map((item) => (

              <div
                className="decision-bar"
                key={item.name}
              >

                <div>

                  <span>
                    {item.name}
                  </span>

                  <b>
                    {Math.max(
                      0,
                      Math.min(
                        100,
                        item.value
                      )
                    )}
                    %
                  </b>

                </div>

                <i>
                  <em
                    style={{
                      width: `${Math.max(
                        0,
                        Math.min(
                          100,
                          item.value
                        )
                      )}%`,
                    }}
                  />
                </i>

              </div>

            ))}

          </div>

        </div>

      </div>

      {/* PIPELINE */}

      <div className="nexus-decision-pipeline">

        <div className="pipeline-title">
          <span>
            INTELLIGENCE PIPELINE
          </span>

          <small>
            análise baseada no estado atual
          </small>
        </div>

        <div className="pipeline-flow">

          {[
            [
              "01",
              "DATA",
              `${answerCount} respostas`,
            ],
            [
              "02",
              "RISK",
              `${risks.length} riscos`,
            ],
            [
              "03",
              "ACTION",
              `${actions.length} ações`,
            ],
            [
              "04",
              "LEGAL",
              `${legal.length} jurídicos`,
            ],
            [
              "05",
              "EVIDENCE",
              `${evidence.length} evidências`,
            ],
            [
              "06",
              "DECISION",
              "priorização",
            ],
          ].map(
            ([number, title, detail], index) => (

              <React.Fragment key={title}>

                <div className="pipeline-node">

                  <small>
                    {number}
                  </small>

                  <strong>
                    {title}
                  </strong>

                  <span>
                    {detail}
                  </span>

                </div>

                {index < 5 && (
                  <i className="pipeline-arrow">
                    →
                  </i>
                )}

              </React.Fragment>

            )
          )}

        </div>

      </div>

      {/* HISTÓRICO */}

      <div className="nexus-decision-footer">

        <div>
          <small>
            HISTÓRICO
          </small>

          <strong>
            {history.length}
          </strong>

          <span>
            eventos registrados
          </span>
        </div>

        <div>
          <small>
            EVIDÊNCIAS
          </small>

          <strong>
            {evidence.length}
          </strong>

          <span>
            registros disponíveis
          </span>
        </div>

        <div>
          <small>
            STATUS
          </small>

          <strong>
            {s?.review?.status ||
              "Em análise"}
          </strong>

          <span>
            ciclo atual
          </span>
        </div>

      </div>

    </section>
  );
}