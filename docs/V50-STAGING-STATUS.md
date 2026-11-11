# Compliance One V50 — desenvolvimento isolado

Status: **EM DESENVOLVIMENTO / NÃO HOMOLOGADO / NÃO PUBLICAR EM PRODUÇÃO**.

## Implementado no checkpoint inicial

- Adaptador Asaas limitado a consultas no Sandbox; nenhuma cobrança é criada por esta versão.
- Endpoint de webhook Asaas com autenticação por token dedicado, deduplicação por ID e persistência para conciliação posterior.
- Eventos são registrados como `PENDING_VERIFICATION`: um evento isolado nunca ativa licença.
- Adaptador de envio Resend, sem enviar e-mails quando não configurado.
- Recuperação de senha com token aleatório, hash no banco, validade de 20 minutos, consumo único e limitação básica de solicitação.
- Interface de solicitação de recuperação e escolha de nova senha.

## Configuração exigida para homologação (não inserir valores no Git)

| Variável | Uso |
| --- | --- |
| `ASAAS_SANDBOX_API_KEY` | API do Sandbox, para consultas depois da autorização |
| `ASAAS_WEBHOOK_TOKEN` | Token independente de 32–255 caracteres configurado no webhook do Sandbox |
| `RESEND_API_KEY` | Chave Resend de envio, preferencialmente restrita ao domínio |
| `RESEND_FROM_EMAIL` | Remetente verificado |
| `PUBLIC_APP_URL` | URL pública de staging para links de recuperação |

## Bloqueadores para o lote completo

- Implantar e testar MFA, revogação de sessão após reset, RBAC por recurso e revisão de isolamento.
- Modelar clientes, planos, preços, assinaturas e conciliação ativa no Sandbox Asaas; somente pagamento confirmado e associado à organização poderá modificar licença.
- Implementar expiração, inadimplência, suspensão segura e reativação; políticas comerciais precisam de definição.
- Habilitar domínio Resend e validar entrega, erros, abuso e bounce em ambiente de testes.
- Agendar monitor normativo sem alegar vigência automática; integrar alertas e responsáveis.
- Integrar análise documental com fontes/citações e controles contra dados sensíveis e alucinações.
- Testar backup externo e restauração em staging, além de recuperação após falhas.
- Testar todos os segmentos, perfis, dispositivos e fluxos de aquisição, login, pagamento, evidências e relatórios.
- Executar revisão de segurança antes de oferecer a clientes reais.

**Não configurar chaves de produção do Asaas, criar cobranças reais ou apontar webhooks de produção para este checkpoint.**
