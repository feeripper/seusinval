'use client';
import { Clock, MessageSquareText, UserRound } from 'lucide-react';
import { Indicator } from '@/lib/indicators';
import { openItems, statusOf, suggestedDeadline } from '@/lib/presentation';
import { Panel, PanelHeader } from './panel';
import { StatusBadge } from './status-badge';

export function Priorities({
  rows,
  onSelect,
  onAsk,
  limit = 3,
}: {
  rows: Indicator[];
  onSelect: (i: Indicator) => void;
  onAsk: (q: string) => void;
  limit?: number;
}) {
  const items = openItems(rows).slice(0, limit);
  return (
    <Panel aria-labelledby="priorities-title">
      <PanelHeader
        eyebrow="Prioridades da semana"
        title={<span id="priorities-title">Ações recomendadas</span>}
        description="Próximos passos a partir dos indicadores fora da meta."
      />
      {items.length ? (
        <ol className="flex flex-col gap-3 px-5 pb-5 sm:px-6">
          {items.map((i, idx) => {
            const s = statusOf(i);
            return (
              <li key={i.id} className="rounded-xl border border-n-200 bg-n-50/60 p-4">
                <div className="flex items-start gap-3">
                  <span className="num inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-n-900 text-xs font-semibold text-white">{idx + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] leading-snug font-medium text-n-900">{i.action}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-n-500">
                      <StatusBadge value={s} size="sm" />
                      <span className="inline-flex items-center gap-1"><UserRound size={12} aria-hidden />{i.owner}</span>
                      <span className="inline-flex items-center gap-1"><Clock size={12} aria-hidden />Prazo sugerido: {suggestedDeadline(s)}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button type="button" onClick={() => onSelect(i)} className="rounded-md bg-n-0 px-2.5 py-1.5 text-xs font-semibold text-n-800 ring-1 ring-n-200 transition-colors hover:bg-n-100">
                        Ver análise · {i.id}
                      </button>
                      <button type="button" onClick={() => onAsk(`Analise o indicador ${i.id} e sua tendência futura`)} className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold text-ink-700 transition-colors hover:bg-ink-50">
                        <MessageSquareText size={13} aria-hidden /> Perguntar ao Seu Sinval
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="px-6 pb-8 pt-2 text-center text-sm text-n-500">Nenhuma ação pendente neste recorte.</div>
      )}
      <div className="mt-auto border-t border-n-100 px-5 py-3 text-[11px] text-n-500 sm:px-6">Prazos sugeridos são referências demonstrativas, não normativas.</div>
    </Panel>
  );
}
