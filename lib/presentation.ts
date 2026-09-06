import { Indicator, fmt, months, projection, status } from './indicators';

export type Status = 'Na meta' | 'Atenção' | 'Crítico';
export type Tone = 'ok' | 'warn' | 'crit';

export const DOMAINS = ['Privacidade de dados', 'Proteção de dados', 'Riscos de IA'] as const;
export type Domain = (typeof DOMAINS)[number];

export const DOMAIN_META: Record<Domain, { short: string; color: string; key: string; blurb: string }> = {
  'Privacidade de dados': { short: 'Privacidade', color: 'var(--dom-privacy)', key: 'privacy', blurb: 'Direitos dos titulares, inventário e avaliações de impacto.' },
  'Proteção de dados': { short: 'Proteção', color: 'var(--dom-protection)', key: 'protection', blurb: 'Criptografia, acessos privilegiados e incidentes.' },
  'Riscos de IA': { short: 'Riscos de IA', color: 'var(--dom-ai)', key: 'ai', blurb: 'Avaliação, monitoramento de viés e supervisão humana.' },
};

export const STATUS_META: Record<Status, { tone: Tone; rank: number; hint: string }> = {
  'Crítico': { tone: 'crit', rank: 0, hint: 'Desvio relevante da meta. Requer ação imediata.' },
  'Atenção': { tone: 'warn', rank: 1, hint: 'Próximo da meta. Acompanhar e corrigir rota.' },
  'Na meta': { tone: 'ok', rank: 2, hint: 'Controle no patamar esperado.' },
};

export const PERIOD = { label: 'Agosto de 2026', short: 'Ago 2026', reference: '31 ago 2026 · fechamento mensal', previous: 'julho', next: 'setembro' };

export const unitLabel = (i: Indicator, n: number) => (i.unit === '%' ? `${fmt(n)} p.p.` : `${fmt(n)} ${Math.abs(n) === 1 ? 'incidente' : 'incidentes'}`);
export const valueLabel = (i: Indicator, v = i.value) => `${fmt(v)}${i.unit}`;
export const targetLabel = (i: Indicator) => `${i.direction === 'up' ? '≥' : '≤'} ${fmt(i.target)}${i.unit}`;

export const statusOf = (i: Indicator): Status => status(i) as Status;
export const statusAt = (i: Indicator, value: number): Status => status({ ...i, value }) as Status;

/** Distância até a meta: positivo = déficit, zero/negativo = meta atingida. */
export const gap = (i: Indicator) => (i.direction === 'up' ? i.target - i.value : i.value - i.target);

/** Variação vs. mês anterior e se representa melhora segundo a direção do indicador. */
export function delta(i: Indicator) {
  const diff = i.value - i.previous;
  const improved = diff * (i.direction === 'up' ? 1 : -1) >= 0;
  return { diff, abs: Math.abs(diff), improved, flat: diff === 0 };
}

/** Tendência dos últimos três meses (jun→ago). */
export function trend(i: Indicator): 'up' | 'down' | 'flat' {
  const d = i.history[5] - i.history[3];
  if (Math.abs(d) < 0.5) return 'flat';
  return d > 0 ? 'up' : 'down';
}

/** Registros pendentes (apresentação a partir de numerador/denominador). */
export const pending = (i: Indicator) => (i.unit === '%' ? Math.max(0, i.denominator - i.numerator) : i.value);

export const severityRank = (i: Indicator) => STATUS_META[statusOf(i)].rank;

export function sortBySeverity(rows: Indicator[]) {
  return [...rows].sort((a, b) => severityRank(a) - severityRank(b) || gap(b) - gap(a));
}

export const openItems = (rows: Indicator[]) => sortBySeverity(rows.filter(i => statusOf(i) !== 'Na meta'));

/** Prazo sugerido para atuação · referência demonstrativa, não normativa. */
export function suggestedDeadline(s: Status) {
  return s === 'Crítico' ? 'até 7 dias' : s === 'Atenção' ? 'até 30 dias' : 'ciclo mensal';
}

/** Texto curto explicando por que o indicador está na situação atual. */
export function whyText(i: Indicator) {
  const s = statusOf(i);
  const d = delta(i);
  const g = gap(i);
  const move = d.flat ? `Estável em relação a ${PERIOD.previous}.` : `${d.improved ? 'Melhora' : 'Piora'} de ${unitLabel(i, d.abs)} em relação a ${PERIOD.previous}.`;
  if (i.unit !== '%') {
    return s === 'Na meta' ? `Nenhum incidente registrado no período. ${move}` : `${fmt(i.value)} ${i.value === 1 ? 'incidente registrado' : 'incidentes registrados'} com meta zero. Qualquer ocorrência é tratada como crítica. ${move}`;
  }
  if (s === 'Na meta') return `Meta de ${fmt(i.target)}% atingida com ${fmt(i.value)}%. ${move}`;
  return `Está ${fmt(g)} p.p. abaixo da meta de ${fmt(i.target)}%; ${fmt(pending(i))} de ${fmt(i.denominator)} registros pendentes. ${move}`;
}

