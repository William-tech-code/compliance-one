# Canal de Denúncias — ativação operacional

## Segurança antes da divulgação

1. Configure `WHISTLEBLOWER_ENCRYPTION_KEY` no serviço Render como **64 caracteres hexadecimais aleatórios** (32 bytes). Não utilize `JWT_SECRET` como chave de criptografia.
2. Faça a guarda segura da chave fora do serviço e controle sua rotação. **Perdê-la tornará os relatos existentes ilegíveis**. Não a registre no repositório.
3. Confira que `DATABASE_PATH` aponta para o disco persistente (`/var/data/...`) e que backup e restauração estejam documentados/testados.
4. Defina formalmente responsáveis, critérios de apuração, retenção, resposta a incidentes, atendimento aos titulares e transparência sobre o tratamento de dados conforme as obrigações aplicáveis.
5. Homologue com dados fictícios antes de distribuir o endereço a usuários reais.

## Operação

- Administrador autenticado: menu **Canal de Denúncias** → **Ativar link**. O link aleatório é específico da organização e não permite ver relatos.
- Administrador cadastra os membros designados sob o papel **Equipe de Apuração**, com senha individual de pelo menos 12 caracteres. Administradores comuns não têm permissão de leitura dos casos.
- Denunciante utiliza `/denunciar/<chave-do-canal>` sem login, escolhe categoria e descreve os fatos. Anexos **não** fazem parte deste primeiro lote.
- Após envio, o sistema fornece protocolo e chave privada de consulta. A chave não é recuperável; deve ser salva pelo denunciante.
- Equipe acessa `/equipe-denuncias` com login próprio. O token da sessão fica em memória e não é gravado no armazenamento do navegador.
- Relatos são armazenados criptografados com AES-256-GCM no SQLite; a categoria e os estados operacionais ficam em campos estruturados para triagem. Logs internos registram acesso e alteração de status sem copiar os relatos.

## Limites desta entrega

- Não há recebimento de anexos, mensagens de acompanhamento, distribuição entre investigadores, 2FA, política automatizada de retenção ou revisão independente obrigatória. Não apresente essas funcionalidades como implementadas.
- O anonimato também depende do conteúdo enviado pelo usuário e dos logs de acesso da infraestrutura. Não é possível prometer anonimato absoluto.
- A API retorna `503 CANAL_AGUARDANDO_CHAVE_SEGURA` até a chave permanente ser configurada; isso é deliberado para impedir armazenamento desprotegido.
