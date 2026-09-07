'use client';
import { ArrowRight, Clock, Database, MessageSquareText, RotateCcw, ShieldCheck, UserRound } from 'lucide-react';
import { Indicator } from '@/lib/indicators';
import { cn } from '@/lib/utils';
import { DOMAIN_META, Domain, sortBySeverity, statusOf, suggestedDeadline, targetLabel, valueLabel, whyText } from '@/lib/presentation';
import { StatusBadge } from './status-badge';
import { Filter, StatusFilter } from './status-filter';

export function AlertList({
  scope,
  filter,
  onFilter,
  onSelect,
  onAsk,
  onResetFilters,
}: {
  scope: Indicator[];
  filter: Filter;
  onFilter: (f: Filter) => void;
  onSelect: (i: Indicator) => void;
  onAsk: (q: string) => void;
  onResetFilters?: () => void;
}) {
  const open = sortBySeverity(scope.filter(i => statusOf(i) !== 'Na meta'));
  const rows = filter === 'Todos' ? open : open.filter(i => statusOf(i) === filter);
  const counts: Record<Filter, number> = {
    Todos: open.length,
    'Crítico': open.filter(i => statusOf(i) === 'Crítico').length,
    'Atenção': open.filter(i => statusOf(i) === 'Atenção').length,
    'Na meta': 0,
  };

  return (
    <section aria-labelledby="alerts-title" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {filter === 'Todos' ? (
            <h2 id="alerts-title" className="text-[15px] font-semibold tracking-tight text-n-900">
              {open.length} {open.length === 1 ? 'alerta aberto' : 'alertas abertos'}
              <span className="ml-2 text-[13px] font-normal text-n-500">ordenados por severidade</span>
            </h2>
          ) : (
            <h2 id="alerts-title" className="inline-flex items-center gap-2 text-[15px] font-semibold tracking-tight text-n-900">
              <span className={cn('num inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-bold text-white', filter === 'Crítico' ? 'bg-crit-600' : 'bg-warn-600')}>
                {rows.length} {filter}
              </span>
              <span className="text-[13px] font-normal text-n-500">indicador{rows.length === 1 ? '' : 'es'} para ação</span>
            </h2>
          )}
          {onResetFilters && (
            <button type="button" onClick={onResetFilters} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-brand-600 hover:bg-brand-50">
              <RotateCcw size={11} aria-hidden /> Limpar filtros
            </button>
          )}
        </div>
        <StatusFilter value={filter} onChange={onFilter} counts={counts} options={['Todos', 'Crítico', 'Atenção']} />
      </div>

      {rows.length ? (
        <ul className="grid gap-4 lg:grid-cols-2">
          {rows.map(i => {
            const s = statusOf(i);
            const crit = s === 'Crítico';
            return (
              <li key={i.id} className={cn('surface surface-hover relative flex flex-col overflow-hidden', 'before:absolute before:inset-y-0 before:left-0 before:w-1', crit ? 'before:bg-crit-600' : 'before:bg-warn-600')}>
                <div className="flex flex-col gap-4 p-5 pl-6 sm:p-6 sm:pl-7">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <StatusBadge value={s} />
                      <span className="text-[11.5px] text-n-500">
                        <span className="num">{i.id}</span> · <span style={{ color: DOMAIN_META[i.domain as Domain].color }}>●</span> {DOMAIN_META[i.domain as Domain].short}
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-md bg-n-100 px-2 py-1 text-[11px] font-medium text-n-700"><Clock size={12} aria-hidden />Prazo sugerido: {suggestedDeadline(s)}</span>
                  </div>

                  <div>
                    <h3 className="text-[16px] leading-snug font-semibold tracking-tight text-n-900">{i.name}</h3>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-n-600">{whyText(i)}</p>
                  </div>

                  <dl className="grid grid-cols-2 gap-3 rounded-xl bg-n-50 p-3.5 text-[12.5px] sm:grid-cols-3">
                    <div>
                      <dt className="eyebrow text-[10px]!">Resultado</dt>
                      <dd className="num mt-1 font-semibold text-n-900">{valueLabel(i)} <span className="text-n-500">/ {targetLabel(i)}</span></dd>
                    </div>
                    <div>
                      <dt className="eyebrow text-[10px]!">Responsável</dt>
                      <dd className="mt-1 inline-flex items-center gap-1 font-medium text-n-800"><UserRound size={12} aria-hidden />{i.owner}</dd>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <dt className="eyebrow text-[10px]!">Fonte</dt>
                      <dd className="mt-1 inline-flex items-center gap-1 font-medium text-n-800"><Database size={12} aria-hidden />{i.source}</dd>
                    </div>
                  </dl>

                  <div>
                    <div className="eyebrow text-[10px]!">Próxima ação</div>
                    <p className="mt-1 text-[13.5px] leading-relaxed font-medium text-n-900">{i.action}</p>
                  </div>

                  <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
                    <button type="button" onClick={() => onSelect(i)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-n-900 px-3.5 text-[13px] font-semibold text-white transition-colors hover:bg-n-800">
                      Ver análise <ArrowRight size={14} aria-hidden />
                    </button>
                    <button type="button" onClick={() => onAsk(`Por que ${i.id} está ${s.toLowerCase()}?`)} className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold text-ink-700 ring-1 ring-ink-200 transition-colors hover:bg-ink-50">
                      <MessageSquareText size={14} aria-hidden /> Perguntar ao Seu Sinval
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="surface flex flex-col items-center gap-2 px-6 py-14 text-center">
          <span className="inline-flex size-12 items-center justify-center rounded-full bg-ok-100 text-ok-600"><ShieldCheck size={22} aria-hidden /></span>
          <p className="text-sm font-semibold text-n-800">Nenhum alerta nesta situação</p>
          <p className="max-w-xs text-xs text-n-500">{open.length ? 'Ajuste o filtro para ver os demais alertas.' : 'Todos os indicadores deste recorte estão na meta.'}</p>
          {filter !== 'Todos' && <button type="button" onClick={() => onFilter('Todos')} className="mt-2 rounded-md bg-n-0 px-3 py-1.5 text-xs font-semibold text-n-800 ring-1 ring-n-200 hover:bg-n-50">Limpar filtro</button>}
        </div>
      )}
    </section>
  );
}
