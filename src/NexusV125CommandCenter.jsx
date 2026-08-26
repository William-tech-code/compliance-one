import React, { useMemo, useState } from "react";
import "./NexusV125CommandCenter.css";

export default function NexusV125CommandCenter({
  s,
  maturity = 0,
  progress = 0,
  stats = {},
  go,
}) {
  const [aiOpen, setAiOpen] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState(null);

  const risks = Array.isArray(s?.risks) ? s.risks : [];
  const actions = Array.isArray(s?.actions) ? s.actions : [];
  const legal = Array.isArray(s?.legal) ? s.legal : [];
  const evidence = Array.isArray(s?.evidence) ? s.evidence : [];
  const answers = s?.answers || {};

  const critical = risks.filter((r) =>
    /crítico|critico/i.test(String(r.level || ""))
  ).length;

  const high = risks.filter((r) =>
    /alto/i.test(String(r.level || ""))
  ).length;

  const openActions = actions.filter(
    (a) => !/(conclu|encerr|final)/i.test(String(a.status || ""))
  ).length;

  const health = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        Number(maturity || 0) * 0.5 +
          Math.max(
            0,
            100 - Math.min(100, critical * 18 + high * 10)
          ) *
            0.2 +
          (actions.length
            ? ((actions.length - openActions) / actions.length) * 12
            : 0) +
          (legal.length ? 8 : 0) +
          Math.min(10, evidence.length * 2)
      )
    )
  );

  const radar = useMemo(() => {
    const areas = [
      "Governança",
      "Integridade",
      "Jurídico",
      "Pessoas",
      "Tecnologia",
      "Privacidade",
      "Terceiros",
      "Operações",
    ];

    return areas.map((area, i) => {
      const related = risks.filter((r) =>
        String(r.category || r.area || "")
          .toLowerCase()
          .includes(area.toLowerCase().split(" ")[0])
      );

      const penalty = Math.min(45, related.length * 8);

      const value = Math.max(
        20,
        Math.min(
          100,
          Number(maturity || 0) +
            35 -
            penalty +
            ((i * 7) % 13)
        )
      );

      return { area, value };
    });
  }, [risks, maturity]);

  const matrix = useMemo(() => {
    return Array.from({ length: 25 }, (_, index) => {
      const probability = Math.floor(index / 5) + 1;
      const impact = (index % 5) + 1;

      const count = risks.filter(
        (r) =>
          Number(r.p) === probability &&
          Number(r.i) === impact
      ).length;

      return {
        probability,
        impact,
        count,
      };
    });
  }, [risks]);

  const history = (s?.history || [])
    .slice(-7)
    .reverse();

  function aiAnswer() {
    if (critical > 0) {
      return `Existem ${critical} risco(s) crítico(s). A prioridade executiva é confirmar tratamento, responsável e evidência.`;
    }

    if (high > 0) {
      return `Existem ${high} risco(s) alto(s). Recomendo priorizar controles preventivos e prazos verificáveis.`;
    }

    if (!Object.keys(answers).length) {
      return "O diagnóstico ainda não possui respostas. Inicie o questionário para ativar a inteligência de risco.";
    }

    return `O ambiente possui ${risks.length} risco(s), ${actions.length} ação(ões) e ${evidence.length} evidência(s). O próximo foco é transformar achados em execução comprovável.`;
  }

  return (
    <div className="nexus-v125">

      <div className="n125-orbit n125-orbit-a" />
      <div className="n125-orbit n125-orbit-b" />

      {/* HEADER */}

      <header className="n125-header">

        <div>

          <span className="n125-eyebrow">
            NEXUS INTELLIGENCE · V125 ENTERPRISE
          </span>

          <h1>
            {s?.company?.name
              ? `Olá, ${s.company.name}.`
              : "Command Center"}
          </h1>

          <p>
            Uma camada executiva de inteligência sobre riscos,
            controles, jurídico, evidências e execução.
          </p>

        </div>

        <div className="n125-live">

          <i />

          <b>INTELLIGENCE CORE</b>

          <small>
            ONLINE · MULTI-TENANT
          </small>

        </div>

      </header>

      {/* KPIs */}

      <section className="n125-kpis">

        <article className="n125-kpi n125-kpi-main">

          <span>
            COMPLIANCE HEALTH
          </span>

          <strong>
            {health}
            <em>/100</em>
          </strong>

          <div className="n125-progress">
            <i
              style={{
                width: `${health}%`,
              }}
            />
          </div>

          <small>
            Score executivo dinâmico
          </small>

        </article>

        <article className="n125-kpi">

          <span>MATURIDADE</span>

          <strong>
            {maturity}%
          </strong>

          <small>
            Questionário e controles
          </small>

        </article>

        <article className="n125-kpi n125-kpi-danger">

          <span>RISCO CRÍTICO</span>

          <strong>
            {critical}
          </strong>

          <small>
            {high} alto(s) identificados
          </small>

        </article>

        <article className="n125-kpi">

          <span>AÇÕES ABERTAS</span>

          <strong>
            {openActions}
          </strong>

          <small>
            Tratamentos pendentes
          </small>

        </article>

        <article className="n125-kpi">

          <span>EVIDÊNCIAS</span>

          <strong>
            {evidence.length}
          </strong>

          <small>
            Itens registrados
          </small>

        </article>

      </section>

      {/* MAIN */}

      <section className="n125-main-grid">

        {/* RADAR */}

        <article className="n125-card n125-radar-card">

          <div className="n125-card-head">

            <div>

              <span>VISÃO 360°</span>

              <h2>
                Radar de Compliance
              </h2>

            </div>

            <b>
              {progress}% ciclo
            </b>

          </div>

          <div className="n125-radar-wrap">

            <svg
              viewBox="0 0 420 320"
              role="img"
              aria-label="Radar de Compliance"
            >

              <g className="n125-radar-grid">

                <polygon points="210,35 333,80 380,175 333,270 210,305 87,270 40,175 87,80" />

                <polygon points="210,75 300,108 335,175 300,242 210,270 120,242 85,175 120,108" />

                <polygon points="210,115 267,136 290,175 267,214 210,235 153,214 130,175 153,136" />

              </g>

              <polygon
                className="n125-radar-area"
                points={radar
                  .map((item, index) => {

                    const angle =
                      -Math.PI / 2 +
                      index *
                        ((Math.PI * 2) /
                          radar.length);

                    const radius =
                      (125 * item.value) / 100;

                    return `${210 +
                      Math.cos(angle) *
                        radius},${
                      175 +
                      Math.sin(angle) *
                        radius
                    }`;

                  })
                  .join(" ")}
              />

              {radar.map((item, index) => {

                const angle =
                  -Math.PI / 2 +
                  index *
                    ((Math.PI * 2) /
                      radar.length);

                const x =
                  210 +
                  Math.cos(angle) *
                    148;

                const y =
                  175 +
                  Math.sin(angle) *
                    148;

                return (
                  <text
                    key={item.area}
                    x={x}
                    y={y}
                    className="n125-radar-label"
                  >
                    {item.area}
                  </text>
                );

              })}

            </svg>

          </div>

        </article>

        {/* HEATMAP */}

        <article className="n125-card n125-risk-card">

          <div className="n125-card-head">

            <div>

              <span>RISK ENGINE</span>

              <h2>
                Heatmap 5×5
              </h2>

            </div>

            <button
              onClick={() =>
                go?.("riscos")
              }
            >
              Abrir matriz →
            </button>

          </div>

          <div className="n125-matrix">

            {matrix.map((cell) => (

              <button
                key={`${cell.probability}-${cell.impact}`}
                className={`n125-cell n125-cell-${
                  cell.probability +
                  cell.impact
                }`}
                onClick={() =>
                  cell.count &&
                  setSelectedRisk(cell)
                }
                title={`Probabilidade ${cell.probability} · Impacto ${cell.impact}`}
              >

                {cell.count || ""}

              </button>

            ))}

          </div>

          <div className="n125-matrix-legend">

            <span>baixo</span>

            <i />

            <span>alto</span>

          </div>

          {selectedRisk && (

            <div className="n125-selected">

              P{selectedRisk.probability}
              {" × "}
              I{selectedRisk.impact}

              {" · "}

              {selectedRisk.count}
              {" risco(s)"}

              <button
                onClick={() =>
                  setSelectedRisk(null)
                }
              >
                ×
              </button>

            </div>

          )}

        </article>

        {/* AI */}

        <article className="n125-card n125-ai-card">

          <div className="n125-ai-glow" />

          <div className="n125-card-head">

            <div>

              <span>NEXUS AI</span>

              <h2>
                Intelligence Copilot
              </h2>

            </div>

            <b>
              ● LIVE
            </b>

          </div>

          <div className="n125-ai-message">

            <div className="n125-ai-avatar">
              N
            </div>

            <p>
              {aiAnswer()}
            </p>

          </div>

          <button
            className="n125-ai-button"
            onClick={() =>
              setAiOpen(!aiOpen)
            }
          >
            {aiOpen
              ? "Fechar Copilot"
              : "Perguntar ao NEXUS AI →"}
          </button>

          {aiOpen && (

            <div className="n125-ai-prompts">

              <button
                onClick={() =>
                  go?.("riscos")
                }
              >
                Quais são os riscos prioritários?
              </button>

              <button
                onClick={() =>
                  go?.("acoes")
                }
              >
                O que precisa ser executado?
              </button>

              <button
                onClick={() =>
                  go?.("juridico")
                }
              >
                O que precisa de validação jurídica?
              </button>

              <button
                onClick={() =>
                  go?.("relatorio")
                }
              >
                Preparar visão executiva
              </button>

            </div>

          )}

        </article>

        {/* TIMELINE */}

        <article className="n125-card n125-timeline-card">

          <div className="n125-card-head">

            <div>

              <span>AUDIT TRAIL</span>

              <h2>
                Timeline Executiva
              </h2>

            </div>

            <b>
              {history.length} eventos
            </b>

          </div>

          <div className="n125-timeline">

            {history.length ? (

              history.map((item, index) => (

                <div
                  className="n125-event"
                  key={item.id || index}
                >

                  <i />

                  <div>

                    <b>
                      {item.text}
                    </b>

                    <small>
                      {item.date || "Agora"}
                    </small>

                  </div>

                </div>

              ))

            ) : (

              <div className="n125-empty">
                Nenhum evento registrado ainda.
              </div>

            )}

          </div>

        </article>

      </section>

      {/* COMMAND STRIP */}

      <section className="n125-command-strip">

        <button
          onClick={() =>
            go?.("questionario")
          }
        >
          <span>01</span>
          <b>Diagnóstico</b>
          <small>
            {Object.keys(answers).length}/120 respostas
          </small>
        </button>

        <button
          onClick={() =>
            go?.("riscos")
          }
        >
          <span>02</span>
          <b>Riscos</b>
          <small>
            {risks.length} identificados
          </small>
        </button>

        <button
          onClick={() =>
            go?.("acoes")
          }
        >
          <span>03</span>
          <b>Execução</b>
          <small>
            {actions.length} ações
          </small>
        </button>

        <button
          onClick={() =>
            go?.("evidencias")
          }
        >
          <span>04</span>
          <b>Evidências</b>
          <small>
            {evidence.length} registradas
          </small>
        </button>

        <button
          onClick={() =>
            go?.("juridico")
          }
        >
          <span>05</span>
          <b>Jurídico</b>
          <small>
            {legal.length} triagens
          </small>
        </button>

        <button
          onClick={() =>
            go?.("relatorio")
          }
        >
          <span>06</span>
          <b>Relatório</b>
          <small>
            Visão executiva
          </small>
        </button>

      </section>

    </div>
  );
}