# V51 — Gate de backup e restauração antes do go-live

**Estado: BLOQUEADO até evidências reais.** Este procedimento é operacional; sua existência não significa que o banco de produção foi copiado ou restaurado.

## Identificação e limites
- Produção: serviço Render `compliance-one`, disco persistente `/var/data`. Não apagar, recriar, desmontar ou substituir o disco.
- Homologação: `compliance-one-v50-staging-uami`. Não copiar dados reais de clientes para homologação.
- O conector Render usado no acompanhamento de deploys e logs **não fornece acesso shell nem download do disco**. Por isso a prova de backup depende de um operador autorizado com acesso seguro ao ambiente.
- Não registrar dados pessoais, conteúdo de banco, senhas, tokens ou chaves nos tickets/PRs.

## Checklist de pré-publicação (preencher com evidência, não suposição)
- [ ] Identificar caminho real do SQLite em produção e arquivos anexos persistentes; registrar somente caminhos, tamanhos e versão de schema, sem dados sensíveis.
- [ ] Confirmar janela de manutenção e política de escrita durante o snapshot.
- [ ] Criar snapshot **consistente** com mecanismo de backup SQLite (não copiar o arquivo ativo com `cp` sem controle de escrita). Proteger permissões.
- [ ] Verificar `PRAGMA integrity_check` = `ok` no **snapshot**, não apenas na origem.
- [ ] Registrar checksum SHA-256 do arquivo de backup e confirmar armazenamento externo criptografado, com retenção e acesso restrito.
- [ ] Restaurar o snapshot em ambiente **isolado e privado**, com acesso mínimo; nunca sobrepor produção ou usar staging compartilhado.
- [ ] Confirmar integridade, versão de schema, contagens agregadas por tabela e acesso com credenciais de teste autorizadas; sem expor dados pessoais.
- [ ] Medir tempo real de recuperação e registrar RPO/RTO aceitos.
- [ ] Exercitar retorno à versão anterior da aplicação em cópia isolada; considerar incompatibilidade entre schemas após migração.
- [ ] Registrar identificador do snapshot, horário UTC, responsável, checksum, resultado da restauração e aprovação formal.
- [ ] Reexecutar testes de isolamento, autenticação, permissões e smoke pós-deploy antes de abrir tráfego de clientes.

## Exemplo seguro de procedimento (adaptar e executar apenas por operador autorizado)

1. Confirmar o caminho real do banco e política de escrita da aplicação.
2. Em shell **do ambiente autorizado**, usar API de backup do SQLite (por exemplo, `sqlite3 /caminho/real/do/banco.sqlite ".backup '/caminho/seguro/backup.sqlite'"`) para obter snapshot consistente. O destino deve ter espaço e permissões apropriados.
3. Executar `sqlite3 /caminho/seguro/backup.sqlite "PRAGMA integrity_check;"` e exigir `ok`.
4. Executar `sha256sum /caminho/seguro/backup.sqlite`, transferir de forma criptografada para armazenamento externo aprovado e verificar o checksum após a transferência.
5. Restaurar **somente em ambiente isolado**, apontando a cópia para o snapshot. Validar integridade, registros agregados, anexos e procedimentos de recuperação.
6. Não imprimir nem compartilhar o conteúdo do banco ou dados pessoais em logs públicos.

**Atenção:** o exemplo usa caminhos ilustrativos, não comandos executados. A restauração de SQLite pode exigir arquivos associados (por exemplo, WAL/SHM), anexos e segredos operacionais. Verificar tudo antes de declarar o backup recuperável.

## Evidência de liberação

| Campo | Valor |
| --- | --- |
| Data/hora UTC do snapshot | PENDENTE |
| Identificador do backup externo | PENDENTE |
| SHA-256 verificado na origem/destino | PENDENTE |
| Integridade do snapshot | PENDENTE |
| Teste de restauração isolada | PENDENTE |
| RPO/RTO medidos | PENDENTE |
| Aprovação do responsável | PENDENTE |
| Go-live autorizado | NÃO |

**Decisão:** sem todas as evidências, **não executar deploy de produção nem migração**. Testes com SQLite fictício no CI não substituem esta prova.
