'use client';
import { useEffect, useMemo, useState } from 'react';
import { Activity, Bell, CalendarDays, ChevronRight, CircleAlert, Database, Info, LayoutDashboard, MessageSquareText, ShieldCheck, TriangleAlert } from 'lucide-react';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Indicator, indicators as demo } from '@/lib/indicators';
import { cn } from '@/lib/utils';
import { DOMAINS, DOMAIN_META, Domain, PERIOD, statusAt, statusOf } from '@/lib/presentation';
import { ActionNow } from '@/components/governance/action-now';
import { AlertList } from '@/components/governance/alert-list';
import { AppSidebar, View } from '@/components/governance/app-sidebar';
import { DomainCards } from '@/components/governance/domain-cards';
import { IndicatorDetail } from '@/components/governance/indicator-detail';
import { IndicatorTable } from '@/components/governance/indicator-table';
import { KpiCard } from '@/components/governance/kpi-card';
import { Priorities } from '@/components/governance/priorities';
import { Message, SinvalChat } from '@/components/governance/sinval-chat';
import { SinvalCard } from '@/components/governance/sinval-card';
import { SinvalMark } from '@/components/governance/sinval-mark';
import { Filter } from '@/components/governance/status-filter';
import { TrendChart } from '@/components/governance/trend-chart';

const VIEW_COPY: Record<View, { eyebrow: string; subtitle: string }> = {
  'Visão geral': { eyebrow: 'Privacidade, proteção e riscos de IA', subtitle: 'Transforme indicadores em decisões. Antecipe o que precisa de atenção.' },
  'Privacidade de dados': { eyebrow: 'Domínio', subtitle: DOMAIN_META['Privacidade de dados'].blurb },
  'Proteção de dados': { eyebrow: 'Domínio', subtitle: DOMAIN_META['Proteção de dados'].blurb },
  'Riscos de IA': { eyebrow: 'Domínio', subtitle: DOMAIN_META['Riscos de IA'].blurb },
  'Central de alertas': { eyebrow: 'Acompanhamento', subtitle: 'Desvios da meta com contexto, responsável, prazo sugerido e próxima ação.' },
};

