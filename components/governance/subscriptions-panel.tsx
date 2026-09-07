'use client';
import { useEffect, useMemo, useState } from 'react';
import { Bell, BellOff, Check, Clock, History, Inbox, Mail, Play, Search, Trash2 } from 'lucide-react';
import { Indicator } from '@/lib/indicators';
import { cn } from '@/lib/utils';
import { DOMAINS, Domain, DOMAIN_META } from '@/lib/presentation';
import { EVENT_OPTIONS, FREQUENCY_OPTIONS, frequencyLabel, eventLabel, NotificationLog, Subscription } from '@/lib/subscriptions';
import { Panel, PanelHeader } from './panel';

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-brand-500',
        checked ? 'bg-brand-500' : 'bg-n-300',
      )}
      aria-label={label}
    >
      <span className={cn('inline-block size-3.5 rounded-full bg-white transition-transform', checked ? 'translate-x-[18px]' : 'translate-x-1')} />
    </button>
  );
}

export function SubscriptionsPanel({ rows, onSelect, preselectedIds = [] }: { rows: Indicator[]; onSelect: (i: Indicator) => void; preselectedIds?: string[] }) {
  const [q, setQ] = useState('');
  const [domain, setDomain] = useState<'Todos' | Domain>('Todos');
  const [email, setEmail] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>(preselectedIds);
  useEffect(() => setSelectedIds(preselectedIds), [preselectedIds]);
  const [events, setEvents] = useState<string[]>(['data_update']);
  const [frequency, setFrequency] = useState<string>('immediate');
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [history, setHistory] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const filtered = useMemo(() => {
    const qn = q.trim().toLowerCase();
    return rows.filter(i => {
      const matchesQ = !qn || [i.id, i.name, i.owner, i.unitArea].join(' ').toLowerCase().includes(qn);
      const matchesD = domain === 'Todos' || i.domain === domain;
      return matchesQ && matchesD;
    });
  }, [rows, q, domain]);

  const fetchSubs = () => {
    setLoading(true);
    fetch('/api/subscriptions')
      .then(r => r.ok ? r.json() : { subscriptions: [] })
      .then(d => setSubs(d.subscriptions || []))
      .finally(() => setLoading(false));
    fetch('/api/subscriptions?history=true')
      .then(r => r.ok ? r.json() : { notifications: [] })
      .then(d => setHistory(d.notifications || []));
  };

  useEffect(() => { fetchSubs(); }, []);

  const toggle = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    const all = filtered.map(i => i.id);
    setSelectedIds(prev => all.every(id => prev.includes(id)) ? prev.filter(id => !all.includes(id)) : Array.from(new Set([...prev, ...all])));
  };

  const toggleEvent = (value: string) => {
    setEvents(prev => prev.includes(value) ? prev.filter(e => e !== value) : [...prev, value]);
  };

  async function save() {
    if (!email.trim() || selectedIds.length === 0) {
      setMsg('Informe um e-mail e selecione pelo menos um indicador.');
      return;
    }
    setLoading(true);
    setMsg('');
    for (const id of selectedIds) {
      const ind = rows.find(i => i.id === id)!;
      await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ indicatorId: id, indicatorName: ind.name, email, events, frequency }),
      });
    }
    setSelectedIds([]);
    setMsg('Assinaturas salvas. Notificações em modo demonstrativo.')
    fetchSubs();
  }

  async function action(subId: string, action: 'pause' | 'resume' | 'delete') {
    await fetch('/api/subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: subId, action }),
    });
    fetchSubs();
  }

  async function simulate() {
    const sub = subs[0];
    if (!sub) { setMsg('Crie uma assinatura antes de simular.'); return; }
    const ind = rows.find(i => i.id === sub.indicatorId) || rows[0];
    setLoading(true);
    const r = await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ indicatorId: ind.id, indicatorName: ind.name, eventType: 'data_update', newValue: String(ind.value) }),
    });
    const data = await r.json();
    setMsg(data.notified ? 'Notificação simulada enviada.' : 'Nenhuma assinatura ativa para o evento simulado.');
    fetchSubs();
    setLoading(false);
  }

  const allSelected = filtered.length > 0 && filtered.every(i => selectedIds.includes(i.id));

  return (
    <div className="flex flex-col gap-6">
      <Panel aria-labelledby="subs-title">
        <PanelHeader
          eyebrow="Meus acompanhamentos"
          title={<span id="subs-title">Assinar indicadores por e-mail</span>}
          description="Escolha indicadores, eventos e frequência. No modo demonstrativo, o envio real depende do backend Go configurado."
        />
        <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-[13px] font-semibold text-foreground">E-mail de destino</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@empresa.com" className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" />
            </div>
            <div>
              <label className="text-[13px] font-semibold text-foreground">Eventos desejados</label>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {EVENT_OPTIONS.map(e => (
                  <label key={e.value} className="flex cursor-pointer items-center gap-2 rounded-lg border border-input bg-card p-2.5 text-sm text-foreground hover:bg-muted">
                    <input type="checkbox" checked={events.includes(e.value)} onChange={() => toggleEvent(e.value)} className="size-4 accent-brand-600" />
                    {e.label}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[13px] font-semibold text-foreground">Frequência</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {FREQUENCY_OPTIONS.map(f => (
                  <button key={f.value} type="button" onClick={() => setFrequency(f.value)} className={cn('rounded-full px-3 py-1.5 text-xs font-semibold ring-1', frequency === f.value ? 'bg-brand-500 text-white ring-brand-500' : 'bg-card text-foreground ring-input hover:bg-muted')}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1">
                <Search size={14} className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar indicador" className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-2 text-sm text-foreground outline-none placeholder:text-muted-foreground" />
              </div>
              <select value={domain} onChange={e => setDomain(e.target.value as Domain | 'Todos')} className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground">
                <option value="Todos">Todos os domínios</option>
                {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2 text-sm text-foreground">
              <input type="checkbox" checked={allSelected} onChange={toggleAll} className="size-4 accent-brand-600" />
              Selecionar todos visíveis ({filtered.length})
            </div>
            <div className="surface h-[260px] overflow-y-auto p-2">
              {filtered.map(i => (
                <label key={i.id} className="flex cursor-pointer items-start gap-3 rounded-lg p-2 hover:bg-muted">
                  <input type="checkbox" checked={selectedIds.includes(i.id)} onChange={() => toggle(i.id)} className="mt-1 size-4 accent-brand-600" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-foreground">{i.name}</div>
                    <div className="text-xs text-muted-foreground"><span className="num">{i.id}</span> · {DOMAIN_META[i.domain as Domain].short}</div>
                  </div>
                  <button type="button" onClick={() => onSelect(i)} className="text-xs ui-info hover:underline">Ver</button>
                </label>
              ))}
              {filtered.length === 0 && <p className="p-4 text-center text-sm text-muted-foreground">Nenhum indicador encontrado.</p>}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <button type="button" onClick={save} disabled={loading} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-foreground px-4 text-sm font-semibold text-background hover:opacity-90 disabled:opacity-50">
                <Mail size={16} aria-hidden /> Salvar assinaturas
              </button>
              <button type="button" onClick={simulate} disabled={loading} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-input bg-card px-4 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-50">
                <Play size={14} aria-hidden /> Simular notificação
              </button>
            </div>
            {msg && <p className="rounded-lg bg-warn-100 px-3 py-2 text-xs text-warn-600">{msg}</p>}
          </div>
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel aria-labelledby="active-title">
          <PanelHeader eyebrow="Ativas" title={<span id="active-title">Assinaturas ativas</span>} description="Pause, exclua ou visualize detalhes." />
          <div className="p-5 sm:p-6">
            {subs.length ? (
              <ul className="flex flex-col divide-y divide-border">
                {subs.map(s => (
                  <li key={s.id} className="flex items-start justify-between gap-3 py-3 first:pt-0">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground">{s.indicatorName || s.indicatorId}</div>
                      <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1"><Mail size={11} aria-hidden />{s.email}</span>
                        <span className="inline-flex items-center gap-1"><Clock size={11} aria-hidden />{frequencyLabel(s.frequency)}</span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {s.events.map(e => <span key={e} className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-foreground">{eventLabel(e)}</span>)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Switch checked={!s.paused && s.active} onChange={v => action(s.id, v ? 'resume' : 'pause')} label={s.paused ? 'Retomar' : 'Pausar'} />
                      <button type="button" onClick={() => action(s.id, 'delete')} className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-crit-600" aria-label="Excluir assinatura"><Trash2 size={14} /></button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <Inbox size={28} className="text-muted-foreground" aria-hidden />
                <p className="text-sm font-semibold text-foreground">Nenhuma assinatura ativa</p>
                <p className="max-w-xs text-xs text-muted-foreground">Crie uma assinatura acima para começar a receber atualizações.</p>
              </div>
            )}
          </div>
        </Panel>

        <Panel aria-labelledby="hist-title">
          <PanelHeader eyebrow="Histórico" title={<span id="hist-title">Notificações enviadas</span>} description="Registro de auditoria de envios (simulados ou reais)." />
          <div className="h-[320px] overflow-y-auto p-5 sm:p-6">
            {history.length ? (
              <ul className="flex flex-col gap-3">
                {history.map(h => (
                  <li key={h.id} className="flex items-start gap-3 rounded-lg border border-input bg-card p-3">
                    <span className={cn('inline-flex size-8 shrink-0 items-center justify-center rounded-full', h.status === 'enviado' ? 'bg-ok-100 text-ok-600' : 'bg-warn-100 text-warn-600')}>
                      {h.status === 'enviado' ? <Check size={14} /> : <Bell size={14} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-foreground">{h.subject}</div>
                      <div className="text-xs text-muted-foreground"><History size={11} className="mr-1 inline" aria-hidden />{new Date(h.sentAt).toLocaleString('pt-BR')}</div>
                      {h.simulated && <span className="mt-1 inline-block rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground">simulado</span>}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                <BellOff size={28} className="text-muted-foreground" aria-hidden />
                <p className="text-sm font-semibold text-foreground">Nenhuma notificação ainda</p>
                <p className="max-w-xs text-xs text-muted-foreground">Assim que houver uma atualização relevante, o histórico aparecerá aqui.</p>
              </div>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
