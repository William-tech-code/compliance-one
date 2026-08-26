import { useEffect, useMemo, useState } from "react";

const CHAVE_PLANOS = "planos_acao_v27";
const CHAVE_EMPRESAS = "compliance_empresas_v30";
const CHAVE_EMPRESA_ATIVA = "compliance_empresa_ativa_v31";

function PlanoAcao({ empresaAtivaId = "" }) {
  const [empresaId, setEmpresaId] = useState(
    empresaAtivaId ||
      localStorage.getItem(CHAVE_EMPRESA_ATIVA) ||
      ""
  );

  const [planos, setPlanos] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem(CHAVE_PLANOS) || "[]"
      );
    } catch {
      return [];
    }
  });

  const [riscos, setRiscos] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem("nexus_riscos_v26") || "[]"
      );
    } catch {
      return [];
    }
  });

  const [empresas, setEmpresas] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem(CHAVE_EMPRESAS) || "[]"
      );
    } catch {
      return [];
    }
  });

  const [filtroStatus, setFiltroStatus] = useState("Todos");
  const [busca, setBusca] = useState("");

  useEffect(() => {
    setEmpresaId(
      empresaAtivaId ||
        localStorage.getItem(CHAVE_EMPRESA_ATIVA) ||
        ""
    );
  }, [empresaAtivaId]);

  useEffect(() => {
    const atualizarEmpresa = (event) => {
      setEmpresaId(
        event?.detail?.empresaId ??
          localStorage.getItem(CHAVE_EMPRESA_ATIVA) ??
          ""
      );
    };

    const atualizarDados = () => {
      try {
        setPlanos(
          JSON.parse(
            localStorage.getItem(CHAVE_PLANOS) || "[]"
          )
        );
      } catch {
        setPlanos([]);
      }

      try {
        setRiscos(
          JSON.parse(
            localStorage.getItem("nexus_riscos_v26") || "[]"
          )
        );
      } catch {
        setRiscos([]);
      }

      try {
        setEmpresas(
          JSON.parse(
            localStorage.getItem(CHAVE_EMPRESAS) || "[]"
          )
        );
      } catch {
        setEmpresas([]);
      }
    };

    window.addEventListener(
      "compliance-empresa-ativa-atualizada",
      atualizarEmpresa
    );

    window.addEventListener(
      "nexus-planos-atualizados",
      atualizarDados
    );

    window.addEventListener(
      "nexus-riscos-atualizados",
      atualizarDados
    );

    window.addEventListener("storage", atualizarDados);

    atualizarDados();

    return () => {
      window.removeEventListener(
        "compliance-empresa-ativa-atualizada",
        atualizarEmpresa
      );
      window.removeEventListener(
        "nexus-planos-atualizados",
        atualizarDados
      );
      window.removeEventListener(
        "nexus-riscos-atualizados",
        atualizarDados
      );
      window.removeEventListener("storage", atualizarDados);
    };
  }, []);

  const empresa = empresas.find(
    (item) => String(item.id) === String(empresaId)
  );

  const planosDaEmpresa = useMemo(() => {
    return planos.filter(
      (plano) =>
        !empresaId ||
        String(plano.empresaId || "") === String(empresaId)
    );
  }, [planos, empresaId]);

  const riscosDaEmpresa = useMemo(() => {
    return riscos.filter(
      (risco) =>
        !empresaId ||
        String(risco.empresaId || "") === String(empresaId)
    );
  }, [riscos, empresaId]);

  const planosFiltrados = useMemo(() => {
    const termo = busca.toLowerCase().trim();

    return planosDaEmpresa.filter((plano) => {
      const correspondeStatus =
        filtroStatus === "Todos" ||
        plano.status === filtroStatus;

      const correspondeBusca =
        !termo ||
        String(plano.acao || "")
          .toLowerCase()
          .includes(termo) ||
        String(plano.riscoNome || "")
          .toLowerCase()
          .includes(termo) ||
        String(plano.responsavel || "")
          .toLowerCase()
          .includes(termo);

      return correspondeStatus && correspondeBusca;
    });
  }, [
    planosDaEmpresa,
    filtroStatus,
    busca,
  ]);

  const indicadores = {
    total: planosDaEmpresa.length,
    pendentes: planosDaEmpresa.filter(
      (item) => item.status === "Pendente"
    ).length,
    andamento: planosDaEmpresa.filter(
      (item) => item.status === "Em andamento"
    ).length,
    concluidos: planosDaEmpresa.filter(
      (item) => item.status === "Concluída"
    ).length,
    atrasados: planosDaEmpresa.filter(
      (item) => item.status === "Atrasada"
    ).length,
  };

  const percentualConclusao =
    indicadores.total === 0
      ? 0
      : Math.round(
          (indicadores.concluidos / indicadores.total) * 100
        );

  function salvarPlanos(lista) {
    localStorage.setItem(
      CHAVE_PLANOS,
      JSON.stringify(lista)
    );

    setPlanos(lista);

    window.dispatchEvent(
      new Event("nexus-planos-atualizados")
    );
  }

  function atualizarStatus(id, status) {
    const atualizados = planos.map((plano) =>
      plano.id === id
        ? {
            ...plano,
            status,
            atualizadoEm: new Date().toISOString(),
          }
        : plano
    );

    salvarPlanos(atualizados);
  }

  function excluir(id) {
    if (
      !window.confirm(
        "Deseja excluir definitivamente este plano de ação?"
      )
    ) {
      return;
    }

    salvarPlanos(
      planos.filter((plano) => plano.id !== id)
    );
  }

  function concluirPlano(id) {
    atualizarStatus(id, "Concluída");
  }

  return (
    <div className="plano-acao-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">TRATAMENTO DE RISCOS</p>
          <h1>Plano de Ação</h1>
          <p className="page-subtitle">
            Acompanhe responsáveis, prazos, prioridades e conclusão
            das medidas de tratamento.
          </p>
        </div>
      </header>

      {!empresaId ? (
        <section
          className="content-card"
          style={{
            marginBottom: "18px",
            background: "#fff7ed",
            border: "1px solid #fed7aa",
            color: "#9a3412",
          }}
        >
          <strong>Nenhuma empresa selecionada.</strong>
          <p>
            Selecione uma empresa no topo para visualizar o plano
            de ação daquela empresa.
          </p>
        </section>
      ) : (
        <section
          className="content-card"
          style={{
            marginBottom: "18px",
            background: "#eff6ff",
            border: "1px solid #dbeafe",
          }}
        >
          <small
            style={{
              color: "#1d4ed8",
              fontWeight: 700,
            }}
          >
            EMPRESA ATIVA
          </small>

          <strong
            style={{
              display: "block",
              marginTop: "5px",
              color: "#17213c",
            }}
          >
            {empresa?.nomeFantasia ||
              empresa?.razaoSocial ||
              empresaId}
          </strong>

          <small
            style={{
              display: "block",
              marginTop: "3px",
              color: "#64748b",
            }}
          >
            {riscosDaEmpresa.length} risco(s) vinculado(s)
          </small>
        </section>
      )}

      <section
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "12px",
          marginBottom: "18px",
        }}
      >
        <Indicador titulo="Total" valor={indicadores.total} />
        <Indicador titulo="Pendentes" valor={indicadores.pendentes} />
        <Indicador titulo="Em andamento" valor={indicadores.andamento} />
        <Indicador titulo="Concluídos" valor={indicadores.concluidos} />
        <Indicador titulo="Atrasados" valor={indicadores.atrasados} />
        <Indicador
          titulo="Conclusão"
          valor={`${percentualConclusao}%`}
        />
      </section>

      <section className="content-card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "12px",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div>
            <p className="eyebrow">ACOMPANHAMENTO</p>
            <h2>Ações cadastradas</h2>
          </div>

          <div
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <input
              type="search"
              value={busca}
              onChange={(event) =>
                setBusca(event.target.value)
              }
              placeholder="Buscar ação, risco ou responsável..."
            />

            <select
              value={filtroStatus}
              onChange={(event) =>
                setFiltroStatus(event.target.value)
              }
            >
              <option>Todos</option>
              <option>Pendente</option>
              <option>Em andamento</option>
              <option>Concluída</option>
              <option>Atrasada</option>
            </select>
          </div>
        </div>

        {planosFiltrados.length === 0 ? (
          <div
            style={{
              marginTop: "20px",
              padding: "30px 20px",
              textAlign: "center",
              border: "1px dashed #cbd5e1",
              borderRadius: "12px",
            }}
          >
            <strong>Nenhum plano de ação encontrado.</strong>
            <p style={{ color: "#64748b" }}>
              Os planos são criados a partir do tratamento dos riscos
              na Matriz de Riscos.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: "12px",
              marginTop: "18px",
            }}
          >
            {planosFiltrados.map((plano) => {
              const prazoVencido =
                plano.prazo &&
                new Date(`${plano.prazo}T23:59:59`) <
                  new Date() &&
                plano.status !== "Concluída";

              return (
                <article
                  key={plano.id}
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: "14px",
                    padding: "18px",
                    background: "#fff",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "16px",
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ flex: "1 1 400px" }}>
                      <small
                        style={{
                          color: "#64748b",
                          fontWeight: 700,
                        }}
                      >
                        RISCO
                      </small>

                      <h3 style={{ margin: "5px 0 8px" }}>
                        {plano.riscoNome ||
                          "Risco não identificado"}
                      </h3>

                      <p
                        style={{
                          margin: 0,
                          color: "#475569",
                        }}
                      >
                        {plano.acao}
                      </p>
                    </div>

                    <div
                      style={{
                        minWidth: "180px",
                      }}
                    >
                      <small>STATUS</small>

                      <select
                        value={plano.status}
                        onChange={(event) =>
                          atualizarStatus(
                            plano.id,
                            event.target.value
                          )
                        }
                        style={{ marginTop: "5px" }}
                      >
                        <option>Pendente</option>
                        <option>Em andamento</option>
                        <option>Concluída</option>
                        <option>Atrasada</option>
                      </select>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(150px, 1fr))",
                      gap: "12px",
                      marginTop: "16px",
                      paddingTop: "16px",
                      borderTop: "1px solid #eef2f7",
                    }}
                  >
                    <Info
                      titulo="Responsável"
                      valor={plano.responsavel || "—"}
                    />

                    <Info
                      titulo="Prazo"
                      valor={
                        plano.prazo
                          ? new Date(
                              `${plano.prazo}T00:00:00`
                            ).toLocaleDateString("pt-BR")
                          : "—"
                      }
                      destaque={prazoVencido}
                    />

                    <Info
                      titulo="Prioridade"
                      valor={plano.prioridade || "—"}
                    />

                    <Info
                      titulo="Origem"
                      valor={plano.origem || "—"}
                    />
                  </div>

                  {plano.observacoes && (
                    <div
                      style={{
                        marginTop: "15px",
                        padding: "12px",
                        borderRadius: "10px",
                        background: "#f8fafc",
                      }}
                    >
                      <small>OBSERVAÇÕES</small>
                      <p style={{ margin: "5px 0 0" }}>
                        {plano.observacoes}
                      </p>
                    </div>
                  )}

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: "8px",
                      marginTop: "15px",
                    }}
                  >
                    {plano.status !== "Concluída" && (
                      <button
                        type="button"
                        onClick={() =>
                          concluirPlano(plano.id)
                        }
                      >
                        ✓ Concluir
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => excluir(plano.id)}
                      style={{ color: "#b91c1c" }}
                    >
                      Excluir
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function Indicador({ titulo, valor }) {
  return (
    <div className="content-card">
      <small
        style={{
          color: "#64748b",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: ".05em",
        }}
      >
        {titulo}
      </small>

      <strong
        style={{
          display: "block",
          fontSize: "28px",
          marginTop: "8px",
          color: "#17213c",
        }}
      >
        {valor}
      </strong>
    </div>
  );
}

function Info({ titulo, valor, destaque = false }) {
  return (
    <div>
      <small>{titulo}</small>
      <strong
        style={{
          display: "block",
          marginTop: "4px",
          color: destaque ? "#b91c1c" : "#17213c",
        }}
      >
        {valor}
      </strong>
    </div>
  );
}

export default PlanoAcao;
