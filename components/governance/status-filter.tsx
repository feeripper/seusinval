'use client';
import { cn } from '@/lib/utils';
import { Status } from '@/lib/presentation';

export type Filter = 'Todos' | Status;

export function StatusFilter({
  value,
  onChange,
  counts,
  options = ['Todos', 'Crítico', 'Atenção', 'Na meta'],
  label = 'Filtrar por situação',
}: {
  value: Filter;
  onChange: (f: Filter) => void;
  counts: Record<Filter, number>;
  options?: Filter[];
  label?: string;
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex max-w-full flex-wrap gap-1 rounded-lg bg-n-100 p-1">
      {options.map(o => {
        const active = value === o;
        return (
          <button
            key={o}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o)}
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-colors',
              active ? 'bg-n-0 text-n-900 shadow-[var(--shadow-1)]' : 'text-n-500 hover:text-n-800',
            )}
          >
            {o === 'Todos' ? 'Todas' : o}
            <span className={cn('num rounded px-1 text-[10.5px]', active ? 'bg-n-100 text-n-700' : 'bg-n-200/70 text-n-500')}>{counts[o]}</span>
          </button>
        );
      })}
    </div>
  );
}
