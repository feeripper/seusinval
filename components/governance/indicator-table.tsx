'use client';
import { ArrowDownRight, ArrowUpRight, ChevronRight, Minus, SearchX } from 'lucide-react';
import { Indicator } from '@/lib/indicators';
import { cn } from '@/lib/utils';
import { DOMAIN_META, Domain, delta, statusOf, targetLabel, unitLabel, valueLabel } from '@/lib/presentation';
import { Panel, PanelHeader } from './panel';
import { Sparkline } from './sparkline';
import { StatusBadge } from './status-badge';
import { Filter, StatusFilter } from './status-filter';

function Delta({ i }: { i: Indicator }) {
  const d = delta(i);
  const Icon = d.flat ? Minus : d.diff > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn('num inline-flex items-center gap-0.5 text-[11.5px] font-medium', d.flat ? 'text-n-500' : d.improved ? 'text-ok-600' : 'text-crit-600')} title="Variação vs. julho">
      <Icon size={12} aria-hidden />
      {unitLabel(i, d.abs)}
    </span>
  );
}

export function IndicatorTable({
  rows,
  scope,
  filter,
  onFilter,
  onSelect,
  title,
  description,
}: {
  rows: Indicator[];
  scope: Indicator[];
  filter: Filter;
  onFilter: (f: Filter) => void;
  onSelect: (i: Indicator) => void;
  title: string;
  description: string;
}) {
  const counts: Record<Filter, number> = {
    Todos: scope.length,
    'Crítico': scope.filter(i => statusOf(i) === 'Crítico').length,
    'Atenção': scope.filter(i => statusOf(i) === 'Atenção').length,
    'Na meta': scope.filter(i => statusOf(i) === 'Na meta').length,
  };
  return (
    <Panel aria-labelledby="indicators-title">
      <PanelHeader
        eyebrow="Indicadores"
        title={<span id="indicators-title">{title}</span>}
        count={rows.length}
        description={description}
        action={<StatusFilter value={filter} onChange={onFilter} counts={counts} />}
      />

      {rows.length ? (
        <>
          {/* Desktop / tablet */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-y border-n-100 bg-n-50/70 text-[11px] font-semibold tracking-[0.06em] text-n-500 uppercase">
                  <th scope="col" className="px-6 py-2.5 font-semibold">Indicador</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Resultado</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Meta</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Últimos 6 meses</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Situação</th>
                  <th scope="col" className="px-4 py-2.5"><span className="sr-only">Detalhes</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-n-100">
                {rows.map(i => {
                  const s = statusOf(i);
                  return (
                    <tr key={i.id} className="group transition-colors hover:bg-n-50">
                      <td className="px-6 py-3.5">
                        <button type="button" onClick={() => onSelect(i)} className="text-left text-[14px] font-semibold text-n-900 hover:text-brand-600">
                          {i.name}
                        </button>
                        <div className="mt-0.5 text-[11.5px] text-n-500">
                          <span className="num">{i.id}</span> · <span style={{ color: DOMAIN_META[i.domain as Domain].color }}>●</span> {DOMAIN_META[i.domain as Domain].short}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="num text-[15px] font-semibold text-n-900">{valueLabel(i)}</div>
                        <Delta i={i} />
                      </td>
                      <td className="num px-4 py-3.5 text-[13px] whitespace-nowrap text-n-600">{targetLabel(i)}</td>
                      <td className="px-4 py-3.5"><Sparkline indicator={i} /></td>
                      <td className="px-4 py-3.5"><StatusBadge value={s} /></td>
                      <td className="px-4 py-3.5 text-right">
                        <button type="button" onClick={() => onSelect(i)} aria-label={`Ver detalhes de ${i.name}`} className="inline-flex size-8 items-center justify-center rounded-md text-n-400 transition-colors hover:bg-n-100 hover:text-n-800">
                          <ChevronRight size={18} aria-hidden />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <ul className="flex flex-col divide-y divide-n-100 border-t border-n-100 md:hidden">
            {rows.map(i => {
              const s = statusOf(i);
              return (
                <li key={i.id}>
                  <button type="button" onClick={() => onSelect(i)} className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-n-50" aria-label={`Ver detalhes de ${i.name}`}>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <StatusBadge value={s} size="sm" />
                        <span className="num text-[11px] text-n-500">{i.id}</span>
                      </div>
                      <div className="mt-1.5 text-[14px] leading-snug font-semibold text-n-900">{i.name}</div>
                      <div className="mt-1 flex items-center gap-2 text-[11.5px] text-n-500">
                        <span>meta {targetLabel(i)}</span>
                        <span aria-hidden>·</span>
                        <Delta i={i} />
                      </div>
                    </div>
                    <div className="num shrink-0 text-right text-lg font-semibold text-n-900">{valueLabel(i)}</div>
                    <ChevronRight size={18} className="shrink-0 text-n-400" aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <div className="flex flex-col items-center gap-2 border-t border-n-100 px-6 py-12 text-center">
          <span className="inline-flex size-11 items-center justify-center rounded-full bg-n-100 text-n-500"><SearchX size={20} aria-hidden /></span>
          <p className="text-sm font-semibold text-n-800">Nenhum indicador nesta situação</p>
          <p className="max-w-xs text-xs text-n-500">Ajuste o filtro para ampliar a visualização.</p>
          <button type="button" onClick={() => onFilter('Todos')} className="mt-2 rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-n-800 ring-1 ring-n-200 hover:bg-n-50">Limpar filtro</button>
        </div>
      )}
    </Panel>
  );
}
