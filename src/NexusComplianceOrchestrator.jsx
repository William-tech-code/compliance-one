import React, { useMemo, useState } from "react";
import "./NexusComplianceOrchestrator.css";

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function getId(item, fallback) {
  return (
    item?.id ||
    item?._id ||
    item?.uuid ||
    fallback
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

function getStatus(item) {
  return normalize(
    item?.status ||
      item?.situacao ||
      item?.state ||
      ""
  );
}

function isClosed(item) {
  return /(conclu|encerr|finaliz|cancel)/i.test(
    getStatus(item)
  );
}

function isOverdue(item) {
  return Boolean(
    item?.overdue ||
      item?.atrasada ||
      normalize(item?.status).includes(
        "atras"
      )
  );
}

export default function NexusComplianceOrchestrator({
  s,
  go,
}) {
  const [selected, setSelected] =
    useState("ORCHESTRATOR");

  const [mode, setMode] =
    useState("LIVE");

  const risks = Array.isArray(s?.risks)
    ? s.risks
    : [];

  const actions = Array.isArray(s?.actions)
    ? s.actions
    : [];

  const controls = Array.isArray(s?.controls)
    ? s.controls
    : [];

  const evidence = Array.isArray(s?.evidence)
    ? s.evidence
    : [];

  const legal = Array.isArray(s?.legal)
    ? s.legal
    : [];

  /*
   * =====================================================
   * 1. DATA GRAPH
   * =====================================================
   */

  const graph = useMemo(() => {
    const riskNodes =
      risks.map((risk, index) => ({
        id: getId(
          risk,
          `risk-${index}`
        ),
        type: "RISK",
        label:
          risk?.title ||
          risk?.name ||
          "Risco",
        score:
          getRiskScore(risk),
        source: risk,
      }));

    const actionNodes =
      actions.map((action, index) => ({
        id: getId(
          action,
          `action-${index}`
        ),
        type: "ACTION",
        label:
          action?.title ||
          action?.name ||
          "Ação",
        source: action,
      }));

    const controlNodes =
      controls.map((control, index) => ({
        id: getId(
          control,
          `control-${index}`
        ),
        type: "CONTROL",
        label:
          control?.title ||
          control?.name ||
          "Controle",
        source: control,
      }));

    const evidenceNodes =
      evidence.map((item, index) => ({
        id: getId(
          item,
          `evidence-${index}`
        ),
        type: "EVIDENCE",
        label:
          item?.title ||
          item?.name ||
          "Evidência",
        source: item,
      }));

    const legalNodes =
      legal.map((item, index) => ({
        id: getId(
          item,
          `legal-${index}`
        ),
        type: "LEGAL",
        label:
          item?.title ||
          item?.name ||
          "Jurídico",
        source: item,
      }));

    return {
      risks: riskNodes,
      actions: actionNodes,
      controls: controlNodes,
      evidence: evidenceNodes,
      legal: legalNodes,
    };
  }, [
    risks,
    actions,
    controls,
    evidence,
    legal,
  ]);

  /*
   * =====================================================
   * 2. ORCHESTRATION ENGINE
   * =====================================================
   */

  const orchestration =
    useMemo(() => {
      const incidents = [];

      graph.risks.forEach(
        (risk) => {
          const rawRisk =
            risk.source;

          const riskId =
            risk.id;

          const linkedActions =
            actions.filter(
              (action) =>
                action?.riskId ===
                  riskId ||
                action?.risk_id ===
                  riskId ||
                action?.sourceRiskId ===
                  riskId
            );

          const linkedControls =
            controls.filter(
              (control) =>
                control?.riskId ===
                  riskId ||
                control?.risk_id ===
                  riskId ||
                control?.sourceRiskId ===
                  riskId
            );

          const linkedEvidence =
            evidence.filter(
              (item) =>
                item?.riskId ===
                  riskId ||
                item?.risk_id ===
                  riskId ||
                item?.sourceRiskId ===
                  riskId
            );

          const linkedLegal =
            legal.filter(
              (item) =>
                item?.riskId ===
                  riskId ||
                item?.risk_id ===
                  riskId ||
                item?.sourceRiskId ===
                  riskId
            );

          const score =
            getRiskScore(
              rawRisk
            );

          const openActions =
            linkedActions.filter(
              (action) =>
                !isClosed(action)
            );

          const overdueActions =
            linkedActions.filter(
              (action) =>
                !isClosed(action) &&
                isOverdue(action)
            );

          /*
           * ORCHESTRATOR RULES
           */

          if (
            score >= 20
          ) {
            incidents.push({
              id:
                `critical-${riskId}`,
              risk,
              type:
                "CRITICAL_RISK",
              severity:
                "CRÍTICA",
              title:
                "Risco crítico detectado",
              description:
                "O nível de exposição exige atuação executiva.",
              action:
                "Priorizar contenção",
              score:
                score + 40,
            });
          }

          if (
            !linkedControls.length
          ) {
            incidents.push({
              id:
                `control-${riskId}`,
              risk,
              type:
                "CONTROL_GAP",
              severity:
                "ALTA",
              title:
                "Lacuna de controle",
              description:
                "O risco não possui controle associado.",
              action:
                "Criar controle",
              score:
                score + 25,
            });
          }

          if (
            !linkedEvidence.length
          ) {
            incidents.push({
              id:
                `evidence-${riskId}`,
              risk,
              type:
                "EVIDENCE_GAP",
              severity:
                "ALTA",
              title:
                "Lacuna de evidência",
              description:
                "Não foi localizada evidência vinculada ao risco.",
              action:
                "Solicitar evidência",
              score:
                score + 18,
            });
          }

          if (
            openActions.length
          ) {
            incidents.push({
              id:
                `action-${riskId}`,
              risk,
              type:
                "OPEN_ACTION",
              severity:
                "MÉDIA",
              title:
                "Ação em execução",
              description:
                `${openActions.length} ação(ões) permanecem abertas.`,
              action:
                "Monitorar execução",
              score:
                score + 12,
            });
          }

          if (
            overdueActions.length
          ) {
            incidents.push({
              id:
                `overdue-${riskId}`,
              risk,
              type:
                "OVERDUE_ACTION",
              severity:
                "CRÍTICA",
              title:
                "Ação vencida",
              description:
                `${overdueActions.length} ação(ões) ultrapassaram o prazo.`,
              action:
                "Escalonar responsável",
              score:
                score + 35,
            });
          }

          if (
            linkedLegal.length
          ) {
            incidents.push({
              id:
                `legal-${riskId}`,
              risk,
              type:
                "LEGAL_EXPOSURE",
              severity:
                "ALTA",
              title:
                "Frente jurídica relacionada",
              description:
                `${linkedLegal.length} item(ns) jurídico(s) relacionado(s).`,
              action:
                "Revisar exposição jurídica",
              score:
                score + 15,
            });
          }
        }
      );

      return incidents.sort(
        (a, b) =>
          b.score -
          a.score
      );
    }, [
      graph,
      actions,
      controls,
      evidence,
      legal,
    ]);

  /*
   * =====================================================
   * 3. EXECUTIVE STATE
   * =====================================================
   */

  const state =
    useMemo(() => {
      const critical =
        orchestration.filter(
          (item) =>
            item.severity ===
            "CRÍTICA"
        ).length;

      const high =
        orchestration.filter(
          (item) =>
            item.severity ===
            "ALTA"
        ).length;

      let status =
        "STABLE";

      if (critical >= 3) {
        status =
          "CRITICAL";
      } else if (
        critical >= 1 ||
        high >= 3
      ) {
        status =
          "ATTENTION";
      }

      return {
        critical,
        high,
        total:
          orchestration.length,
        status,
      };
    }, [
      orchestration,
    ]);

  /*
   * =====================================================
   * 4. AUTOMATED DECISION
   * =====================================================
   */

  const decision =
    orchestration[0];

  const decisionText =
    decision
      ? `${decision.title}. ${decision.description}`
      : "Nenhum evento prioritário foi identificado pelo Orchestrator.";

  /*
   * =====================================================
   * 5. SYSTEM HEALTH
   * =====================================================
   */

  const health =
    useMemo(() => {
      const total =
        risks.length +
        actions.length +
        controls.length +
        evidence.length +
        legal.length;

      const connected =
        orchestration.length;

      if (!total) {
        return 0;
      }

      return Math.max(
        0,
        Math.min(
          100,
          Math.round(
            100 -
              (connected /
                Math.max(
                  1,
                  total
                )) *
                18
          )
        )
      );
    }, [
      risks,
      actions,
      controls,
      evidence,
      legal,
      orchestration,
    ]);

  /*
   * =====================================================
   * 6. PIPELINE
   * =====================================================
   */

  const pipeline = [
    {
      label:
        "DETECT",
      value:
        risks.length
          ? `${risks.length} riscos`
          : "aguardando",
      active:
        risks.length > 0,
    },
    {
      label:
        "ANALYZE",
      value:
        orchestration.length
          ? `${orchestration.length} eventos`
          : "aguardando",
      active:
        orchestration.length > 0,
    },
    {
      label:
        "DECIDE",
      value:
        decision
          ? "prioridade definida"
          : "aguardando",
      active:
        Boolean(decision),
    },
    {
      label:
        "EXECUTE",
      value:
        actions.length
          ? `${actions.length} ações`
          : "aguardando",
      active:
        actions.length > 0,
    },
    {
      label:
        "VALIDATE",
      value:
        evidence.length
          ? `${evidence.length} evidências`
          : "aguardando",
      active:
        evidence.length > 0,
    },
  ];

  /*
   * =====================================================
   * UI
   * =====================================================
   */

  return (
    <section className="nexus-orchestrator">

      <div className="nco-grid" />

      <div className="nco-glow one" />
      <div className="nco-glow two" />

      {/* HEADER */}

      <header className="nco-header">

        <div>

          <span className="nco-eyebrow">
            NEXUS COMPLIANCE ORCHESTRATOR · 5.0
          </span>

          <h2>
            Compliance
            <strong>Orchestrator</strong>
          </h2>

          <p>
            Motor central de coordenação:
            detecta eventos, cruza informações,
            prioriza decisões e acompanha o
            ciclo operacional de Compliance.
          </p>

        </div>

        <div className="nco-live">

          <i />

          <div>
            <strong>
              ORCHESTRATOR ONLINE
            </strong>

            <small>
              CONTINUOUS COMPLIANCE LOOP
            </small>
          </div>

        </div>

      </header>

      {/* SYSTEM STATE */}

      <div className="nco-state">

        <div className="nco-state-main">

          <div className="nco-orbit">

            <div className="nco-orbit-core">

              <strong>
                {health}%
              </strong>

              <small>
                SYSTEM
              </small>

            </div>

          </div>

          <div>

            <span>
              ORCHESTRATION STATUS
            </span>

            <h3>
              {state.status ===
              "CRITICAL"
                ? "ATENÇÃO CRÍTICA"
                : state.status ===
                  "ATTENTION"
                ? "ATENÇÃO"
                : "FLUXO ESTÁVEL"}
            </h3>

            <p>
              O motor está cruzando os
              elementos disponíveis e
              identificando pontos de
              intervenção.
            </p>

          </div>

        </div>

        <div className="nco-state-metrics">

          <div>
            <small>
              EVENTOS
            </small>

            <strong>
              {state.total}
            </strong>
          </div>

          <div>
            <small>
              CRÍTICOS
            </small>

            <strong className="red">
              {state.critical}
            </strong>
          </div>

          <div>
            <small>
              ALTA
            </small>

            <strong className="orange">
              {state.high}
            </strong>
          </div>

        </div>

      </div>

      {/* LOOP */}

      <div className="nco-loop">

        <div className="nco-loop-title">

          <span>
            CONTINUOUS COMPLIANCE LOOP
          </span>

          <div>

            {["LIVE", "SIMULATION"].map(
              (item) => (

                <button
                  key={item}
                  className={
                    mode === item
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setMode(item)
                  }
                >
                  {item}
                </button>

              )
            )}

          </div>

        </div>

        <div className="nco-pipeline">

          {pipeline.map(
            (step, index) => (

              <React.Fragment
                key={step.label}
              >

                <button
                  className={
                    step.active
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setSelected(
                      step.label
                    )
                  }
                >

                  <i>
                    {index + 1}
                  </i>

                  <strong>
                    {step.label}
                  </strong>

                  <small>
                    {step.value}
                  </small>

                </button>

                {index <
                  pipeline.length - 1 && (
                  <b />
                )}

              </React.Fragment>

            )
          )}

        </div>

      </div>

      {/* MAIN */}

      <div className="nco-main">

        {/* EVENT STREAM */}

        <div className="nco-panel">

          <div className="nco-panel-title">

            <div>
              <span>
                ORCHESTRATION STREAM
              </span>

              <h3>
                Eventos Inteligentes
              </h3>
            </div>

            <b>
              {orchestration.length}
            </b>

          </div>

          {orchestration.length ? (

            <div className="nco-events">

              {orchestration
                .slice(0, 10)
                .map(
                  (item) => (

                    <button
                      key={item.id}
                      className={`nco-event ${
                        selected ===
                        item.id
                          ? "selected"
                          : ""
                      }`}
                      onClick={() =>
                        setSelected(
                          item.id
                        )
                      }
                    >

                      <div
                        className={`nco-event-dot ${
                          item.severity ===
                          "CRÍTICA"
                            ? "critical"
                            : item.severity ===
                              "ALTA"
                            ? "high"
                            : ""
                        }`}
                      />

                      <div className="nco-event-info">

                        <div>

                          <strong>
                            {item.title}
                          </strong>

                          <span>
                            {item.severity}
                          </span>

                        </div>

                        <small>
                          {item.description}
                        </small>

                      </div>

                      <div className="nco-event-score">
                        {item.score}
                      </div>

                    </button>

                  )
                )}

            </div>

          ) : (

            <div className="nco-empty">

              <span>
                ✓
              </span>

              <strong>
                Nenhum evento prioritário
              </strong>

              <small>
                O Orchestrator está aguardando
                dados para iniciar a análise.
              </small>

            </div>

          )}

        </div>

        {/* DECISION CENTER */}

        <aside className="nco-panel nco-decision">

          <div className="nco-panel-title">

            <div>
              <span>
                DECISION CENTER
              </span>

              <h3>
                Próxima decisão
              </h3>
            </div>

            <b>
              AI
            </b>

          </div>

          {decision ? (

            <>

              <div className="nco-decision-alert">

                <small>
                  PRIORIDADE
                </small>

                <strong>
                  {decision.severity}
                </strong>

              </div>

              <h4>
                {decision.title}
              </h4>

              <p>
                {decisionText}
              </p>

              <div className="nco-action">

                <span>
                  AÇÃO RECOMENDADA
                </span>

                <strong>
                  {decision.action}
                </strong>

              </div>

              <button
                onClick={() =>
                  go?.("riscos")
                }
              >
                Abrir contexto
                <span>
                  →
                </span>
              </button>

            </>

          ) : (

            <div className="nco-empty small">

              <span>
                ◎
              </span>

              <strong>
                Sem decisão pendente
              </strong>

              <small>
                O sistema está estável.
              </small>

            </div>

          )}

        </aside>

      </div>

      {/* KNOWLEDGE MATRIX */}

      <div className="nco-matrix">

        <div className="nco-panel-title">

          <div>
            <span>
              COMPLIANCE KNOWLEDGE GRAPH
            </span>

            <h3>
              Estado dos domínios
            </h3>
          </div>

          <b>
            LIVE
          </b>

        </div>

        <div className="nco-matrix-grid">

          {[
            [
              "RISCOS",
              risks.length,
              "red",
            ],
            [
              "AÇÕES",
              actions.length,
              "blue",
            ],
            [
              "CONTROLES",
              controls.length,
              "cyan",
            ],
            [
              "EVIDÊNCIAS",
              evidence.length,
              "green",
            ],
            [
              "JURÍDICO",
              legal.length,
              "purple",
            ],
          ].map(
            ([label, value, color]) => (

              <button
                key={label}
                className={`nco-domain ${color}`}
                onClick={() =>
                  setSelected(label)
                }
              >

                <small>
                  {label}
                </small>

                <strong>
                  {value}
                </strong>

                <i />

              </button>

            )
          )}

        </div>

      </div>

    </section>
  );
}