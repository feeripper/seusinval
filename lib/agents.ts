export type AgentId = 'sinval' | 'aurora' | 'octave' | 'sherlock';

export type Agent = {
  id: AgentId;
  name: string;
  role: string;
  specialty: string;
  description: string;
  greeting: string;
  mark: string;
  avatar: string;
  accent: string;
  statusLine: string;
  questions: string[];
};

export const DISCLAIMER = 'As respostas são orientativas e devem ser validadas pelas áreas de Privacidade, Segurança, Risco e Jurídico.';

export const AGENTS: Agent[] = [
  {
    id: 'sinval',
    name: 'Seu Sinval',
    role: 'Coordenador geral',
    specialty: 'Visão executiva e priorização de riscos',
    description: 'Resume o painel, prioriza o que exige ação e encaminha a análise ao especialista certo.',
    greeting: 'Olá! Sou o Seu Sinval. Posso ajudar a analisar os indicadores.',
    mark: 'S',
    avatar: '/images/agents/seu-sinval.png',
    accent: '#08244a',
    statusLine: 'Seu Sinval está analisando o contexto…',
    questions: [
      'Faça um resumo executivo.',
      'Quais são os três maiores riscos?',
      'O que exige ação imediata?',
      'Para qual especialista devo encaminhar esta análise?',
    ],
  },
  {
    id: 'aurora',
    name: 'Aurora',
    role: 'Especialista em Risco de IA',
    specialty: 'Modelos, vieses, inventário e controles de IA',
    description: 'Analisa modelos, vieses, criticidade e a previsão de risco de IA com base no inventário.',
    greeting: 'Olá, sou a Aurora. Vamos olhar riscos de IA, modelos e o que precisa de revisão.',
    mark: 'A',
    avatar: '/images/agents/aurora.png',
    accent: '#6f4fb3',
    statusLine: 'Aurora está analisando riscos de IA…',
    questions: [
      'Quais riscos de IA estão críticos?',
      'Explique o risco de viés identificado.',
      'Quais modelos precisam de revisão?',
      'Como foi calculada a previsão de risco de IA?',
    ],
  },
  {
    id: 'octave',
    name: 'Octave',
    role: 'Especialista em Proteção de Dados',
    specialty: 'Segurança, acessos, incidentes e controles',
    description: 'Revisa exposição de bases, acessos, incidentes e controles pendentes de proteção.',
    greeting: 'Olá, sou o Octave. Posso revisar exposição, incidentes e controles de proteção de dados.',
    mark: 'O',
    avatar: '/images/agents/octave.png',
    accent: '#1754a1',
    statusLine: 'Octave está revisando controles de proteção…',
    questions: [
      'Quais bases estão mais expostas?',
      'Há incidentes em aberto?',
      'Quais controles estão pendentes?',
      'Mostre riscos críticos de proteção de dados.',
    ],
  },
  {
    id: 'sherlock',
    name: 'Sherlock',
    role: 'Especialista em Privacidade de Dados',
    specialty: 'LGPD, direitos dos titulares, ROPA e DPIA',
    description: 'Investiga prazos de titulares, bases legais, retenção, consentimento e avaliações de impacto.',
    greeting: 'Olá, sou a Sherlock. Vamos investigar prazos, LGPD e o risco de privacidade por área.',
    mark: 'H',
    avatar: '/images/agents/sherlock.png',
    accent: '#ec7000',
    statusLine: 'Sherlock está investigando a questão de privacidade…',
    questions: [
      'Quais indicadores de LGPD pioraram?',
      'Há solicitações de titulares atrasadas?',
      'Quais áreas têm maior risco de privacidade?',
      'Explique a previsão de incidentes.',
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
