# Compliance One V51 — Motor de avaliação empresarial baseado em evidências

**Status: especificação de implementação; não afirmar que os recursos abaixo estão implementados.**
**Branch alvo:** feature/compliance-v50-staging. **Produção:** preservar sem deploy.

## Objetivo
Transformar questionários por segmento em avaliações de conformidade rastreáveis, sem confundir resposta afirmativa com controle efetivo. Cada conclusão deve distinguir declaração, documentação, implantação, teste e monitoramento.

## 1. Jornada de avaliação
1. Cadastro autenticado de organização e unidade; selecionar setor, porte, jurisdição e operações relevantes.
2. Determinar escopo, normas e controles aplicáveis por regras versionadas, com revisão humana.
3. Aplicar questionário condicional por domínio, vinculado à versão do catálogo de controles.
4. Solicitar documentos originais e evidências com proprietário, data, validade, hash e controle de acesso por tenant.
5. Testar controles: amostra, método, avaliador independente, achados, limitações e trilha de auditoria.
6. Calcular indicadores separados de cobertura, evidências, eficácia e riscos residuais; não calcular conformidade legal automática.
7. Gerar plano corretivo com prioridade, responsável, prazo, verificador e prova de conclusão.
8. Emitir relatório executivo versionado com fontes, ressalvas, decisões humanas e monitoramento periódico.

## 2. Dimensões e escala de maturidade
Domínios mínimos: governança; anticorrupção e antissuborno; integridade financeira; trabalhista e saúde ocupacional; LGPD e segurança; terceiros; canal de denúncias; auditoria e evidências; obrigações regulatórias específicas.
Cada controle recebe níveis **independentes**, não um único booleano:
- 0 = não avaliado;
- 1 = declarado;
- 2 = documentado;
- 3 = implementado com evidências;
- 4 = testado por revisor autorizado;
- 5 = monitorado com indicadores e histórico.
A ausência de evidência impede classificação superior a 1. Documento presente, mas vencido ou sem vínculo, não comprova implementação. Resultado 'não aplicável' exige justificativa, norma/escopo e revisão. Não respondido permanece desconhecido, nunca conformidade.

## 3. Modelo de dados proposto
- assessment_cycles(id, tenant_id, scope_version, sector, period_start, period_end, status, reviewer_id)
- control_catalog(id, version, domain, sector_rules, applicability_rules, normative_source, review_date)
- control_assessments(id, tenant_id, cycle_id, control_id, declared_answer, applicability, applicability_reason, maturity_level, assessment_status, reviewer_id)
- evidence_links(id, tenant_id, control_assessment_id, private_document_id, checksum, expires_at, review_status)
- control_tests(id, tenant_id, control_assessment_id, method, sample_size, tester_id, outcome, limitations)
- findings(id, tenant_id, cycle_id, control_id, severity, likelihood, impact, evidence_id, owner_id)
- corrective_actions(id, tenant_id, finding_id, owner_id, due_at, status, verifier_id, verified_at)
- assessment_events(id, tenant_id, actor_id, resource_id, event_type, timestamp, immutable_digest)
Todos os IDs devem ter integridade referencial e checagens de tenant na camada de acesso. Não reutilizar dados de uma organização em outra.

## 4. Indicadores transparentes
- Cobertura: controles aplicáveis efetivamente avaliados / controles aplicáveis totais.
- Evidência: controles avaliados com documentação válida e revisada / controles avaliados.
- Eficácia: controles testados com resultado satisfatório / controles testados (exibir também n).
- Ações vencidas: ações abertas com prazo anterior ao dia de referência.
- Risco residual: matriz de probabilidade x impacto após controles, com critérios versionados.
Sempre exibir denominadores, N/A, dados faltantes, período e metodologia. Não somar percentuais de dimensões distintas em uma nota jurídica única. IA pode propor explicações, mas não aprovar evidência, risco ou conclusão sem revisão humana.

## 5. Fluxo de interface premium
- Visão inicial: escopo, estágio do diagnóstico, pendências críticas, evidências a vencer, ações vencidas.
- Cartão do controle: declaração, exigência aplicável, documentos, testes, achados, ações, histórico e fonte.
- Painel executivo: evolução temporal e comparativo **somente** entre ciclos comparáveis do mesmo tenant.
- Relatório: sumário executivo, limites, metodologia, achados priorizados, responsáveis, prazos e trilha.
- Estados claros: não avaliado, aguardando evidência, em revisão, verificado, não aplicável, falha confirmada.

## 6. Critérios de aceite automatizados e humanos
- Responder 'sim' em 800 perguntas sem anexar provas não gera status 'verificado'.
- Documento de outro tenant nunca pode ser consultado nem vinculado.
- Documento vencido, hash divergente ou sem revisão não eleva maturidade.
- Avaliador não pode aprovar a própria ação quando segregação for exigida.
- N/A sem justificativa e revisão não exclui controle do denominador.
- Ciclo encerrado é imutável; correções geram versão/evento novo.
- Fonte normativa inexistente/sem verificação gera aviso, nunca conclusão legal categórica.
- IA não inventa fontes, não acessa documentos sem permissão e apresenta incerteza.
- Testes E2E com duas empresas fictícias, controles aplicáveis e não aplicáveis, evidências, achados e relatórios.
- Testes de acessibilidade e dispositivos iOS/Android/tablet/desktop.

## 7. Plano de implementação em lote
A. Persistência multi-tenant e catálogo versionado; B. evidências e testes; C. regras de maturidade e métricas; D. painel e relatórios; E. segurança e testes integrados; F. homologação humana; G. release único após gate de backup e restauração da produção.

**Pendências reais:** definir critérios normativos por segmento com especialista, implementar APIs e UI, executar testes e aprovar a restauração do banco de produção. Esta especificação não substitui tais entregas.
