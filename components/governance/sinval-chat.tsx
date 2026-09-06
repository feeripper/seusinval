'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Eraser, LoaderCircle, Send, ShieldAlert } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Indicator } from '@/lib/indicators';
import { cn } from '@/lib/utils';
import { PERIOD } from '@/lib/presentation';
import { AGENTS, AgentId, DISCLAIMER, agentById, questionsFor } from '@/lib/agents';
import { AgentMark } from './agent-mark';

export type Message = { role: 'user' | 'assistant'; text: string; agentId?: AgentId; actions?: string[]; streaming?: boolean };

export function SinvalChat({
  open,
  onOpenChange,
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
  onOpenChange: (o: boolean) => void;
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
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages, busy]);

  const agent = agentById(agentId);
  const submit = (e: React.FormEvent) => { e.preventDefault(); if (!input.trim() || busy) return; onAsk(input); setInput(''); };
  const questions = questionsFor(agent, view);
  const available = mode === 'llm';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 border-l-0 bg-n-50 p-0 sm:max-w-[560px] [&>button]:top-5 [&>button]:right-5 [&>button]:size-8 [&>button]:rounded-md [&>button]:text-white [&>button]:opacity-100 [&>button]:hover:bg-white/10 [&>button]:inline-flex [&>button]:items-center [&>button]:justify-center">
        <SheetHeader className="ink-gradient gap-0 px-6 pt-6 pb-4 pr-16 text-white">
          <div className="flex items-center gap-3">
            <AgentMark id={agent.id} letter={agent.mark} size={44} inverted />
            <div>
              <SheetTitle className="text-[19px] leading-tight font-semibold tracking-tight text-white">{agent.name}</SheetTitle>
              <SheetDescription className="mt-0.5 text-[12.5px] text-white/65">{agent.role}</SheetDescription>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px]">
            <span className="rounded-full bg-white/10 px-2.5 py-1 font-medium text-white/85 ring-1 ring-white/15">{view === 'Visão geral' || view === 'Governança' || view === 'Central de alertas' ? 'Todos os domínios' : view}</span>
            <span className="rounded-full bg-white/10 px-2.5 py-1 font-medium text-white/85 ring-1 ring-white/15">{PERIOD.label}</span>
            <span className={cn('rounded-full px-2.5 py-1 font-medium ring-1', available ? 'bg-ok-100/20 text-ok-100 ring-ok-200/40' : 'bg-brand-500/20 text-brand-100 ring-brand-500/40')}>{available ? 'Motor OpenAI conectado' : 'IA indisponível'}</span>
          </div>
        </SheetHeader>

        <div className="border-b border-n-200 bg-white px-4 py-3" role="tablist" aria-label="Escolher assistente">
          <div className="grid grid-cols-2 gap-2">
            {AGENTS.map(a => (
              <button
                key={a.id}
                type="button"
                role="tab"
                aria-selected={agentId === a.id}
                onClick={() => onAgentChange(a.id)}
                className={cn(
                  'flex items-start gap-2 rounded-xl border px-2.5 py-2 text-left transition-colors',
                  agentId === a.id ? 'border-ink-200 bg-ink-50' : 'border-n-200 bg-white hover:bg-n-50',
                )}
              >
                <AgentMark id={a.id} letter={a.mark} size={28} />
                <span className="min-w-0">
                  <span className="block truncate text-[12.5px] font-semibold text-n-900">{a.name}</span>
                  <span className="block truncate text-[10.5px] text-n-500">{a.role}</span>
                  <span className={cn('mt-0.5 inline-flex items-center gap-1 text-[10px] font-semibold', available ? 'text-ok-600' : 'text-n-500')}>
                    <i className={cn('size-1.5 rounded-full', available ? 'bg-ok-600' : 'bg-n-400')} aria-hidden />
                    {available ? 'Disponível' : 'Indisponível'}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6" aria-live="polite" aria-busy={busy}>
          {!messages.length && (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="text-[20px] leading-tight font-semibold tracking-tight text-n-900">Olá. Sou {agent.name}.</h2>
                <p className="mt-2 text-[13.5px] leading-relaxed text-n-600">{agent.specialty}. Posso usar o contexto desta tela e os indicadores demonstrativos para orientar a decisão.</p>
              </div>
              <div>
                <div className="eyebrow mb-2">Sugestões para {agent.name}</div>
                <ul className="flex flex-col gap-2">
                  {questions.map(q => (
                    <li key={q}>
                      <button type="button" onClick={() => onAsk(q)} disabled={busy} className="surface surface-hover flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-[13.5px] font-medium text-n-800 disabled:opacity-50">
                        {q}<ArrowUpRight size={16} className="shrink-0 text-ink-600" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <ol className="flex flex-col gap-4">
            {messages.map((m, idx) => {
              const who = agentById(m.agentId);
              return (
                <li key={idx} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                  {m.role === 'user' ? (
                    <div className="max-w-[85%]">
                      <div className="mb-1 text-right text-[10.5px] font-semibold tracking-[0.06em] text-n-500 uppercase">Você</div>
                      <p className="rounded-2xl rounded-tr-md bg-ink-700 px-4 py-2.5 text-[13.5px] leading-relaxed text-white">{m.text}</p>
                    </div>
                  ) : (
                    <div className="flex w-full max-w-[96%] gap-2.5">
                      <AgentMark id={who.id} letter={who.mark} size={28} className="mt-5" />
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-baseline gap-2">
                          <span className="text-[10.5px] font-semibold tracking-[0.06em] text-ink-700 uppercase">{who.name}</span>
                          <span className="text-[10.5px] text-n-500">{who.role}</span>
                        </div>
                        <div className="surface rounded-2xl rounded-tl-md p-4">
                          <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-n-800">{m.text}</p>
                          {m.actions && m.actions.length > 0 && idx === messages.length - 1 && !m.streaming && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {m.actions.map(action => (
                                <button key={action} type="button" onClick={() => onAsk(action)} className="rounded-md bg-white px-2.5 py-1.5 text-[11.5px] font-semibold text-n-800 ring-1 ring-n-200 hover:bg-n-50">
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
              <li className="flex gap-2.5">
                <AgentMark id={agent.id} letter={agent.mark} size={28} className="mt-5" />
                <div>
                  <div className="mb-1 text-[10.5px] font-semibold tracking-[0.06em] text-ink-700 uppercase">{agent.name}</div>
                  <div className="surface inline-flex items-center gap-2 rounded-2xl rounded-tl-md px-4 py-3 text-[13px] text-n-600">
                    <LoaderCircle className="animate-spin text-ink-600" size={16} aria-hidden />{statusLine || agent.statusLine}
                  </div>
                </div>
              </li>
            )}
          </ol>
          {error && (
            <p role="alert" className="mt-4 flex items-start gap-1.5 rounded-lg bg-crit-100 px-3 py-2 text-[12.5px] leading-relaxed text-crit-600">
              <ShieldAlert size={13} className="mt-0.5 shrink-0" aria-hidden />{error}
            </p>
          )}
          <div ref={end} />
        </div>

        <form onSubmit={submit} className="border-t border-n-200 bg-white px-5 py-4 sm:px-6">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] text-n-500">{rows.length} indicadores no recorte</p>
            <button type="button" onClick={onClear} disabled={!messages.length && !error} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11.5px] font-semibold text-n-600 hover:bg-n-100 disabled:opacity-40">
              <Eraser size={12} aria-hidden /> Limpar conversa
            </button>
          </div>
          <label className="sr-only" htmlFor="sinval-question">Sua pergunta ao assistente</label>
          <div className="flex items-center gap-2 rounded-xl border border-n-300 bg-white p-1.5 pl-4 transition-shadow focus-within:border-ink-500 focus-within:ring-2 focus-within:ring-ink-500/20">
            <input
              id="sinval-question"
              maxLength={2000}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={`Pergunte a ${agent.name}`}
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent text-[14px] text-n-900 outline-none placeholder:text-n-400"
            />
            <button type="submit" disabled={busy || !input.trim()} aria-label="Enviar pergunta" className="inline-flex size-9 items-center justify-center rounded-lg bg-brand-500 text-white transition-colors hover:bg-brand-600 disabled:opacity-40">
              <Send size={16} aria-hidden />
            </button>
          </div>
          <p className="mt-2.5 text-center text-[11px] leading-relaxed text-n-500">{DISCLAIMER}</p>
        </form>
      </SheetContent>
    </Sheet>
  );
}
