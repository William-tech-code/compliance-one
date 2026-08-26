import React, { useMemo, useState } from "react";
import "./NexusCommandGraph.css";

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function openStatus(value) {
  return !/(conclu|encerr|finaliz|cancel)/i.test(
    String(value || "")
  );
}

function riskLevel(risk) {
  const level = normalize(
    risk?.level ||
      risk?.nivel ||
      risk?.severity
  );

  if (level.includes("crit")) return "CRÍTICO";
  if (level.includes("alto")) return "ALTO";
  if (level.includes("medio")) return "MÉDIO";

  const score = Number(
    risk?.score ||
      risk?.riskScore ||
      0
  );

  if (score >= 20) return "CRÍTICO";
  if (score >= 10) return "ALTO";
  if (score >= 5) return "MÉDIO";

  return "BAIXO";
}

export default function NexusCommandGraph({
  s,
  go,
}) {
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

  const legal = Array.isArray(s?.legal)
    ? s.legal
    : [];

  const controls =
    Array.isArray(s?.controls)
      ? s.controls
      : [];

  /*
   * =====================================================
   * CONSTRUCTION DO GRAFO
   * =====================================================
   */

  const graph = useMemo(() => {
    return risks.map((risk, index) => {
      const id =
        risk.id ||
        `risk-${index}`;

      const relatedActions =
        actions.filter(
          (item) =>
            item.riskId === id ||
            item.risk_id === id ||
            item.sourceRiskId === id
        );

      const relatedEvidence =
        evidence.filter(
          (item) =>
            item.riskId === id ||
            item.risk_id === id ||
            item.sourceRiskId === id
        );

      const relatedLegal =
        legal.filter(
          (item) =>
            item.riskId === id ||
            item.risk_id === id ||
            item.sourceRiskId === id
        );

      const relatedControls =
        controls.filter(
          (item) =>
            item.riskId === id ||
            item.risk_id === id ||
            item.sourceRiskId === id
        );

      const pendingActions =
        relatedActions.filter(
          (item) =>
            openStatus(item.status)
        );

      const level =
        riskLevel(risk);

      let exposure =
        Number(
          risk.score ||
            risk.riskScore ||
            0
        );

      if (level === "CRÍTICO") {
        exposure += 20;
      } else if (level === "ALTO") {
        exposure += 10;
      }

      if (pendingActions.length) {
        exposure +=
          pendingActions.length * 5;
      }

      if (!relatedEvidence.length) {
        exposure += 8;
      }

      if (relatedLegal.length) {
        exposure +=
          relatedLegal.length * 5;
      }

      if (!relatedControls.length) {
        exposure += 6;
      }

      let exposureLevel =
        "CONTROLADA";

      if (exposure >= 35) {
        exposureLevel =
          "CRÍTICA";
      } else if (exposure >= 25) {
        exposureLevel =
          "ELEVADA";
      } else if (exposure >= 15) {
        exposureLevel =
          "MODERADA";
      }

      return {
        id,
        risk,
        level,
        exposure,
        exposureLevel,
        actions: relatedActions,
        evidence: relatedEvidence,
        legal: relatedLegal,
        controls: relatedControls,
        pendingActions,
      };
    });
  }, [
    risks,
    actions,
    evidence,
    legal,
    controls,
  ]);

  const selected =
    graph.find(
      (item) =>
        item.id === selectedId
    ) ||
    graph[0];

  /*
   * =====================================================
   * ESTATÍSTICAS DO GRAFO
   * =====================================================
   */

  const stats = useMemo(() => {
    const critical =
      graph.filter(
        (item) =>
          item.level === "CRÍTICO"
      ).length;

    const elevated =
      graph.filter(
        (item) =>
          item.exposureLevel ===
          "ELEVADA"
      ).length;

    const disconnected =
      graph.filter(
        (item) =>
          !item.evidence.length ||
          !item.controls.length
      ).length;

    const totalConnections =
      graph.reduce(
        (sum, item) =>
          sum +
          item.actions.length +
          item.evidence.length +
          item.legal.length +
          item.controls.length,
        0
      );

    return {
      critical,
      elevated,
      disconnected,
      totalConnections,
    };
  }, [graph]);

  /*
   * =====================================================
   * NÓS VISUAIS
   * =====================================================
   */

  const nodes = useMemo(() => {
    const max =
      Math.min(graph.length, 9);

    const radius = 36;

    return graph
      .slice(0, max)
      .map((item, index) => {
        const angle =
          index *
          (360 / max) -
          90;

        return {
          ...item,
          x:
            50 +
            Math.cos(
              (angle *
                Math.PI) /
                180
            ) *
              radius,
          y:
            50 +
            Math.sin(
              (angle *
                Math.PI) /
                180
            ) *
              radius,
        };
      });
  }, [graph]);

  /*
   * =====================================================
   * CONEXÕES
   * =====================================================
   */

  const connections =
    nodes.flatMap(
      (node, index) => {
        if (!nodes.length) {
          return [];
        }

        const next =
          nodes[
            (index + 1) %
              nodes.length
          ];

        return [
          {
            from: node,
            to: next,
          },
        ];
      }
    );

  return (
    <section className="nexus-command-graph">

      <div className="ncg-grid" />

      <div className="ncg-glow one" />
      <div className="ncg-glow two" />

      {/* HEADER */}

      <header className="ncg-header">

        <div>

          <span className="ncg-eyebrow">
            NEXUS COMMAND GRAPH · 2.0
          </span>

          <h2>
            Compliance
            <strong>Command Graph</strong>
          </h2>

          <p>
            Rede de interconexão entre riscos,
            ações, evidências, jurídico e
            controles.
          </p>

        </div>

        <div className="ncg-status">

          <i />

          <div>
            <strong>
              GRAPH ENGINE
            </strong>

            <small>
              NETWORK ONLINE
            </small>
          </div>

        </div>

      </header>

      {/* KPI */}

      <div className="ncg-kpis">

        <article>
          <small>
            RISCOS
          </small>

          <strong>
            {graph.length}
          </strong>

          <span>
            nós principais
          </span>
        </article>

        <article>
          <small>
            CRÍTICOS
          </small>

          <strong className="ncg-red">
            {stats.critical}
          </strong>

          <span>
            exposição máxima
          </span>
        </article>

        <article>
          <small>
            CONEXÕES
          </small>

          <strong>
            {stats.totalConnections}
          </strong>

          <span>
            relacionamentos
          </span>
        </article>

        <article>
          <small>
            GAPS
          </small>

          <strong className="ncg-orange">
            {stats.disconnected}
          </strong>

          <span>
            pontos sem cobertura
          </span>
        </article>

      </div>

      {/* GRAPH */}

      <div className="ncg-main">

        <div className="ncg-graph-panel">

          <div className="ncg-panel-title">

            <div>
              <span>
                LIVE NETWORK
              </span>

              <h3>
                Mapa de interdependências
              </h3>
            </div>

            <b>
              LIVE
            </b>

          </div>

          {nodes.length ? (

            <div className="ncg-network">

              <div className="ncg-network-core">

                <strong>
                  NEXUS
                </strong>

                <small>
                  COMPLIANCE
                </small>

              </div>

              <div className="ncg-connections">

                {connections.map(
                  (connection, index) => {

                    const x1 =
                      connection.from.x;

                    const y1 =
                      connection.from.y;

                    const x2 =
                      connection.to.x;

                    const y2 =
                      connection.to.y;

                    const dx =
                      x2 - x1;

                    const dy =
                      y2 - y1;

                    const length =
                      Math.sqrt(
                        dx * dx +
                          dy * dy
                      );

                    const angle =
                      Math.atan2(
                        dy,
                        dx
                      ) *
                      (180 /
                        Math.PI);

                    return (
                      <i
                        key={index}
                        style={{
                          left:
                            `${x1}%`,
                          top:
                            `${y1}%`,
                          width:
                            `${length}%`,
                          transform:
                            `rotate(${angle}deg)`,
                        }}
                      />
                    );
                  }
                )}

              </div>

              {nodes.map(
                (node) => (

                  <button
                    key={node.id}
                    className={`ncg-node ${
                      node.level ===
                      "CRÍTICO"
                        ? "critical"
                        : node.level ===
                          "ALTO"
                        ? "high"
                        : "normal"
                    } ${
                      selected?.id ===
                      node.id
                        ? "selected"
                        : ""
                    }`}
                    style={{
                      left:
                        `${node.x}%`,
                      top:
                        `${node.y}%`,
                    }}
                    onClick={() =>
                      setSelectedId(
                        node.id
                      )
                    }
                  >

                    <span>
                      {node.risk.title ||
                        "Risco"}
                    </span>

                    <small>
                      {node.exposureLevel}
                    </small>

                  </button>

                )
              )}

            </div>

          ) : (

            <div className="ncg-empty">

              <span>
                ◈
              </span>

              <strong>
                Grafo aguardando dados
              </strong>

              <small>
                Execute o diagnóstico para
                gerar os relacionamentos.
              </small>

            </div>

          )}

        </div>

        {/* INSPECTOR */}

        <aside className="ncg-inspector">

          <div className="ncg-panel-title">

            <div>
              <span>
                NODE INSPECTOR
              </span>

              <h3>
                Inteligência do risco
              </h3>
            </div>

            <b>
              AI
            </b>

          </div>

          {selected ? (

            <>

              <div className="ncg-selected-risk">

                <small>
                  {selected.risk.category ||
                    selected.risk.area ||
                    "COMPLIANCE"}
                </small>

                <h4>
                  {selected.risk.title ||
                    "Risco selecionado"}
                </h4>

                <div
                  className={`ncg-exposure ${selected.exposureLevel.toLowerCase()}`}
                >
                  {selected.exposureLevel}
                </div>

              </div>

              <div className="ncg-relations">

                <div>
                  <span>
                    AÇÕES
                  </span>

                  <strong>
                    {selected.actions.length}
                  </strong>
                </div>

                <div>
                  <span>
                    EVIDÊNCIAS
                  </span>

                  <strong>
                    {selected.evidence.length}
                  </strong>
                </div>

                <div>
                  <span>
                    JURÍDICO
                  </span>

                  <strong>
                    {selected.legal.length}
                  </strong>
                </div>

                <div>
                  <span>
                    CONTROLES
                  </span>

                  <strong>
                    {selected.controls.length}
                  </strong>
                </div>

              </div>

              <div className="ncg-path">

                <span>
                  RELACIONAMENTOS
                </span>

                <div>
                  <i>R</i>
                  <em />
                  <i>A</i>
                  <em />
                  <i>E</i>
                  <em />
                  <i>J</i>
                  <em />
                  <i>C</i>
                </div>

                <small>
                  Risco → Ação → Evidência
                  → Jurídico → Controle
                </small>

              </div>

              <button
                className="ncg-open"
                onClick={() =>
                  go?.("riscos")
                }
              >
                Abrir risco completo
                <span>
                  →
                </span>
              </button>

            </>

          ) : (

            <div className="ncg-inspector-empty">

              <span>
                ◈
              </span>

              <p>
                Selecione um nó no grafo
                para inspecionar suas
                conexões.
              </p>

            </div>

          )}

        </aside>

      </div>

      {/* COVERAGE */}

      <div className="ncg-coverage">

        <div className="ncg-panel-title">

          <div>
            <span>
              CONTROL COVERAGE
            </span>

            <h3>
              Cobertura da rede
            </h3>
          </div>

        </div>

        <div className="ncg-coverage-grid">

          {[
            [
              "Riscos",
              graph.length,
              "risk",
            ],
            [
              "Ações",
              actions.length,
              "action",
            ],
            [
              "Evidências",
              evidence.length,
              "evidence",
            ],
            [
              "Jurídico",
              legal.length,
              "legal",
            ],
            [
              "Controles",
              controls.length,
              "control",
            ],
          ].map(
            ([label, value, type]) => (

              <div
                className="ncg-coverage-item"
                key={label}
              >

                <div>

                  <span>
                    {label}
                  </span>

                  <strong>
                    {value}
                  </strong>

                </div>

                <i
                  className={type}
                >
                  <em
                    style={{
                      width:
                        `${Math.min(
                          100,
                          value * 12
                        )}%`,
                    }}
                  />
                </i>

              </div>

            )
          )}

        </div>

      </div>

    </section>
  );
}