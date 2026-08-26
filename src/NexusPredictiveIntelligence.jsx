import React, { useMemo, useState } from "react";
import "./NexusPredictiveIntelligence.css";

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function num(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function openStatus(value) {
  return !/(conclu|encerr|finaliz|cancel)/i.test(
    String(value || "")
  );
}

export default function NexusPredictiveIntelligence({
  s,
  maturity = 0,
  go,
}) {
  const [mode, setMode] = useState("forecast");

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

  const history = Array.isArray(s?.history)
    ? s.history
    : [];

  /*
   * =====================================================
   * BASE ANALYSIS
   * =====================================================
   */

  const analysis = useMemo(() => {
    return risks.map((risk) => {
      const level = normalize(
        risk.level ||
          risk.nivel ||
          risk.severity
      );

      const score = num(
        risk.score ||
          risk.riskScore ||
          risk.rating
      );

      const critical =
        level.includes("critico");

      const high =
        level.includes("alto");

      const relatedActions =
        actions.filter(
          (action) =>
            action.riskId === risk.id ||
            action.risk_id === risk.id
        );

      const relatedEvidence =
        evidence.filter(
          (item) =>
            item.riskId === risk.id ||
            item.risk_id === risk.id ||
            item.sourceRiskId === risk.id
        );

      const relatedLegal =
        legal.filter(
          (item) =>
            item.riskId === risk.id ||
            item.risk_id === risk.id
        );

      const pendingActions =
        relatedActions.filter(
          (action) =>
            openStatus(action.status)
        );

      /*
       * PRESSURE:
       * mede o quanto o risco está pressionando
       * o ambiente neste momento.
       */

      let pressure = score;

      if (critical) {
        pressure += 25;
      } else if (high) {
        pressure += 12;
      }

      if (pendingActions.length) {
        pressure +=
          pendingActions.length * 6;
      }

      if (!relatedEvidence.length) {
        pressure += 9;
      }

      if (relatedLegal.length) {
        pressure +=
          relatedLegal.length * 7;
      }

      /*
       * VELOCITY:
       * representa a tendência estimada.
       *
       * Não é previsão estatística real.
       * É um indicador heurístico baseado
       * no estado atual do ambiente.
       */

      let velocity = 0;

      if (critical) velocity += 8;
      if (high) velocity += 5;
      if (pendingActions.length) velocity += 3;
      if (!relatedEvidence.length) velocity += 3;
      if (relatedLegal.length) velocity += 2;

      if (pressure >= 40) {
        velocity += 4;
      }

      const probability = Math.max(
        5,
        Math.min(
          95,
          Math.round(
            25 +
              pressure * 0.55 +
              velocity
          )
        )
      );

      let forecast =
        "ESTÁVEL";

      if (probability >= 80) {
        forecast = "CRÍTICO";
      } else if (probability >= 65) {
        forecast = "ASCENDENTE";
      } else if (probability >= 45) {
        forecast = "ATENÇÃO";
      }

      return {
        risk,
        pressure,
        velocity,
        probability,
        forecast,
        pendingActions,
        relatedEvidence,
        relatedLegal,
      };
    });
  }, [
    risks,
    actions,
    evidence,
    legal,
  ]);

  const ordered = useMemo(
    () =>
      [...analysis].sort(
        (a, b) =>
          b.probability -
          a.probability
      ),
    [analysis]
  );

  const predictiveRisks =
    ordered.filter(
      (item) =>
        item.probability >= 65
    );

  const criticalForecasts =
    ordered.filter(
      (item) =>
        item.probability >= 80
    );

  const averageProbability =
    analysis.length
      ? Math.round(
          analysis.reduce(
            (sum, item) =>
              sum + item.probability,
            0
          ) / analysis.length
        )
      : 0;

  /*
   * =====================================================
   * MATURITY TRAJECTORY
   * =====================================================
   */

  const maturityTrend =
    useMemo(() => {
      const current =
        num(maturity);

      if (history.length < 2) {
        return {
          direction:
            current >= 70
              ? "POSITIVA"
              : current >= 45
              ? "ESTÁVEL"
              : "ATENÇÃO",
          delta: 0,
        };
      }

      const recent =
        history
          .slice(-5)
          .map((item) =>
            num(
              item.maturity ||
                item.score ||
                item.value
            )
          )
          .filter(
            (value) => value > 0
          );

      if (recent.length < 2) {
        return {
          direction: "ESTÁVEL",
          delta: 0,
        };
      }

      const first =
        recent[0];

      const last =
        recent[recent.length - 1];

      const delta =
        Math.round(
          last - first
        );

      return {
        direction:
          delta > 5
            ? "POSITIVA"
            : delta < -5
            ? "NEGATIVA"
            : "ESTÁVEL",
        delta,
      };
    }, [
      history,
      maturity,
    ]);

  /*
   * =====================================================
   * EARLY WARNING
   * =====================================================
   */

  const warnings = useMemo(() => {
    const result = [];

    if (
      criticalForecasts.length
    ) {
      result.push({
        type: "critical",
        title:
          "Risco com trajetória crítica",
        text:
          `${criticalForecasts.length} risco(s) apresentam probabilidade preditiva elevada.`,
        page:
          "riscos",
      });
    }

    if (
      predictiveRisks.length >= 3
    ) {
      result.push({
        type: "warning",
        title:
          "Concentração de exposição",
        text:
          "O ambiente apresenta múltiplos riscos com tendência ascendente.",
        page:
          "riscos",
      });
    }

    const actionsPending =
      actions.filter(
        (action) =>
          openStatus(action.status)
      ).length;

    if (
      actionsPending >= 5
    ) {
      result.push({
        type: "warning",
        title:
          "Backlog operacional elevado",
        text:
          `${actionsPending} ações permanecem abertas.`,
        page:
          "acoes",
      });
    }

    if (
      evidence.length <
        risks.length &&
      risks.length > 0
    ) {
      result.push({
        type: "warning",
        title:
          "Cobertura documental insuficiente",
        text:
          "A quantidade de evidências está abaixo do volume de riscos registrados.",
        page:
          "evidencias",
      });
    }

    if (
      maturityTrend.direction ===
      "NEGATIVA"
    ) {
      result.push({
        type: "critical",
        title:
          "Queda de maturidade detectada",
        text:
          `A trajetória recente indica variação de ${maturityTrend.delta} pontos.`,
        page:
          "dashboard",
      });
    }

    return result;
  }, [
    criticalForecasts.length,
    predictiveRisks.length,
    actions,
    evidence.length,
    risks.length,
    maturityTrend,
  ]);

  /*
   * =====================================================
   * WHAT IF
   * =====================================================
   */

  const whatIf = useMemo(() => {
    const current =
      num(maturity);

    const critical =
      criticalForecasts.length;

    const pending =
      actions.filter(
        (action) =>
          openStatus(action.status)
      ).length;

    const improvement =
      Math.min(
        25,
        critical * 4 +
          Math.min(
            10,
            pending
          )
      );

    const projected =
      Math.min(
        100,
        Math.round(
          current +
            improvement
        )
      );

    const deterioration =
      Math.max(
        0,
        Math.round(
          current -
            (
              critical * 5 +
              Math.min(
                15,
                pending
              )
            )
        )
      );

    return {
      current,
      projected,
      deterioration,
    };
  }, [
    maturity,
    criticalForecasts.length,
    actions,
  ]);

  /*
   * =====================================================
   * MODE
   * =====================================================
   */

  const modeData = {
    forecast: {
      title:
        "Previsão de exposição",
      subtitle:
        "Onde o risco pode chegar",
    },

    warnings: {
      title:
        "Early Warning System",
      subtitle:
        "Sinais que merecem atenção",
    },

    simulation: {
      title:
        "What-if Simulator",
      subtitle:
        "Impacto de diferentes decisões",
    },
  };

  const activeMode =
    modeData[mode];

  return (
    <section className="nexus-predictive">

      <div className="np-background" />

      {/* HEADER */}

      <header className="np-header">

        <div>

          <span className="np-eyebrow">
            NEXUS PREDICTIVE INTELLIGENCE · 2.0
          </span>

          <h2>
            Predictive
            <strong>Intelligence</strong>
          </h2>

          <p>
            Motor heurístico de tendência,
            alerta antecipado e simulação
            executiva baseado no estado atual
            do ambiente.
          </p>

        </div>

        <div className="np-live">

          <i />

          <div>
            <strong>
              PREDICTIVE CORE
            </strong>

            <small>
              ONLINE · ANALYSIS ACTIVE
            </small>
          </div>

        </div>

      </header>

      {/* KPI */}

      <div className="np-kpis">

        <div className="np-kpi np-kpi-main">

          <div className="np-kpi-orb">

            <strong>
              {averageProbability}%
            </strong>

            <span>
              EXPOSURE
            </span>

          </div>

          <div>

            <small>
              RISK FORECAST
            </small>

            <h3>
              {averageProbability >= 70
                ? "Atenção elevada"
                : averageProbability >= 45
                ? "Monitoramento recomendado"
                : "Ambiente estável"}
            </h3>

            <p>
              Probabilidade heurística média
              dos riscos identificados.
            </p>

          </div>

        </div>

        <div className="np-kpi">

          <small>
            RISCOS PREDITIVOS
          </small>

          <strong>
            {predictiveRisks.length}
          </strong>

          <span>
            tendência ascendente
          </span>

        </div>

        <div className="np-kpi">

          <small>
            ALERTAS
          </small>

          <strong className="np-red">
            {warnings.length}
          </strong>

          <span>
            sinais antecipados
          </span>

        </div>

        <div className="np-kpi">

          <small>
            TRAJETÓRIA
          </small>

          <strong
            className={
              maturityTrend.direction ===
              "POSITIVA"
                ? "np-green"
                : maturityTrend.direction ===
                  "NEGATIVA"
                ? "np-red"
                : ""
            }
          >
            {maturityTrend.direction}
          </strong>

          <span>
            {maturityTrend.delta > 0
              ? `+${maturityTrend.delta} pontos`
              : `${maturityTrend.delta} pontos`}
          </span>

        </div>

      </div>

      {/* TABS */}

      <div className="np-tabs">

        {Object.entries(
          modeData
        ).map(
          ([key, item]) => (

            <button
              key={key}
              className={
                mode === key
                  ? "active"
                  : ""
              }
              onClick={() =>
                setMode(key)
              }
            >

              <span>
                {key === "forecast"
                  ? "◈"
                  : key === "warnings"
                  ? "⚠"
                  : "◇"}
              </span>

              <div>

                <strong>
                  {item.title}
                </strong>

                <small>
                  {item.subtitle}
                </small>

              </div>

            </button>

          )
        )}

      </div>

      {/* CONTENT */}

      {mode === "forecast" && (

        <div className="np-content">

          <div className="np-panel">

            <div className="np-panel-title">

              <div>
                <span>
                  FORECAST MAP
                </span>

                <h3>
                  Riscos com maior pressão futura
                </h3>
              </div>

              <b>
                AI
              </b>

            </div>

            {ordered.length ? (

              <div className="np-risk-list">

                {ordered
                  .slice(0, 6)
                  .map(
                    (
                      item,
                      index
                    ) => (

                      <div
                        className="np-risk"
                        key={
                          item.risk.id ||
                          index
                        }
                      >

                        <div className="np-risk-rank">
                          {String(
                            index + 1
                          ).padStart(
                            2,
                            "0"
                          )}
                        </div>

                        <div className="np-risk-info">

                          <div>

                            <small>
                              {item.risk.category ||
                                item.risk.area ||
                                "Compliance"}
                            </small>

                            <strong>
                              {item.risk.title ||
                                "Risco identificado"}
                            </strong>

                          </div>

                          <p>
                            {item.risk.consequence ||
                              item.risk.recommendation ||
                              "Pressão calculada pelo motor preditivo."}
                          </p>

                        </div>

                        <div className="np-probability">

                          <strong>
                            {item.probability}%
                          </strong>

                          <span>
                            {item.forecast}
                          </span>

                          <i>
                            <em
                              style={{
                                width:
                                  `${item.probability}%`,
                              }}
                            />
                          </i>

                        </div>

                      </div>

                    )
                  )}

              </div>

            ) : (

              <div className="np-empty">

                <span>
                  ◈
                </span>

                <strong>
                  Sem dados preditivos
                </strong>

                <small>
                  Execute o diagnóstico para
                  alimentar o motor.
                </small>

              </div>

            )}

          </div>

          <div className="np-side">

            <div className="np-panel">

              <div className="np-panel-title">

                <div>
                  <span>
                    TRAJECTORY
                  </span>

                  <h3>
                    Maturidade
                  </h3>
                </div>

              </div>

              <div className="np-trajectory">

                <div>
                  <small>
                    ATUAL
                  </small>

                  <strong>
                    {whatIf.current}
                  </strong>
                </div>

                <div className="np-trajectory-arrow">
                  →
                </div>

                <div>
                  <small>
                    PROJETADA
                  </small>

                  <strong className="np-green">
                    {whatIf.projected}
                  </strong>
                </div>

              </div>

              <p className="np-note">
                Cenário de melhoria baseado na
                resolução progressiva de riscos
                e pendências atuais.
              </p>

            </div>

            <div className="np-panel np-priority">

              <span>
                TOP PREDICTIVE SIGNAL
              </span>

              {ordered[0] ? (

                <>
                  <h3>
                    {ordered[0].risk.title}
                  </h3>

                  <strong>
                    {ordered[0].probability}%
                  </strong>

                  <p>
                    Probabilidade heurística
                    estimada.
                  </p>

                  <button
                    onClick={() =>
                      go?.("riscos")
                    }
                  >
                    Investigar risco →
                  </button>
                </>

              ) : (

                <p>
                  Nenhum sinal prioritário.
                </p>

              )}

            </div>

          </div>

        </div>

      )}

      {mode === "warnings" && (

        <div className="np-content">

          <div className="np-panel np-warning-panel">

            <div className="np-panel-title">

              <div>
                <span>
                  EARLY WARNING SYSTEM
                </span>

                <h3>
                  Sinais antecipados
                </h3>
              </div>

              <b>
                LIVE
              </b>

            </div>

            {warnings.length ? (

              <div className="np-warning-list">

                {warnings.map(
                  (
                    warning,
                    index
                  ) => (

                    <button
                      key={index}
                      className={`np-warning ${warning.type}`}
                      onClick={() =>
                        go?.(
                          warning.page
                        )
                      }
                    >

                      <div className="np-warning-icon">
                        {warning.type ===
                        "critical"
                          ? "!"
                          : "⚠"}
                      </div>

                      <div>

                        <strong>
                          {warning.title}
                        </strong>

                        <p>
                          {warning.text}
                        </p>

                      </div>

                      <span>
                        →
                      </span>

                    </button>

                  )
                )}

              </div>

            ) : (

              <div className="np-clear">

                <span>
                  ✓
                </span>

                <strong>
                  Nenhum sinal antecipado crítico
                </strong>

                <small>
                  O ambiente não apresenta
                  alertas relevantes no momento.
                </small>

              </div>

            )}

          </div>

        </div>

      )}

      {mode === "simulation" && (

        <div className="np-content">

          <div className="np-panel">

            <div className="np-panel-title">

              <div>
                <span>
                  WHAT-IF SIMULATOR
                </span>

                <h3>
                  E se as decisões mudarem?
                </h3>
              </div>

              <b>
                SIM
              </b>

            </div>

            <div className="np-simulation">

              <div className="np-sim-card">

                <small>
                  ESTADO ATUAL
                </small>

                <strong>
                  {whatIf.current}
                </strong>

                <span>
                  maturidade
                </span>

              </div>

              <div className="np-sim-arrow">
                →
              </div>

              <div className="np-sim-card positive">

                <small>
                  SE TRATARMOS
                </small>

                <strong>
                  {whatIf.projected}
                </strong>

                <span>
                  maturidade projetada
                </span>

              </div>

              <div className="np-sim-card negative">

                <small>
                  SE IGNORARMOS
                </small>

                <strong>
                  {whatIf.deterioration}
                </strong>

                <span>
                  cenário de deterioração
                </span>

              </div>

            </div>

            <div className="np-simulation-message">

              <span>
                NEXUS AI
              </span>

              <p>
                A simulação é uma projeção heurística
                para apoiar decisão. Ela não representa
                uma previsão estatística ou garantia
                de resultado futuro.
              </p>

            </div>

          </div>

        </div>

      )}

    </section>
  );
}