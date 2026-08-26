import React, { useMemo, useState } from "react";
import "./NexusExecutiveIntelligence.css";

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function isOpen(value) {
  return !/(conclu|encerr|finaliz|cancel)/i.test(
    String(value || "")
  );
}

function getRiskScore(risk) {
  return Number(
    risk?.score ||
      risk?.riskScore ||
      risk?.pontuacao ||
      0
  );
}

function getRiskLevel(risk) {
  const level = normalize(
    risk?.level ||
      risk?.nivel ||
      risk?.severity
  );

  if (level.includes("crit")) return "CRÍTICO";
  if (level.includes("alto")) return "ALTO";
  if (level.includes("medio")) return "MÉDIO";

  const score = getRiskScore(risk);

  if (score >= 20) return "CRÍTICO";
  if (score >= 10) return "ALTO";
  if (score >= 5) return "MÉDIO";

  return "BAIXO";
}

export default function NexusExecutiveIntelligence({
  s,
  maturity = 0,
  go,
}) {
  const [selected, setSelected] =
    useState(null);

  const risks = Array.isArray(s?.risks)
    ? s.risks
    : [];

  const actions = Array.isArray(s?.actions)
    ? s.actions
    : [];

  const evidence = Array.isArray(s?.evidence)
    ? s.evidence
    : [];

  const legal = Array.isArray(s?.legal)
    ? s.legal
    : [];

  const controls = Array.isArray(s?.controls)
    ? s.controls
    : [];

  /*
   * =====================================================
   * EXECUTIVE INTELLIGENCE ENGINE
   * =====================================================
   */

  const intelligence = useMemo(() => {
    const criticalRisks =
      risks.filter(
        (risk) =>
          getRiskLevel(risk) ===
          "CRÍTICO"
      );

    const highRisks =
      risks.filter(
        (risk) =>
          getRiskLevel(risk) ===
          "ALTO"
      );

    const openActions =
      actions.filter(
        (action) =>
          isOpen(action.status)
      );

    const openLegal =
      legal.filter(
        (item) =>
          isOpen(item.status)
      );

    const uncoveredRisks =
      risks.filter(
        (risk) => {
          const id =
            risk.id ||
            risk._id;

          const linkedEvidence =
            evidence.some(
              (item) =>
                item.riskId === id ||
                item.risk_id === id ||
                item.sourceRiskId === id
            );

          return !linkedEvidence;
        }
      );

    const uncoveredControls =
      risks.filter(
        (risk) => {
          const id =
            risk.id ||
            risk._id;

          const linkedControl =
            controls.some(
              (item) =>
                item.riskId === id ||
                item.risk_id === id ||
                item.sourceRiskId === id
            );

          return !linkedControl;
        }
      );

    const riskExposure =
      risks.reduce(
        (sum, risk) =>
          sum + getRiskScore(risk),
        0
      );

    const averageRisk =
      risks.length
        ? Math.round(
            riskExposure /
              risks.length
          )
        : 0;

    const controlCoverage =
      risks.length
        ? Math.round(
            ((risks.length -
              uncoveredControls.length) /
              risks.length) *
              100
          )
        : 0;

    const evidenceCoverage =
      risks.length
        ? Math.round(
            ((risks.length -
              uncoveredRisks.length) /
              risks.length) *
              100
          )
        : 0;

    let executiveScore =
      Number(maturity) || 0;

    executiveScore =
      executiveScore * 0.35 +
      controlCoverage * 0.25 +
      evidenceCoverage * 0.2 +
      Math.max(
        0,
        100 -
          criticalRisks.length *
            15 -
          highRisks.length * 5
      ) *
        0.2;

    executiveScore = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          executiveScore
        )
      )
    );

    let state =
      "ESTÁVEL";

    if (
      criticalRisks.length >= 2 ||
      executiveScore < 45
    ) {
      state = "ATENÇÃO CRÍTICA";
    } else if (
      criticalRisks.length ||
      highRisks.length >= 3 ||
      executiveScore < 65
    ) {
      state = "ATENÇÃO";
    } else if (
      executiveScore >= 80
    ) {
      state = "CONTROLADO";
    }

    const priorityCandidates =
      risks.map(
        (risk, index) => {
          const score =
            getRiskScore(risk);

          const level =
            getRiskLevel(risk);

          const id =
            risk.id ||
            risk._id ||
            `risk-${index}`;

          const linkedEvidence =
            evidence.filter(
              (item) =>
                item.riskId === id ||
                item.risk_id === id ||
                item.sourceRiskId === id
            );

          const linkedActions =
            actions.filter(
              (item) =>
                item.riskId === id ||
                item.risk_id === id ||
                item.sourceRiskId === id
            );

          const linkedLegal =
            legal.filter(
              (item) =>
                item.riskId === id ||
                item.risk_id === id ||
                item.sourceRiskId === id
            );

          const linkedControls =
            controls.filter(
              (item) =>
                item.riskId === id ||
                item.risk_id === id ||
                item.sourceRiskId === id
            );

          let priority =
            score;

          if (
            level === "CRÍTICO"
          ) {
            priority += 35;
          } else if (
            level === "ALTO"
          ) {
            priority += 20;
          }

          if (
            !linkedEvidence.length
          ) {
            priority += 15;
          }

          if (
            !linkedControls.length
          ) {
            priority += 12;
          }

          if (
            linkedLegal.length
          ) {
            priority +=
              linkedLegal.length * 5;
          }

          const pending =
            linkedActions.filter(
              (item) =>
                isOpen(item.status)
            ).length;

          priority +=
            pending * 7;

          return {
            id,
            risk,
            level,
            score,
            priority,
            evidence:
              linkedEvidence,
            actions:
              linkedActions,
            legal:
              linkedLegal,
            controls:
              linkedControls,
            pending,
          };
        }
      )
      .sort(
        (a, b) =>
          b.priority -
          a.priority
      )
      .slice(0, 5);

    return {
      criticalRisks,
      highRisks,
      openActions,
      openLegal,
      uncoveredRisks,
      uncoveredControls,
      riskExposure,
      averageRisk,
      controlCoverage,
      evidenceCoverage,
      executiveScore,
      state,
      priorityCandidates,
    };
  }, [
    risks,
    actions,
    evidence,
    legal,
    controls,
    maturity,
  ]);

  /*
   * =====================================================
   * RECOMMENDATION ENGINE
   * =====================================================
   */

  const recommendation = useMemo(() => {
    const top =
      intelligence.priorityCandidates[0];

    if (!top) {
      return {
        title:
          "Inicie o diagnóstico de Compliance",
        text:
          "O NEXUS ainda não possui dados suficientes para gerar uma recomendação executiva.",
        urgency:
          "INICIAL",
        action:
          "Executar diagnóstico",
      };
    }

    if (
      top.level === "CRÍTICO"
    ) {
      return {
        title:
          "Conter exposição crítica",
        text:
          "O risco prioritário apresenta exposição elevada e deve ser tratado antes da expansão de novas iniciativas.",
        urgency:
          "IMEDIATA",
        action:
          "Abrir plano de resposta",
      };
    }

    if (
      top.pending > 0
    ) {
      return {
        title:
          "Desbloquear ações pendentes",
        text:
          "Existem ações associadas ao risco prioritário que permanecem abertas.",
        urgency:
          "ALTA",
        action:
          "Revisar ações",
      };
    }

    if (
      !top.evidence.length
    ) {
      return {
        title:
          "Construir trilha de evidências",
        text:
          "O risco prioritário não possui evidência vinculada suficiente para demonstrar a efetividade do controle.",
        urgency:
          "ALTA",
        action:
          "Adicionar evidências",
      };
    }

    if (
      !top.controls.length
    ) {
      return {
        title:
          "Implantar controle",
        text:
          "O risco prioritário não apresenta controle associado no grafo de Compliance.",
        urgency:
          "ALTA",
        action:
          "Criar controle",
      };
    }

    return {
      title:
        "Otimizar controle prioritário",
      text:
        "A estrutura apresenta cobertura, mas o risco prioritário ainda merece acompanhamento executivo.",
      urgency:
        "MODERADA",
      action:
        "Abrir inteligência de riscos",
    };
  }, [
    intelligence.priorityCandidates,
  ]);

  const selectedItem =
    intelligence.priorityCandidates.find(
      (item) =>
        item.id === selected
    ) ||
    intelligence.priorityCandidates[0];

  /*
   * =====================================================
   * EXECUTIVE NARRATIVE
   * =====================================================
   */

  const narrative = useMemo(() => {
    const {
      executiveScore,
      criticalRisks,
      highRisks,
      openActions,
      openLegal,
      controlCoverage,
      evidenceCoverage,
    } = intelligence;

    if (!risks.length) {
      return (
        "O NEXUS ainda não possui dados suficientes para formar uma leitura executiva. Execute o diagnóstico para ativar a inteligência."
      );
    }

    if (
      criticalRisks.length
    ) {
      return `A organização apresenta ${criticalRisks.length} risco(s) crítico(s). A prioridade executiva deve ser concentrada na contenção da exposição, no tratamento das ações pendentes e na criação de evidências que demonstrem a efetividade dos controles.`;
    }

    if (
      executiveScore < 60
    ) {
      return `A maturidade atual indica uma estrutura em desenvolvimento. O principal ganho executivo está na transformação dos controles existentes em processos documentados, mensuráveis e rastreáveis.`;
    }

    if (
      openLegal.length
    ) {
      return `A estrutura apresenta capacidade operacional, porém existem ${openLegal.length} frente(s) jurídica(s) aberta(s) que merecem acompanhamento executivo para evitar crescimento da exposição.`;
    }

    if (
      openActions.length
    ) {
      return `A organização apresenta uma base relativamente controlada, mas possui ${openActions.length} ação(ões) aberta(s). O próximo ganho de maturidade está na execução disciplinada dos planos existentes.`;
    }

    if (
      controlCoverage >= 80 &&
      evidenceCoverage >= 80
    ) {
      return "A organização demonstra uma estrutura de Compliance bem coberta e rastreável. O foco executivo deve migrar da correção para a prevenção, monitoramento e melhoria contínua.";
    }

    return "A organização apresenta uma estrutura intermediária de Compliance. O principal objetivo deve ser aumentar a cobertura dos controles e fortalecer a trilha de evidências.";
  }, [
    intelligence,
    risks.length,
  ]);

  return (
    <section className="nexus-executive">

      <div className="nei-grid" />

      <div className="nei-glow one" />
      <div className="nei-glow two" />

      {/* HEADER */}

      <header className="nei-header">

        <div>

          <span className="nei-eyebrow">
            NEXUS EXECUTIVE INTELLIGENCE · 3.0
          </span>

          <h2>
            Executive
            <strong>Intelligence</strong>
          </h2>

          <p>
            Síntese executiva gerada a partir
            dos riscos, controles, evidências,
            ações e frentes jurídicas.
          </p>

        </div>

        <div className="nei-live">

          <i />

          <div>
            <strong>
              INTELLIGENCE ONLINE
            </strong>

            <small>
              DECISION SUPPORT ACTIVE
            </small>
          </div>

        </div>

      </header>

      {/* TOP SCORE */}

      <div className="nei-top">

        <div className="nei-score-panel">

          <div className="nei-score-ring">

            <div>

              <strong>
                {intelligence.executiveScore}
              </strong>

              <span>
                EXECUTIVE
              </span>

            </div>

          </div>

          <div className="nei-score-info">

            <small>
              STATUS EXECUTIVO
            </small>

            <h3>
              {intelligence.state}
            </h3>

            <p>
              Score consolidado de
              maturidade, controle,
              evidência e exposição.
            </p>

          </div>

        </div>

        <div className="nei-metrics">

          <article>
            <small>
              EXPOSIÇÃO
            </small>

            <strong>
              {intelligence.riskExposure}
            </strong>

            <span>
              pontos de risco
            </span>
          </article>

          <article>
            <small>
              CRÍTICOS
            </small>

            <strong className="red">
              {intelligence.criticalRisks.length}
            </strong>

            <span>
              riscos prioritários
            </span>
          </article>

          <article>
            <small>
              CONTROLES
            </small>

            <strong className="green">
              {intelligence.controlCoverage}%
            </strong>

            <span>
              cobertura estimada
            </span>
          </article>

          <article>
            <small>
              EVIDÊNCIAS
            </small>

            <strong>
              {intelligence.evidenceCoverage}%
            </strong>

            <span>
              rastreabilidade
            </span>
          </article>

        </div>

      </div>

      {/* EXECUTIVE NARRATIVE */}

      <div className="nei-narrative">

        <div className="nei-narrative-icon">
          ✦
        </div>

        <div>

          <span>
            EXECUTIVE BRIEFING
          </span>

          <p>
            {narrative}
          </p>

        </div>

      </div>

      {/* MAIN */}

      <div className="nei-main">

        {/* PRIORITIES */}

        <div className="nei-panel">

          <div className="nei-panel-title">

            <div>
              <span>
                PRIORITY MATRIX
              </span>

              <h3>
                Prioridades Executivas
              </h3>
            </div>

            <b>
              TOP 5
            </b>

          </div>

          {intelligence.priorityCandidates.length ? (

            <div className="nei-priority-list">

              {intelligence.priorityCandidates.map(
                (item, index) => (

                  <button
                    key={item.id}
                    className={`nei-priority ${
                      selectedItem?.id ===
                      item.id
                        ? "active"
                        : ""
                    }`}
                    onClick={() =>
                      setSelected(
                        item.id
                      )
                    }
                  >

                    <div className="nei-rank">
                      {String(
                        index + 1
                      ).padStart(
                        2,
                        "0"
                      )}
                    </div>

                    <div className="nei-priority-info">

                      <div>

                        <strong>
                          {item.risk.title ||
                            item.risk.name ||
                            "Risco sem título"}
                        </strong>

                        <span
                          className={
                            item.level ===
                            "CRÍTICO"
                              ? "critical"
                              : item.level ===
                                "ALTO"
                              ? "high"
                              : ""
                          }
                        >
                          {item.level}
                        </span>

                      </div>

                      <small>
                        Prioridade:
                        {" "}
                        {item.priority}
                        {" · "}
                        {item.pending}
                        {" "}
                        ação(ões) abertas
                      </small>

                      <i>
                        <em
                          style={{
                            width:
                              `${Math.min(
                                100,
                                item.priority
                              )}%`,
                          }}
                        />
                      </i>

                    </div>

                    <span className="nei-arrow">
                      →
                    </span>

                  </button>

                )
              )}

            </div>

          ) : (

            <div className="nei-empty">

              <span>
                ◎
              </span>

              <strong>
                Nenhuma prioridade calculada
              </strong>

              <small>
                Execute o diagnóstico para
                ativar a matriz executiva.
              </small>

            </div>

          )}

        </div>

        {/* RECOMMENDATION */}

        <aside className="nei-panel nei-recommendation">

          <div className="nei-panel-title">

            <div>
              <span>
                DECISION SUPPORT
              </span>

              <h3>
                Recomendação
              </h3>
            </div>

            <b>
              AI
            </b>

          </div>

          <div className="nei-rec-alert">

            <small>
              URGÊNCIA
            </small>

            <strong>
              {recommendation.urgency}
            </strong>

          </div>

          <h4>
            {recommendation.title}
          </h4>

          <p>
            {recommendation.text}
          </p>

          <button
            onClick={() =>
              go?.("riscos")
            }
          >
            {recommendation.action}

            <span>
              →
            </span>
          </button>

        </aside>

      </div>

      {/* SELECTED RISK */}

      {selectedItem && (

        <div className="nei-selected">

          <div>

            <span>
              CURRENT EXECUTIVE FOCUS
            </span>

            <h3>
              {selectedItem.risk.title ||
                selectedItem.risk.name ||
                "Risco prioritário"}
            </h3>

            <p>
              Este risco concentra atualmente
              o maior nível de prioridade
              calculada pelo Intelligence Engine.
            </p>

          </div>

          <div className="nei-selected-stats">

            <div>
              <small>
                SCORE
              </small>

              <strong>
                {selectedItem.score}
              </strong>
            </div>

            <div>
              <small>
                AÇÕES
              </small>

              <strong>
                {selectedItem.actions.length}
              </strong>
            </div>

            <div>
              <small>
                EVIDÊNCIAS
              </small>

              <strong>
                {selectedItem.evidence.length}
              </strong>
            </div>

            <div>
              <small>
                JURÍDICO
              </small>

              <strong>
                {selectedItem.legal.length}
              </strong>
            </div>

          </div>

          <button
            onClick={() =>
              go?.("riscos")
            }
          >
            Abrir inteligência
            <span>
              →
            </span>
          </button>

        </div>

      )}

    </section>
  );
}