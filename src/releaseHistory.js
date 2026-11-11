export const CURRENT_RELEASE = "48.0.0";
export const RELEASE_HISTORY = [
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
