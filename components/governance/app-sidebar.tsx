'use client';
import { Bell, BrainCircuit, LayoutDashboard, LockKeyhole, Scale, ShieldCheck } from 'lucide-react';
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar';
import { Indicator } from '@/lib/indicators';
import { cn } from '@/lib/utils';
import { DOMAINS, Domain, statusOf } from '@/lib/presentation';
import { SinvalMark } from './sinval-mark';
import { StatusDot } from './status-badge';

export type View = 'Governança' | 'Visão geral' | Domain | 'Central de alertas';

const DOMAIN_ICONS: Record<Domain, React.ComponentType<{ size?: number; className?: string }>> = {
  'Privacidade de dados': ShieldCheck,
  'Proteção de dados': LockKeyhole,
  'Riscos de IA': BrainCircuit,
};

function NavButton({ active, onClick, icon: Icon, label, trailing }: { active: boolean; onClick: () => void; icon: React.ComponentType<{ size?: number; className?: string }>; label: string; trailing?: React.ReactNode }) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={active}
        onClick={onClick}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'h-10 gap-3 rounded-lg px-3 text-[13.5px] font-medium text-n-600 transition-colors',
          'hover:bg-n-100 hover:text-n-900',
          'data-[active=true]:bg-brand-50 data-[active=true]:text-brand-700 data-[active=true]:font-semibold',
          'relative data-[active=true]:before:absolute data-[active=true]:before:inset-y-2 data-[active=true]:before:left-0 data-[active=true]:before:w-[3px] data-[active=true]:before:rounded-r data-[active=true]:before:bg-brand-500',
        )}
      >
        <Icon size={18} className={cn('shrink-0', active ? 'text-brand-600' : 'text-n-500')} />
        <span className="truncate">{label}</span>
        {trailing && <span className="ml-auto inline-flex items-center gap-1">{trailing}</span>}
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function AppSidebar({ view, rows, onNavigate, onOpenSinval }: { view: View; rows: Indicator[]; onNavigate: (v: View) => void; onOpenSinval: () => void }) {
  const { setOpenMobile } = useSidebar();
  const go = (v: View) => { onNavigate(v); setOpenMobile(false); };
  const openCount = rows.filter(i => statusOf(i) !== 'Na meta').length;

  return (
    <Sidebar className="border-r-0">
      <SidebarHeader className="gap-0 px-5 pt-6 pb-5">
        <button type="button" onClick={() => go('Governança')} className="flex items-center gap-3 rounded-xl text-left transition-colors hover:bg-n-50" aria-label="Ir para Governança de dados e IA">
          <div aria-label="itaú" className="flex size-11 items-end justify-center rounded-xl bg-brand-500 pb-1 text-[26px] leading-none font-bold tracking-[-0.06em] text-white">itaú</div>
          <div className="min-w-0">
            <div className="text-[15px] leading-tight font-semibold tracking-tight text-n-900">Governança</div>
            <div className="text-[11.5px] leading-tight text-n-500">dados &amp; inteligência artificial</div>
          </div>
        </button>
      </SidebarHeader>

      <SidebarContent className="gap-1 px-3">
        <SidebarGroup className="p-0">
          <SidebarGroupLabel className="eyebrow h-7 px-3">Workspace</SidebarGroupLabel>
          <SidebarMenu className="gap-0.5">
            <NavButton active={view === 'Governança'} onClick={() => go('Governança')} icon={Scale} label="Governança" />
            <NavButton active={view === 'Visão geral'} onClick={() => go('Visão geral')} icon={LayoutDashboard} label="Visão geral" />
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup className="p-0 pt-3">
          <SidebarGroupLabel className="eyebrow h-7 px-3">Domínios</SidebarGroupLabel>
          <SidebarMenu className="gap-0.5">
            {DOMAINS.map(d => {
              const group = rows.filter(i => i.domain === d);
              const crit = group.filter(i => statusOf(i) === 'Crítico').length;
              const warn = group.filter(i => statusOf(i) === 'Atenção').length;
              return (
                <NavButton
                  key={d}
                  active={view === d}
                  onClick={() => go(d)}
                  icon={DOMAIN_ICONS[d]}
                  label={d}
                  trailing={
                    <span className="inline-flex items-center gap-1" aria-label={`${crit} críticos, ${warn} em atenção`}>
                      {crit > 0 && <StatusDot tone="crit" />}
                      {warn > 0 && <StatusDot tone="warn" />}
                      {crit === 0 && warn === 0 && <StatusDot tone="ok" />}
                    </span>
                  }
                />
              );
            })}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup className="p-0 pt-3">
          <SidebarGroupLabel className="eyebrow h-7 px-3">Acompanhamento</SidebarGroupLabel>
          <SidebarMenu className="gap-0.5">
            <NavButton
              active={view === 'Central de alertas'}
              onClick={() => go('Central de alertas')}
              icon={Bell}
              label="Central de alertas"
              trailing={openCount > 0 && <span className="num inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-n-900 px-1.5 text-[11px] font-semibold text-white">{openCount}</span>}
            />
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup className="p-0 pt-3">
          <SidebarGroupLabel className="eyebrow h-7 px-3">Inteligência</SidebarGroupLabel>
          <button
            type="button"
            onClick={() => { onOpenSinval(); setOpenMobile(false); }}
            className="ink-gradient group mx-0 flex w-full items-center gap-3 rounded-xl p-3 text-left text-white shadow-[var(--shadow-2)] transition-opacity hover:opacity-95"
          >
            <SinvalMark size={34} inverted />
            <span className="min-w-0 flex-1">
              <span className="block text-[13.5px] font-semibold">Seu Sinval</span>
              <span className="block truncate text-[11px] text-white/65">Pergunte sobre os indicadores</span>
            </span>
            <span className="rounded bg-white/12 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-white/85 ring-1 ring-white/15">IA</span>
          </button>
        </SidebarGroup>

        <div className="mt-auto px-3 pb-2 pt-6 text-[11.5px] leading-relaxed text-n-500">
          Uma visão integrada.<br /><span className="font-medium text-n-700">Decisões mais seguras.</span>
        </div>
      </SidebarContent>

      <SidebarFooter className="border-t border-n-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-9 items-center justify-center rounded-full bg-n-100 text-[12px] font-semibold text-n-700">FA</span>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-semibold text-n-900">Felippe Araujo</div>
            <div className="text-[11px] text-n-500">Visão de demonstração</div>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
