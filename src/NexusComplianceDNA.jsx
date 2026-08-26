import React, { useMemo, useState } from "react";
import "./NexusComplianceDNA.css";

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function clamp(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export default function NexusComplianceDNA({
  s,
  maturity = 0,
  go,
}) {
  const [selected, setSelected] =
    useState("Governança");

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

  const answers =
    s?.answers &&
    typeof s.answers === "object"
      ? s.answers
      : {};

  /*
   * =====================================================
   * DNA DIMENSIONS
   *
   * Os indicadores abaixo são heurísticos.
   * Eles organizam os dados disponíveis no sistema
   * em uma visão executiva.
   * =====================================================
   */

  const dimensions = useMemo(() => {
    const answerCount =
      Object.keys(answers).length;

    const riskCount =
      risks.length;

    const critical =
      risks.filter((risk) =>
        /critico/i.test(
          normalize(
            risk.level ||
              risk.nivel ||
              risk.severity
          )
        )
      ).length;

    const openActions =
      actions.filter(
        (action) =>
          !/(conclu|encerr|finaliz|cancel)/i.test(
            String(action.status || "")
          )
      ).length;

    const openLegal =
      legal.filter(
        (item) =>
          !/(conclu|encerr|finaliz|cancel)/i.test(
            String(item.status || "")
          )
      ).length;

    const evidenceCoverage =
      riskCount > 0
        ? clamp(
            (evidence.length /
              riskCount) *
              100
          )
        : answerCount > 0
        ? 65
        : 0;

    const riskControl =
      riskCount > 0
        ? clamp(
            ((riskCount - critical) /
              riskCount) *
              100
          )
        : answerCount > 0
        ? 70
        : 0;

    const execution =
      actions.length > 0
        ? clamp(
            ((actions.length -
              openActions) /
              actions.length) *
              100
          )
        : answerCount > 0
        ? 60
        : 0;

    const legalControl =
      legal.length > 0
        ? clamp(
            ((legal.length -
              openLegal) /
              legal.length) *
              100
          )
        : answerCount > 0
        ? 65
        : 0;

    const governance =
      clamp(
        Number(maturity) * 0.7 +
          evidenceCoverage * 0.15 +
          riskControl * 0.15
      );

    const people =
      clamp(
        Number(maturity) * 0.55 +
          execution * 0.25 +
          evidenceCoverage * 0.2
      );

    const processes =
      clamp(
        Number(maturity) * 0.5 +
          execution * 0.3 +
          riskControl * 0.2
      );

    const risk =
      clamp(
        Number(maturity) * 0.35 +
          riskControl * 0.65
      );

    const juridical =
      clamp(
        Number(maturity) * 0.4 +
          legalControl * 0.6
      );

    const evidenceDimension =
      clamp(
        Number(maturity) * 0.3 +
          evidenceCoverage * 0.7
      );

    const ethics =
      clamp(
        Number(maturity) * 0.8 +
          evidenceCoverage * 0.1 +
          riskControl * 0.1
      );

    return [
      {
        name: "Governança",
        value: governance,
        icon: "◈",
        color: "cyan",
        description:
          "Estrutura decisória, responsabilidades e capacidade de governança.",
      },
      {
        name: "Pessoas",
        value: people,
        icon: "◎",
        color: "purple",
        description:
          "Capacidade organizacional e execução dos responsáveis.",
      },
      {
        name: "Processos",
        value: processes,
        icon: "▤",
        color: "blue",
        description:
          "Consistência operacional e capacidade de execução.",
      },
      {
        name: "Riscos",
        value: risk,
        icon: "△",
        color: "red",
        description:
          "Capacidade atual de controle e exposição a riscos.",
      },
      {
        name: "Jurídico",
        value: juridical,
        icon: "§",
        color: "gold",
        description:
          "Nível de controle das questões e exposições jurídicas.",
      },
      {
        name: "Evidências",
        value: evidenceDimension,
        icon: "◉",
        color: "green",
        description:
          "Rastreabilidade documental e comprovação dos controles.",
      },
      {
        name: "Ética",
        value: ethics,
        icon: "✦",
        color: "pink",
        description:
          "Maturidade cultural e estrutura ética estimada.",
      },
    ];
  }, [
    answers,
    risks,
    actions,
    evidence,
    legal,
    maturity,
  ]);

  const selectedDimension =
    dimensions.find(
      (item) =>
        item.name === selected
    ) ||
    dimensions[0];

  /*
   * =====================================================
   * HEATMAP
   * =====================================================
   */

  const heatmap = useMemo(() => {
    const matrix = [];

    for (
      let impact = 5;
      impact >= 1;
      impact--
    ) {
      const row = [];

      for (
        let probability = 1;
        probability <= 5;
        probability++
      ) {
        const score =
          impact * probability;

        let level = "baixo";

        if (score >= 16) {
          level = "critico";
        } else if (score >= 10) {
          level = "alto";
        } else if (score >= 5) {
          level = "medio";
        }

        const count =
          risks.filter(
            (risk) => {
              const riskScore =
                Number(
                  risk.score ||
                    risk.riskScore ||
                    0
                );

              if (!riskScore) {
                return false;
              }

              return (
                Math.max(
                  1,
                  Math.min(
                    5,
                    Math.round(
                      riskScore / 5
                    )
                  )
                ) ===
                  probability &&
                Math.max(
                  1,
                  Math.min(
                    5,
                    Math.ceil(
                      riskScore / 5
                    )
                  )
                ) === impact
              );
            }
          ).length;

        row.push({
          impact,
          probability,
          score,
          level,
          count,
        });
      }

      matrix.push(row);
    }

    return matrix;
  }, [risks]);

  const totalRiskExposure =
    risks.reduce(
      (sum, risk) =>
        sum +
        Number(
          risk.score ||
            risk.riskScore ||
            0
        ),
      0
    );

  const averageDNA =
    dimensions.length
      ? Math.round(
          dimensions.reduce(
            (sum, item) =>
              sum + item.value,
            0
          ) / dimensions.length
        )
      : 0;

  const strongest =
    [...dimensions].sort(
      (a, b) =>
        b.value - a.value
    )[0];

  const weakest =
    [...dimensions].sort(
      (a, b) =>
        a.value - b.value
    )[0];

  return (
    <section className="nexus-dna">

      <div className="dna-grid-bg" />

      {/* HEADER */}

      <header className="dna-header">

        <div>

          <span className="dna-eyebrow">
            NEXUS COMPLIANCE DNA · 2.0
          </span>

          <h2>
            Compliance
            <strong>DNA</strong>
          </h2>

          <p>
            Mapa multidimensional da maturidade,
            exposição e capacidade de controle
            da organização.
          </p>

        </div>

        <div className="dna-score">

          <div className="dna-score-ring">

            <strong>
              {averageDNA}
            </strong>

            <small>
              DNA
            </small>

          </div>

          <div>

            <span>
              MATURIDADE ESTRUTURAL
            </span>

            <strong>
              {averageDNA >= 80
                ? "EVOLUÍDO"
                : averageDNA >= 60
                ? "ESTRUTURADO"
                : averageDNA >= 40
                ? "EM DESENVOLVIMENTO"
                : "INICIAL"}
            </strong>

          </div>

        </div>

      </header>

      {/* DNA ORBIT */}

      <div className="dna-main">

        <div className="dna-orbit-panel">

          <div className="dna-orbit">

            <div className="dna-core">

              <strong>
                {averageDNA}
              </strong>

              <span>
                COMPLIANCE
              </span>

            </div>

            {dimensions.map(
              (item, index) => {

                const angle =
                  index *
                  (360 /
                    dimensions.length);

                const radius =
                  38;

                const x =
                  50 +
                  Math.cos(
                    (angle *
                      Math.PI) /
                      180
                  ) *
                    radius;

                const y =
                  50 +
                  Math.sin(
                    (angle *
                      Math.PI) /
                      180
                  ) *
                    radius;

                return (
                  <button
                    key={item.name}
                    className={`dna-node ${item.color} ${
                      selected ===
                      item.name
                        ? "active"
                        : ""
                    }`}
                    style={{
                      left: `${x}%`,
                      top: `${y}%`,
                    }}
                    onClick={() =>
                      setSelected(
                        item.name
                      )
                    }
                    title={
                      item.name
                    }
                  >
                    <span>
                      {item.icon}
                    </span>
                  </button>
                );
              }
            )}

            <div className="dna-orbit-line one" />
            <div className="dna-orbit-line two" />

          </div>

        </div>

        {/* DIMENSIONS */}

        <div className="dna-dimensions">

          <div className="dna-section-title">

            <div>
              <span>
                DNA PROFILE
              </span>

              <h3>
                Estrutura de Compliance
              </h3>
            </div>

            <b>
              LIVE
            </b>

          </div>

          <div className="dna-list">

            {dimensions.map(
              (item) => (

                <button
                  key={item.name}
                  className={
                    selected ===
                    item.name
                      ? "selected"
                      : ""
                  }
                  onClick={() =>
                    setSelected(
                      item.name
                    )
                  }
                >

                  <div
                    className={`dna-mini-icon ${item.color}`}
                  >
                    {item.icon}
                  </div>

                  <div className="dna-list-info">

                    <div>

                      <strong>
                        {item.name}
                      </strong>

                      <span>
                        {item.value}%
                      </span>

                    </div>

                    <i>
                      <em
                        style={{
                          width:
                            `${item.value}%`,
                        }}
                      />
                    </i>

                  </div>

                </button>

              )
            )}

          </div>

        </div>

      </div>

      {/* SELECTED INTELLIGENCE */}

      <div className="dna-selected">

        <div
          className={`dna-selected-icon ${selectedDimension.color}`}
        >
          {selectedDimension.icon}
        </div>

        <div>

          <small>
            DIMENSION SELECIONADA
          </small>

          <h3>
            {selectedDimension.name}
          </h3>

          <p>
            {selectedDimension.description}
          </p>

        </div>

        <strong>
          {selectedDimension.value}%
        </strong>

      </div>

      {/* HEATMAP */}

      <div className="dna-heatmap-section">

        <div className="dna-section-title">

          <div>
            <span>
              RISK HEATMAP · 5 × 5
            </span>

            <h3>
              Mapa de Exposição
            </h3>
          </div>

          <div className="dna-exposure">
            <small>
              EXPOSIÇÃO TOTAL
            </small>

            <strong>
              {totalRiskExposure}
            </strong>
          </div>

        </div>

        <div className="dna-heatmap-wrap">

          <div className="dna-axis-y">
            <span>5</span>
            <span>4</span>
            <span>3</span>
            <span>2</span>
            <span>1</span>
          </div>

          <div className="dna-heatmap">

            {heatmap.map(
              (row) =>
                row.map(
                  (cell) => (

                    <button
                      key={`${cell.impact}-${cell.probability}`}
                      className={`heat-${cell.level}`}
                      onClick={() =>
                        go?.("riscos")
                      }
                      title={`Impacto ${cell.impact} × Probabilidade ${cell.probability}`}
                    >

                      <strong>
                        {cell.score}
                      </strong>

                      {cell.count >
                        0 && (
                        <span>
                          {cell.count}
                        </span>
                      )}

                    </button>

                  )
                )
            )}

          </div>

        </div>

        <div className="dna-axis-x">

          <span>1</span>
          <span>2</span>
          <span>3</span>
          <span>4</span>
          <span>5</span>

        </div>

        <div className="dna-axis-label">
          PROBABILIDADE →
        </div>

      </div>

      {/* EXECUTIVE SUMMARY */}

      <div className="dna-executive">

        <div>

          <span>
            STRONGEST DNA
          </span>

          <strong>
            {strongest?.name}
          </strong>

          <small>
            {strongest?.value}% de maturidade
          </small>

        </div>

        <div>

          <span>
            ATTENTION POINT
          </span>

          <strong>
            {weakest?.name}
          </strong>

          <small>
            {weakest?.value}% de maturidade
          </small>

        </div>

        <div>

          <span>
            RISK CELLS
          </span>

          <strong>
            {risks.length}
          </strong>

          <small>
            riscos registrados
          </small>

        </div>

        <button
          onClick={() =>
            go?.("riscos")
          }
        >
          Abrir Inteligência de Riscos
          <span>
            →
          </span>
        </button>

      </div>

    </section>
  );
}