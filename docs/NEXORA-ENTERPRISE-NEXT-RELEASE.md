# NEXORA Compliance One — pacote de endurecimento e apuração

## Incluído neste lote

- Histórico de mudança de status na Central de Apuração, obtido exclusivamente após autorização de equipe e limitado à organização autenticada.
- Controles de volume do canal público em modo *fail closed*, sem reinicializar silenciosamente a contagem de tentativas.
- Limitação de tentativas incorretas de login por origem e identidade, com janela de 15 minutos e resposta `429`.
- Snapshot consistente do banco SQLite usando a API `backup`, verificação `integrity_check` e SHA-256 com leitura em fluxo.
- Testes de backup, limitador de login, isolamento de casos e histórico.

## Homologação e publicação

1. Trabalhar sobre o commit base `69f03150d3f9fa48731772b1834d512b0a0715c5`.
2. Executar `npm ci`, `npm run build` e `node --test tests/*.test.js`.
3. Executar `npm audit --omit=dev` em ambiente com acesso ao registro npm; não confundir erro de rede com auditoria aprovada.
4. Validar login administrativo, geração do canal, denúncia anônima, chave de acompanhamento, equipe autorizada, revogação de acesso e isolação por organização.
5. Fazer backup verificado antes de qualquer implantação. Exemplo no Shell do Render, **apenas após verificar espaço livre**:

   ```bash
   node scripts/backup-sqlite.js "/var/data/backups/compliance-pre-release-$(date -u +%Y%m%dT%H%M%SZ).sqlite"
   ```

6. Guardar cópia externa do backup e do hash; o disco de 1 GB **não equivale a política de backup**.
7. Fazer deploy somente após homologação e manter um plano de retorno ao commit anterior. Reversão de código não reverte alterações de dados.

## Limitações explícitas

- Este lote não implementa MFA, recuperação de senha por e-mail nem tarefas agendadas de backup; demandam integração e verificação de identidade adequadas.
- Monitor regulatório identifica alterações de fontes oficiais consultadas, sem afirmar vigência normativa automaticamente.
- O controle de tentativas é local ao processo; para múltiplas instâncias, usar armazenamento de contadores compartilhado.
- Não alterar `WHISTLEBLOWER_ENCRYPTION_KEY`, `JWT_SECRET` ou o caminho do banco na implantação.
- Remover `BOOTSTRAP_SECRET` após o primeiro cadastro administrativo concluído.
