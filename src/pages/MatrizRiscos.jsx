import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

function MatrizRiscos({ empresaAtivaId = "" }) {

  /* =====================================================
     V26.1 — INTEGRAÇÃO DIAGNÓSTICO → MATRIZ
     ===================================================== */

  const CHAVE_RISCOS_DIAGNOSTICO = "nexus_riscos_v26";
  const CHAVE_RISCOS_MATRIZ = "matriz_riscos";

  /* =====================================================
     V24.3 — PERMISSÕES INTERNAS DO MÓDULO
     ===================================================== */

  const CHAVE_PERMISSOES_V24 = "compliance_one_permissoes_v24";
  const CHAVE_PERFIL_V24 = "compliance_one_perfil_v24";

  const [permissoesInternas, setPermissoesInternas] = useState(() => {
    try {
      const salvas = localStorage.getItem(CHAVE_PERMISSOES_V24);
      const perfilAtual = localStorage.getItem(CHAVE_PERFIL_V24) || "administrador";

      const nomesPerfis = {
        administrador: "Administrador",
        compliance: "Compliance",
        gestor: "Gestor",
        funcionario: "Funcionário",
      };

      const dados = salvas ? JSON.parse(salvas) : {};
      const perfilNome = nomesPerfis[perfilAtual] || "Administrador";

      return {
        perfilAtual,
        perfilNome,
        modulo: dados?.[perfilNome]?.riscos || null,
      };
    } catch {
      return {
        perfilAtual: "administrador",
        perfilNome: "Administrador",
        modulo: {
          visualizar: true,
          criar: true,
          editar: true,
          excluir: true,
        },
      };
    }
  });

  useEffect(() => {
    const atualizarPermissoes = () => {
      try {
        const salvas = localStorage.getItem(CHAVE_PERMISSOES_V24);
        const perfilAtual =
          localStorage.getItem(CHAVE_PERFIL_V24) || "administrador";

        const nomesPerfis = {
          administrador: "Administrador",
          compliance: "Compliance",
          gestor: "Gestor",
          funcionario: "Funcionário",
        };

        const dados = salvas ? JSON.parse(salvas) : {};
        const perfilNome =
          nomesPerfis[perfilAtual] || "Administrador";

        setPermissoesInternas({
          perfilAtual,
          perfilNome,
          modulo: dados?.[perfilNome]?.riscos || null,
        });
      } catch {
        setPermissoesInternas({
          perfilAtual: "administrador",
          perfilNome: "Administrador",
          modulo: {
            visualizar: true,
            criar: true,
            editar: true,
            excluir: true,
          },
        });
      }
    };

    window.addEventListener(
      "compliance-permissoes-atualizadas",
      atualizarPermissoes
    );

    window.addEventListener(
      "compliance-perfil-atualizado",
      atualizarPermissoes
    );

    window.addEventListener("storage", atualizarPermissoes);

    atualizarPermissoes();

    return () => {
      window.removeEventListener(
        "compliance-permissoes-atualizadas",
        atualizarPermissoes
      );

      window.removeEventListener(
        "compliance-perfil-atualizado",
        atualizarPermissoes
      );

      window.removeEventListener("storage", atualizarPermissoes);
    };
  }, []);

  const permissaoRiscos = permissoesInternas.modulo || {};

  const podeVisualizarRiscos =
    permissaoRiscos.visualizar !== false;

  const podeCriarRisco =
    permissaoRiscos.criar === true;

  const podeEditarRisco =
    permissaoRiscos.editar === true;

  const podeExcluirRisco =
    permissaoRiscos.excluir === true;

  const podeVisualizarPlano =
    (() => {
      try {
        const salvas =
          localStorage.getItem(CHAVE_PERMISSOES_V24);

        if (!salvas) return true;

        const dados = JSON.parse(salvas);

        return (
          dados?.[
            permissoesInternas.perfilNome
          ]?.plano?.visualizar !== false
        );
      } catch {
        return true;
      }
    })();


  /* =====================================================
     ESTADOS PRINCIPAIS
  ===================================================== */

  const [riscos, setRiscos] = useState([]);

  const [mostrarFormulario, setMostrarFormulario] =
    useState(false);
const [mostrarPlanoAcao, setMostrarPlanoAcao] = useState(false);

const [riscoPlanoAcao, setRiscoPlanoAcao] = useState(null);

  /* =====================================================
     V27 — CONTROLE DO PLANO DE AÇÃO
  ===================================================== */

  const CHAVE_PLANOS_ACAO_V27 = "planos_acao_v27";

  const [planosAcao, setPlanosAcao] = useState(() => {
    try {
      const salvo = localStorage.getItem(CHAVE_PLANOS_ACAO_V27);
      return salvo ? JSON.parse(salvo) : [];
    } catch {
      return [];
    }
  });

  const [mostrarPlanos, setMostrarPlanos] = useState(false);
  const [filtroStatusPlano, setFiltroStatusPlano] = useState("Todos");


  const [acao, setAcao] = useState("");
  const [responsavelAcao, setResponsavelAcao] = useState("");
  const [prazoAcao, setPrazoAcao] = useState("");
  const [prioridadeAcao, setPrioridadeAcao] = useState("Alta");
  const [statusAcao, setStatusAcao] = useState("Pendente");
  const [observacoesAcao, setObservacoesAcao] = useState("");

  function abrirPlanoAcao(risco) {
    setRiscoPlanoAcao(risco);
    setAcao("");
    setResponsavelAcao(risco.responsavel || "");
    setPrazoAcao("");
    setPrioridadeAcao(risco.nivel === "Crítico" ? "Crítica" : risco.nivel === "Alto" ? "Alta" : "Média");
    setStatusAcao("Pendente");
    setObservacoesAcao("");
    setMostrarPlanoAcao(true);
  }

  function fecharPlanoAcao() {
    setMostrarPlanoAcao(false);
    setRiscoPlanoAcao(null);
  }

  function salvarAcao() {
    if (!riscoPlanoAcao) return;

    if (!acao.trim() || !responsavelAcao.trim() || !prazoAcao) {
      alert("Preencha a ação, o responsável e o prazo.");
      return;
    }

    const novaAcao = {
      id: `acao-${Date.now()}`,
      empresaId:
        riscoPlanoAcao.empresaId ||
        empresaSelecionadaId ||
        "",
      riscoId: riscoPlanoAcao.id,
      riscoNome: riscoPlanoAcao.nome,
      categoria: riscoPlanoAcao.categoria,
      origem: riscoPlanoAcao.origem || "Cadastro manual",
      acao: acao.trim(),
      responsavel: responsavelAcao.trim(),
      prazo: prazoAcao,
      prioridade: prioridadeAcao,
      status: statusAcao,
      observacoes: observacoesAcao.trim(),
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
    };

    setPlanosAcao((anteriores) => {
      const atualizados = [...anteriores, novaAcao];
      localStorage.setItem(
        CHAVE_PLANOS_ACAO_V27,
        JSON.stringify(atualizados)
      );
      window.dispatchEvent(
        new Event("nexus-planos-atualizados")
      );
      return atualizados;
    });

    alert("Plano de ação salvo com sucesso!");
    fecharPlanoAcao();
  }

  function atualizarStatusPlano(id, novoStatus) {
    setPlanosAcao((anteriores) => {
      const atualizados = anteriores.map((plano) =>
        plano.id === id
          ? {
              ...plano,
              status: novoStatus,
              atualizadoEm: new Date().toISOString(),
            }
          : plano
      );

      localStorage.setItem(
        CHAVE_PLANOS_ACAO_V27,
        JSON.stringify(atualizados)
      );

      window.dispatchEvent(
        new Event("nexus-planos-atualizados")
      );

      return atualizados;
    });
  }

  function excluirPlanoAcao(id) {
    if (!window.confirm("Deseja excluir este plano de ação?")) return;

    setPlanosAcao((anteriores) => {
      const atualizados = anteriores.filter(
        (plano) => plano.id !== id
      );

      localStorage.setItem(
        CHAVE_PLANOS_ACAO_V27,
        JSON.stringify(atualizados)
      );

      window.dispatchEvent(
        new Event("nexus-planos-atualizados")
      );

      return atualizados;
    });
  }

  const planosDaEmpresaV34 = planosAcao.filter(
    (plano) =>
      !empresaSelecionadaId ||
      String(plano.empresaId || "") ===
        String(empresaSelecionadaId)
  );

  const planosFiltrados = planosDaEmpresaV34.filter(
    (plano) =>
      filtroStatusPlano === "Todos" ||
      plano.status === filtroStatusPlano
  );

  const planosPendentes = planosDaEmpresaV34.filter(
    (plano) => plano.status === "Pendente"
  ).length;

  const planosAndamento = planosDaEmpresaV34.filter(
    (plano) => plano.status === "Em andamento"
  ).length;

  const planosConcluidos = planosDaEmpresaV34.filter(
    (plano) => plano.status === "Concluída"
  ).length;

  const planosAtrasados = planosDaEmpresaV34.filter(
    (plano) => plano.status === "Atrasada"
  ).length;

  const [riscoEditando, setRiscoEditando] =
    useState(null);

  const [busca, setBusca] = useState("");

  // =====================================================
  // V31 — EMPRESA ATIVA
  // =====================================================

  const [empresaAtivaIdV31, setEmpresaAtivaIdV31] = useState(
    empresaAtivaId ||
      localStorage.getItem("compliance_empresa_ativa_v31") ||
      localStorage.getItem("compliance_empresa_ativa_v30") ||
      ""
  );

  useEffect(() => {
    const atualizarEmpresa = (event) => {
      const id =
        event?.detail?.empresaId ??
        localStorage.getItem("compliance_empresa_ativa_v31") ??
        "";
      setEmpresaAtivaIdV31(id);
    };

    window.addEventListener(
      "compliance-empresa-ativa-atualizada",
      atualizarEmpresa
    );

    return () => {
      window.removeEventListener(
        "compliance-empresa-ativa-atualizada",
        atualizarEmpresa
      );
    };
  }, []);

  const empresaSelecionadaId =
    empresaAtivaId || empresaAtivaIdV31 || "";

  const pertenceAEmpresa = (registro) =>
    !empresaSelecionadaId ||
    String(registro.empresaId || "") === String(empresaSelecionadaId);


  const [filtroCategoria, setFiltroCategoria] =
    useState("Todas");

  const [filtroNivel, setFiltroNivel] =
    useState("Todos");

  /* =====================================================
     CAMPOS DO FORMULÁRIO
  ===================================================== */

  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [descricao, setDescricao] = useState("");
  const [medidaControle, setMedidaControle] =
    useState("");

  const [probabilidade, setProbabilidade] =
    useState(3);

  const [impacto, setImpacto] =
    useState(3);

  const [status, setStatus] =
    useState("Em monitoramento");

  const [prazo, setPrazo] =
    useState("");

  /* =====================================================
     V26.1 — CARREGAMENTO E SINCRONIZAÇÃO
     ===================================================== */

  useEffect(() => {
    const carregarRiscos = () => {
      try {
        const matriz = JSON.parse(
          localStorage.getItem(CHAVE_RISCOS_MATRIZ) || "[]"
        );
        const diagnostico = JSON.parse(
          localStorage.getItem(CHAVE_RISCOS_DIAGNOSTICO) || "[]"
        );

        const matrizArray = Array.isArray(matriz) ? matriz : [];
        const diagnosticoArray = Array.isArray(diagnostico)
          ? diagnostico
          : [];

        const ids = new Set(
          matrizArray.map((risco) => String(risco.id))
        );

        const importados = diagnosticoArray
          .filter((risco) => !ids.has(String(risco.id)))
          .map((risco) => ({
            ...risco,
            origem: "Diagnóstico",
            origemTipo: "diagnostico",
            status: risco.status || "Em monitoramento",
            criadoEm: risco.criadoEm || new Date().toISOString(),
            atualizadoEm: new Date().toISOString(),
          }));

        setRiscos([...matrizArray, ...importados]);
      } catch (erro) {
        console.error("Erro ao carregar riscos:", erro);
        setRiscos([]);
      }
    };

    carregarRiscos();

    window.addEventListener("nexus-riscos-atualizados", carregarRiscos);
    window.addEventListener("storage", carregarRiscos);

    return () => {
      window.removeEventListener("nexus-riscos-atualizados", carregarRiscos);
      window.removeEventListener("storage", carregarRiscos);
    };
  }, []);

  /* =====================================================
     SALVAR DADOS
  ===================================================== */

  useEffect(() => {
    const atualizarRiscosDoDiagnostico = () => {
      try {
        const armazenados = JSON.parse(
          localStorage.getItem("nexus_riscos_v26") || "[]"
        );

        const filtrados = armazenados.filter(
          (risco) =>
            !empresaSelecionadaId ||
            String(risco.empresaId || "") ===
              String(empresaSelecionadaId)
        );

        setRiscos((anteriores) => {
          const idsExistentes = new Set(
            anteriores.map((item) => String(item.id))
          );

          const novos = filtrados.filter(
            (item) => !idsExistentes.has(String(item.id))
          );

          return novos.length > 0
            ? [...anteriores, ...novos]
            : anteriores;
        });
      } catch {
        // Mantém o estado atual se o armazenamento estiver inválido.
      }
    };

    window.addEventListener(
      "nexus-diagnostico-riscos-gerados",
      atualizarRiscosDoDiagnostico
    );

    return () =>
      window.removeEventListener(
        "nexus-diagnostico-riscos-gerados",
        atualizarRiscosDoDiagnostico
      );
  }, [empresaSelecionadaId]);


  useEffect(() => {

    try {

      localStorage.setItem(
        CHAVE_RISCOS_MATRIZ,
        JSON.stringify(riscos)
      );

    } catch (erro) {

      console.error(
        "Erro ao salvar riscos:",
        erro
      );

    }

  }, [riscos]);

  /* =====================================================
     V26.1 — ORIGEM DOS RISCOS
     ===================================================== */

  const riscosDoDiagnostico = useMemo(
    () =>
      riscos.filter(
        (risco) =>
          risco.origemTipo === "diagnostico" ||
          risco.origem === "Diagnóstico"
      ),
    [riscos]
  );

  const riscosManuais = useMemo(
    () =>
      riscos.filter(
        (risco) =>
          risco.origemTipo !== "diagnostico" &&
          risco.origem !== "Diagnóstico"
      ),
    [riscos]
  );

  const origemDoRisco = (risco) =>
    risco.origemTipo === "diagnostico" ||
    risco.origem === "Diagnóstico"
      ? "Diagnóstico"
      : "Cadastro manual";

  function importarNovosRiscosDoDiagnostico() {
    try {
      const dados = JSON.parse(
        localStorage.getItem(CHAVE_RISCOS_DIAGNOSTICO) || "[]"
      );

      if (!Array.isArray(dados) || dados.length === 0) {
        alert("Nenhum risco proveniente do diagnóstico foi encontrado.");
        return;
      }

      setRiscos((atuais) => {
        const ids = new Set(atuais.map((risco) => String(risco.id)));

        const novos = dados
          .filter((risco) => !ids.has(String(risco.id)))
          .map((risco) => ({
            ...risco,
            origem: "Diagnóstico",
            origemTipo: "diagnostico",
            status: risco.status || "Em monitoramento",
            criadoEm: risco.criadoEm || new Date().toISOString(),
            atualizadoEm: new Date().toISOString(),
          }));

        if (!novos.length) {
          alert("A matriz já contém todos os riscos do diagnóstico.");
          return atuais;
        }

        alert(`${novos.length} risco(s) importado(s) do diagnóstico.`);
        return [...atuais, ...novos];
      });
    } catch (erro) {
      console.error("Erro ao importar riscos:", erro);
      alert("Não foi possível importar os riscos do diagnóstico.");
    }
  }

  /* =====================================================
     CALCULAR NÍVEL
  ===================================================== */

  function calcularNivel(
    prob,
    imp
  ) {

    const resultado =
      Number(prob) * Number(imp);

    if (resultado >= 16) {
      return "Crítico";
    }

    if (resultado >= 10) {
      return "Alto";
    }

    if (resultado >= 5) {
      return "Moderado";
    }

    return "Baixo";
  }

  /* =====================================================
     SCORE
  ===================================================== */

  function calcularScore(
    prob,
    imp
  ) {

    return (
      Number(prob) *
      Number(imp)
    );

  }

  /* =====================================================
     CLASSES VISUAIS DO NÍVEL
  ===================================================== */

  function getNivelStyle(nivel) {

    switch (nivel) {

      case "Crítico":

        return {
          background: "#fee2e2",
          color: "#991b1b",
          border: "1px solid #fecaca",
        };

      case "Alto":

        return {
          background: "#ffedd5",
          color: "#9a3412",
          border: "1px solid #fed7aa",
        };

      case "Moderado":

        return {
          background: "#fef3c7",
          color: "#92400e",
          border: "1px solid #fde68a",
        };

      default:

        return {
          background: "#dcfce7",
          color: "#166534",
          border: "1px solid #bbf7d0",
        };

    }

  }

  /* =====================================================
     STATUS
  ===================================================== */

  function getStatusStyle(statusAtual) {

    switch (statusAtual) {

      case "Controlado":

        return {
          background: "#dcfce7",
          color: "#166534",
        };

      case "Em tratamento":

        return {
          background: "#dbeafe",
          color: "#1d4ed8",
        };

      case "Atrasado":

        return {
          background: "#fee2e2",
          color: "#991b1b",
        };

      default:

        return {
          background: "#fef3c7",
          color: "#92400e",
        };

    }

  }

  /* =====================================================
     CADASTRAR / EDITAR
  ===================================================== */

  function cadastrarRisco(e) {

    e.preventDefault();

    if (riscoEditando && !podeEditarRisco) {
      alert("Você não possui permissão para editar riscos.");
      return;
    }

    if (!riscoEditando && !podeCriarRisco) {
      alert("Você não possui permissão para criar riscos.");
      return;
    }

    if (
      !nome.trim() ||
      !categoria.trim() ||
      !responsavel.trim() ||
      !descricao.trim()
    ) {

      alert(
        "Preencha nome, categoria, responsável e descrição."
      );

      return;

    }

    const prob =
      Number(probabilidade);

    const imp =
      Number(impacto);

    const riscoAtualizado = {

      id: riscoEditando
        ? riscoEditando.id
        : Date.now(),

      nome: nome.trim(),

      categoria: categoria.trim(),

      responsavel: responsavel.trim(),

      descricao: descricao.trim(),

      medidaControle:
        medidaControle.trim(),

      probabilidade: prob,

      impacto: imp,

      score:
        calcularScore(prob, imp),

      nivel:
        calcularNivel(prob, imp),

      status,

      prazo,

      origem: riscoEditando
        ? (riscoEditando.origem || "Cadastro manual")
        : "Cadastro manual",

      origemTipo: riscoEditando
        ? (riscoEditando.origemTipo || "manual")
        : "manual",

      criadoEm:
        riscoEditando
          ? riscoEditando.criadoEm
          : new Date().toISOString(),

      atualizadoEm:
        new Date().toISOString(),

    };

    if (riscoEditando) {

      setRiscos(
        (listaAtual) =>
          listaAtual.map(
            (risco) =>
              risco.id ===
              riscoEditando.id
                ? riscoAtualizado
                : risco
          )
      );

    } else {

      setRiscos(
        (listaAtual) => [
          ...listaAtual,
          riscoAtualizado,
        ]
      );

    }

    limparFormulario();

  }

  /* =====================================================
     EDITAR
  ===================================================== */

  function editarRisco(risco) {

    if (!podeEditarRisco) {
      alert("Você não possui permissão para editar riscos.");
      return;
    }

    setRiscoEditando(risco);

    setNome(
      risco.nome || ""
    );

    setCategoria(
      risco.categoria || ""
    );

    setResponsavel(
      risco.responsavel || ""
    );

    setDescricao(
      risco.descricao || ""
    );

    setMedidaControle(
      risco.medidaControle || ""
    );

    setProbabilidade(
      Number(risco.probabilidade) || 3
    );

    setImpacto(
      Number(risco.impacto) || 3
    );

    setStatus(
      risco.status ||
      "Em monitoramento"
    );

    setPrazo(
      risco.prazo || ""
    );

    setMostrarFormulario(true);

  }

  /* =====================================================
     EXCLUIR
  ===================================================== */

  function excluirRisco(id) {

    if (!podeExcluirRisco) {
      alert("Você não possui permissão para excluir riscos.");
      return;
    }

    const confirmar =
      window.confirm(
        "Tem certeza que deseja excluir este risco?\n\nEssa ação removerá o risco da matriz."
      );

    if (!confirmar) {
      return;
    }

    setRiscos(
      (listaAtual) =>
        listaAtual.filter(
          (risco) =>
            risco.id !== id
        )
    );

    if (
      riscoEditando &&
      riscoEditando.id === id
    ) {

      limparFormulario();

    }

  }

  /* =====================================================
     LIMPAR FORMULÁRIO
  ===================================================== */

  function limparFormulario() {

    setNome("");

    setCategoria("");

    setResponsavel("");

    setDescricao("");

    setMedidaControle("");

    setProbabilidade(3);

    setImpacto(3);

    setStatus(
      "Em monitoramento"
    );

    setPrazo("");

    setRiscoEditando(null);

    setMostrarFormulario(false);

  }

  /* =====================================================
     NOVO RISCO
  ===================================================== */

  function novoRisco() {

    limparFormulario();

    setMostrarFormulario(true);

  }

  /* =====================================================
     CATEGORIAS
  ===================================================== */

  const categorias =
    useMemo(() => {

      const lista =
        riscos
          .map(
            (risco) =>
              risco.categoria
          )
          .filter(Boolean);

      return [
        "Todas",
        ...Array.from(
          new Set(lista)
        ),
      ];

    }, [riscos]);

  /* =====================================================
     RISCOS FILTRADOS
  ===================================================== */

  const riscosFiltrados =
    riscosDaEmpresa.filter(
      (risco) => {
        const textoBusca = busca.toLowerCase().trim();

        const nome = String(risco.nome || "").toLowerCase();
        const descricao = String(risco.descricao || "").toLowerCase();
        const responsavel = String(risco.responsavel || "").toLowerCase();

        const correspondeBusca =
          !textoBusca ||
          nome.includes(textoBusca) ||
          descricao.includes(textoBusca) ||
          responsavel.includes(textoBusca);

        const correspondeCategoria =
          filtroCategoria === "Todas" ||
          risco.categoria === filtroCategoria;

        const correspondeNivel =
          filtroNivel === "Todos" ||
          risco.nivel === filtroNivel;

        return (
          correspondeBusca &&
          correspondeCategoria &&
          correspondeNivel
        );
      }
    );

  /* =====================================================
     INDICADORES
  ===================================================== */

  const riscosEmAtencao =
    riscos.filter(
      (risco) =>
        risco.nivel ===
          "Moderado" ||
        risco.nivel ===
          "Alto"
    ).length;

  const riscosCriticos =
    riscos.filter(
      (risco) =>
        risco.nivel ===
        "Crítico"
    ).length;

  const riscosAltos =
    riscos.filter(
      (risco) =>
        risco.nivel ===
        "Alto"
    ).length;

  const riscosControlados =
    riscos.filter(
      (risco) =>
        risco.status ===
        "Controlado"
    ).length;

  /* =====================================================
     FORMULÁRIO ABERTO
  ===================================================== */

  const formularioAberto =
    mostrarFormulario ||
    riscoEditando !== null;

  /* =====================================================
     RENDER
  ===================================================== */

  if (!podeVisualizarRiscos) {
    return (
      <div
        className="content-card"
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "50px 30px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: "42px",
            marginBottom: "14px",
          }}
        >
          🔒
        </div>

        <p
          className="eyebrow"
          style={{ marginBottom: "6px" }}
        >
          ACESSO RESTRITO
        </p>

        <h2
          style={{
            margin: "0 0 10px",
            color: "#17213c",
          }}
        >
          Matriz de Riscos
        </h2>

        <p
          style={{
            margin: 0,
            color: "#667085",
          }}
        >
          O perfil <strong>{permissoesInternas.perfilNome}</strong>{" "}
          não possui permissão para visualizar este módulo.
        </p>
      </div>
    );
  }

  return (

    <div
      className="page"
      style={{
        width: "100%",
        boxSizing: "border-box",
        paddingBottom: "40px",
      }}
    >

      {/* =================================================
          CABEÇALHO
      ================================================= */}

      <div
        className="page-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "20px",
          marginBottom: "24px",
        }}
      >

        <div>

          <p className="eyebrow">
            GESTÃO DE RISCOS
          </p>

          <h1>
            Matriz de Riscos
          </h1>

          <p className="page-description">
            Identifique, avalie, trate e acompanhe
            os principais riscos da organização.
          </p>

        </div>

        <div
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
            justifyContent: "flex-end",
          }}
        >
          <button
            type="button"
            onClick={importarNovosRiscosDoDiagnostico}
          >
            ↻ Importar diagnóstico
          </button>

          {podeCriarRisco && (
            <button
              type="button"
              className="primary-button"
              onClick={novoRisco}
            >
              + Novo risco
            </button>
          )}
        </div>

      </div>


      {/* =================================================
          INDICADORES
      ================================================= */}

      <section
        className="risk-overview"
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "16px",
          marginBottom: "24px",
        }}
      >

        <div className="diagnostic-card">

          <span className="diagnostic-icon blue">
            !
          </span>

          <div>

            <small>
              Riscos identificados
            </small>

            <strong>
              {riscos.length}
            </strong>

          </div>

        </div>


        <div className="diagnostic-card">

          <span className="diagnostic-icon yellow">
            !
          </span>

          <div>

            <small>
              Em atenção
            </small>

            <strong>
              {riscosEmAtencao}
            </strong>

          </div>

        </div>


        <div className="diagnostic-card">

          <span className="diagnostic-icon red">
            !
          </span>

          <div>

            <small>
              Riscos críticos
            </small>

            <strong>
              {riscosCriticos}
            </strong>

          </div>

        </div>


        <div className="diagnostic-card">

          <span
            className="diagnostic-icon"
            style={{
              background: "#dcfce7",
              color: "#166534",
            }}
          >
            ✓
          </span>

          <div>

            <small>
              Controlados
            </small>

            <strong>
              {riscosControlados}
            </strong>

          </div>

        </div>

      </section>


      {/* =================================================
          V26.1 — INTEGRAÇÃO
      ================================================= */}

      <section
        className="content-card"
        style={{
          marginBottom: "24px",
          border: "1px solid #dbeafe",
          background: "#ffffff",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "20px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <p className="eyebrow">INTEGRAÇÃO V26.1</p>
            <h2 style={{ margin: "4px 0 6px" }}>
              Diagnóstico → Matriz de Riscos
            </h2>
            <p style={{ margin: 0, color: "#64748b", lineHeight: 1.5 }}>
              Riscos identificados no diagnóstico são incorporados à matriz
              sem apagar os riscos cadastrados manualmente.
            </p>
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <span
              style={{
                padding: "8px 12px",
                borderRadius: "999px",
                background: "#eef2ff",
                color: "#4338ca",
                fontSize: "12px",
                fontWeight: 800,
              }}
            >
              {riscosDoDiagnostico.length} do diagnóstico
            </span>

            <span
              style={{
                padding: "8px 12px",
                borderRadius: "999px",
                background: "#f8fafc",
                color: "#475569",
                fontSize: "12px",
                fontWeight: 800,
              }}
            >
              {riscosManuais.length} manual(is)
            </span>
          </div>
        </div>
      </section>

      {/* =================================================
          MATRIZ 5 X 5
      ================================================= */}

      <section
        className="content-card"
        style={{
          marginBottom: "24px",
        }}
      >

        <div
          className="section-heading"
          style={{
            marginBottom: "20px",
          }}
        >

          <div>

            <p className="eyebrow">
              ANÁLISE
            </p>

            <h2>
              Mapa de criticidade
            </h2>

          </div>

          <span>
            Probabilidade × Impacto
          </span>

        </div>


        <div
          style={{
            overflowX: "auto",
          }}
        >

          <div
            style={{
              minWidth: "520px",
              display: "grid",
              gridTemplateColumns:
                "90px repeat(5, 1fr)",
              gap: "4px",
            }}
          >

            <div />

            {[1, 2, 3, 4, 5].map(
              (valor) => (

                <div
                  key={valor}
                  style={{
                    textAlign: "center",
                    fontWeight: 700,
                    padding: "8px",
                  }}
                >
                  {valor}
                </div>

              )
            )}


            {[5, 4, 3, 2, 1].map(
              (prob) => (

                <React.Fragment
                  key={prob}
                >

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                    }}
                  >
                    P {prob}
                  </div>

                  {[1, 2, 3, 4, 5].map(
                    (imp) => {

                      const nivel =
                        calcularNivel(
                          prob,
                          imp
                        );

                      const quantidade =
                        riscos.filter(
                          (risco) =>
                            Number(
                              risco.probabilidade
                            ) === prob &&
                            Number(
                              risco.impacto
                            ) === imp
                        ).length;

                      const style =
                        getNivelStyle(
                          nivel
                        );

                      return (

                        <div
                          key={`${prob}-${imp}`}
                          style={{
                            minHeight: "58px",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: "8px",
                            background:
                              style.background,
                            color:
                              style.color,
                            border:
                              style.border,
                            fontSize: "12px",
                            fontWeight: 700,
                          }}
                        >

                          <span>
                            {prob * imp}
                          </span>

                          {quantidade > 0 && (

                            <span
                              style={{
                                fontSize: "11px",
                                marginTop: "3px",
                              }}
                            >
                              {quantidade} risco
                              {quantidade > 1
                                ? "s"
                                : ""}
                            </span>

                          )}

                        </div>

                      );

                    }
                  )}

                </React.Fragment>

              )
            )}

          </div>

        </div>


        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "12px",
            marginTop: "16px",
          }}
        >

          {[
            "Baixo",
            "Moderado",
            "Alto",
            "Crítico",
          ].map(
            (nivel) => {

              const style =
                getNivelStyle(
                  nivel
                );

              return (

                <span
                  key={nivel}
                  style={{
                    ...style,
                    padding:
                      "6px 10px",
                    borderRadius:
                      "999px",
                    fontSize:
                      "12px",
                    fontWeight:
                      700,
                  }}
                >
                  {nivel}
                </span>

              );

            }
          )}

        </div>

      </section>


      {/* =================================================
          FORMULÁRIO
      ================================================= */}

      {formularioAberto && (podeCriarRisco || (riscoEditando && podeEditarRisco)) && (

        <section
          className="content-card"
          style={{
            width: "100%",
            boxSizing: "border-box",
            marginBottom: "24px",
          }}
        >

          <div
            className="section-heading"
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems:
                "center",
              marginBottom:
                "24px",
            }}
          >

            <div>

              <p className="eyebrow">

                {riscoEditando
                  ? "EDIÇÃO DE RISCO"
                  : "NOVO RISCO"}

              </p>

              <h2>

                {riscoEditando
                  ? "Editar risco"
                  : "Cadastrar risco"}

              </h2>

            </div>

            <button
              type="button"
              onClick={
                limparFormulario
              }
            >
              Fechar
            </button>

          </div>


          <form
            onSubmit={
              cadastrarRisco
            }
          >

            <div
              className="form-grid"
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "18px",
              }}
            >

              <div className="form-group">

                <label>
                  Nome do risco *
                </label>

                <input
                  type="text"
                  value={nome}
                  onChange={(e) =>
                    setNome(
                      e.target.value
                    )
                  }
                  placeholder="Ex.: Falha no processo de compras"
                />

              </div>


              <div className="form-group">

                <label>
                  Categoria *
                </label>

                <input
                  type="text"
                  value={categoria}
                  onChange={(e) =>
                    setCategoria(
                      e.target.value
                    )
                  }
                  placeholder="Ex.: Operacional"
                />

              </div>


              <div className="form-group">

                <label>
                  Responsável *
                </label>

                <input
                  type="text"
                  value={responsavel}
                  onChange={(e) =>
                    setResponsavel(
                      e.target.value
                    )
                  }
                  placeholder="Responsável pelo risco"
                />

              </div>


              <div className="form-group">

                <label>
                  Probabilidade *
                </label>

                <select
                  value={probabilidade}
                  onChange={(e) =>
                    setProbabilidade(
                      Number(
                        e.target.value
                      )
                    )
                  }
                >

                  <option value={1}>
                    1 - Muito baixa
                  </option>

                  <option value={2}>
                    2 - Baixa
                  </option>

                  <option value={3}>
                    3 - Média
                  </option>

                  <option value={4}>
                    4 - Alta
                  </option>

                  <option value={5}>
                    5 - Muito alta
                  </option>

                </select>

              </div>


              <div className="form-group">

                <label>
                  Impacto *
                </label>

                <select
                  value={impacto}
                  onChange={(e) =>
                    setImpacto(
                      Number(
                        e.target.value
                      )
                    )
                  }
                >

                  <option value={1}>
                    1 - Muito baixo
                  </option>

                  <option value={2}>
                    2 - Baixo
                  </option>

                  <option value={3}>
                    3 - Médio
                  </option>

                  <option value={4}>
                    4 - Alto
                  </option>

                  <option value={5}>
                    5 - Muito alto
                  </option>

                </select>

              </div>


              <div className="form-group">

                <label>
                  Status
                </label>

                <select
                  value={status}
                  onChange={(e) =>
                    setStatus(
                      e.target.value
                    )
                  }
                >

                  <option>
                    Em monitoramento
                  </option>

                  <option>
                    Em tratamento
                  </option>

                  <option>
                    Controlado
                  </option>

                  <option>
                    Atrasado
                  </option>

                </select>

              </div>


              <div className="form-group">

                <label>
                  Prazo
                </label>

                <input
                  type="date"
                  value={prazo}
                  onChange={(e) =>
                    setPrazo(
                      e.target.value
                    )
                  }
                />

              </div>


              <div className="form-group">

                <label>
                  Medida de controle
                </label>

                <input
                  type="text"
                  value={
                    medidaControle
                  }
                  onChange={(e) =>
                    setMedidaControle(
                      e.target.value
                    )
                  }
                  placeholder="Ex.: Dupla conferência"
                />

              </div>


              <div
                className="form-group"
                style={{
                  gridColumn:
                    "1 / -1",
                }}
              >

                <label>
                  Descrição *
                </label>

                <textarea
                  value={descricao}
                  onChange={(e) =>
                    setDescricao(
                      e.target.value
                    )
                  }
                  placeholder="Descreva o risco, suas causas e possíveis consequências..."
                  rows={5}
                />

              </div>

            </div>


            {/* PREVISUALIZAÇÃO */}

            <div
              style={{
                marginTop: "24px",
                padding: "18px",
                borderRadius: "12px",
                background: "#f8fafc",
                border:
                  "1px solid #e2e8f0",
              }}
            >

              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "center",
                  flexWrap:
                    "wrap",
                  gap: "12px",
                }}
              >

                <div>

                  <small>
                    CLASSIFICAÇÃO ATUAL
                  </small>

                  <h3
                    style={{
                      margin:
                        "4px 0 0",
                    }}
                  >
                    {calcularNivel(
                      probabilidade,
                      impacto
                    )}
                  </h3>

                </div>

                <div
                  style={{
                    textAlign:
                      "right",
                  }}
                >

                  <small>
                    SCORE
                  </small>

                  <strong
                    style={{
                      display:
                        "block",
                      fontSize:
                        "28px",
                    }}
                  >
                    {calcularScore(
                      probabilidade,
                      impacto
                    )}
                    /25
                  </strong>

                </div>

              </div>

            </div>


            {/* BOTÕES */}

            <div
              style={{
                display: "flex",
                gap: "12px",
                marginTop: "24px",
                flexWrap:
                  "wrap",
              }}
            >

              <button
                type="submit"
                className="primary-button"
              >

                {riscoEditando
                  ? "Salvar alterações"
                  : "Cadastrar risco"}

              </button>


              <button
                type="button"
                onClick={
                  limparFormulario
                }
              >
                Cancelar
              </button>

            </div>

          </form>

        </section>

      )}
      {/* =================================================
          PLANO DE AÇÃO
      ================================================= */}

      {mostrarPlanoAcao && riscoPlanoAcao && (
        <div style={{ position: "fixed", inset: 0, zIndex: 999999, background: "rgba(15,23,42,.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", overflowY: "auto" }}>
          <section className="content-card" style={{ width: "min(900px,100%)", maxHeight: "90vh", overflowY: "auto", background: "#fff", borderRadius: "18px", padding: "28px", boxShadow: "0 25px 70px rgba(15,23,42,.25)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "20px", marginBottom: "24px" }}>
              <div><p className="eyebrow">PLANO DE AÇÃO</p><h2 style={{ margin: 0 }}>Tratamento do risco</h2><p style={{ marginTop: "8px", color: "#64748b" }}>Cadastre uma ação vinculada diretamente ao risco selecionado.</p></div>
              <button type="button" onClick={fecharPlanoAcao}>Fechar</button>
            </div>
            <div style={{ padding: "18px", borderRadius: "12px", background: "#f8fafc", border: "1px solid #e2e8f0", marginBottom: "24px" }}>
              <small>RISCO VINCULADO</small>
              <h3 style={{ margin: "6px 0 12px" }}>{riscoPlanoAcao.nome}</h3>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <span>Categoria: <strong>{riscoPlanoAcao.categoria}</strong></span>
                <span>Score: <strong>{riscoPlanoAcao.score || calcularScore(riscoPlanoAcao.probabilidade, riscoPlanoAcao.impacto)}/25</strong></span>
                <span>Nível: <strong>{riscoPlanoAcao.nivel}</strong></span>
                <span>Responsável: <strong>{riscoPlanoAcao.responsavel}</strong></span>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: "18px" }}>
              <div className="form-group" style={{ gridColumn: "1 / -1" }}><label>Ação necessária *</label><input id="plano-acao" name="planoAcao" type="text" value={acao} onChange={(e) => setAcao(e.target.value)} placeholder="Ex.: Atualizar documentação dos funcionários" /></div>
              <div className="form-group"><label>Responsável pela ação *</label><input id="responsavel-acao" name="responsavelAcao" type="text" value={responsavelAcao} onChange={(e) => setResponsavelAcao(e.target.value)} placeholder="Nome do responsável" /></div>
              <div className="form-group"><label>Prazo *</label><input id="prazo-acao" name="prazoAcao" type="date" value={prazoAcao} onChange={(e) => setPrazoAcao(e.target.value)} /></div>
              <div className="form-group"><label>Prioridade</label><select id="prioridade-acao" name="prioridadeAcao" value={prioridadeAcao} onChange={(e) => setPrioridadeAcao(e.target.value)}><option>Baixa</option><option>Média</option><option>Alta</option><option>Crítica</option></select></div>
              <div className="form-group"><label>Status</label><select id="status-acao" name="statusAcao" value={statusAcao} onChange={(e) => setStatusAcao(e.target.value)}><option>Pendente</option><option>Em andamento</option><option>Concluída</option><option>Atrasada</option></select></div>
              <div className="form-group" style={{ gridColumn: "1 / -1" }}><label>Observações</label><textarea id="observacoes-acao" name="observacoesAcao" rows={4} value={observacoesAcao} onChange={(e) => setObservacoesAcao(e.target.value)} placeholder="Detalhes, providências ou observações..." /></div>
            </div>
            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "24px", flexWrap: "wrap" }}><button type="button" onClick={fecharPlanoAcao}>Cancelar</button><button type="button" className="primary-button" onClick={salvarAcao}>💾 Salvar ação</button></div>
          </section>
        </div>
      )}

      {/* =================================================
          V27 — PLANO DE AÇÃO E ACOMPANHAMENTO
      ================================================= */}

      {podeVisualizarPlano && (
        <section
          className="content-card"
          style={{
            width: "100%",
            boxSizing: "border-box",
            marginBottom: "24px",
          }}
        >
          <div
            className="section-heading"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "16px",
              flexWrap: "wrap",
              marginBottom: "20px",
            }}
          >
            <div>
              <p className="eyebrow">TRATAMENTO</p>
              <h2>Plano de Ação</h2>
              <p style={{ margin: "6px 0 0", color: "#64748b" }}>
                Acompanhe as medidas corretivas vinculadas aos riscos.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setMostrarPlanos((valor) => !valor)}
            >
              {mostrarPlanos ? "Ocultar planos" : "Ver planos"}
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "12px",
            }}
          >
            {[
              ["Pendentes", planosPendentes, "#fef3c7", "#92400e"],
              ["Em andamento", planosAndamento, "#dbeafe", "#1d4ed8"],
              ["Concluídos", planosConcluidos, "#dcfce7", "#166534"],
              ["Atrasados", planosAtrasados, "#fee2e2", "#991b1b"],
            ].map(([titulo, quantidade, fundo, cor]) => (
              <div
                key={titulo}
                style={{
                  padding: "16px",
                  borderRadius: "12px",
                  background: fundo,
                  color: cor,
                }}
              >
                <small>{titulo}</small>
                <strong
                  style={{
                    display: "block",
                    fontSize: "24px",
                    marginTop: "5px",
                  }}
                >
                  {quantidade}
                </strong>
              </div>
            ))}
          </div>

          {mostrarPlanos && (
            <div style={{ marginTop: "20px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  marginBottom: "15px",
                }}
              >
                <select
                  value={filtroStatusPlano}
                  onChange={(e) =>
                    setFiltroStatusPlano(e.target.value)
                  }
                  style={{ maxWidth: "220px" }}
                >
                  <option value="Todos">Todos os status</option>
                  <option value="Pendente">Pendente</option>
                  <option value="Em andamento">Em andamento</option>
                  <option value="Concluída">Concluída</option>
                  <option value="Atrasada">Atrasada</option>
                </select>
              </div>

              {planosFiltrados.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "35px 20px",
                    border: "1px dashed #cbd5e1",
                    borderRadius: "12px",
                  }}
                >
                  <strong>Nenhum plano de ação encontrado.</strong>
                  <p style={{ color: "#64748b" }}>
                    Selecione um risco e crie uma ação para começar.
                  </p>
                </div>
              ) : (
                <div style={{ display: "grid", gap: "12px" }}>
                  {planosFiltrados.map((plano) => {
                    const vencido =
                      plano.prazo &&
                      new Date(`${plano.prazo}T23:59:59`) < new Date() &&
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
                            alignItems: "flex-start",
                            gap: "15px",
                            flexWrap: "wrap",
                          }}
                        >
                          <div style={{ flex: "1 1 420px" }}>
                            <small
                              style={{
                                color: "#64748b",
                                fontWeight: 700,
                              }}
                            >
                              RISCO VINCULADO
                            </small>
                            <h3 style={{ margin: "5px 0 8px" }}>
                              {plano.riscoNome}
                            </h3>
                            <p style={{ margin: 0, color: "#475569" }}>
                              {plano.acao}
                            </p>
                          </div>

                          <div
                            style={{
                              minWidth: "170px",
                              textAlign: "right",
                            }}
                          >
                            <small>STATUS</small>
                            <select
                              value={plano.status}
                              onChange={(e) =>
                                atualizarStatusPlano(
                                  plano.id,
                                  e.target.value
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
                            borderTop: "1px solid #e2e8f0",
                          }}
                        >
                          <div>
                            <small>RESPONSÁVEL</small>
                            <strong style={{ display: "block", marginTop: "4px" }}>
                              {plano.responsavel}
                            </strong>
                          </div>

                          <div>
                            <small>PRAZO</small>
                            <strong
                              style={{
                                display: "block",
                                marginTop: "4px",
                                color: vencido ? "#b91c1c" : "#17213c",
                              }}
                            >
                              {plano.prazo
                                ? new Date(
                                    `${plano.prazo}T00:00:00`
                                  ).toLocaleDateString("pt-BR")
                                : "Não definido"}
                            </strong>
                          </div>

                          <div>
                            <small>PRIORIDADE</small>
                            <strong style={{ display: "block", marginTop: "4px" }}>
                              {plano.prioridade}
                            </strong>
                          </div>

                          <div>
                            <small>ORIGEM</small>
                            <strong style={{ display: "block", marginTop: "4px" }}>
                              {plano.origem}
                            </strong>
                          </div>
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
                            marginTop: "15px",
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => excluirPlanoAcao(plano.id)}
                            style={{ color: "#b91c1c" }}
                          >
                            🗑️ Excluir plano
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* =================================================
          LISTA DE RISCOS
      ================================================= */}

      <section
        className="content-card"
        style={{
          width: "100%",
          boxSizing: "border-box",
        }}
      >

        <div
          className="section-heading"
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems:
              "center",
            gap: "16px",
            flexWrap:
              "wrap",
            marginBottom:
              "20px",
          }}
        >

          <div>

            <p className="eyebrow">
              REGISTRO
            </p>

            <h2>
              Riscos cadastrados
            </h2>

          </div>

          <strong>
            {riscosFiltrados.length}
            {" "}
            resultado
            {riscosFiltrados.length !== 1
              ? "s"
              : ""}
          </strong>

        </div>


        {/* FILTROS */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "minmax(220px, 2fr) minmax(180px, 1fr) minmax(180px, 1fr)",
            gap: "12px",
            marginBottom:
              "20px",
          }}
        >

          <input
            type="search"
            value={busca}
            onChange={(e) =>
              setBusca(
                e.target.value
              )
            }
            placeholder="🔎 Pesquisar risco, descrição ou responsável..."
          />


          <select
            value={
              filtroCategoria
            }
            onChange={(e) =>
              setFiltroCategoria(
                e.target.value
              )
            }
          >

            {categorias.map(
              (categoriaAtual) => (

                <option
                  key={
                    categoriaAtual
                  }
                  value={
                    categoriaAtual
                  }
                >
                  {categoriaAtual}
                </option>

              )
            )}

          </select>


          <select
            value={filtroNivel}
            onChange={(e) =>
              setFiltroNivel(
                e.target.value
              )
            }
          >

            <option value="Todos">
              Todos os níveis
            </option>

            <option value="Baixo">
              Baixo
            </option>

            <option value="Moderado">
              Moderado
            </option>

            <option value="Alto">
              Alto
            </option>

            <option value="Crítico">
              Crítico
            </option>

          </select>

        </div>


        {/* LISTAGEM */}

        {riscos.length === 0 ? (

          <div
            style={{
              textAlign:
                "center",
              padding:
                "60px 20px",
            }}
          >

            <div
              style={{
                fontSize:
                  "42px",
                marginBottom:
                  "12px",
              }}
            >
              🛡️
            </div>

            <h3>
              Nenhum risco cadastrado
            </h3>

            <p>
              Comece cadastrando o primeiro risco da organização.
            </p>

            {podeCriarRisco && (
              <button
                type="button"
                className="primary-button"
                onClick={novoRisco}
              >
                + Cadastrar primeiro risco
              </button>
            )}

          </div>

        ) : riscosFiltrados.length === 0 ? (

          <div
            style={{
              textAlign:
                "center",
              padding:
                "40px 20px",
            }}
          >

            <h3>
              Nenhum resultado encontrado
            </h3>

            <p>
              Tente alterar os filtros ou o termo de pesquisa.
            </p>

          </div>

        ) : (

          <div
            style={{
              display:
                "flex",
              flexDirection:
                "column",
              gap:
                "12px",
            }}
          >

            {riscosFiltrados.map(
              (risco) => {

                const nivelStyle =
                  getNivelStyle(
                    risco.nivel
                  );

                const statusStyle =
                  getStatusStyle(
                    risco.status
                  );

                return (

                  <article
                    key={
                      risco.id
                    }
                    style={{
                      border:
                        "1px solid #e2e8f0",
                      borderRadius:
                        "14px",
                      padding:
                        "20px",
                      background:
                        "#ffffff",
                    }}
                  >

                    {/* CABEÇALHO DO RISCO */}

                    <div
                      style={{
                        display:
                          "flex",
                        justifyContent:
                          "space-between",
                        alignItems:
                          "flex-start",
                        gap:
                          "20px",
                        flexWrap:
                          "wrap",
                      }}
                    >

                      <div
                        style={{
                          flex:
                            "1 1 400px",
                        }}
                      >

                        <div
                          style={{
                            display:
                              "flex",
                            gap:
                              "8px",
                            flexWrap:
                              "wrap",
                            marginBottom:
                              "8px",
                          }}
                        >

                          <span
                            style={{
                              ...nivelStyle,
                              padding:
                                "5px 10px",
                              borderRadius:
                                "999px",
                              fontSize:
                                "11px",
                              fontWeight:
                                800,
                            }}
                          >
                            {risco.nivel}
                          </span>


                          <span
                            style={{
                              ...statusStyle,
                              padding:
                                "5px 10px",
                              borderRadius:
                                "999px",
                              fontSize:
                                "11px",
                              fontWeight:
                                700,
                            }}
                          >
                            {risco.status}
                          </span>

                          <span
                            style={{
                              padding: "5px 10px",
                              borderRadius: "999px",
                              fontSize: "11px",
                              fontWeight: 800,
                              background:
                                origemDoRisco(risco) === "Diagnóstico"
                                  ? "#eef2ff"
                                  : "#f8fafc",
                              color:
                                origemDoRisco(risco) === "Diagnóstico"
                                  ? "#4338ca"
                                  : "#475569",
                              border:
                                "1px solid " +
                                (origemDoRisco(risco) === "Diagnóstico"
                                  ? "#c7d2fe"
                                  : "#e2e8f0"),
                            }}
                          >
                            {origemDoRisco(risco)}
                          </span>

                        </div>


                        <h3
                          style={{
                            margin:
                              "0 0 8px",
                          }}
                        >
                          {risco.nome}
                        </h3>


                        <p
                          style={{
                            margin:
                              "0 0 12px",
                            lineHeight:
                              "1.6",
                          }}
                        >
                          {risco.descricao}
                        </p>

                      </div>


                      {/* SCORE */}

                      <div
                        style={{
                          minWidth:
                            "90px",
                          textAlign:
                            "center",
                          padding:
                            "12px",
                          borderRadius:
                            "12px",
                          background:
                            "#f8fafc",
                        }}
                      >

                        <small>
                          SCORE
                        </small>

                        <strong
                          style={{
                            display:
                              "block",
                            fontSize:
                              "24px",
                          }}
                        >
                          {risco.score ||
                            calcularScore(
                              risco.probabilidade,
                              risco.impacto
                            )}
                        </strong>

                        <small>
                          /25
                        </small>

                      </div>

                    </div>


                    {/* DADOS */}

                    <div
                      style={{
                        display:
                          "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(180px, 1fr))",
                        gap:
                          "12px",
                        marginTop:
                          "18px",
                        paddingTop:
                          "18px",
                        borderTop:
                          "1px solid #e2e8f0",
                      }}
                    >

                      <div>

                        <small>
                          ORIGEM
                        </small>

                        <strong
                          style={{
                            display: "block",
                            color:
                              origemDoRisco(risco) === "Diagnóstico"
                                ? "#4338ca"
                                : "#334155",
                          }}
                        >
                          {origemDoRisco(risco)}
                        </strong>

                      </div>

                      <div>

                        <small>
                          CATEGORIA
                        </small>

                        <strong
                          style={{
                            display:
                              "block",
                          }}
                        >
                          {risco.categoria}
                        </strong>

                      </div>


                      <div>

                        <small>
                          RESPONSÁVEL
                        </small>

                        <strong
                          style={{
                            display:
                              "block",
                          }}
                        >
                          {risco.responsavel}
                        </strong>

                      </div>


                      <div>

                        <small>
                          PROBABILIDADE
                        </small>

                        <strong
                          style={{
                            display:
                              "block",
                          }}
                        >
                          {risco.probabilidade}/5
                        </strong>

                      </div>


                      <div>

                        <small>
                          IMPACTO
                        </small>

                        <strong
                          style={{
                            display:
                              "block",
                          }}
                        >
                          {risco.impacto}/5
                        </strong>

                      </div>


                      <div>

                        <small>
                          PRAZO
                        </small>

                        <strong
                          style={{
                            display:
                              "block",
                          }}
                        >
                          {risco.prazo
                            ? new Date(
                                risco.prazo +
                                  "T00:00:00"
                              ).toLocaleDateString(
                                "pt-BR"
                              )
                            : "Não definido"}
                        </strong>

                      </div>

                    </div>


                    {/* CONTROLE */}

                    <div
                      style={{
                        marginTop:
                          "16px",
                        padding:
                          "14px",
                        borderRadius:
                          "10px",
                        background:
                          "#f8fafc",
                      }}
                    >

                      <small>
                        MEDIDA DE CONTROLE
                      </small>

                      <p
                        style={{
                          margin:
                            "5px 0 0",
                        }}
                      >
                        {risco.medidaControle ||
                          "Nenhuma medida de controle definida."}
                      </p>

                    </div>


                    {/* AÇÕES */}
                    <div
                      style={{
                        display:
                          "flex",
                        justifyContent:
                          "flex-end",
                        gap:
                          "8px",
                        marginTop:
                          "16px",
                        flexWrap:
                          "wrap",
                      }}
                    >
                      {podeEditarRisco && (
                        <button
                          type="button"
                          onClick={() =>
                            editarRisco(risco)
                          }
                        >
                          ✏️ Editar
                        </button>
                      )}

                      {podeVisualizarPlano && (
                        <button
                          type="button"
                          onClick={() => {
                            if (typeof abrirPlanoAcao === "function") {
                              abrirPlanoAcao(risco);
                            } else {
                              console.log(
                                "PLANO DE AÇÃO:",
                                risco
                              );
                            }
                          }}
                        >
                          📋 Plano de Ação
                          {planosAcao.filter(
                            (plano) =>
                              String(plano.riscoId) === String(risco.id)
                          ).length > 0
                            ? ` (${
                                planosAcao.filter(
                                  (plano) =>
                                    String(plano.riscoId) === String(risco.id)
                                ).length
                              })`
                            : ""}
                        </button>
                      )}

                      {podeExcluirRisco && (
                        <button
                          type="button"
                          onClick={() =>
                            excluirRisco(risco.id)
                          }
                          style={{
                            color:
                              "#b91c1c",
                          }}
                        >
                          🗑️ Excluir
                        </button>
                      )}
                    </div>

                  </article>

                );

              }
            )}

          </div>

        )}

      </section>

    </div>

  );

}

export default MatrizRiscos;