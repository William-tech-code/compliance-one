import { useState } from "react";
import "./Usuarios.css";

/* =========================================================
   COMPLIANCE ONE
   V24.2 — USUÁRIOS + PERMISSÕES INTEGRADAS
   ========================================================= */

export const CHAVE_PERMISSOES_V24 = "compliance_one_permissoes_v24";

export const perfisV241 = {
  Administrador: { descricao: "Acesso administrativo total ao sistema." },
  Compliance: { descricao: "Gestão de compliance, riscos e controles." },
  Gestor: { descricao: "Gestão operacional e acompanhamento." },
  Funcionário: { descricao: "Acesso operacional limitado." },
};

export const modulosV241 = [
  { id: "dashboard", nome: "Dashboard", descricao: "Indicadores e visão geral da empresa." },
  { id: "diagnostico", nome: "Diagnóstico", descricao: "Avaliação de conformidade." },
  { id: "riscos", nome: "Matriz de Riscos", descricao: "Identificação e gerenciamento de riscos." },
  { id: "documentos", nome: "Documentos", descricao: "Políticas, normas e documentos corporativos." },
  { id: "funcionarios", nome: "Funcionários", descricao: "Cadastro e gestão de colaboradores." },
  { id: "checklists", nome: "Checklists", descricao: "Controles e listas de verificação." },
  { id: "plano", nome: "Plano de Ação", descricao: "Ações corretivas e preventivas." },
  { id: "relatorios", nome: "Relatórios", descricao: "Relatórios e indicadores." },
  { id: "usuarios", nome: "Usuários e Acessos", descricao: "Gestão de usuários e permissões.", restrito: true },
  { id: "denuncias", nome: "Canal de Denúncias", descricao: "Recebimento e tratamento de denúncias.", restrito: true },
  { id: "auditoria", nome: "Logs de Auditoria", descricao: "Registro das atividades do sistema.", restrito: true },
  { id: "configuracoes", nome: "Configurações", descricao: "Configurações administrativas.", restrito: true },
];

const criarPermissao = (visualizar, criar, editar, excluir, extras = {}) => ({
  visualizar,
  criar,
  editar,
  excluir,
  ...extras,
});

export const permissoesPadraoV241 = {
  Administrador: {
    dashboard: criarPermissao(true, false, false, false),
    diagnostico: criarPermissao(true, true, true, true),
    riscos: criarPermissao(true, true, true, true),
    documentos: criarPermissao(true, true, true, true),
    funcionarios: criarPermissao(true, true, true, true),
    checklists: criarPermissao(true, true, true, true),
    plano: criarPermissao(true, true, true, true),
    relatorios: criarPermissao(true, true, true, true),
    usuarios: criarPermissao(true, true, true, true),
    denuncias: criarPermissao(true, true, true, true, { apurar: true, auditar: true }),
    auditoria: criarPermissao(true, false, false, false),
    configuracoes: criarPermissao(true, true, true, true),
  },
  Compliance: {
    dashboard: criarPermissao(true, false, false, false),
    diagnostico: criarPermissao(true, true, true, false),
    riscos: criarPermissao(true, true, true, false),
    documentos: criarPermissao(true, true, true, false),
    funcionarios: criarPermissao(true, true, true, false),
    checklists: criarPermissao(true, true, true, false),
    plano: criarPermissao(true, true, true, false),
    relatorios: criarPermissao(true, true, false, false),
    usuarios: criarPermissao(true, true, true, false),
    denuncias: criarPermissao(true, false, true, false, { apurar: true, auditar: true }),
    auditoria: criarPermissao(true, false, false, false),
    configuracoes: criarPermissao(false, false, false, false),
  },
  Gestor: {
    dashboard: criarPermissao(true, false, false, false),
    diagnostico: criarPermissao(true, false, true, false),
    riscos: criarPermissao(true, true, true, false),
    documentos: criarPermissao(true, false, true, false),
    funcionarios: criarPermissao(true, true, true, false),
    checklists: criarPermissao(true, true, true, false),
    plano: criarPermissao(true, true, true, false),
    relatorios: criarPermissao(true, false, false, false),
    usuarios: criarPermissao(false, false, false, false),
    denuncias: criarPermissao(false, false, false, false, { apurar: false, auditar: false }),
    auditoria: criarPermissao(false, false, false, false),
    configuracoes: criarPermissao(false, false, false, false),
  },
  Funcionário: {
    dashboard: criarPermissao(true, false, false, false),
    diagnostico: criarPermissao(false, false, false, false),
    riscos: criarPermissao(false, false, false, false),
    documentos: criarPermissao(true, false, false, false),
    funcionarios: criarPermissao(false, false, false, false),
    checklists: criarPermissao(true, false, true, false),
    plano: criarPermissao(false, false, false, false),
    relatorios: criarPermissao(false, false, false, false),
    usuarios: criarPermissao(false, false, false, false),
    denuncias: criarPermissao(false, false, false, false, { apurar: false, auditar: false }),
    auditoria: criarPermissao(false, false, false, false),
    configuracoes: criarPermissao(false, false, false, false),
  },
};

