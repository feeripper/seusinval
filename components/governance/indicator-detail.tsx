'use client';
import { ArrowDownRight, ArrowUpRight, CalendarDays, Clock, Database, Minus, MessageSquareText, UserRound } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Indicator, fmt } from '@/lib/indicators';
import { HISTORY_MONTHS, HORIZON_MONTHS, forecastSeries } from '@/lib/forecast';
import { cn } from '@/lib/utils';
import { DOMAIN_META, Domain, PERIOD, calcText, delta, gap, statusOf, suggestedDeadline, targetLabel, unitLabel, valueLabel, whyText } from '@/lib/presentation';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ForecastExplainer } from './forecast-explainer';
import { StatusBadge } from './status-badge';

function Step({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="grid grid-cols-[28px_1fr] gap-x-3">
      <span className="num mt-0.5 inline-flex size-7 items-center justify-center rounded-full bg-n-100 text-[11px] font-semibold text-n-700" aria-hidden>{n}</span>
      <div className="min-w-0">
        <h3 className="text-[13px] font-semibold tracking-tight text-n-900">{title}</h3>
        <div className="mt-2">{children}</div>
      </div>
    </section>
  );
}

function DetailChart({ i }: { i: Indicator }) {
  const fc = forecastSeries(i.history, i.unit, i.direction);
  const hist = HISTORY_MONTHS.slice(-12);
  const data = [...hist, ...HORIZON_MONTHS].map((m, j) => {
    const histIdx = i.history.length - hist.length + j;
    if (j < hist.length) return { month: m, v: histIdx >= 0 ? i.history[histIdx] : null, p: j === hist.length - 1 ? i.history[i.history.length - 1] : null };
    return { month: m, v: null, p: fc.points[j - hist.length]?.value ?? null };
  });
  const values = [...i.history, ...fc.points.map(p => p.value), i.target];
  const min = Math.floor(Math.min(...values) - 2);
  const max = Math.ceil(Math.max(...values) + 2);
  const color = DOMAIN_META[i.domain as Domain].color;
  return (
    <div className="h-[150px] w-full" role="img" aria-label={`Histórico: ${i.history.join(', ')}. Cenário Holt: ${fc.points.map(p => `${p.month} ${fmt(p.value)}`).join(', ')}.`}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 480, height: 150 }}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--n-200)" strokeDasharray="2 4" />
          <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--n-500)' }} dy={6} />
          <YAxis domain={[Math.max(0, min), i.unit === '%' ? Math.min(100, max) : max]} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'var(--n-400)' }} width={44} tickFormatter={v => `${v}${i.unit}`} />
          <ReferenceLine y={i.target} stroke="var(--n-400)" strokeDasharray="4 4" label={{ value: `meta ${targetLabel(i)}`, position: 'insideTopRight', fontSize: 10, fill: 'var(--n-500)' }} />
          <Tooltip
            cursor={{ stroke: 'var(--n-300)' }}
            formatter={(value, name) => [`${fmt(Number(value))}${i.unit}`, name === 'p' ? 'Cenário' : 'Resultado']}
            labelFormatter={l => `${l} 2026`}
            contentStyle={{ borderRadius: 10, border: '1px solid var(--n-200)', fontSize: 12, boxShadow: 'var(--shadow-2)' }}
          />
          <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2.4} dot={{ r: 3, fill: 'white', strokeWidth: 2 }} isAnimationActive={false} connectNulls={false} />
          <Line type="monotone" dataKey="p" stroke={color} strokeWidth={2.2} strokeDasharray="5 5" strokeOpacity={0.8} dot={{ r: 3, fill: 'white', strokeWidth: 2 }} isAnimationActive={false} connectNulls={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function IndicatorDetail({ indicator, onClose, onAsk }: { indicator: Indicator | null; onClose: () => void; onAsk: (q: string) => void }) {
  const i = indicator;
  return (
    <Sheet open={!!i} onOpenChange={o => !o && onClose()}>
      <SheetContent className="w-full gap-0 overflow-y-auto border-l-0 bg-n-0 p-0 sm:max-w-[560px] [&>button]:top-5 [&>button]:right-5 [&>button]:size-8 [&>button]:rounded-md [&>button]:opacity-100 [&>button]:hover:bg-n-100 [&>button]:inline-flex [&>button]:items-center [&>button]:justify-center">
        {i && (() => {
          const s = statusOf(i);
          const d = delta(i);
          const g = gap(i);
          const DeltaIcon = d.flat ? Minus : d.diff > 0 ? ArrowUpRight : ArrowDownRight;
          return (
            <>
              <SheetHeader className="gap-3 border-b border-n-100 px-6 pt-6 pb-5 pr-16">
                <SheetDescription className="flex items-center gap-2 text-[11.5px] text-n-500">
                  <span className="num">{i.id}</span> · <span style={{ color: DOMAIN_META[i.domain as Domain].color }}>●</span> {i.domain}
                </SheetDescription>
                <SheetTitle className="text-[21px] leading-tight font-semibold tracking-tight text-n-900">{i.name}</SheetTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge value={s} />
                  <span className="inline-flex items-center gap-1 text-[11.5px] text-n-500"><CalendarDays size={12} aria-hidden />{PERIOD.label} · dados demonstrativos</span>
                </div>
              </SheetHeader>

              <div className="flex flex-col gap-7 px-6 py-6">
                <Step n="01" title="O que aconteceu">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <div className="num text-[44px] leading-none font-semibold tracking-tight text-n-900">{valueLabel(i)}</div>
                      <div className="mt-1.5 text-[12.5px] text-n-500">Meta {targetLabel(i)}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span className={cn('num inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold', d.flat ? 'bg-n-100 text-n-600' : d.improved ? 'bg-ok-100 text-ok-600' : 'bg-crit-100 text-crit-600')}>
                        <DeltaIcon size={13} aria-hidden />{unitLabel(i, d.abs)} vs. {PERIOD.previous}
                      </span>
                      <span className="num rounded-md bg-n-100 px-2 py-1 text-xs font-medium text-n-700">
                        {g > 0 ? `${unitLabel(i, g)} ${i.direction === 'up' ? 'abaixo' : 'acima'} da meta` : 'meta atingida'}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 rounded-xl border border-n-200 p-3">
                    <DetailChart i={i} />
                  </div>
                  <p className="mt-3 text-[12.5px] leading-relaxed text-n-500"><span className="font-medium text-n-700">Cálculo:</span> {calcText(i)}</p>
                </Step>

                <Step n="02" title="Por que importa">
                  <p className="text-[13.5px] leading-relaxed text-n-700">{whyText(i)} <span className="text-n-500">{i.unit === '%' ? 'Indicadores percentuais: quanto maior, melhor.' : 'Meta de zero ocorrências.'}</span></p>
                </Step>

                <Step n="03" title="Quem atua">
                  <dl className="grid grid-cols-1 gap-3 rounded-xl bg-n-50 p-4 text-[13px] sm:grid-cols-2">
                    <div>
                      <dt className="eyebrow text-[10px]!">Responsável</dt>
                      <dd className="mt-1 inline-flex items-center gap-1.5 font-medium text-n-900"><UserRound size={13} aria-hidden />{i.owner}</dd>
                    </div>
                    <div>
                      <dt className="eyebrow text-[10px]!">Fonte</dt>
                      <dd className="mt-1 inline-flex items-center gap-1.5 font-medium text-n-900"><Database size={13} aria-hidden />{i.source}</dd>
                    </div>
                  </dl>
                </Step>

                <Step n="04" title="Qual é o próximo passo">
                  <div className="rounded-xl border border-brand-200 bg-brand-50 p-4">
                    <p className="text-[14px] leading-relaxed font-medium text-n-900">{i.action}</p>
                    <div className="mt-2 inline-flex items-center gap-1 text-[11.5px] text-n-600"><Clock size={12} aria-hidden />Prazo sugerido: {suggestedDeadline(s)} <span className="text-n-400">· referência demonstrativa</span></div>
                  </div>
                </Step>

                <ForecastExplainer i={i} />

                <p className="text-[11.5px] leading-relaxed text-n-500">Critério demonstrativo: meta atingida = na meta; desvio de até 10 p.p. = atenção; acima de 10 p.p. = crítico. Qualquer incidente é crítico. Metas internas fictícias.</p>

                <button
                  type="button"
                  onClick={() => { onAsk(`Analise o indicador ${i.id} e sua tendência futura`); onClose(); }}
                  className="ink-gradient inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white shadow-[var(--shadow-2)] transition-opacity hover:opacity-95"
                >
                  <MessageSquareText size={16} aria-hidden /> Perguntar ao Seu Sinval sobre {i.id}
                </button>
              </div>
            </>
          );
        })()}
      </SheetContent>
    </Sheet>
  );
}
