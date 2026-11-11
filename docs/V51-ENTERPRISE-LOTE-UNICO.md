# NEXORA COMPLIANCE ONE — V51 ENTERPRISE | LOTE ÚNICO

**Estado:** pacote integrado em desenvolvimento, **não homologado**, **não publicar em produção**.
**Destino de desenvolvimento:** branch `feature/compliance-v50-staging` e serviço `compliance-one-v50-staging-uami`.
**Produção protegida:** `release/compliance-one-render-hardening`, serviço `compliance-one` e seu disco `/var/data` não podem ser alterados durante a preparação.
**Regra comercial:** Asaas e Resend permanecem desligados até configuração e autorização; não gerar cobranças reais nem criar serviços pagos.
**Regra de entrega:** várias alterações podem ser integradas e testadas na mesma branch, mas **um único lançamento final em produção**, somente após toda a matriz aprovada. Não confundir código criado com funcionalidade homologada.

## 1. Critérios de aceite do lote

| Área | Entregável mínimo | Validação obrigatória | Estado |
| --- | --- | --- | --- |
| Autenticação | Login seguro, expiração/revogação, recuperação de senha e MFA com recuperação protegida | E2E com usuários fictícios; tentativas, sessões revogadas e TOTP inválido | Pendente |
| Multiempresa | Organizações reais no banco, membros, convite, papéis e seleção de contexto autenticada | Dois tenants fictícios; leitura/escrita cruzada retornam 403/404 em **todas** as rotas | Pendente |
| RBAC | Matriz de permissões por recurso/ação, segregação de apuração e gestão de administradores | Testar cada papel, elevação de privilégio e rotas não autorizadas | Pendente |
| Evidências | Binários originais privados, hashes, tamanho, trilha, versionamento, antivírus e retenção | Testes com arquivo válido, alterado, excluído, tipos rejeitados e download cruzado | Pendente |
| Backup | Backup criptografado externo com política de retenção e restauração documentada | Restaurar um snapshot **fictício** em ambiente isolado e medir recuperação | Pendente |
| Questionários | Biblioteca versionada por ramo e área; aproximadamente 800 itens aplicáveis por segmento; lógica condicional | Revisão de amostra por especialistas, contagem, aplicabilidade, cálculos e histórico | Pendente |
| Gestão de riscos | Matrizes rastreáveis, ações, responsáveis, SLA, evidências e validação independente | Fluxo completo entre diagnóstico, risco, ação, anexo, revisão e relatório | Pendente |
| Due diligence | Cadastro e acompanhamento de terceiros, documentos, validade e reavaliação | Testar isolamento, classificação, vencimentos e alerta | Pendente |
| Canal de denúncias | Canal externo, segregação, investigação e política de confidencialidade/não retaliação | Simular relatos e verificar proteção da identidade e acesso restrito | Pendente |
| IA documental | Leitura autorizada de documentos, extração, fontes citadas, riscos e revisão humana | Avaliar injeção de prompt, resultados sem fonte, erros e dados sigilosos | Pendente |
| Monitoramento normativo | Fontes oficiais versionadas, comparação, alertas por setor e revisão | Simular mudança de norma, indisponibilidade e revisão humana | Pendente |
| Relatório executivo | PDFs auditáveis com indicadores, escopo, limitações e fontes | Conferir números, versão do diagnóstico, assinatura e exportação | Pendente |
| Assinaturas | Clientes, plano, trial, estados, conciliação Asaas Sandbox, suspensão/reativação | Sandbox, duplicidade/replay de webhook e confirmação independente | Bloqueado sem chaves |
| E-mails | Resend com remetente verificado, recuperação, notificações e tratamento de falhas | Envio para destinatários de teste com logs e regras de privacidade | Bloqueado sem chaves |
| UX responsiva | Painel executivo, entrada, atualizações, acessibilidade e telas móveis | Android, iOS, tablets, desktop, teclado, leitor de tela, sem sobreposição | Parcial |
| Confiabilidade | CI, observabilidade, alertas, testes, migrações idempotentes, rollback | Build, testes, restauração, smoke e relatório de segurança | Pendente |

### Cuidado crítico com a arquitetura atual

O painel `ProductionCenter` mantém `companies` e `users` em estado local. Isso **não** representa cadastro de empresas e contas autenticadas no backend. Nenhum novo cliente deve usar esse fluxo como provisionamento SaaS até ser substituído por APIs autorizadas e isolamento persistente.

O arquivo `package.json` ainda informa versão `45.0.0`; o manifesto visual informa `50.0.0` no staging. Unificar identificação de release após a estabilização para evitar anúncio falso de funcionalidades.

## 2. Condições obrigatórias para aprovar a migração

1. Backup verificável da produção, com teste de recuperação, antes de qualquer migração.
2. Migração de banco reversível ou estratégia de retorno compatível com esquema e documentos existentes.
3. Todos os segredos de produção distintos dos segredos de staging; não copiar banco de clientes ao staging.
4. Verificar bancos/arquivos persistentes antes e depois; **nunca apagar disco** para corrigir problemas de implantação.
5. Executar teste de isolamento de tenants, testes de permissão e exercícios de recuperação.
6. Homologar uso real de MFA apenas após validar formato da chave de criptografia e procedimento de recuperação.
7. Não prometer conformidade jurídica automática: IA/alertas apoiam revisão humana e identificam fontes.
8. Asaas Sandbox e Resend só poderão passar para estado integrado quando as chaves forem configuradas de forma segura; pagamentos reais exigem autorização separada.
9. Todas as funcionalidades visíveis deverão estar operacionais ou explicitamente identificadas como indisponíveis.
10. Registrar versão, alterações, riscos residuais, resultado E2E e confirmação de implantação.

## 3. Sequência interna do lote único (sem lançamentos parciais em produção)

**Passo A — Base:** banco multiempresa, autenticação, RBAC, MFA, audit trail e contratos de API.

**Passo B — Operação:** evidências seguras, terceiros, canais de denúncia, questionários e matrizes.

**Passo C — Intelligence:** IA documental, revisão humana, monitor normativo e alertas.

**Passo D — Comercial e UX:** planos, assinatura Sandbox, Resend de teste, PDFs e experiência premium.

**Passo E — Homologação integrada:** testes unitários, integração, E2E, segurança, dispositivos, backup e restauração.

**Passo F — Único go-live:** janela controlada, backup, deploy, smoke, observabilidade e rollback testado.

Nenhum passo isolado autoriza afirmar que o lote inteiro está pronto.

## 4. Registro de execução — 11/11/2026

- [x] Criada matriz do lote único com critérios de aceite e regras de publicação.
- [x] Criada política `server/v51UserAccess.js` de autorização de usuários: criação restrita a Administrador.
- [x] Integrada política nas rotas `GET/POST /api/users` e validação de entrada.
- [x] Criado conjunto de testes unitários `tests/v51UserAccess.test.js`.
- [ ] Executar testes da alteração no ambiente de homologação; ainda não foram executados nesta etapa.
- [ ] Revisar provisionamento multiempresa real; atual `ProductionCenter` permanece demonstrativo.
- [ ] Implementar e validar todos os demais itens da matriz.

**Checkpoint:** código preparado na branch de staging; **nenhum deploy da V51 foi acionado** e produção não foi alterada.