export function calcText(i: Indicator) {
  return i.unit === '%' ? `${fmt(i.numerator)} de ${fmt(i.denominator)} registros × 100 = ${fmt(i.value)}%.` : `Contagem de ${fmt(i.value)} incidentes no período.`;
}

/** Série mensal com médias por domínio (indicadores percentuais) e ponto de projeção. */
export type TrendPoint = { month: string; projected: boolean } & Record<string, string | number | boolean | null>;

export function trendSeries(rows: Indicator[]): TrendPoint[] {
  return [...months, 'Set'].map((month, j) => {
    const point: TrendPoint = { month, projected: j === 6 };
    DOMAINS.forEach(domain => {
      const key = DOMAIN_META[domain].key;
      const group = rows.filter(i => i.domain === domain && i.unit === '%');
      const avg = (fn: (i: Indicator) => number) => (group.length ? Math.round((group.reduce((s, i) => s + fn(i), 0) / group.length) * 10) / 10 : null);
      point[key] = j < 6 ? avg(i => i.history[j]) : null;
      point[`${key}_p`] = j === 5 ? avg(i => i.history[5]) : j === 6 ? avg(i => projection(i)) : null;
    });
    return point;
  });
}

export function domainSummary(rows: Indicator[], domain: Domain) {
  const group = rows.filter(i => i.domain === domain);
  const pct = group.filter(i => i.unit === '%');
  const avg = (fn: (i: Indicator) => number) => (pct.length ? pct.reduce((s, i) => s + fn(i), 0) / pct.length : 0);
  const current = avg(i => i.value);
  const previous = avg(i => i.previous);
  const counts = { ok: 0, warn: 0, crit: 0 } as Record<Tone, number>;
  group.forEach(i => { counts[STATUS_META[statusOf(i)].tone] += 1; });
  const worst = sortBySeverity(group)[0];
  return { group, current, previous, diff: current - previous, counts, worst: worst && statusOf(worst) !== 'Na meta' ? worst : null };
}

export function suggestedQuestions(view: string, rows: Indicator[]) {
  const open = openItems(rows);
  const first = open[0];
  const list: string[] = [];
  if (first) list.push(`Por que ${first.id} está ${statusOf(first).toLowerCase()}?`);
  list.push(view === 'Visão geral' || view === 'Central de alertas' ? 'Quais indicadores precisam de atenção?' : `Resuma as prioridades em ${view}`);
  list.push('Qual a tendência para o próximo mês?');
  if (view === 'Visão geral') list.push('Resuma os riscos de IA');
  return Array.from(new Set(list)).slice(0, 4);
}

/* ------------------------------------------------------------------------
   Estruturação da resposta do assistente (somente apresentação).
   Reconhece o formato produzido por `analyze` e, quando possível, separa
   resumo, evidências, método e transparência. Caso contrário, retorna null.
   ------------------------------------------------------------------------ */
export type AnswerItem = { id: string; name: string; value: string; target: string; status: Status; projection?: string; action: string; source: string; owner: string };
export type StructuredAnswer = { summary: string; items: AnswerItem[]; method?: string; disclaimer?: string };

const ITEM_RE = /^([A-Z]+-\d{3}) · (.+?): (\S+) \(meta ([^)]+)\)\. (Na meta|Atenção|Crítico)\. (?:Projeção ilustrativa para setembro: ([^.]+)\. )?(.+?) Fonte: ([^;]+); responsável: (.+?)\.$/;

export function parseAnswer(text: string): StructuredAnswer | null {
  const parts = text.split(/\n\n+/).map(p => p.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  const items: AnswerItem[] = [];
  let method: string | undefined;
  let disclaimer: string | undefined;
  for (const p of parts.slice(1)) {
    const m = p.match(ITEM_RE);
    if (m) { items.push({ id: m[1], name: m[2], value: m[3], target: m[4], status: m[5] as Status, projection: m[6], action: m[7], source: m[8], owner: m[9] }); continue; }
    if (/^Método:/.test(p)) { method = p.replace(/^Método:\s*/, ''); continue; }
    if (/^Resposta demonstrativa/.test(p)) { disclaimer = p; continue; }
    return null;
  }
  if (!items.length) return null;
  return { summary: parts[0], items, method, disclaimer };
}
