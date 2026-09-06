'use client';
import { ArrowRight, BrainCircuit, LockKeyhole, ShieldCheck, TrendingDown, TrendingUp } from 'lucide-react';
import { Indicator, fmt } from '@/lib/indicators';
import { cn } from '@/lib/utils';
import { DOMAINS, DOMAIN_META, Domain, PERIOD, domainSummary } from '@/lib/presentation';

const ICONS: Record<Domain, React.ComponentType<{ size?: number; className?: string }>> = {
  'Privacidade de dados': ShieldCheck,
  'Proteção de dados': LockKeyhole,
  'Riscos de IA': BrainCircuit,
};

export function DomainCards({ rows, onOpen }: { rows: Indicator[]; onOpen: (d: Domain) => void }) {
  return (
    <div className="grid gap-4 md:grid-cols-3" role="list" aria-label="Panorama por domínio">
      {DOMAINS.map(domain => {
        const meta = DOMAIN_META[domain];
        const s = domainSummary(rows, domain);
        const Icon = ICONS[domain];
        const total = s.group.length || 1;
        const up = s.diff >= 0;
        return (
          <article key={domain} role="listitem" className="surface surface-hover group relative flex flex-col gap-4 p-5">
            <button type="button" onClick={() => onOpen(domain)} className="absolute inset-0 z-0 rounded-2xl" aria-label={`Abrir ${domain}`} />
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="inline-flex size-10 items-center justify-center rounded-xl text-white" style={{ background: meta.color }}>
                  <Icon size={19} aria-hidden />
                </span>
                <div>
                  <h3 className="text-[15px] font-semibold tracking-tight text-n-900">{domain}</h3>
                  <p className="text-xs text-n-500">{s.group.length} indicadores</p>
                </div>
              </div>
            </div>

            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="eyebrow">Média dos percentuais</div>
                <div className="num mt-1 text-[30px] leading-none font-semibold tracking-tight text-n-900">{fmt(s.current)}<span className="text-lg text-n-500">%</span></div>
              </div>
              <span className={cn('num inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium', up ? 'bg-ok-100 text-ok-600' : 'bg-crit-100 text-crit-600')}>
                {up ? <TrendingUp size={12} aria-hidden /> : <TrendingDown size={12} aria-hidden />}
                {up ? '+' : '−'}{fmt(Math.abs(s.diff))} p.p. vs. {PERIOD.previous}
              </span>
            </div>

            <div>
              <div className="flex h-2 w-full overflow-hidden rounded-full bg-n-100" role="img" aria-label={`${s.counts.ok} na meta, ${s.counts.warn} em atenção, ${s.counts.crit} críticos`}>
                {s.counts.ok > 0 && <span className="bg-ok-600" style={{ width: `${(s.counts.ok / total) * 100}%` }} />}
                {s.counts.warn > 0 && <span className="bg-warn-600" style={{ width: `${(s.counts.warn / total) * 100}%` }} />}
                {s.counts.crit > 0 && <span className="bg-crit-600" style={{ width: `${(s.counts.crit / total) * 100}%` }} />}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-n-600">
                <span className="inline-flex items-center gap-1"><i className="size-1.5 rounded-full bg-ok-600" aria-hidden />{s.counts.ok} na meta</span>
                <span className="inline-flex items-center gap-1"><i className="size-1.5 rounded-full bg-warn-600" aria-hidden />{s.counts.warn} atenção</span>
                <span className="inline-flex items-center gap-1"><i className="size-1.5 rounded-full bg-crit-600" aria-hidden />{s.counts.crit} crítico{s.counts.crit === 1 ? '' : 's'}</span>
              </div>
            </div>

            <p className="min-h-9 text-xs leading-relaxed text-n-500">
              {s.worst ? <><span className="font-medium text-n-700">Prioridade:</span> {s.worst.name}.</> : meta.blurb}
            </p>

            <button type="button" onClick={() => onOpen(domain)} className="relative z-10 mt-auto inline-flex w-fit items-center gap-1 text-[13px] font-semibold text-brand-600 transition-colors hover:text-brand-700">
              Explorar domínio <ArrowRight size={14} aria-hidden className="transition-transform group-hover:translate-x-0.5" />
            </button>
          </article>
        );
      })}
    </div>
  );
}
