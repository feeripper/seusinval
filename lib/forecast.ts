export type ForecastMethod = 'holt-linear';

export type Confidence = 'alta' | 'média' | 'baixa';

export type ForecastPoint = {
  month: string;
  value: number;
  low: number;
  high: number;
};

export type Forecast = {
  method: ForecastMethod;
  methodLabel: string;
  points: ForecastPoint[];
  trend: 'alta' | 'estável' | 'queda';
  slope: number;
  rmse: number;
  confidence: Confidence;
  recordsUsed: number;
  variables: string[];
  limitations: string[];
  explanation: string;
};

const ALPHA = 0.45;
const BETA = 0.25;
const Z80 = 1.2815515655446004;

export const HISTORY_MONTHS = [
  'Mar/25', 'Abr/25', 'Mai/25', 'Jun/25', 'Jul/25', 'Ago/25',
  'Set/25', 'Out/25', 'Nov/25', 'Dez/25', 'Jan/26', 'Fev/26',
  'Mar/26', 'Abr/26', 'Mai/26', 'Jun/26', 'Jul/26', 'Ago/26',
] as const;

export const HORIZON_MONTHS = ['Set/26', 'Out/26', 'Nov/26'] as const;

export function clampForecast(value: number, unit: string, direction: string) {
  if (unit === '%') return Math.max(0, Math.min(100, value));
  if (direction === 'down') return Math.max(0, value);
  return Math.max(0, value);
}

export function holt(history: number[]) {
  const n = history.length;
  if (n === 0) return { level: 0, trend: 0, fitted: [] as number[] };
  if (n === 1) return { level: history[0], trend: 0, fitted: [history[0]] };
  let level = history[0];
  let trend = history[1] - history[0];
  const fitted = [level];
  for (let t = 1; t < n; t++) {
    const prev = level;
    level = ALPHA * history[t] + (1 - ALPHA) * (level + trend);
    trend = BETA * (level - prev) + (1 - BETA) * trend;
    fitted.push(level);
  }
  return { level, trend, fitted };
}

export function forecastSeries(history: number[], unit: string, direction: string, horizon = HORIZON_MONTHS): Forecast {
  const series = history.filter(v => Number.isFinite(v));
  const { level, trend, fitted } = holt(series);
  let sse = 0;
  const start = Math.min(1, series.length);
  for (let i = start; i < series.length; i++) sse += (series[i] - fitted[i]) ** 2;
  const denom = Math.max(1, series.length - start);
  const rmse = Math.sqrt(sse / denom);
  const points: ForecastPoint[] = horizon.map((month, h) => {
    const raw = level + (h + 1) * trend;
    const value = round1(clampForecast(raw, unit, direction));
    const band = round1(Math.max(unit === '%' ? 0.4 : 0.1, rmse * Z80));
    return {
      month,
      value,
      low: round1(clampForecast(value - band, unit, direction)),
      high: round1(clampForecast(value + band, unit, direction)),
    };
  });
  const slope = trend;
  const trendLabel: Forecast['trend'] = Math.abs(slope) < 0.15 ? 'estável' : slope > 0 ? 'alta' : 'queda';
  const span = Math.max(1, Math.max(...series) - Math.min(...series));
  const rel = rmse / span;
  const confidence: Confidence = rel < 0.08 ? 'alta' : rel < 0.18 ? 'média' : 'baixa';
  const methodLabel = 'Suavização exponencial de Holt (tendência linear)';
  const explanation = [
    `Método: ${methodLabel}, com α=${ALPHA} (nível) e β=${BETA} (tendência).`,
    `Usa os ${series.length} pontos mensais mais recentes. Não há aleatoriedade: o mesmo histórico produz o mesmo resultado.`,
    `Tendência ${trendLabel} de ${round1(slope)} por mês. Próximo ponto: ${points[0]?.value}.`,
    `Faixa de 80% aproximada por ±1,28 × RMSE in-sample (${round1(rmse)}). Confiança ${confidence}.`,
  ].join(' ');
  return {
    method: 'holt-linear',
    methodLabel,
    points,
    trend: trendLabel,
    slope: round1(slope),
    rmse: round1(rmse),
    confidence,
    recordsUsed: series.length,
    variables: ['histórico mensal do próprio indicador', 'nível suavizado', 'tendência linear'],
    limitations: [
      'Série demonstrativa, sem sazonalidade explícita nem variáveis exógenas.',
      'A faixa de confiança é in-sample e subestima quebras de regime.',
      'Não é parecer de conformidade nem modelo preditivo validado.',
    ],
    explanation,
  };
}

export function round1(n: number) {
  return Math.round(n * 10) / 10;
}
