export type AgentId = 'sinval' | 'aurora' | 'octave' | 'sherlock';

export type Agent = {
  id: AgentId;
  name: string;
  role: string;
  specialty: string;
  mark: string;
  statusLine: string;
  questions: string[];
};

export const DISCLAIMER = 'As respostas são orientativas e devem ser validadas pelas áreas de Privacidade, Segurança, Risco e Jurídico.';

export const AGENTS: Agent[] = [
  {
    id: 'sinval',
    name: 'Seu Sinval',
    role: 'Coordenador geral',
    specialty: 'Coordena privacidade, proteção e risco de IA',
    mark: 'S',
    statusLine: 'Seu Sinval está analisando o contexto…',
    questions: [
      'Quais indicadores precisam de atenção?',
      'Resuma o panorama de governança deste mês',
      'O que priorizar nesta semana?',
    ],
  },
  {
    id: 'aurora',
    name: 'Aurora',
    role: 'Especialista em Risco de IA',
    specialty: 'Governança, vieses, alucinações e monitoramento de modelos',
    mark: 'A',
    statusLine: 'Aurora está analisando riscos de IA…',
    questions: [
      'Quais são os riscos de usar IA generativa no atendimento?',
      'Como reduzir vieses e alucinações nos modelos?',
      'O que acompanhar em IA-001?',
    ],
  },
  {
    id: 'octave',
    name: 'Octave',
    role: 'Especialista em Proteção de Dados',
    specialty: 'Controles técnicos, acessos, criptografia e incidentes',
    mark: 'O',
    statusLine: 'Octave está revisando controles de proteção…',
    questions: [
      'Quais ativos estão sem criptografia?',
      'Como tratar o incidente de exposição de dados?',
      'O que falta na recertificação de acessos privilegiados?',
    ],
  },
  {
    id: 'sherlock',
    name: 'Sherlock',
    role: 'Especialista em Privacidade de Dados',
    specialty: 'LGPD, direitos dos titulares, RIPD e privacy by design',
    mark: 'H',
    statusLine: 'Sherlock está investigando a questão de privacidade…',
    questions: [
      'Quais solicitações de titulares estão fora do prazo?',
      'Quando um RIPD é necessário neste recorte?',
      'Como melhorar o inventário de tratamentos?',
    ],
  },
];

export const agentById = (id: string | undefined): Agent => AGENTS.find(a => a.id === id) ?? AGENTS[0];

export function questionsFor(agent: Agent, view: string): string[] {
  if (agent.id !== 'sinval') return agent.questions;
  if (view === 'Privacidade de dados') return AGENTS[3].questions;
  if (view === 'Proteção de dados') return AGENTS[2].questions;
  if (view === 'Riscos de IA') return AGENTS[1].questions;
  return agent.questions;
}

const ACTION_QUESTIONS: Record<string, string> = {
  'Ver riscos relacionados': 'Quais riscos de IA estão críticos neste recorte e o que mitigar primeiro?',
  'Criar plano de mitigação': 'Monte um plano de 30 dias para os modelos de IA fora da meta, com dono e evidência.',
  'Revisar controles técnicos': 'O que revisar agora em criptografia, acessos privilegiados e incidentes de exposição?',
  'Abrir acompanhamento de incidente': 'Como tratar os incidentes de exposição de dados do painel, com contenção, dono e evidência?',
  'Ver direitos dos titulares': 'Quais solicitações de titulares estão fora do prazo e o que a área deve fazer nesta semana?',
  'Avaliar necessidade de RIPD': 'Quando um RIPD é necessário neste recorte e o que o painel já mostra sobre avaliações de impacto?',
  'Ver indicadores em atenção': 'Quais indicadores precisam de atenção e o que priorizar nesta semana?',
  'Perguntar a um especialista': 'Resuma o panorama de governança e diga qual especialista deve entrar em cada prioridade.',
};

export function questionFromAction(label: string): string {
  return ACTION_QUESTIONS[label] ?? label;
}
