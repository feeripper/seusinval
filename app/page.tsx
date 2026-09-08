'use client';
import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { Activity, Bell, CalendarDays, ChevronRight, CircleAlert, Database, Info, LayoutDashboard, ShieldCheck, TriangleAlert } from 'lucide-react';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Indicator, indicators as demo } from '@/lib/indicators';
import { cn } from '@/lib/utils';
import { DOMAINS, DOMAIN_BY_SLUG, DOMAIN_META, DOMAIN_SLUGS, Domain, PERIOD, STATUS_BY_SLUG, STATUS_SLUGS, Status, statusAt, statusOf } from '@/lib/presentation';
import { AgentId, agentById, questionFromAction } from '@/lib/agents';
import { ActionNow } from '@/components/governance/action-now';
import { AgentAvatar } from '@/components/governance/agent-avatar';
import { AgentsGallery } from '@/components/governance/agents-gallery';
import { AlertList } from '@/components/governance/alert-list';
import { AppSidebar, View } from '@/components/governance/app-sidebar';
import { DashboardSkeleton } from '@/components/governance/dashboard-skeleton';
import { DomainCards } from '@/components/governance/domain-cards';
import { IndicatorDetail } from '@/components/governance/indicator-detail';
import { IndicatorTable } from '@/components/governance/indicator-table';
import { KpiCard } from '@/components/governance/kpi-card';
import { Priorities } from '@/components/governance/priorities';
import { SubscriptionsPanel } from '@/components/governance/subscriptions-panel';
import { FloatingChat, Message } from '@/components/governance/floating-chat';
import { Filter } from '@/components/governance/status-filter';
import { ThemeToggle } from '@/components/theme-toggle';

const TrendChart = dynamic(() => import('@/components/governance/trend-chart').then(m => m.TrendChart), {
  ssr: false,
  loading: () => <div className="surface h-[320px] animate-pulse" aria-hidden />,
});

const VIEW_COPY: Record<View, { eyebrow: string; subtitle: string }> = {
  'Governança': { eyebrow: 'Governança de dados e IA', subtitle: 'Visão integrada de privacidade, proteção, governança e riscos de IA para decisão executiva.' },
  'Privacidade de dados': { eyebrow: 'Domínio', subtitle: DOMAIN_META['Privacidade de dados'].blurb },
  'Proteção de dados': { eyebrow: 'Domínio', subtitle: DOMAIN_META['Proteção de dados'].blurb },
  'Riscos de IA': { eyebrow: 'Domínio', subtitle: DOMAIN_META['Riscos de IA'].blurb },
  'Governança de dados': { eyebrow: 'Domínio', subtitle: DOMAIN_META['Governança de dados'].blurb },
  'Central de alertas': { eyebrow: 'Acompanhamento', subtitle: 'Desvios da meta com contexto, responsável, prazo sugerido e próxima ação.' },
  'Meus acompanhamentos': { eyebrow: 'Notificações', subtitle: 'Assine indicadores e acompanhe o histórico de notificações por e-mail.' },
};

function readUrlState(): { domain: Domain | 'Todos'; status: Filter; q: string; initialView: View } {
  if (typeof window === 'undefined') return { domain: 'Todos', status: 'Todos', q: '', initialView: 'Governança' };
  const params = new URLSearchParams(window.location.search);
  const pathname = window.location.pathname;
  const isAlertasPath = pathname === '/alertas' || pathname.startsWith('/alertas/');
  const domainParam = params.get('domain');
  const statusParam = params.get('status');
  const q = params.get('q') ?? '';
  const domain = domainParam ? (DOMAIN_BY_SLUG[domainParam] as Domain | undefined) : null;
  const status = statusParam ? (STATUS_BY_SLUG[statusParam] as Filter | undefined) : null;
  let initialView: View = isAlertasPath ? 'Central de alertas' : 'Governança';
  let resolvedDomain: Domain | 'Todos' = 'Todos';
  if (domain && status && DOMAINS.includes(domain)) {
    resolvedDomain = domain;
    initialView = 'Central de alertas';
  } else if (domain && DOMAINS.includes(domain)) {
    resolvedDomain = domain;
    initialView = isAlertasPath ? 'Central de alertas' : domain;
  } else if (status) {
    initialView = 'Central de alertas';
  }
  return { domain: resolvedDomain, status: status ?? 'Todos', q, initialView };
}

