'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Database, LoaderCircle, Send, ShieldAlert, UserRound } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Indicator } from '@/lib/indicators';
import { cn } from '@/lib/utils';
import { PERIOD, parseAnswer, suggestedQuestions } from '@/lib/presentation';
import { SinvalMark } from './sinval-mark';
import { StatusBadge } from './status-badge';

export type Message = { role: 'user' | 'assistant'; text: string };

function AssistantMessage({ text }: { text: string }) {
  const parsed = parseAnswer(text);
  if (!parsed) {
    return <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-n-800">{text}</p>;
  }
  return (
    <div className="flex flex-col gap-4">
      <section>
        <div className="eyebrow text-[10px]! text-ink-700">Resumo executivo</div>
        <p className="mt-1 text-[13.5px] leading-relaxed text-n-900">{parsed.summary}</p>
      </section>

      <section>
        <div className="eyebrow text-[10px]! text-ink-700">Evidências e recomendações</div>
        <ul className="mt-2 flex flex-col gap-2.5">
          {parsed.items.map(item => (
            <li key={item.id} className="rounded-xl border border-n-200 bg-white p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="num text-[11px] text-n-500">{item.id}</div>
                  <div className="text-[13.5px] font-semibold text-n-900">{item.name}</div>
                </div>
                <StatusBadge value={item.status} size="sm" />
              </div>
              <div className="num mt-2 flex flex-wrap items-baseline gap-x-2 text-[13px]">
                <span className="text-lg font-semibold text-n-900">{item.value}</span>
                <span className="text-n-500">meta {item.target}</span>
                {item.projection && <span className="rounded bg-ink-50 px-1.5 py-0.5 text-[11px] font-medium text-ink-700 ring-1 ring-ink-200">cenário set: {item.projection}</span>}
              </div>
              <div className="mt-2.5 border-t border-n-100 pt-2.5">
                <div className="eyebrow text-[10px]!">Recomendação</div>
                <p className="mt-0.5 text-[13px] leading-relaxed text-n-800">{item.action}</p>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-n-500">
                <span className="inline-flex items-center gap-1"><Database size={11} aria-hidden />{item.source}</span>
                <span className="inline-flex items-center gap-1"><UserRound size={11} aria-hidden />{item.owner}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {parsed.method && (
        <section>
          <div className="eyebrow text-[10px]! text-ink-700">Método</div>
          <p className="mt-1 text-[12.5px] leading-relaxed text-n-600">{parsed.method}</p>
        </section>
      )}

      {parsed.disclaimer && (
        <p className="flex items-start gap-1.5 rounded-lg bg-n-100 px-3 py-2 text-[11.5px] leading-relaxed text-n-600">
          <ShieldAlert size={13} className="mt-0.5 shrink-0" aria-hidden />{parsed.disclaimer}
        </p>
      )}
    </div>
  );
}

export function SinvalChat({
  open,
  onOpenChange,
  messages,
  busy,
  mode,
  view,
  rows,
  onAsk,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  messages: Message[];
  busy: boolean;
  mode: string;
  view: string;
  rows: Indicator[];
  onAsk: (q: string) => void;
}) {
  const [input, setInput] = useState('');
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages, busy]);

  const submit = (e: React.FormEvent) => { e.preventDefault(); if (!input.trim() || busy) return; onAsk(input); setInput(''); };
  const questions = suggestedQuestions(view, rows);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 border-l-0 bg-n-50 p-0 sm:max-w-[560px] [&>button]:top-5 [&>button]:right-5 [&>button]:size-8 [&>button]:rounded-md [&>button]:text-white [&>button]:opacity-100 [&>button]:hover:bg-white/10 [&>button]:inline-flex [&>button]:items-center [&>button]:justify-center">
        <SheetHeader className="ink-gradient gap-0 px-6 pt-6 pb-5 pr-16 text-white">
          <div className="flex items-center gap-3">
            <SinvalMark size={44} inverted />
            <div>
              <SheetTitle className="text-[19px] leading-tight font-semibold tracking-tight text-white">Seu Sinval</SheetTitle>
              <SheetDescription className="mt-0.5 text-[12.5px] text-white/65">Assistente de governança de dados e IA</SheetDescription>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px]">
            <span className="rounded-full bg-white/10 px-2.5 py-1 font-medium text-white/85 ring-1 ring-white/15">{view === 'Visão geral' || view === 'Central de alertas' ? 'Todos os domínios' : view}</span>
            <span className="rounded-full bg-white/10 px-2.5 py-1 font-medium text-white/85 ring-1 ring-white/15">{PERIOD.label}</span>
            <span className={cn('rounded-full px-2.5 py-1 font-medium ring-1', mode === 'demo' ? 'bg-brand-500/20 text-brand-100 ring-brand-500/40' : 'bg-ok-100/20 text-ok-100 ring-ok-200/40')}>{mode === 'demo' ? 'Modo demonstração' : 'Base conectada'}</span>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6" aria-live="polite" aria-busy={busy}>
          {!messages.length && (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="text-[20px] leading-tight font-semibold tracking-tight text-n-900">Olá. Vamos olhar além dos números?</h2>
                <p className="mt-2 text-[13.5px] leading-relaxed text-n-600">Explico desvios, tendências, fonte, responsável e ação recomendada de cada indicador — com linguagem clara e foco em decisão.</p>
              </div>
              <div>
                <div className="eyebrow mb-2">Sugestões para este contexto</div>
                <ul className="flex flex-col gap-2">
                  {questions.map(q => (
                    <li key={q}>
                      <button type="button" onClick={() => onAsk(q)} className="surface surface-hover flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-[13.5px] font-medium text-n-800">
                        {q}<ArrowUpRight size={16} className="shrink-0 text-ink-600" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <p className="text-[11.5px] leading-relaxed text-n-500">
                {mode === 'demo' ? 'No modo demonstração, a análise é baseada em regras sobre dados fictícios; nenhum modelo de IA está conectado.' : 'Confira as fontes indicadas antes de tomar decisões.'}
              </p>
            </div>
          )}

          <ol className="flex flex-col gap-4">
            {messages.map((m, idx) => (
              <li key={idx} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                {m.role === 'user' ? (
                  <div className="max-w-[85%]">
                    <div className="mb-1 text-right text-[10.5px] font-semibold tracking-[0.06em] text-n-500 uppercase">Você</div>
                    <p className="rounded-2xl rounded-tr-md bg-ink-700 px-4 py-2.5 text-[13.5px] leading-relaxed text-white">{m.text}</p>
                  </div>
                ) : (
                  <div className="flex w-full max-w-[96%] gap-2.5">
                    <SinvalMark size={28} className="mt-5" />
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 text-[10.5px] font-semibold tracking-[0.06em] text-ink-700 uppercase">Seu Sinval</div>
                      <div className="surface rounded-2xl rounded-tl-md p-4">
                        <AssistantMessage text={m.text} />
                      </div>
                    </div>
                  </div>
                )}
              </li>
            ))}
            {busy && (
              <li className="flex gap-2.5">
                <SinvalMark size={28} className="mt-5" />
                <div>
                  <div className="mb-1 text-[10.5px] font-semibold tracking-[0.06em] text-ink-700 uppercase">Seu Sinval</div>
                  <div className="surface inline-flex items-center gap-2 rounded-2xl rounded-tl-md px-4 py-3 text-[13px] text-n-600">
                    <LoaderCircle className="animate-spin text-ink-600" size={16} aria-hidden />Analisando os indicadores…
                  </div>
                </div>
              </li>
            )}
          </ol>
          <div ref={end} />
        </div>

        <form onSubmit={submit} className="border-t border-n-200 bg-white px-5 py-4 sm:px-6">
          <label className="sr-only" htmlFor="sinval-question">Sua pergunta ao Seu Sinval</label>
          <div className="flex items-center gap-2 rounded-xl border border-n-300 bg-white p-1.5 pl-4 transition-shadow focus-within:border-ink-500 focus-within:ring-2 focus-within:ring-ink-500/20">
            <input
              id="sinval-question"
              maxLength={2000}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="O que você quer analisar?"
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent text-[14px] text-n-900 outline-none placeholder:text-n-400"
            />
            <button type="submit" disabled={busy || !input.trim()} aria-label="Enviar pergunta" className="inline-flex size-9 items-center justify-center rounded-lg bg-brand-500 text-white transition-colors hover:bg-brand-600 disabled:opacity-40">
              <Send size={16} aria-hidden />
            </button>
          </div>
          <p className="mt-2.5 text-center text-[11px] text-n-500">
            {mode === 'demo' ? 'Demonstração por regras sobre dados fictícios. Modelo de IA ainda não conectado.' : 'Confira as fontes antes de tomar decisões.'}
          </p>
        </form>
      </SheetContent>
    </Sheet>
  );
}
