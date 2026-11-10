// NEXORA Compliance One V46 — 800 verificações por ramo, organizadas em 32 áreas.
// As perguntas são instrumentos de diagnóstico; não substituem parecer jurídico ou auditoria.
export const DIAGNOSTIC_DIMENSIONS = [
["responsável","Existe responsável formalmente designado, com atribuições documentadas, para o controle de {tema}?"],
["política","Há política aprovada pela administração que discipline {tema}, com escopo e exceções definidos?"],
["inventário","Os ativos, atividades, terceiros e obrigações associados a {tema} estão identificados e inventariados?"],
["riscos","Os riscos inerentes a {tema} são avaliados por probabilidade, impacto e exposição residual?"],
["requisitos","Os requisitos legais, regulatórios, contratuais e internos aplicáveis a {tema} são mapeados e revisados?"],
["procedimento","Existe procedimento operacional vigente, acessível e aprovado para executar {tema}?"],
["segregação","As funções de execução, aprovação e fiscalização de {tema} estão segregadas quando necessário?"],
["aprovação","As decisões e exceções relativas a {tema} seguem alçadas e justificativas registradas?"],
["evidência","A execução dos controles de {tema} gera evidências verificáveis, datadas e rastreáveis?"],
["periodicidade","A frequência de execução e revisão dos controles de {tema} está definida conforme o risco?"],
["indicadores","Há indicadores mensuráveis de eficácia e desvios relacionados a {tema}, com metas e responsáveis?"],
["monitoramento","São monitorados alertas, desvios e tendências em {tema} antes de produzirem danos?"],
["treinamento","As pessoas envolvidas em {tema} recebem treinamento inicial e periódico compatível com suas funções?"],
["terceiros","Os fornecedores e parceiros envolvidos em {tema} são avaliados e supervisionados conforme o risco?"],
["acessos","Os acessos físicos e digitais necessários a {tema} seguem privilégio mínimo e revisão periódica?"],
["privacidade","Os dados pessoais utilizados em {tema} são minimizados e protegidos segundo sua finalidade e base aplicável?"],
["incidentes","Existe fluxo de identificação, registro, contenção, investigação e comunicação de incidentes em {tema}?"],
["continuidade","Há plano de contingência para falhas críticas em {tema}, com responsáveis e alternativas testadas?"],
["auditoria","A eficácia dos controles de {tema} é testada por revisão independente ou auditoria baseada em risco?"],
["correção","As não conformidades de {tema} geram plano corretivo com prazo, responsável e verificação de eficácia?"],
["mudanças","Alterações relevantes em processos, sistemas ou normas de {tema} passam por avaliação prévia de riscos?"],
["reporte","A direção recebe relatórios periódicos sobre riscos, incidentes e desempenho de {tema}?"],
["retenção","Os registros de {tema} seguem classificação, controle de versões, guarda e descarte autorizados?"],
["cultura","Existem mecanismos de escuta, reporte protegido e prevenção de retaliação relativos a {tema}?"],
["melhoria","Os resultados de auditorias, incidentes e indicadores de {tema} são usados para melhoria contínua?"]
];
export const ENTERPRISE_AREAS = [
["Governança e Conselho","supervisão estratégica e prestação de contas"],
["Direção Executiva","decisões executivas e delegações"],
["Compliance e Integridade","programa de integridade e prevenção à corrupção"],
["Jurídico e Regulatório","obrigações legais, contratos e contencioso"],
["Recursos Humanos","admissão, jornada, remuneração e desligamento"],
["Financeiro e Controladoria","pagamentos, conciliações e demonstrações financeiras"],
["Compras e Suprimentos","requisições, cotações e homologações"],
["Terceiros e Fornecedores","due diligence, contratos e monitoramento de terceiros"],
["Operações","processos operacionais críticos"],
["Comercial e Vendas","propostas, preços, comissões e relacionamento comercial"],
["Logística","transporte, movimentação e rastreabilidade"],
["Tecnologia e Segurança da Informação","infraestrutura, sistemas e cibersegurança"],
["Privacidade e Dados","tratamento de dados pessoais e direitos dos titulares"],
["Qualidade","inspeções, conformidade de produtos e serviços"],
["Saúde e Segurança do Trabalho","perigos ocupacionais e prevenção de acidentes"],
["Meio Ambiente","licenças, resíduos, emissões e recursos naturais"],
["Auditoria Interna","planejamento e execução de auditorias"],
["Gestão de Documentos","ciclo de vida de políticas, contratos e evidências"],
["Continuidade de Negócios","resiliência e recuperação de operações"],
["Canal de Denúncias","recebimento, apuração e proteção de denunciantes"],
["ESG e Responsabilidade","impactos sociais, ambientais e governança sustentável"],
["Treinamento e Cultura","capacitação, comunicação e cultura ética"]
];
const DEFAULT_SECTOR = ["Licenciamento setorial","Atendimento e consumidor","Ativos e infraestrutura","Controle de produção ou serviço","Rastreabilidade operacional","Segurança específica do ramo","Contratos setoriais","Fiscalização e inspeções","Indicadores setoriais","Gestão de ocorrências"];
const SECTOR_TOPICS = {
"Supermercados / Varejo":["segurança de alimentos e cadeia fria","validade e rastreabilidade de produtos","prevenção de perdas e inventário","operações de caixa e estornos","publicidade e preços ao consumidor","relações com fornecedores e promoções","armazenagem e controle de pragas","devoluções e reclamações","licenças sanitárias e fiscalização","acessibilidade e segurança de clientes"],
"Logística / Transportes":["documentação e licenciamento de frota","jornada e habilitação de motoristas","manutenção preventiva e inspeção veicular","custódia e rastreamento de cargas","gestão de sinistros e acidentes","contratação de transportadores terceiros","segurança patrimonial e prevenção de roubos","armazenagem e movimentação de cargas","gestão de rotas e riscos operacionais","documentação de transporte e obrigações setoriais"],
"Hotelaria / Turismo":["cadastro e proteção de dados de hóspedes","controle de acesso e chaves","segurança contra incêndio e evacuação","higiene de quartos e áreas comuns","serviços de alimentos e bebidas","reservas, cancelamentos e reembolsos","terceirização de limpeza e manutenção","acessibilidade e atendimento inclusivo","licenciamento e obrigações de hospedagem","gestão de incidentes e proteção de hóspedes"],
"Gestão Pública":["planejamento de contratações públicas","licitações, dispensas e inexigibilidades","gestão e fiscalização contratual","transparência ativa e acesso à informação","integridade e conflitos de interesses","gestão de convênios e transferências","prestação de contas e controle interno","proteção de dados no setor público","gestão de pessoal e responsabilização","ouvidoria, corregedoria e atendimento ao cidadão"],
"Saúde / Hospitalar":["segurança do paciente","prontuários e sigilo assistencial","controle de infecções","medicamentos e cadeia de suprimentos","equipamentos médico-assistenciais","resíduos de serviços de saúde","protocolos clínicos e eventos adversos","credenciamento de profissionais","consentimento e direitos do paciente","vigilância sanitária e licenciamento"],
"Educação":["proteção de dados de alunos","segurança de crianças e adolescentes","acessibilidade educacional","contratos e cobrança educacional","qualidade pedagógica e avaliação","credenciamento e requisitos educacionais","gestão de docentes e colaboradores","segurança de instalações escolares","alimentação e transporte escolar","atendimento a responsáveis e reclamações"],
"Tecnologia":["desenvolvimento seguro de software","gestão de vulnerabilidades e correções","serviços em nuvem e fornecedores","continuidade de plataformas e disponibilidade","gestão de identidades e privilégios","proteção de dados e arquitetura de privacidade","segurança de APIs e integrações","registro e resposta a incidentes","gestão de mudanças e implantação","governança de modelos de inteligência artificial"],
"Financeiro":["prevenção a fraudes e lavagem de dinheiro","identificação e diligência de clientes","operações e conciliações financeiras","crédito e cobrança responsável","segurança de transações e pagamentos","gestão de riscos e capital","atendimento e reclamações financeiras","governança de produtos financeiros","monitoramento de operações atípicas","requisitos prudenciais e regulatórios"],
"Produção / Indústria":["controle de processo produtivo","manutenção de máquinas e equipamentos","qualidade e rastreabilidade de lotes","segurança de máquinas e bloqueio de energia","controle de matérias-primas","resíduos e emissões industriais","gestão de fornecedores industriais","calibração e inspeções técnicas","alterações de engenharia e processos","armazenagem de produtos acabados"],
"Metalúrgica":["proteção de máquinas e equipamentos","soldagem, corte e trabalhos a quente","movimentação e içamento de cargas","rastreabilidade de matéria-prima metálica","controle dimensional e qualidade","resíduos metálicos e óleos","manutenção de equipamentos","armazenagem de cilindros e gases","proteção respiratória e exposição ocupacional","inspeção de peças e produtos"],
"Química / Petroquímica":["segurança de processos químicos","armazenamento de substâncias perigosas","fichas de segurança e rotulagem","controle de vazamentos e contenção","gestão de mudanças de processo","integridade de equipamentos e tubulações","resíduos e efluentes perigosos","resposta a emergências químicas","transporte de produtos perigosos","exposição ocupacional a agentes químicos"],
"Construção":["licenciamento e documentação de obras","segurança em altura e escavações","gestão de subempreiteiros","qualidade e inspeção de materiais","controle de cronograma e medições","segurança de máquinas e canteiros","destinação de resíduos de construção","projetos, alterações e responsabilidade técnica","gestão de contratos e aditivos","entrega e assistência pós-obra"],
"Agronegócio":["rastreabilidade de produção agropecuária","uso e armazenamento de insumos","segurança de máquinas agrícolas","licenciamento e gestão ambiental rural","bem-estar animal quando aplicável","segurança alimentar e qualidade","armazenagem e transporte de safra","gestão de mão de obra rural","controle de água e recursos naturais","contratos e cadeia de fornecedores"],
"Energia":["integridade de ativos energéticos","segurança elétrica e bloqueios","licenças e autorizações setoriais","manutenção de instalações críticas","continuidade do fornecimento","gestão de emergências operacionais","controle ambiental de operações","segurança de prestadores de serviço","monitoramento de perdas e medições","requisitos de fiscalização setorial"]
};
SECTOR_TOPICS["Serviços"]=["contratos e níveis de serviço","qualidade da prestação","atendimento ao cliente","gestão de equipes externas","gestão de terceiros","continuidade dos serviços","licenciamento profissional","faturamento e cobrança","proteção de dados de clientes","tratamento de reclamações"];
const RISK_DIMENSION_KEYS = {
 responsável:"governance",política:"governance",inventário:"controls",riscos:"controls",
 requisitos:"legal",procedimento:"controls",segregação:"controls",aprovação:"governance",
 evidência:"audit",periodicidade:"monitoring",indicadores:"monitoring",monitoramento:"monitoring",
 treinamento:"training",terceiros:"thirdparty",acessos:"security",privacidade:"privacy",
 incidentes:"security",continuidade:"security",auditoria:"audit",correção:"controls",
 mudanças:"controls",reporte:"governance",retenção:"documentation",cultura:"ethics",melhoria:"monitoring"
};
export function buildEnterpriseQuestions(segment="Outro") {
 const topics=SECTOR_TOPICS[segment]||DEFAULT_SECTOR;
 const sectorAreas=topics.map((topic,i)=>[`Ramo · ${String(i+1).padStart(2,"0")} · ${topic}`,topic]);
 const areas=[...ENTERPRISE_AREAS,...sectorAreas];
 const questions=areas.flatMap(([area,topic],ai)=>DIAGNOSTIC_DIMENSIONS.map(([dimension,template],di)=>({
  id:`V46-${encodeURIComponent(segment)}-${String(ai+1).padStart(2,"0")}-${String(di+1).padStart(2,"0")}`,
  area,text:template.replace("{tema}",topic),key:RISK_DIMENSION_KEYS[dimension]||"controls",
  segment,dimension,topic,scope:ai<ENTERPRISE_AREAS.length?"transversal":"setorial",
  evidenceHint:`Solicitar documentos, registros e amostras referentes a ${topic}.`
 })));
 // Retém as respostas antigas no estado; IDs V46 próprios evitam associação indevida.
 return questions;
}