const clonar = (obj) => JSON.parse(JSON.stringify(obj));

export function carregarPermissoesV241() {
  try {
    const salvas = localStorage.getItem(CHAVE_PERMISSOES_V24);
    if (!salvas) return clonar(permissoesPadraoV241);
    const parsed = JSON.parse(salvas);
    return {
      ...clonar(permissoesPadraoV241),
      ...parsed,
    };
  } catch {
    return clonar(permissoesPadraoV241);
  }
}

export function salvarPermissoesV241(permissoes) {
  localStorage.setItem(CHAVE_PERMISSOES_V24, JSON.stringify(permissoes));
  window.dispatchEvent(new CustomEvent("compliance-permissoes-atualizadas"));
}

const usuariosIniciais = [
  { id: 1, nome: "Administrador", email: "admin@empresa.com", perfil: "Administrador", status: "Ativo" },
  { id: 2, nome: "João Silva", email: "joao@empresa.com", perfil: "Compliance", status: "Ativo" },
  { id: 3, nome: "Maria Souza", email: "maria@empresa.com", perfil: "Gestor", status: "Ativo" },
  { id: 4, nome: "Carlos Lima", email: "carlos@empresa.com", perfil: "Funcionário", status: "Ativo" },
];

function Usuarios() {
  const [usuarios, setUsuarios] = useState(usuariosIniciais);
  const [busca, setBusca] = useState("");
  const [modalAberto, setModalAberto] = useState(false);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState(null);
  const [novoUsuario, setNovoUsuario] = useState({ nome: "", email: "", perfil: "Funcionário", status: "Ativo" });
  const [permissoes, setPermissoes] = useState(carregarPermissoesV241);
  const [aba, setAba] = useState("permissoes");

  const usuariosFiltrados = usuarios.filter((usuario) => {
    const termo = busca.toLowerCase();
    return usuario.nome.toLowerCase().includes(termo) || usuario.email.toLowerCase().includes(termo) || usuario.perfil.toLowerCase().includes(termo);
  });

  function handleChange(event) {
    const { name, value } = event.target;
    setNovoUsuario((anterior) => ({ ...anterior, [name]: value }));
  }

  function criarUsuario(event) {
    event.preventDefault();
    if (!novoUsuario.nome.trim() || !novoUsuario.email.trim()) return;
    setUsuarios((anterior) => [...anterior, { id: Date.now(), ...novoUsuario }]);
    setNovoUsuario({ nome: "", email: "", perfil: "Funcionário", status: "Ativo" });
    setModalAberto(false);
  }

  function abrirGerenciamento(usuario) {
    setUsuarioSelecionado(usuario);
    setAba("permissoes");
    setPermissoes(carregarPermissoesV241);
  }

  function fecharGerenciamento() {
    setUsuarioSelecionado(null);
    setAba("permissoes");
  }

  function alterarPermissao(modulo, acao) {
    setPermissoes((anterior) => ({
      ...anterior,
      [usuarioSelecionado.perfil]: {
        ...anterior[usuarioSelecionado.perfil],
        [modulo]: {
          ...anterior[usuarioSelecionado.perfil]?.[modulo],
          [acao]: !anterior[usuarioSelecionado.perfil]?.[modulo]?.[acao],
        },
      },
    }));
  }

  function restaurarPadrao() {
    if (!usuarioSelecionado) return;
    const perfil = usuarioSelecionado.perfil;
    setPermissoes((anterior) => ({ ...anterior, [perfil]: clonar(permissoesPadraoV241[perfil]) }));
  }

  function alterarPerfil(event) {
    const novoPerfil = event.target.value;
    setUsuarioSelecionado((anterior) => ({ ...anterior, perfil: novoPerfil }));
  }

  function salvarAlteracoes() {
    if (!usuarioSelecionado) return;
    const perfil = usuarioSelecionado.perfil;
    const permissoesParaSalvar = permissoes[perfil] || permissoesPadraoV241[perfil];
    const estadoAtual = carregarPermissoesV241();
    const atualizado = { ...estadoAtual, [perfil]: clonar(permissoesParaSalvar) };
    salvarPermissoesV241(atualizado);
    setPermissoes(atualizado);
    setUsuarios((anterior) => anterior.map((usuario) => usuario.id === usuarioSelecionado.id ? { ...usuario, perfil } : usuario));
    fecharGerenciamento();
  }

  return (
    <div className="usuarios-page">
      <header className="usuarios-header">
        <div>
          <p className="usuarios-eyebrow">CONTROLE DE ACESSOS</p>
          <h1>Usuários e Acessos</h1>
          <p className="usuarios-subtitle">Gerencie os usuários e os níveis de acesso ao Compliance One.</p>
        </div>
        <button className="usuarios-primary-button" onClick={() => setModalAberto(true)}><span>＋</span>Novo usuário</button>
      </header>

      <section className="usuarios-toolbar">
        <div className="usuarios-search"><span>⌕</span><input type="text" placeholder="Buscar por nome, e-mail ou perfil..." value={busca} onChange={(event) => setBusca(event.target.value)} /></div>
        <div className="usuarios-counter">{usuariosFiltrados.length} usuário{usuariosFiltrados.length !== 1 ? "s" : ""}</div>
      </section>

      <section className="usuarios-panel">
        <div className="usuarios-panel-header"><div><h2>Usuários cadastrados</h2><p>Controle quem possui acesso ao sistema.</p></div></div>
        <div className="usuarios-table-wrapper">
          <table className="usuarios-table">
            <thead><tr><th>Usuário</th><th>Perfil</th><th>Status</th><th>Acesso</th></tr></thead>
            <tbody>
              {usuariosFiltrados.length > 0 ? usuariosFiltrados.map((usuario) => (
                <tr key={usuario.id}>
                  <td><div className="usuario-identificacao"><div className="usuario-avatar">{usuario.nome.charAt(0).toUpperCase()}</div><div><strong>{usuario.nome}</strong><span>{usuario.email}</span></div></div></td>
                  <td><span className={`usuario-perfil perfil-${usuario.perfil.toLowerCase().replace("í", "i").replace(" ", "-")}`}>{usuario.perfil}</span></td>
                  <td><span className="usuario-status"><span className="status-dot"></span>{usuario.status}</span></td>
                  <td><button className="usuario-action-button" onClick={() => abrirGerenciamento(usuario)}>Gerenciar</button></td>
                </tr>
              )) : <tr><td colSpan="4" className="usuarios-empty">Nenhum usuário encontrado.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {modalAberto && (
        <div className="usuario-modal-overlay" onClick={() => setModalAberto(false)}>
          <div className="usuario-modal" onClick={(event) => event.stopPropagation()}>
            <div className="usuario-modal-header"><div><p>NOVO ACESSO</p><h2>Cadastrar usuário</h2></div><button className="usuario-modal-close" onClick={() => setModalAberto(false)}>×</button></div>
            <form onSubmit={criarUsuario}>
              <div className="usuario-form-grid">
                <div className="usuario-form-group"><label htmlFor="nome">Nome completo</label><input id="nome" name="nome" type="text" placeholder="Digite o nome" value={novoUsuario.nome} onChange={handleChange} required /></div>
                <div className="usuario-form-group"><label htmlFor="email">E-mail</label><input id="email" name="email" type="email" placeholder="usuario@empresa.com" value={novoUsuario.email} onChange={handleChange} required /></div>
                <div className="usuario-form-group"><label htmlFor="perfil">Perfil de acesso</label><select id="perfil" name="perfil" value={novoUsuario.perfil} onChange={handleChange}>{Object.keys(perfisV241).map((perfil) => <option key={perfil} value={perfil}>{perfil}</option>)}</select></div>
                <div className="usuario-form-group"><label htmlFor="status">Status</label><select id="status" name="status" value={novoUsuario.status} onChange={handleChange}><option>Ativo</option><option>Inativo</option></select></div>
              </div>
              <div className="usuario-modal-actions"><button type="button" className="usuario-secondary-button" onClick={() => setModalAberto(false)}>Cancelar</button><button type="submit" className="usuarios-primary-button">Criar usuário</button></div>
            </form>
          </div>
        </div>
      )}

      {usuarioSelecionado && (
        <div className="usuario-modal-overlay" onClick={fecharGerenciamento}>
          <div className="usuario-modal usuario-modal-permissoes" onClick={(event) => event.stopPropagation()}>
            <div className="usuario-modal-header"><div><p>V24.2 — CONTROLE DE ACESSO</p><h2>Gerenciar usuário</h2></div><button className="usuario-modal-close" onClick={fecharGerenciamento}>×</button></div>
            <div className="usuario-management-user"><div className="usuario-avatar usuario-avatar-large">{usuarioSelecionado.nome.charAt(0).toUpperCase()}</div><div><strong>{usuarioSelecionado.nome}</strong><span>{usuarioSelecionado.email}</span><small>Perfil atual: {usuarioSelecionado.perfil}</small></div></div>
            <div className="usuario-management-tabs"><button className={aba === "permissoes" ? "active" : ""} onClick={() => setAba("permissoes")}>Permissões</button><button className={aba === "perfil" ? "active" : ""} onClick={() => setAba("perfil")}>Perfil de acesso</button></div>

            {aba === "permissoes" && (
              <div className="usuario-permissoes-content">
                <div className="usuario-permissoes-heading"><div><h3>Permissões por módulo</h3><p>As alterações serão aplicadas ao perfil selecionado.</p></div><button className="usuario-reset-button" onClick={restaurarPadrao}>Restaurar padrão</button></div>
                <div className="usuario-permissoes-lista">
                  {modulosV241.map((modulo) => {
                    const dados = permissoes[usuarioSelecionado.perfil]?.[modulo.id] || {};
                    return (
                      <div key={modulo.id} className={`usuario-permissao-item ${modulo.restrito ? "modulo-restrito" : ""}`}>
                        <div className="usuario-permissao-info"><div className="usuario-permissao-title"><strong>{modulo.nome}</strong>{modulo.restrito && <span className="usuario-restrito-badge">Restrito</span>}</div><span>{modulo.descricao}</span></div>
                        <div className="usuario-permissoes-acoes">
                          {["visualizar", "criar", "editar", "excluir"].map((acao) => (
                            <label className="usuario-checkbox" key={acao}><input type="checkbox" checked={Boolean(dados[acao])} onChange={() => alterarPermissao(modulo.id, acao)} /><span>{acao === "visualizar" ? "Ver" : acao.charAt(0).toUpperCase() + acao.slice(1)}</span></label>
                          ))}
                          {modulo.id === "denuncias" && <><label className="usuario-checkbox"><input type="checkbox" checked={Boolean(dados.apurar)} onChange={() => alterarPermissao(modulo.id, "apurar")} /><span>Apurar</span></label><label className="usuario-checkbox"><input type="checkbox" checked={Boolean(dados.auditar)} onChange={() => alterarPermissao(modulo.id, "auditar")} /><span>Auditar</span></label></>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {aba === "perfil" && (
              <div className="usuario-perfil-content">
                <div className="usuario-perfil-box"><span>PERFIL ATUAL</span><strong>{usuarioSelecionado.perfil}</strong><p>{perfisV241[usuarioSelecionado.perfil]?.descricao}</p></div>
                <div className="usuario-form-group"><label>Perfil de acesso</label><select value={usuarioSelecionado.perfil} onChange={alterarPerfil}>{Object.keys(perfisV241).map((perfil) => <option key={perfil} value={perfil}>{perfil}</option>)}</select></div>
                <div className="usuario-perfil-informacao"><strong>Como funciona?</strong><p>O perfil define as permissões aplicadas ao usuário. As permissões personalizadas são salvas no perfil e passam a refletir no menu do sistema.</p></div>
              </div>
            )}

            <div className="usuario-modal-actions"><button type="button" className="usuario-secondary-button" onClick={fecharGerenciamento}>Cancelar</button><button type="button" className="usuarios-primary-button" onClick={salvarAlteracoes}>Salvar alterações</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Usuarios;
