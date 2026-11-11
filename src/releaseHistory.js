export const CURRENT_RELEASE = "49.0.0";
export const RELEASE_HISTORY = [
 {version:"49.0.0",title:"Interface adaptável para diferentes telas",date:"2026-11-10",changes:[
 {module:"Navegação e layout",before:"Algumas telas mantinham dimensões rígidas em aparelhos menores.",after:"Novas regras adaptativas ajustam áreas de conteúdo, cabeçalhos e painéis em celulares e tablets.",benefit:"Reduz cortes horizontais e melhora o aproveitamento da tela."},
 {module:"Tabelas e formulários",before:"Tabelas extensas e campos podiam ultrapassar a largura da tela.",after:"Tabelas recebem rolagem horizontal em telas compactas e campos respeitam a largura disponível.",benefit:"Facilita a consulta e o preenchimento pelo celular."},
 {module:"Toque e acessibilidade",before:"Alguns controles eram dimensionados principalmente para mouse.",after:"Controles em dispositivos de toque ganham área mínima e os campos recebem ajustes para teclado móvel.",benefit:"Melhora a interação em Android, iPhone e tablets."},
 {module:"iOS e áreas seguras",before:"O espaçamento inferior não considerava sempre a área segura do aparelho.",after:"O conteúdo móvel passa a considerar a área segura inferior quando suportada.",benefit:"Diminui o risco de controles próximos demais à borda do aparelho."}
 ]},
 {version:"48.0.0",title:"Acesso autenticado obrigatório",date:"2026-11-10",changes:[
  {module:"Acesso",before:"A interface permitia abrir o modo local e a demonstração sem autenticação.",after:"O painel só é exibido depois de a API validar uma sessão do usuário.",benefit:"Evita a utilização do ambiente de trabalho por visitantes sem login."},
  {module:"Sessão",before:"A falha de conexão com a API mantinha a interface local acessível.",after:"Sem sessão válida, a plataforma apresenta a entrada de autenticação.",benefit:"O acesso à interface acompanha a validação da identidade no servidor."}
 ]},
 {version:"47.0.0",title:"Proteção de evidências, IA e revisão regulatória",date:"2026-11-10",changes:[
  {module:"Evidências",before:"O download não conferia a integridade do arquivo original.",after:"O servidor verifica o SHA-256 e o tamanho antes de entregar o documento e registra falhas de integridade.",benefit:"Detecta adulterações dos arquivos armazenados."},
  {module:"Isolamento de empresas",before:"O estado de revisão regulatória podia afetar outras organizações.",after:"As decisões de revisão são vinculadas à empresa, à fonte e à revisão específica.",benefit:"Impede que uma revisão de uma empresa altere a de outra."},
  {module:"Inteligência artificial",before:"O controle de frequência mantinha registros sem limite explícito.",after:"O limitador de consultas usa memória limitada e informa o tempo de espera em caso de excesso.",benefit:"Melhora a previsibilidade do serviço diante de consultas repetidas."}
 ]}
];