export default function Page() {
  const [view, setView] = useState<View>(() => readUrlState().initialView);
  const [rows, setRows] = useState<Indicator[]>(demo);
  const [mode, setMode] = useState('demo');
  const [aiReady, setAiReady] = useState(false);
  const [error, setError] = useState('');
  const [chatError, setChatError] = useState('');
  const [filter, setFilter] = useState<Filter>(() => readUrlState().status);
  const [selected, setSelected] = useState<Indicator | null>(null);
  const [chat, setChat] = useState(false);
  const [chatMin, setChatMin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(() => readUrlState().q);
  const [statusLine, setStatusLine] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [agentId, setAgentId] = useState<AgentId>('sinval');
  const [conversationId, setConversationId] = useState('');
  const [preselectedSubscriptions, setPreselectedSubscriptions] = useState<string[]>([]);
  const [alertDomain, setAlertDomain] = useState<Domain | 'Todos'>(() => readUrlState().domain);

  // Sync to URL whenever filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (DOMAINS.includes(view as Domain)) {
      params.set('domain', DOMAIN_SLUGS[view as Domain]);
    } else if (view === 'Central de alertas' && alertDomain !== 'Todos') {
      params.set('domain', DOMAIN_SLUGS[alertDomain as Domain]);
    }
    if (filter !== 'Todos') params.set('status', STATUS_SLUGS[filter as Status]);
    if (query) params.set('q', query);
    const qs = params.toString();
    const basePath = view === 'Central de alertas' ? '/alertas' : '/';
    const url = qs ? `${basePath}?${qs}` : basePath;
    window.history.replaceState({}, '', url);
  }, [view, alertDomain, filter, query]);

  useEffect(() => {
    fetch('/api/indicators')
      .then(r => { if (!r.ok) throw Error(); return r.json(); })
      .then(d => { if (Array.isArray(d.indicators)) setRows(d.indicators); setMode(d.mode === 'llm' ? 'llm' : 'demo'); })
      .catch(() => setError('Não foi possível atualizar a base. Exibindo os dados demonstrativos locais.'))
      .finally(() => setLoading(false));
    fetch('/api/agents')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.agents?.some((a: { status: string }) => a.status === 'disponível')) setAiReady(true); })
      .catch(() => undefined);
  }, []);

  const isDomain = (DOMAINS as readonly string[]).includes(view);
  const activeDomain: Domain | 'Todos' = useMemo(() => (isDomain ? (view as Domain) : view === 'Central de alertas' ? alertDomain : 'Todos'), [isDomain, view, alertDomain]);
  const scope = useMemo(() => (activeDomain === 'Todos' ? rows : rows.filter(i => i.domain === activeDomain)), [rows, activeDomain]);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return scope.filter(i => {
      if (filter !== 'Todos' && statusOf(i) !== filter) return false;
      if (!q) return true;
      return [i.id, i.name, i.owner, i.unitArea, i.domain].join(' ').toLowerCase().includes(q);
    });
  }, [scope, filter, query]);

  const count = (s: 'Na meta' | 'Atenção' | 'Crítico', at?: 'previous') => scope.filter(i => (at ? statusAt(i, i.previous) : statusOf(i)) === s).length;
  const healthy = count('Na meta'), attention = count('Atenção'), critical = count('Crítico');
  const openCount = attention + critical;

  async function ask(q: string) {
    q = questionFromAction(q.trim());
    if (!q || busy) return;
    setChat(true);
    setChatMin(false);
    setChatError('');
    setMessages(m => [...m, { role: 'user', text: q }]);
    setBusy(true);
    setStatusLine(agentById(agentId).statusLine);
    const payload = {
      message: q,
      question: q,
      agent: agentId,
      conversationId,
      domain: activeDomain === 'Todos' ? 'Todos' : activeDomain,
      context: { currentPage: view, selectedIndicator: selected?.id ?? '' },
      stream: true,
    };
    let streamAgent: AgentId = agentId;
    try {
      const r = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' }, body: JSON.stringify(payload) });
      if (!r.ok) {
        const d = await r.json().catch(() => ({ error: 'Não foi possível consultar o assistente.' }));
        throw Error(d.error || 'Não foi possível consultar o assistente.');
      }
      const ctype = r.headers.get('content-type') || '';
      if (ctype.includes('text/event-stream') && r.body) {
        await readChatStream(r.body, {
          onMeta(meta) {
            if (meta.status) setStatusLine(meta.status);
            if (meta.agent?.id) {
              streamAgent = meta.agent.id as AgentId;
              setAgentId(streamAgent);
            }
          },
          onDelta(text) {
            setBusy(false);
            setMessages(m => {
              const last = m[m.length - 1];
              if (last?.role === 'assistant' && last.streaming) return [...m.slice(0, -1), { ...last, text: last.text + text }];
              return [...m, { role: 'assistant', text, agentId: streamAgent, streaming: true }];
            });
          },
          onDone(done) {
            setAiReady(true);
            if (done.conversationId) setConversationId(done.conversationId);
            if (done.agent?.id) setAgentId(done.agent.id as AgentId);
            setMessages(m => {
              const last = m[m.length - 1];
              const streamed = last?.role === 'assistant' && last.streaming ? last.text : '';
              const text = (done.message || streamed).trim();
              if (!text) return last?.role === 'assistant' && last.streaming ? m.slice(0, -1) : m;
              const actions = (done.suggestedActions ?? []).filter(a => questionFromAction(a) !== q);
              const next: Message = { role: 'assistant', text, agentId: (done.agent?.id as AgentId) || streamAgent, actions };
              if (last?.role === 'assistant') return [...m.slice(0, -1), next];
              return [...m, next];
            });
          },
        });
      } else {
        const d = await r.json();
        if (!d.simulated) setAiReady(true);
        if (d.conversationId) setConversationId(d.conversationId);
        const id = (d.agent?.id as AgentId) || agentId;
        setAgentId(id);
        setMessages(m => [...m, { role: 'assistant', text: d.message || d.answer || '', agentId: id, actions: d.suggestedActions }]);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Serviço indisponível.';
      setChatError(msg);
    } finally {
      setBusy(false);
      setStatusLine('');
    }
  }

  type NavigateOptions = { filter?: Filter; domain?: Domain | 'Todos' };
  function navigate(v: View, opts?: Filter | NavigateOptions) {
    const options: NavigateOptions = typeof opts === 'string' ? { filter: opts } : (opts ?? {});
    const f: Filter = options.filter ?? 'Todos';
    let domain: Domain | 'Todos' = 'Todos';
    if ((DOMAINS as readonly string[]).includes(v)) {
      domain = v as Domain;
    } else if (v === 'Central de alertas') {
      domain = options.domain ?? activeDomain;
    }
    setAlertDomain(domain);
    setView(v);
    setFilter(f);
    setQuery('');
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openChat(id: AgentId = 'sinval') {
    setAgentId(id);
    setChat(true);
    setChatMin(false);
  }

  function clearChat() {
    setMessages([]);
    setConversationId('');
    setChatError('');
  }

  function handleSubscribe(i: Indicator) {
    setPreselectedSubscriptions([i.id]);
    navigate('Meus acompanhamentos');
  }

  const copy = VIEW_COPY[view];

  return (
    <SidebarProvider style={{ '--sidebar-width': '260px' } as React.CSSProperties}>
      <AppSidebar view={view} rows={rows} onNavigate={navigate} onOpenSinval={() => openChat('sinval')} />

      <SidebarInset className="min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-n-200 bg-n-0/85 px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-2 text-[13px] text-n-500">
            <SidebarTrigger className="size-9 rounded-lg text-n-700 hover:bg-n-100 md:hidden" aria-label="Abrir navegação" />
            <button type="button" onClick={() => navigate('Governança')} className="hidden rounded-md px-1 py-0.5 font-medium hover:bg-n-100 hover:text-n-900 sm:inline">Governança</button>
            {activeDomain !== 'Todos' && (
              <>
                <ChevronRight size={14} className="hidden sm:inline" aria-hidden />
                <button type="button" onClick={() => navigate(activeDomain as View)} className="hidden rounded-md px-1 py-0.5 font-medium hover:bg-n-100 hover:text-n-900 sm:inline">{activeDomain}</button>
              </>
            )}
            {view !== 'Governança' && view !== activeDomain && (
              <>
                <ChevronRight size={14} className="hidden sm:inline" aria-hidden />
                <strong className="truncate font-semibold text-n-900">{view}</strong>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className={cn('hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 sm:inline-flex', mode === 'demo' ? 'bg-warn-100 text-warn-600 ring-warn-200' : 'bg-ok-100 text-ok-600 ring-ok-200')}>
              <Database size={12} aria-hidden />{mode === 'demo' ? 'Dados fictícios' : 'Base conectada'}
            </span>
            <ThemeToggle />
            <button type="button" aria-label={`Central de alertas, ${openCount} abertos`} onClick={() => navigate('Central de alertas')} className="relative inline-flex size-9 items-center justify-center rounded-lg text-n-700 transition-colors hover:bg-n-100">
              <Bell size={18} aria-hidden />
              {openCount > 0 && <span className="num absolute -top-0.5 -right-0.5 inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-brand-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">{openCount}</span>}
            </button>
            <button type="button" onClick={() => openChat('sinval')} className="ink-gradient inline-flex h-9 items-center gap-2 rounded-lg pl-1 pr-3 text-[13px] font-semibold text-white shadow-[var(--shadow-1)] transition-opacity hover:opacity-95">
              <AgentAvatar id="sinval" size={24} alt="" />
              <span className="hidden sm:inline">Seu Sinval</span>
            </button>
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 pt-6 pb-10 sm:px-6 lg:px-8 lg:pt-8">
          {/* Título */}
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <div className="eyebrow">{copy.eyebrow}</div>
              <h1 className="mt-1 text-[26px] leading-tight font-semibold tracking-tight text-n-900 sm:text-[30px]">
                {view === 'Central de alertas' && activeDomain !== 'Todos' ? `${activeDomain} · ` : ''}
                {view}
                {view === 'Central de alertas' && filter !== 'Todos' ? <span className="ml-2 text-[20px] text-n-500">({filter.toLowerCase()})</span> : null}
              </h1>
              <p className="mt-1.5 max-w-xl text-[13.5px] leading-relaxed text-n-500">{copy.subtitle}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex h-9 items-center gap-2 rounded-lg bg-n-0 px-3 text-[12.5px] font-medium text-n-700 ring-1 ring-n-200">
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

          {loading ? <DashboardSkeleton /> : view === 'Meus acompanhamentos' ? (
            <SubscriptionsPanel rows={rows} onSelect={setSelected} preselectedIds={preselectedSubscriptions} />
          ) : view === 'Central de alertas' ? (
            <>
              {filter === 'Todos' && (
                <div className="grid gap-4 sm:grid-cols-3">
                  <KpiCard label="Críticos" value={critical} unit={critical ? 'ação imediata' : 'nenhum'} context="Desvio acima de 10 p.p. ou incidente" change={critical - count('Crítico', 'previous')} changeGoodWhen="down" tone="crit" icon={CircleAlert} emphasis={critical > 0} cta={critical ? 'Filtrar críticos' : undefined} onCta={() => setFilter('Crítico')} />
                  <KpiCard label="Em atenção" value={attention} unit="acompanhar" context="Até 10 p.p. da meta" change={attention - count('Atenção', 'previous')} changeGoodWhen="down" tone="warn" icon={Activity} cta={attention ? 'Filtrar atenção' : undefined} onCta={() => setFilter('Atenção')} />
                  <KpiCard label="Na meta" value={healthy} unit={`de ${scope.length}`} context="Sem alerta aberto" change={healthy - count('Na meta', 'previous')} tone="ok" icon={ShieldCheck} />
                </div>
              )}
              <AlertList scope={scope} filter={filter} onFilter={setFilter} onSelect={setSelected} onAsk={ask} onResetFilters={() => navigate('Central de alertas', { domain: activeDomain })} />
            </>
          ) : (
            <>
              {/* KPIs */}
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard label="Indicadores monitorados" value={scope.length} unit="indicadores" context={isDomain ? 'Domínio selecionado' : '4 domínios de governança'} icon={LayoutDashboard} />
                <KpiCard label="Dentro da meta" value={healthy} unit={`${Math.round((healthy / (scope.length || 1)) * 100)}%`} context="Controles em patamar esperado" change={healthy - count('Na meta', 'previous')} tone="ok" icon={ShieldCheck} />
                <KpiCard label="Em atenção" value={attention} unit="acompanhar" context="Próximos da meta estabelecida" change={attention - count('Atenção', 'previous')} changeGoodWhen="down" tone="warn" icon={Activity} cta={attention ? 'Ver em atenção' : undefined} onCta={() => navigate('Central de alertas', { filter: 'Atenção', domain: activeDomain })} />
                <KpiCard label="Críticos" value={critical} unit={critical ? 'ação necessária' : 'nenhum'} context="Desvio relevante da meta" change={critical - count('Crítico', 'previous')} changeGoodWhen="down" tone="crit" icon={CircleAlert} emphasis={critical > 0} cta={critical ? 'Ver prioridades' : undefined} onCta={() => navigate('Central de alertas', { filter: 'Crítico', domain: activeDomain })} />
              </div>

              {/* Ação agora + prioridades */}
              <div className="grid gap-4 lg:grid-cols-12">
                <div className="lg:col-span-7"><ActionNow rows={scope} onSelect={setSelected} onSeeAll={() => navigate('Central de alertas', { domain: activeDomain })} /></div>
                <div className="lg:col-span-5"><Priorities rows={scope} onSelect={setSelected} onAsk={ask} /></div>
              </div>

              {/* Panorama por domínio */}
              {!isDomain && (
                <section aria-labelledby="domains-title" className="flex flex-col gap-3">
                  <div className="flex items-end justify-between gap-3 px-0.5">
                    <div>
                      <div className="eyebrow">Panorama</div>
                      <h2 id="domains-title" className="text-[15px] font-semibold tracking-tight text-n-900 sm:text-base">Quatro domínios de governança</h2>
                    </div>
                  </div>
                  <DomainCards rows={rows} onOpen={d => navigate(d)} />
                </section>
              )}

              <TrendChart rows={rows} highlight={activeDomain !== 'Todos' ? activeDomain : undefined} />

              {!isDomain && <AgentsGallery available={aiReady || mode === 'demo'} onTalk={openChat} />}

              <IndicatorTable
                rows={visible}
                scope={scope}
                filter={filter}
                onFilter={setFilter}
                onSelect={setSelected}
                onSubscribe={handleSubscribe}
                title={isDomain ? `Indicadores de ${view}` : 'Panorama dos indicadores'}
                description="Resultado, meta, histórico mensal e situação em um só lugar."
                query={query}
                onQuery={setQuery}
              />
            </>
          )}

          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-n-200 pt-5 text-[11.5px] text-n-500">
            <span>Seu Sinval <span aria-hidden className="mx-1.5">·</span> Governança de dados e IA</span>
            <span className="inline-flex items-center gap-1.5"><Info size={12} aria-hidden />Protótipo conceitual · dados demonstrativos · previsão Holt explicável</span>
          </footer>
        </div>
      </SidebarInset>

      <IndicatorDetail indicator={selected} onClose={() => setSelected(null)} onAsk={ask} onSubscribe={handleSubscribe} />
      <FloatingChat
        open={chat}
        minimized={chatMin}
        onOpen={() => openChat(agentId)}
        onClose={() => { setChat(false); setChatMin(false); }}
        onMinimize={() => setChatMin(true)}
        messages={messages}
        busy={busy}
        statusLine={statusLine}
        error={chatError}
        mode={aiReady ? 'llm' : mode}
        view={activeDomain === 'Todos' ? view : activeDomain}
        rows={scope}
        agentId={agentId}
        onAgentChange={setAgentId}
        onAsk={ask}
        onClear={clearChat}
      />
    </SidebarProvider>
  );
}

type StreamMeta = { status?: string; agent?: { id?: string } };
type StreamDone = { conversationId?: string; agent?: { id?: string }; message?: string; suggestedActions?: string[] };

async function readChatStream(body: ReadableStream<Uint8Array>, handlers: {
  onMeta: (meta: StreamMeta) => void;
  onDelta: (text: string, agent?: AgentId) => void;
  onDone: (done: StreamDone) => void;
}) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let event = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const raw of lines) {
      const line = raw.replace(/\r$/, '');
      if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) {
        const data = line.slice(5).trim();
        try {
          const parsed = JSON.parse(data);
          if (event === 'meta') handlers.onMeta(parsed);
          else if (event === 'delta') handlers.onDelta(parsed.text ?? '', parsed.agent);
          else if (event === 'done') handlers.onDone(parsed);
          else if (event === 'error' && parsed.error) throw new Error(parsed.error);
        } catch (err) {
          if (err instanceof Error && event === 'error') throw err;
        }
        event = '';
      }
    }
  }
}