export default function Page() {
  const [view, setView] = useState<View>('Visão geral');
  const [rows, setRows] = useState<Indicator[]>(demo);
  const [mode, setMode] = useState('demo');
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('Todos');
  const [selected, setSelected] = useState<Indicator | null>(null);
  const [chat, setChat] = useState(false);
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    fetch('/api/indicators')
      .then(r => { if (!r.ok) throw Error(); return r.json(); })
      .then(d => { setRows(d.indicators); setMode(d.mode); })
      .catch(() => setError('Não foi possível atualizar a base. Exibindo os dados demonstrativos locais.'));
  }, []);

  const isDomain = (DOMAINS as readonly string[]).includes(view);
  const scope = useMemo(() => (isDomain ? rows.filter(i => i.domain === view) : rows), [rows, view, isDomain]);
  const visible = useMemo(() => scope.filter(i => filter === 'Todos' || statusOf(i) === filter), [scope, filter]);

  const count = (s: 'Na meta' | 'Atenção' | 'Crítico', at?: 'previous') => scope.filter(i => (at ? statusAt(i, i.previous) : statusOf(i)) === s).length;
  const healthy = count('Na meta'), attention = count('Atenção'), critical = count('Crítico');
  const openCount = attention + critical;

  async function ask(q: string) {
    if (!q.trim() || busy) return;
    setChat(true);
    setMessages(m => [...m, { role: 'user', text: q }]);
    setBusy(true);
    try {
      const r = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: q, domain: isDomain ? view : 'Todos' }) });
      if (!r.ok) throw Error('Não foi possível concluir a análise. Tente novamente.');
      const d = await r.json();
      setMessages(m => [...m, { role: 'assistant', text: d.answer }]);
    } catch (e) {
      setMessages(m => [...m, { role: 'assistant', text: e instanceof Error ? e.message : 'Serviço indisponível.' }]);
    } finally {
      setBusy(false);
    }
  }

  function navigate(v: View, f: Filter = 'Todos') {
    setView(v);
    setFilter(f);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const copy = VIEW_COPY[view];

  return (
    <SidebarProvider style={{ '--sidebar-width': '260px' } as React.CSSProperties}>
      <AppSidebar view={view} rows={rows} onNavigate={navigate} onOpenSinval={() => setChat(true)} />

      <SidebarInset className="min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-n-200 bg-white/85 px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-2 text-[13px] text-n-500">
            <SidebarTrigger className="size-9 rounded-lg text-n-700 hover:bg-n-100 md:hidden" aria-label="Abrir navegação" />
            <span className="hidden sm:inline">Governança</span>
            <ChevronRight size={14} className="hidden sm:inline" aria-hidden />
            <strong className="truncate font-semibold text-n-900">{view}</strong>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn('hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 sm:inline-flex', mode === 'demo' ? 'bg-warn-100 text-warn-600 ring-warn-200' : 'bg-ok-100 text-ok-600 ring-ok-200')}>
              <Database size={12} aria-hidden />{mode === 'demo' ? 'Dados fictícios' : 'Base conectada'}
            </span>
            <button type="button" aria-label={`Central de alertas, ${openCount} abertos`} onClick={() => navigate('Central de alertas')} className="relative inline-flex size-9 items-center justify-center rounded-lg text-n-700 transition-colors hover:bg-n-100">
              <Bell size={18} aria-hidden />
              {openCount > 0 && <span className="num absolute -top-0.5 -right-0.5 inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-brand-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">{openCount}</span>}
            </button>
            <button type="button" onClick={() => setChat(true)} className="ink-gradient inline-flex h-9 items-center gap-2 rounded-lg pl-1.5 pr-3 text-[13px] font-semibold text-white shadow-[var(--shadow-1)] transition-opacity hover:opacity-95">
              <SinvalMark size={24} inverted />
              <span className="hidden sm:inline">Seu Sinval</span>
            </button>
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 pt-6 pb-10 sm:px-6 lg:px-8 lg:pt-8">
          {/* Título */}
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <div className="eyebrow">{copy.eyebrow}</div>
              <h1 className="mt-1 text-[26px] leading-tight font-semibold tracking-tight text-n-900 sm:text-[30px]">{view}</h1>
              <p className="mt-1.5 max-w-xl text-[13.5px] leading-relaxed text-n-500">{copy.subtitle}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex h-9 items-center gap-2 rounded-lg bg-white px-3 text-[12.5px] font-medium text-n-700 ring-1 ring-n-200">
                <CalendarDays size={15} className="text-n-500" aria-hidden />{PERIOD.label}
              </span>
              <span className="hidden h-9 items-center gap-2 rounded-lg px-2 text-[12px] text-n-500 md:inline-flex">Referência: {PERIOD.reference}</span>
            </div>
          </div>

          {error && (
            <div role="alert" className="flex items-start gap-2 rounded-xl border border-warn-200 bg-warn-100 px-4 py-3 text-[13px] text-warn-600">
              <TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden />{error}
            </div>
          )}

          {view === 'Central de alertas' ? (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <KpiCard label="Críticos" value={critical} unit={critical ? 'ação imediata' : 'nenhum'} context="Desvio acima de 10 p.p. ou incidente" change={critical - count('Crítico', 'previous')} changeGoodWhen="down" tone="crit" icon={CircleAlert} emphasis={critical > 0} cta={critical ? 'Filtrar críticos' : undefined} onCta={() => setFilter('Crítico')} />
                <KpiCard label="Em atenção" value={attention} unit="acompanhar" context="Até 10 p.p. da meta" change={attention - count('Atenção', 'previous')} changeGoodWhen="down" tone="warn" icon={Activity} cta={attention ? 'Filtrar atenção' : undefined} onCta={() => setFilter('Atenção')} />
                <KpiCard label="Na meta" value={healthy} unit={`de ${scope.length}`} context="Sem alerta aberto" change={healthy - count('Na meta', 'previous')} tone="ok" icon={ShieldCheck} />
              </div>
              <AlertList scope={scope} filter={filter} onFilter={setFilter} onSelect={setSelected} onAsk={ask} />
            </>
          ) : (
            <>
              {/* KPIs */}
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard label="Indicadores monitorados" value={scope.length} unit="indicadores" context={isDomain ? 'Domínio selecionado' : '3 domínios de governança'} icon={LayoutDashboard} />
                <KpiCard label="Dentro da meta" value={healthy} unit={`${Math.round((healthy / (scope.length || 1)) * 100)}%`} context="Controles em patamar esperado" change={healthy - count('Na meta', 'previous')} tone="ok" icon={ShieldCheck} />
                <KpiCard label="Em atenção" value={attention} unit="acompanhar" context="Próximos da meta estabelecida" change={attention - count('Atenção', 'previous')} changeGoodWhen="down" tone="warn" icon={Activity} cta={attention ? 'Ver em atenção' : undefined} onCta={() => navigate('Central de alertas', 'Atenção')} />
                <KpiCard label="Críticos" value={critical} unit={critical ? 'ação necessária' : 'nenhum'} context="Desvio relevante da meta" change={critical - count('Crítico', 'previous')} changeGoodWhen="down" tone="crit" icon={CircleAlert} emphasis={critical > 0} cta={critical ? 'Ver prioridades' : undefined} onCta={() => navigate('Central de alertas', 'Crítico')} />
              </div>

              {/* Ação agora + prioridades */}
              <div className="grid gap-4 lg:grid-cols-12">
                <div className="lg:col-span-7"><ActionNow rows={scope} onSelect={setSelected} onSeeAll={() => navigate('Central de alertas')} /></div>
                <div className="lg:col-span-5"><Priorities rows={scope} onSelect={setSelected} onAsk={ask} /></div>
              </div>

              {/* Panorama por domínio */}
              {!isDomain && (
                <section aria-labelledby="domains-title" className="flex flex-col gap-3">
                  <div className="flex items-end justify-between gap-3 px-0.5">
                    <div>
                      <div className="eyebrow">Panorama</div>
                      <h2 id="domains-title" className="text-[15px] font-semibold tracking-tight text-n-900 sm:text-base">Três domínios de governança</h2>
                    </div>
                  </div>
                  <DomainCards rows={rows} onOpen={d => navigate(d)} />
                </section>
              )}

              {/* Tendência + Seu Sinval */}
              <div className="grid gap-4 lg:grid-cols-12">
                <div className="lg:col-span-7 xl:col-span-8"><TrendChart rows={rows} highlight={isDomain ? (view as Domain) : undefined} /></div>
                <div className="lg:col-span-5 xl:col-span-4"><SinvalCard rows={scope} view={view} mode={mode} onAsk={ask} onOpen={() => setChat(true)} /></div>
              </div>

              {/* Tabela */}
              <IndicatorTable
                rows={visible}
                scope={scope}
                filter={filter}
                onFilter={setFilter}
                onSelect={setSelected}
                title={isDomain ? `Indicadores de ${view}` : 'Panorama dos indicadores'}
                description="Resultado, meta, tendência de seis meses e situação em um só lugar."
              />
            </>
          )}

          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-n-200 pt-5 text-[11.5px] text-n-500">
            <span>itaú unibanco <span aria-hidden className="mx-1.5">·</span> Governança de dados e IA</span>
            <span className="inline-flex items-center gap-1.5"><Info size={12} aria-hidden />Protótipo conceitual · metas e dados demonstrativos · projeções são cenários ilustrativos</span>
          </footer>
        </div>
      </SidebarInset>

      <IndicatorDetail indicator={selected} onClose={() => setSelected(null)} onAsk={ask} />
      <SinvalChat open={chat} onOpenChange={setChat} messages={messages} busy={busy} mode={mode} view={view} rows={scope} onAsk={ask} />

      {/* Acesso rápido ao assistente no mobile */}
      <button
        type="button"
        onClick={() => setChat(true)}
        aria-label="Abrir Seu Sinval"
        className="ink-gradient fixed right-4 bottom-4 z-30 inline-flex h-12 items-center gap-2 rounded-full pl-1.5 pr-4 text-[13px] font-semibold text-white shadow-[var(--shadow-3)] md:hidden"
      >
        <SinvalMark size={36} inverted /> <MessageSquareText size={16} aria-hidden /> Seu Sinval
      </button>
    </SidebarProvider>
  );
}
