'use client';
import { useState } from 'react';
import { ChevronDown, Info } from 'lucide-react';
import { Indicator, fmt } from '@/lib/indicators';
import { forecastSeries, HISTORY_MONTHS } from '@/lib/forecast';
import { PERIOD, valueLabel } from '@/lib/presentation';

export function ForecastExplainer({ i }: { i: Indicator }) {
  const [open, setOpen] = useState(false);
  const fc = forecastSeries(i.history, i.unit, i.direction);
  const next = fc.points[0];
  return (
    <div className="rounded-xl border border-ink-200 bg-ink-50">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-ink-800">
          <Info size={15} aria-hidden /> Como esta previsão foi calculada?
        </span>
        <ChevronDown size={16} className={open ? 'rotate-180 text-ink-700' : 'text-ink-700'} aria-hidden />
      </button>
      {open && (
        <div className="border-t border-ink-200 px-4 py-4 text-[12.5px] leading-relaxed text-n-700">
          <dl className="grid gap-3 sm:grid-cols-2">
            <div><dt className="eyebrow text-[10px]!">Indicador</dt><dd className="mt-1 font-medium text-n-900">{i.id} · {i.name}</dd></div>
            <div><dt className="eyebrow text-[10px]!">Fonte</dt><dd className="mt-1 font-medium text-n-900">{i.source}</dd></div>
            <div><dt className="eyebrow text-[10px]!">Período histórico</dt><dd className="mt-1 font-medium text-n-900">{HISTORY_MONTHS[HISTORY_MONTHS.length - i.history.length] ?? HISTORY_MONTHS[0]} a {PERIOD.short} · {fc.recordsUsed} meses</dd></div>
            <div><dt className="eyebrow text-[10px]!">Registros</dt><dd className="mt-1 font-medium text-n-900">{fmt(i.denominator || fc.recordsUsed)}</dd></div>
            <div><dt className="eyebrow text-[10px]!">Método</dt><dd className="mt-1 font-medium text-n-900">{fc.methodLabel}</dd></div>
            <div><dt className="eyebrow text-[10px]!">Tendência</dt><dd className="mt-1 font-medium text-n-900">{fc.trend} · {fmt(fc.slope)} / mês</dd></div>
            <div><dt className="eyebrow text-[10px]!">Próximos períodos</dt><dd className="mt-1 font-medium text-n-900">{fc.points.map(p => `${p.month} ${fmt(p.value)}${i.unit}`).join(' · ')}</dd></div>
            <div><dt className="eyebrow text-[10px]!">Confiança</dt><dd className="mt-1 font-medium text-n-900">{fc.confidence} · faixa 80% {next ? `${fmt(next.low)}–${fmt(next.high)}${i.unit}` : '—'}</dd></div>
            <div><dt className="eyebrow text-[10px]!">Atualização</dt><dd className="mt-1 font-medium text-n-900">{'updatedAt' in i && i.updatedAt ? String(i.updatedAt) : PERIOD.reference}</dd></div>
            <div><dt className="eyebrow text-[10px]!">Natureza</dt><dd className="mt-1 font-medium text-n-900">Dados demonstrativos / simulados</dd></div>
          </dl>
          <p className="mt-3">{fc.explanation}</p>
          <p className="mt-2 text-n-500">Variáveis: {fc.variables.join('; ')}. Limitações: {fc.limitations.join(' ')}</p>
          <p className="mt-2 text-n-500">Leitura atual {valueLabel(i)}. O mesmo histórico sempre produz o mesmo resultado.</p>
        </div>
      )}
    </div>
  );
}
