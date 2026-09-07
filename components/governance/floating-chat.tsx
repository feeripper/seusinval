'use client';
import { useEffect, useRef, useState } from 'react';
import { Eraser, LoaderCircle, Maximize2, Minus, Send, ShieldAlert, X } from 'lucide-react';
import { Indicator } from '@/lib/indicators';
import { cn } from '@/lib/utils';
import { PERIOD } from '@/lib/presentation';
import { AGENTS, AgentId, DISCLAIMER, agentById, questionsFor } from '@/lib/agents';
import { AgentAvatar, AvailabilityDot } from './agent-avatar';
import type { Message } from './sinval-chat';

export function FloatingChat({
  open,
  minimized,
  onOpen,
  onClose,
  onMinimize,
  messages,
  busy,
  statusLine,
  error,
  mode,
  view,
  rows,
  agentId,
  onAgentChange,
  onAsk,
  onClear,
}: {
  open: boolean;
  minimized: boolean;
  onOpen: () => void;
  onClose: () => void;
  onMinimize: () => void;
  messages: Message[];
  busy: boolean;
  statusLine: string;
  error: string;
  mode: string;
  view: string;
  rows: Indicator[];
  agentId: AgentId;
  onAgentChange: (id: AgentId) => void;
  onAsk: (q: string) => void;
  onClear: () => void;
}) {
  const [input, setInput] = useState('');
  const [tip, setTip] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const agent = agentById(agentId);
  const available = mode === 'llm';
  const questions = questionsFor(agent, view);
  const simulated = !available;

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, busy, open, minimized]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || busy) return;
    onAsk(input);
    setInput('');
  };

  if (!open) {
    return (
      <div className="fixed right-4 bottom-4 z-40 sm:right-6 sm:bottom-6">
        {tip && (
          <div
            role="tooltip"
            className="absolute right-0 bottom-[72px] w-64 rounded-xl border border-n-200 bg-n-0 p-3 text-[12.5px] leading-relaxed text-n-700 shadow-[var(--shadow-3)]"
          >
            {agentById('sinval').greeting}
          </div>
        )}
        <button
          type="button"
          onClick={onOpen}
          onMouseEnter={() => setTip(true)}
          onMouseLeave={() => setTip(false)}
          onFocus={() => setTip(true)}
          onBlur={() => setTip(false)}
          aria-label="Abrir chat do Seu Sinval"
          title={agentById('sinval').greeting}
          className="chat-fab relative inline-flex size-14 items-center justify-center rounded-full bg-ink-900 shadow-[var(--shadow-3)] ring-4 ring-n-0 transition-transform hover:scale-[1.03] focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <AgentAvatar id="sinval" size={56} alt="" />
          <AvailabilityDot available size={12} />
        </button>
      </div>
    );
  }

  if (minimized) {
    return (
      <div className="fixed right-4 bottom-4 z-40 sm:right-6 sm:bottom-6">
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex h-12 items-center gap-2 rounded-full border bg-card py-1 pr-4 pl-1 shadow-[var(--shadow-3)]"
          aria-label={`Restaurar conversa com ${agent.name}`}
        >
          <span className="relative">
            <AgentAvatar agent={agent} size={40} alt="" />
            <AvailabilityDot available />
          </span>
          <span className="text-[13px] font-semibold text-foreground">{agent.name}</span>
          <Maximize2 size={14} className="text-muted-foreground" aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <section
      aria-label={`Chat com ${agent.name}`}
      className="chat-panel fixed inset-x-3 bottom-3 z-40 flex h-[min(640px,calc(100dvh-2rem))] flex-col overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-3)] sm:inset-x-auto sm:right-6 sm:bottom-6 sm:min-h-[620px] sm:h-[min(680px,calc(100dvh-2rem))] sm:w-[min(480px,calc(100vw-2rem))] sm:min-w-[440px]"
    >
      <header className="flex items-center gap-3 px-4 py-3 text-white" style={{ background: agent.accent }}>
        <span className="relative">
          <AgentAvatar agent={agent} size={40} alt="" className="ring-white/20" />
          <AvailabilityDot available />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[14px] font-semibold tracking-tight">{agent.name}</h2>
          <p className="truncate text-[11px] text-white/75">{agent.role}</p>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={onMinimize} aria-label="Minimizar chat" className="inline-flex size-8 items-center justify-center rounded-md text-white/90 hover:bg-white/10">
            <Minus size={16} aria-hidden />
          </button>
          <button type="button" onClick={onClose} aria-label="Fechar chat" className="inline-flex size-8 items-center justify-center rounded-md text-white/90 hover:bg-white/10">
            <X size={16} aria-hidden />
          </button>
        </div>
      </header>

      <div className="flex gap-1 overflow-x-auto border-b border-n-200 bg-n-50 px-2 py-2" role="tablist" aria-label="Escolher assistente">
        {AGENTS.map(a => (
          <button
            key={a.id}
            type="button"
            role="tab"
            aria-selected={agentId === a.id}
            onClick={() => onAgentChange(a.id)}
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-semibold transition-colors',
              agentId === a.id ? 'bg-n-0 text-n-900 shadow-[var(--shadow-1)] ring-1 ring-n-200' : 'text-n-500 hover:bg-n-0 hover:text-n-800',
            )}
          >
            <AgentAvatar agent={a} size={20} alt="" />
            {a.name === 'Seu Sinval' ? 'Sinval' : a.name}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4" aria-live="polite" aria-busy={busy}>
        <div className="mb-3 flex flex-wrap gap-1.5 text-[10.5px]">
          <span className="rounded-full bg-n-100 px-2 py-0.5 font-medium text-n-600">{view === 'Governança' || view === 'Central de alertas' ? 'Todos os domínios' : view}</span>
          <span className="rounded-full bg-n-100 px-2 py-0.5 font-medium text-n-600">{PERIOD.label}</span>
          <span className={cn('rounded-full px-2 py-0.5 font-medium', available ? 'bg-ok-100 text-ok-600' : 'bg-warn-100 text-warn-600')}>
            {available ? 'Motor OpenAI conectado' : 'Simulação local'}
          </span>
        </div>

        {!messages.length && (
          <div className="mb-4">
            <p className="text-[14px] leading-relaxed font-medium text-n-900">{agent.greeting}</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-n-600">{agent.description}</p>
            <div className="eyebrow mt-4 mb-2">Sugestões rápidas</div>
            <ul className="flex flex-col gap-1.5">
              {questions.map(q => (
                <li key={q}>
                  <button type="button" onClick={() => onAsk(q)} disabled={busy} className="w-full rounded-lg border border-n-200 bg-n-50 px-3 py-2 text-left text-[12.5px] font-medium text-n-800 hover:bg-n-100 disabled:opacity-50">
                    {q}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <ol className="flex flex-col gap-3">
          {messages.map((m, idx) => {
            const who = agentById(m.agentId);
            return (
              <li key={idx} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                {m.role === 'user' ? (
                  <p className="max-w-[85%] rounded-2xl rounded-tr-md bg-ink-700 px-3 py-2 text-[13px] leading-relaxed text-white">{m.text}</p>
                ) : (
                  <div className="flex max-w-[96%] gap-2">
                    <AgentAvatar agent={who} size={24} className="mt-1" alt="" />
                    <div className="min-w-0">
                      <div className="mb-0.5 text-[10px] font-semibold tracking-[0.06em] text-n-500 uppercase">{who.name}</div>
                      <div className="rounded-2xl rounded-tl-md border border-n-200 bg-n-50 px-3 py-2">
                        <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-n-800">{m.text}</p>
                        {m.actions && m.actions.length > 0 && idx === messages.length - 1 && !m.streaming && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {m.actions.map(action => (
                              <button key={action} type="button" onClick={() => onAsk(action)} className="rounded-md bg-n-0 px-2 py-1 text-[11px] font-semibold text-n-800 ring-1 ring-n-200 hover:bg-n-100">
                                {action}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
          {busy && (
            <li className="flex gap-2">
              <AgentAvatar agent={agent} size={24} className="mt-1" alt="" />
              <div className="inline-flex items-center gap-2 rounded-2xl rounded-tl-md border border-n-200 bg-n-50 px-3 py-2 text-[12.5px] text-n-600">
                <LoaderCircle className="animate-spin" size={14} aria-hidden />{statusLine || agent.statusLine}
              </div>
            </li>
          )}
        </ol>
        {error && (
          <p role="alert" className="mt-3 flex items-start gap-1.5 rounded-lg bg-crit-100 px-3 py-2 text-[12px] leading-relaxed text-crit-600">
            <ShieldAlert size={13} className="mt-0.5 shrink-0" aria-hidden />{error}
          </p>
        )}
        <div ref={end} />
      </div>

      <form onSubmit={submit} className="border-t border-n-200 bg-n-0 px-3 py-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[10.5px] text-n-500">{rows.length} indicadores no recorte{simulated ? ' · simulação' : ''}</p>
          <button type="button" onClick={onClear} disabled={!messages.length && !error} className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-n-600 hover:bg-n-100 disabled:opacity-40">
            <Eraser size={11} aria-hidden /> Limpar conversa
          </button>
        </div>
        <label className="sr-only" htmlFor="sinval-question">Sua pergunta ao assistente</label>
        <div className="flex items-center gap-2 rounded-xl border border-n-300 bg-n-0 p-1 pl-3 focus-within:border-ink-500 focus-within:ring-2 focus-within:ring-ink-500/20">
          <input
            id="sinval-question"
            maxLength={2000}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={`Pergunte a ${agent.name}`}
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent py-2 text-[13.5px] text-n-900 outline-none placeholder:text-n-400"
          />
          <button type="submit" disabled={busy || !input.trim()} aria-label="Enviar pergunta" className="inline-flex size-9 items-center justify-center rounded-lg bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-40">
            <Send size={15} aria-hidden />
          </button>
        </div>
        <p className="mt-2 text-center text-[10.5px] leading-relaxed text-n-500">{DISCLAIMER}</p>
      </form>
    </section>
  );
}
