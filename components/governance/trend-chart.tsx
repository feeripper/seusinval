'use client';
import { useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Indicator, fmt } from '@/lib/indicators';
import { cn } from '@/lib/utils';
import { DOMAINS, DOMAIN_META, Domain, PERIOD, trendSeries } from '@/lib/presentation';
import { Panel, PanelHeader } from './panel';

type TooltipPayload = { dataKey?: string | number; value?: number | null; color?: string };

function TrendTooltip({ active, payload, label, projected }: { active?: boolean; payload?: TooltipPayload[]; label?: string | number; projected?: boolean }) {
  if (!active || !payload?.length) return null;
  const byDomain = DOMAINS.map(d => {
    const key = DOMAIN_META[d].key;
    const entry = payload.find(p => p.dataKey === key && p.value != null) ?? payload.find(p => p.dataKey === `${key}_p` && p.value != null);
    return { domain: d, value: entry?.value ?? null, color: DOMAIN_META[d].color };
  }).filter(e => e.value != null);
  if (!byDomain.length) return null;
  return (
    <div className="min-w-[190px] rounded-xl border border-n-200 bg-white p-3 shadow-[var(--shadow-2)]">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-n-900">{label} 2026</span>
        {projected && <span className="rounded-full bg-ink-50 px-1.5 py-0.5 text-[10px] font-semibold text-ink-700 ring-1 ring-ink-200">cenário</span>}
      </div>
      <ul className="flex flex-col gap-1.5">
        {byDomain.map(e => (
          <li key={e.domain} className="flex items-center justify-between gap-4 text-xs">
            <span className="inline-flex items-center gap-1.5 text-n-600"><i className="size-2 rounded-full" style={{ background: e.color }} aria-hidden />{DOMAIN_META[e.domain].short}</span>
            <span className="num font-semibold text-n-900">{fmt(e.value as number)}%</span>
          </li>
        ))}
      </ul>
      {projected && <p className="mt-2 border-t border-n-100 pt-2 text-[10.5px] leading-snug text-n-500">Extrapolação ilustrativa; não é previsão validada.</p>}
    </div>
  );
}

export function TrendChart({ rows, highlight }: { rows: Indicator[]; highlight?: Domain }) {
  const [mode, setMode] = useState<'history' | 'scenario'>('history');
  const [hidden, setHidden] = useState<Set<Domain>>(new Set());
  const data = useMemo(() => trendSeries(rows), [rows]);
  const visibleData = mode === 'scenario' ? data : data.slice(0, 6);
  const toggle = (d: Domain) => setHidden(prev => { const next = new Set(prev); if (next.has(d)) next.delete(d); else next.add(d); return next; });

  return (
    <Panel aria-labelledby="trend-title">
      <PanelHeader
        eyebrow="Tendências"
        title={<span id="trend-title">Evolução por domínio</span>}
        description="Média dos indicadores percentuais · mar–ago 2026"
        action={
          <div role="tablist" aria-label="Modo de visualização" className="inline-flex rounded-lg bg-n-100 p-0.5">
            {([['history', 'Histórico'], ['scenario', 'Com cenário']] as const).map(([k, label]) => (
              <button
                key={k}
                role="tab"
                type="button"
                aria-selected={mode === k}
                onClick={() => setMode(k)}
                className={cn('inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-colors', mode === k ? 'bg-white text-n-900 shadow-[var(--shadow-1)]' : 'text-n-500 hover:text-n-800')}
              >
                {k === 'scenario' && <Sparkles size={13} aria-hidden />}
                {label}
              </button>
            ))}
          </div>
        }
      />
      <div className="px-2 pb-2 sm:px-4">
        <div className="h-[230px] w-full sm:h-[260px]">
          <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 640, height: 260 }}>
            <LineChart data={visibleData} margin={{ top: 12, right: 16, left: -14, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--n-200)" strokeDasharray="2 4" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'var(--n-500)' }} dy={8} />
              <YAxis domain={[50, 100]} ticks={[50, 60, 70, 80, 90, 100]} tickFormatter={v => `${v}%`} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--n-400)' }} width={48} />
              <ReferenceLine y={95} stroke="var(--n-400)" strokeDasharray="4 4" label={{ value: 'meta 95%', position: 'insideTopRight', fontSize: 10, fill: 'var(--n-500)' }} />
              {mode === 'scenario' && <ReferenceArea x1="Ago" x2="Set" fill="var(--ink-50)" fillOpacity={0.7} strokeOpacity={0} label={{ value: 'Cenário ilustrativo', position: 'insideTop', fontSize: 10, fill: 'var(--ink-700)' }} />}
              <Tooltip cursor={{ stroke: 'var(--n-300)', strokeWidth: 1 }} content={<TrendTooltip projected={mode === 'scenario'} />} />
              {DOMAINS.filter(d => !hidden.has(d)).map(d => {
                const meta = DOMAIN_META[d];
                const dim = highlight && highlight !== d;
                return (
                  <Line
                    key={meta.key}
                    type="monotone"
                    dataKey={meta.key}
                    name={d}
                    stroke={meta.color}
                    strokeWidth={dim ? 1.5 : 2.5}
                    strokeOpacity={dim ? 0.35 : 1}
                    dot={{ r: dim ? 0 : 3, fill: 'white', strokeWidth: 2 }}
                    activeDot={{ r: 5, strokeWidth: 0 }}
                    isAnimationActive={false}
                    connectNulls={false}
                  />
                );
              })}
              {mode === 'scenario' && DOMAINS.filter(d => !hidden.has(d)).map(d => {
                const meta = DOMAIN_META[d];
                const dim = highlight && highlight !== d;
                return (
                  <Line
                    key={`${meta.key}_p`}
                    type="monotone"
                    dataKey={`${meta.key}_p`}
                    name={`${d} · cenário`}
                    stroke={meta.color}
                    strokeWidth={dim ? 1.5 : 2.5}
                    strokeOpacity={dim ? 0.3 : 0.9}
                    strokeDasharray="5 5"
                    dot={{ r: dim ? 0 : 3, fill: 'white', strokeWidth: 2, strokeDasharray: '' }}
                    activeDot={{ r: 5, strokeWidth: 0 }}
                    isAnimationActive={false}
                    connectNulls={false}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-n-100 px-5 py-3 sm:px-6">
        <div className="flex flex-wrap gap-2" aria-label="Legenda">
          {DOMAINS.map(d => {
            const meta = DOMAIN_META[d];
            const off = hidden.has(d);
            return (
              <button
                key={d}
                type="button"
                aria-pressed={!off}
                onClick={() => toggle(d)}
                className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors', off ? 'border-n-200 text-n-400 line-through' : 'border-n-200 bg-white text-n-700 hover:bg-n-50', highlight === d && !off && 'border-n-400')}
              >
                <i className="size-2 rounded-full" style={{ background: off ? 'var(--n-300)' : meta.color }} aria-hidden />
                {meta.short}
              </button>
            );
          })}
          <span className="inline-flex items-center gap-1.5 px-1 text-xs text-n-500"><i className="h-0 w-4 border-t border-dashed border-n-500" aria-hidden />cenário</span>
        </div>
        <p className="text-[11px] text-n-500">
          {mode === 'scenario' ? `${PERIOD.next}: extrapolação da variação média jun–ago. Cenário ilustrativo, sem validação preditiva.` : 'Incidentes (contagem) ficam fora da média.'}
        </p>
      </div>
    </Panel>
  );
}
