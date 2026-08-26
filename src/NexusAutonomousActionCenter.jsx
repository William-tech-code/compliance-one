import React, { useMemo, useState } from "react";
import "./NexusAutonomousActionCenter.css";

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

function getPriority(action, risk) {
  const status = normalize(
    action?.priority ||
      action?.prioridade ||
      action?.severity
  );

  if (status.includes("crit")) return "CRÍTICA";
  if (status.includes("alta")) return "ALTA";
  if (status.includes("media")) return "MÉDIA";

  const riskScore = Number(
    risk?.score ||
      risk?.riskScore ||
      0
  );

  if (riskScore >= 20) return "CRÍTICA";
  if (riskScore >= 10) return "ALTA";

  return "MÉDIA";
}

function getProgress(action) {
  const value = Number(
    action?.progress ??
      action?.progresso ??
      action?.completion ??
      0
  );

  return Math.max(
    0,
    Math.min(100, value)
  );
}

function getRiskForAction(action, risks) {
  const id =
    action?.riskId ||
    action?.risk_id ||
    action?.sourceRiskId;

  if (id) {
    return (
      risks.find(
        (risk) =>
          risk?.id === id ||
          risk?._id === id
      ) || null
    );
  }

  return null;
}

export default function NexusAutonomousActionCenter({
  s,
  go,
}) {
  const [filter, setFilter] =
    useState("TODAS");

  const [selectedId, setSelectedId] =
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

  /*
   * =====================================================
   * ACTION INTELLIGENCE ENGINE
   * =====================================================
   */

  const actionIntel = useMemo(() => {
    return actions.map(
      (action, index) => {
        const id =
          action?.id ||
          action?._id ||
          `action-${index}`;

        const risk =
          getRiskForAction(
            action,
            risks
          );

        const priority =
          getPriority(
            action,
            risk
          );

        const progress =
          getProgress(action);

        const status =
          normalize(
            action?.status ||
              action?.situacao ||
              ""
          );

        const overdue =
          Boolean(
            action?.overdue ||
              action?.atrasada ||
              status.includes("atras")
          );

        const deadline =
          action?.deadline ||
          action?.prazo ||
          action?.dueDate ||
          action?.dataLimite ||
          null;

        const responsible =
          action?.responsible ||
          action?.responsavel ||
          action?.owner ||
          "Não definido";

        const linkedEvidence =
          evidence.filter(
            (item) =>
              item?.actionId === id ||
              item?.action_id === id ||
              item?.sourceActionId === id
          );

        const open =
          isOpen(action?.status);

        let urgency =
          priority === "CRÍTICA"
            ? 35
            : priority === "ALTA"
            ? 22
            : 10;

        if (open) {
          urgency += 15;
        }

        if (progress < 50) {
          urgency += 10;
        }

        if (overdue) {
          urgency += 25;
        }

        if (!responsible ||
            responsible ===
              "Não definido") {
          urgency += 10;
        }

        if (
          !linkedEvidence.length
        ) {
          urgency += 8;
        }

        if (risk) {
          urgency += Number(
            risk?.score ||
              risk?.riskScore ||
              0
          );
        }

        return {
          id,
          action,
          risk,
          priority,
          progress,
          overdue,
          deadline,
          responsible,
          linkedEvidence,
          open,
          urgency,
        };
      }
    );
  }, [
    actions,
    risks,
    evidence,
  ]);

  /*
   * =====================================================
   * METRICS
   * =====================================================
   */

  const metrics = useMemo(() => {
    const open =
      actionIntel.filter(
        (item) => item.open
      );

    const overdue =
      actionIntel.filter(
        (item) => item.overdue
      );

    const critical =
      actionIntel.filter(
        (item) =>
          item.priority ===
          "CRÍTICA"
      );

    const withoutOwner =
      actionIntel.filter(
        (item) =>
          !item.responsible ||
          item.responsible ===
            "Não definido"
      );

    const completed =
      actionIntel.filter(
        (item) => !item.open
      );

    const averageProgress =
      actionIntel.length
        ? Math.round(
            actionIntel.reduce(
              (sum, item) =>
                sum + item.progress,
              0
            ) /
              actionIntel.length
          )
        : 0;

    return {
      total: actionIntel.length,
      open: open.length,
      overdue: overdue.length,
      critical: critical.length,
      withoutOwner:
        withoutOwner.length,
      completed:
        completed.length,
      averageProgress,
    };
  }, [actionIntel]);

  /*
   * =====================================================
   * PRIORITY ORDER
   * =====================================================
   */

  const orderedActions =
    useMemo(() => {
      return [...actionIntel].sort(
        (a, b) =>
          b.urgency -
          a.urgency
      );
    }, [actionIntel]);

  const filteredActions =
    useMemo(() => {
      if (filter === "TODAS") {
        return orderedActions;
      }

      return orderedActions.filter(
        (item) =>
          item.priority ===
          filter
      );
    }, [
      orderedActions,
      filter,
    ]);

  const selected =
    filteredActions.find(
      (item) =>
        item.id === selectedId
    ) ||
    orderedActions[0];

  /*
   * =====================================================
   * AUTONOMOUS RECOMMENDATION
   * =====================================================
   */

  const recommendation =
    useMemo(() => {
      if (!orderedActions.length) {
        return {
          title:
            "Nenhuma ação operacional identificada",
          text:
            "O NEXUS não encontrou ações suficientes para gerar uma intervenção automática.",
          urgency:
            "INICIAL",
        };
      }

      const item =
        orderedActions[0];

      if (item.overdue) {
        return {
          title:
            "Escalonar ação vencida",
          text:
            "A ação prioritária ultrapassou o prazo identificado. Recomenda-se intervenção imediata do responsável ou gestor.",
          urgency:
            "IMEDIATA",
        };
      }

      if (
        item.priority ===
          "CRÍTICA" &&
        item.progress < 70
      ) {
        return {
          title:
            "Intervir em ação crítica",
          text:
            "A ação está associada a uma exposição elevada e ainda não apresenta progresso suficiente.",
          urgency:
            "IMEDIATA",
        };
      }

      if (
        item.progress < 50
      ) {
        return {
          title:
            "Acelerar execução",
          text:
            "A ação prioritária permanece com baixo nível de conclusão.",
          urgency:
            "ALTA",
        };
      }

      if (
        item.responsible ===
        "Não definido"
      ) {
        return {
          title:
            "Definir responsável",
          text:
            "A ausência de responsável reduz a capacidade de execução e rastreabilidade.",
          urgency:
            "ALTA",
        };
      }

      if (
        !item.linkedEvidence.length
      ) {
        return {
          title:
            "Solicitar evidência",
          text:
            "A ação apresenta execução, mas não possui evidência vinculada suficiente para comprovação.",
          urgency:
            "MODERADA",
        };
      }

      return {
        title:
          "Manter monitoramento",
        text:
          "As ações prioritárias apresentam evolução compatível com o nível de exposição atual.",
        urgency:
          "MONITORAR",
      };
    }, [
      orderedActions,
    ]);

  /*
   * =====================================================
   * PIPELINE
   * =====================================================
   */

  const pipeline = [
    {
      label: "RISCO",
      value: selected?.risk
        ? "IDENTIFICADO"
        : "—",
      active: Boolean(
        selected?.risk
      ),
    },
    {
      label: "DECISÃO",
      value: selected
        ? "PRIORIZADA"
        : "—",
      active: Boolean(selected),
    },
    {
      label: "AÇÃO",
      value: selected
        ? "EM EXECUÇÃO"
        : "—",
      active: Boolean(selected),
    },
    {
      label: "EVIDÊNCIA",
      value:
        selected?.linkedEvidence
          ?.length
          ? "VINCULADA"
          : "PENDENTE",
      active: Boolean(
        selected?.linkedEvidence
          ?.length
      ),
    },
    {
      label: "VALIDAÇÃO",
      value:
        selected?.progress >= 100
          ? "CONCLUÍDA"
          : "PENDENTE",
      active:
        selected?.progress >= 100,
    },
  ];

  return (
    <section className="nexus-action-center">

      <div className="nac-grid" />

      <div className="nac-glow one" />
      <div className="nac-glow two" />

      {/* HEADER */}

      <header className="nac-header">

        <div>

          <span className="nac-eyebrow">
            NEXUS AUTONOMOUS ACTION CENTER · 4.0
          </span>

          <h2>
            Autonomous
            <strong>Action Center</strong>
          </h2>

          <p>
            Transforme inteligência em execução:
            prioridade, responsável, prazo,
            evidência e validação.
          </p>

        </div>

        <div className="nac-live">

          <i />

          <div>
            <strong>
              ACTION ENGINE ONLINE
            </strong>

            <small>
              AUTONOMOUS PRIORITIZATION ACTIVE
            </small>
          </div>

        </div>

      </header>

      {/* KPI */}

      <div className="nac-kpis">

        <article>
          <small>
            AÇÕES
          </small>

          <strong>
            {metrics.total}
          </strong>

          <span>
            total monitorado
          </span>
        </article>

        <article>
          <small>
            ABERTAS
          </small>

          <strong>
            {metrics.open}
          </strong>

          <span>
            execução pendente
          </span>
        </article>

        <article>
          <small>
            VENCIDAS
          </small>

          <strong className="red">
            {metrics.overdue}
          </strong>

          <span>
            requerem intervenção
          </span>
        </article>

        <article>
          <small>
            PROGRESSO
          </small>

          <strong className="green">
            {metrics.averageProgress}%
          </strong>

          <span>
            execução média
          </span>
        </article>

      </div>

      {/* AUTONOMOUS RECOMMENDATION */}

      <div className="nac-recommendation">

        <div className="nac-rec-icon">
          ⚡
        </div>

        <div className="nac-rec-body">

          <span>
            AUTONOMOUS RECOMMENDATION
          </span>

          <h3>
            {recommendation.title}
          </h3>

          <p>
            {recommendation.text}
          </p>

        </div>

        <div className="nac-rec-urgency">

          <small>
            URGÊNCIA
          </small>

          <strong>
            {recommendation.urgency}
          </strong>

        </div>

      </div>

      {/* MAIN */}

      <div className="nac-main">

        {/* ACTION QUEUE */}

        <div className="nac-panel">

          <div className="nac-panel-title">

            <div>
              <span>
                EXECUTION QUEUE
              </span>

              <h3>
                Fila de Ações Inteligente
              </h3>
            </div>

            <b>
              LIVE
            </b>

          </div>

          <div className="nac-filters">

            {[
              "TODAS",
              "CRÍTICA",
              "ALTA",
              "MÉDIA",
            ].map(
              (item) => (

                <button
                  key={item}
                  className={
                    filter === item
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setFilter(item)
                  }
                >
                  {item}
                </button>

              )
            )}

          </div>

          {filteredActions.length ? (

            <div className="nac-action-list">

              {filteredActions
                .slice(0, 8)
                .map(
                  (item, index) => (

                    <button
                      key={item.id}
                      className={`nac-action ${
                        selected?.id ===
                        item.id
                          ? "selected"
                          : ""
                      } ${
                        item.overdue
                          ? "overdue"
                          : ""
                      }`}
                      onClick={() =>
                        setSelectedId(
                          item.id
                        )
                      }
                    >

                      <div className="nac-action-rank">
                        {String(
                          index + 1
                        ).padStart(
                          2,
                          "0"
                        )}
                      </div>

                      <div className="nac-action-content">

                        <div>

                          <strong>
                            {item.action?.title ||
                              item.action?.name ||
                              "Ação sem título"}
                          </strong>

                          <span
                            className={
                              item.priority ===
                              "CRÍTICA"
                                ? "critical"
                                : item.priority ===
                                  "ALTA"
                                ? "high"
                                : ""
                            }
                          >
                            {item.priority}
                          </span>

                        </div>

                        <small>
                          {item.responsible}
                          {" · "}
                          {item.deadline ||
                            "Sem prazo"}
                        </small>

                        <i>
                          <em
                            style={{
                              width:
                                `${item.progress}%`,
                            }}
                          />
                        </i>

                      </div>

                      <div className="nac-action-progress">
                        {item.progress}%
                      </div>

                    </button>

                  )
                )}

            </div>

          ) : (

            <div className="nac-empty">

              <span>
                ✓
              </span>

              <strong>
                Nenhuma ação encontrada
              </strong>

              <small>
                Ajuste o filtro ou registre
                novas ações no sistema.
              </small>

            </div>

          )}

        </div>

        {/* INSPECTOR */}

        <aside className="nac-panel nac-inspector">

          <div className="nac-panel-title">

            <div>
              <span>
                ACTION INSPECTOR
              </span>

              <h3>
                Execução
              </h3>
            </div>

            <b>
              AI
            </b>

          </div>

          {selected ? (

            <>

              <div className="nac-selected">

                <small>
                  {selected.priority}
                </small>

                <h4>
                  {selected.action?.title ||
                    selected.action?.name ||
                    "Ação selecionada"}
                </h4>

                <div
                  className={
                    selected.overdue
                      ? "danger"
                      : "safe"
                  }
                >
                  {selected.overdue
                    ? "AÇÃO VENCIDA"
                    : "EM MONITORAMENTO"}
                </div>

              </div>

              <div className="nac-details">

                <div>
                  <span>
                    RESPONSÁVEL
                  </span>

                  <strong>
                    {selected.responsible}
                  </strong>
                </div>

                <div>
                  <span>
                    PRAZO
                  </span>

                  <strong>
                    {selected.deadline ||
                      "Não definido"}
                  </strong>
                </div>

                <div>
                  <span>
                    PROGRESSO
                  </span>

                  <strong>
                    {selected.progress}%
                  </strong>
                </div>

                <div>
                  <span>
                    EVIDÊNCIAS
                  </span>

                  <strong>
                    {selected.linkedEvidence.length}
                  </strong>
                </div>

              </div>

              <div className="nac-pipeline">

                <span>
                  COMPLIANCE EXECUTION PIPELINE
                </span>

                <div>

                  {pipeline.map(
                    (step, index) => (

                      <React.Fragment
                        key={step.label}
                      >

                        <div
                          className={
                            step.active
                              ? "active"
                              : ""
                          }
                        >
                          <i>
                            {index + 1}
                          </i>

                          <small>
                            {step.label}
                          </small>

                          <em>
                            {step.value}
                          </em>
                        </div>

                        {index <
                          pipeline.length -
                            1 && (
                          <b />
                        )}

                      </React.Fragment>

                    )
                  )}

                </div>

              </div>

              <button
                className="nac-open"
                onClick={() =>
                  go?.("acoes")
                }
              >
                Abrir ação completa
                <span>
                  →
                </span>
              </button>

            </>

          ) : (

            <div className="nac-empty inspector">

              <span>
                ◎
              </span>

              <strong>
                Selecione uma ação
              </strong>

              <small>
                A inteligência operacional
                aparecerá aqui.
              </small>

            </div>

          )}

        </aside>

      </div>

      {/* EXECUTION STATUS */}

      <div className="nac-status">

        <div className="nac-panel-title">

          <div>
            <span>
              AUTONOMOUS CONTROL
            </span>

            <h3>
              Estado operacional
            </h3>
          </div>

        </div>

        <div className="nac-status-grid">

          <div>
            <small>
              AÇÕES CRÍTICAS
            </small>

            <strong>
              {metrics.critical}
            </strong>

            <span>
              requerem priorização
            </span>
          </div>

          <div>
            <small>
              SEM RESPONSÁVEL
            </small>

            <strong>
              {metrics.withoutOwner}
            </strong>

            <span>
              precisam de atribuição
            </span>
          </div>

          <div>
            <small>
              CONCLUÍDAS
            </small>

            <strong>
              {metrics.completed}
            </strong>

            <span>
              fora da fila ativa
            </span>
          </div>

          <div>
            <small>
              ESCALONAMENTO
            </small>

            <strong
              className={
                metrics.overdue
                  ? "red"
                  : "green"
              }
            >
              {metrics.overdue
                ? "ATIVO"
                : "NORMAL"}
            </strong>

            <span>
              motor de intervenção
            </span>
          </div>

        </div>

      </div>

    </section>
  );
}