# Compliance One — lote premium (11/11/2026)

## Estado
Branch de preparação isolada de `main`. Este documento é um plano de implementação, não uma declaração de funcionalidades concluídas.

## Bloqueadores de produção (P0)
- Confirmar código efetivamente implantado no Render e comparar com a branch main.
- Remover fallback de JWT_SECRET em produção e exigir segredo persistente.
- Confirmar caminho persistente do SQLite; preparar backup verificável e restauração testada antes de migrar.
- Bloquear bootstrap público após instalação inicial e validar autenticação em todas as rotas privadas.
- Revisar isolamento por company_id em leitura, escrita, anexos e relatórios.
- Corrigir estado de carregamento da autenticação: timeout, erro recuperável e login sempre acessível.
- Testar sessão expirada, usuário desativado, autorização por perfil e tentativas de login.

## Experiência e atualizações (P1)
- Tela de abertura premium com opção de reduzir animações; login responsivo em Android/iOS/tablet/desktop.
- Versionamento único no backend e frontend; changelog estruturado por versão.
- Card de atualização mostrado somente para versões novas por usuário, com lista de alterações e confirmação persistente.
- Não bloquear acesso por card informativo; atualização obrigatória apenas para mudanças incompatíveis.

## Módulos de compliance (P1/P2)
- Questionários por setor com ~800 questões curadas por segmento, regras condicionais e rastreabilidade da fonte.
- Perfis: cartórios, hotelaria, logística, indústria, comércio, saúde e administração pública.
- Gestão de riscos: probabilidade, impacto, controles, responsável, prazo e histórico.
- Evidências: arquivos originais, hashes, versões, auditoria, controle de acesso e verificação de inconsistências sem afirmar detecção infalível.
- Integridade: antissuborno, conflitos de interesse, terceiros, denúncias e investigações.
- Monitoramento normativo: fontes oficiais verificáveis, revisão humana e alertas de impacto.
- Relatórios PDF executivos com filtros por empresa e unidade.
- Planos e assinaturas: permissões por plano, teste, cobrança via provedor e webhooks autenticados; não armazenar cartões.

## Critérios de aceite
1. Nenhuma rota privada acessível sem autenticação válida.
2. Nenhum acesso cruzado entre empresas em API, arquivos e relatórios.
3. Dados preservados após reinicialização e restauração testada.
4. Login renderizado sem carregamento infinito, incluindo falha de rede.
5. Card de versão exibido uma vez por versão por usuário.
6. Fluxos principais testados em viewport móvel, tablet e desktop.
7. Testes automatizados, build e smoke test em staging aprovados.
8. Publicar somente após confirmação do serviço/branch Render e verificação de rollback.
