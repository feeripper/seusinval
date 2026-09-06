'use client';
import { ArrowRight, ChevronRight, ShieldCheck } from 'lucide-react';
import { Indicator } from '@/lib/indicators';
import { cn } from '@/lib/utils';
import { DOMAIN_META, Domain, gap, openItems, statusOf, targetLabel, unitLabel, valueLabel } from '@/lib/presentation';
import { Panel, PanelHeader } from './panel';
import { StatusBadge } from './status-badge';

export function ActionNow({
  rows,
  onSelect,
  onSeeAll,
  limit = 4,
}: {
  rows: Indicator[];
  onSelect: (i: Indicator) => void;
  onSeeAll: () => void;
  limit?: number;
}) {
  const open = openItems(rows);
  const critical = open.filter(i => statusOf(i) === 'Crítico');
  const shown = open.slice(0, limit);
  return (
    <Panel aria-labelledby="action-now-title">
      <PanelHeader
        eyebrow="Exige ação agora"
        title={<span id="action-now-title">{critical.length ? `${critical.length} ${critical.length === 1 ? 'indicador crítico' : 'indicadores críticos'}` : open.length ? 'Nenhum indicador crítico' : 'Tudo dentro da meta'}</span>}
        description={critical.length ? 'Desvios relevantes da meta, ordenados por severidade e distância.' : open.length ? 'Há indicadores em atenção que merecem acompanhamento.' : 'Nenhum desvio registrado neste recorte.'}
        action={
          open.length > 0 && (
            <button type="button" onClick={onSeeAll} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[13px] font-semibold text-brand-600 hover:bg-brand-50 hover:text-brand-700">
              Central de alertas <ArrowRight size={14} aria-hidden />
            </button>
          )
        }
      />
      {shown.length ? (
        <ul className="flex flex-col divide-y divide-n-100 border-t border-n-100">
          {shown.map(i => {
            const s = statusOf(i);
            const g = gap(i);
            return (
              <li key={i.id}>
                <button
                  type="button"
                  onClick={() => onSelect(i)}
                  className={cn(
                    'group relative flex w-full items-center gap-4 px-5 py-3.5 text-left transition-colors hover:bg-n-50 sm:px-6',
                    'before:absolute before:inset-y-3 before:left-0 before:w-[3px] before:rounded-r',
                    s === 'Crítico' ? 'before:bg-crit-600' : 'before:bg-warn-600',
                  )}
                  aria-label={`Ver análise de ${i.name}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge value={s} size="sm" />
                      <span className="text-[11px] font-medium text-n-500">
                        <span style={{ color: DOMAIN_META[i.domain as Domain].color }}>●</span> {DOMAIN_META[i.domain as Domain].short} · {i.id}
                      </span>
                    </div>
                    <div className="mt-1.5 truncate text-[14px] font-semibold text-n-900">{i.name}</div>
                    <div className="mt-0.5 text-xs text-n-500">Responsável: {i.owner}</div>
                  </div>
                  <div className="hidden shrink-0 text-right sm:block">
                    <div className="num text-lg font-semibold text-n-900">{valueLabel(i)}</div>
                    <div className="text-[11px] text-n-500">meta {targetLabel(i)}</div>
                  </div>
                  <div className="num shrink-0 rounded-md bg-n-100 px-2 py-1 text-xs font-semibold text-n-700">
                    {i.direction === 'up' ? '−' : '+'}{unitLabel(i, g)}
                  </div>
                  <ChevronRight size={18} className="shrink-0 text-n-400 transition-transform group-hover:translate-x-0.5 group-hover:text-n-600" aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="flex flex-col items-center gap-2 border-t border-n-100 px-6 py-10 text-center">
          <span className="inline-flex size-11 items-center justify-center rounded-full bg-ok-100 text-ok-600"><ShieldCheck size={22} aria-hidden /></span>
          <p className="text-sm font-medium text-n-800">Controles em patamar esperado</p>
          <p className="max-w-xs text-xs text-n-500">Continue acompanhando as tendências para antecipar desvios.</p>
        </div>
      )}
      {open.length > shown.length && (
        <div className="border-t border-n-100 px-5 py-3 text-xs text-n-500 sm:px-6">
          + {open.length - shown.length} em atenção. <button type="button" onClick={onSeeAll} className="font-semibold text-brand-600 hover:text-brand-700">Ver todos</button>
        </div>
      )}
    </Panel>
  );
}
