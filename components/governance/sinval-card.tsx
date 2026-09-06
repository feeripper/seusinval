'use client';
import { ArrowUpRight, MessageSquareText } from 'lucide-react';
import { Indicator } from '@/lib/indicators';
import { openItems, statusOf, suggestedQuestions } from '@/lib/presentation';
import { SinvalMark } from './sinval-mark';

export function SinvalCard({ rows, view, mode, onAsk, onOpen }: { rows: Indicator[]; view: string; mode: string; onAsk: (q: string) => void; onOpen: () => void }) {
  const open = openItems(rows);
  const critical = open.filter(i => statusOf(i) === 'Crítico');
  const questions = suggestedQuestions(view, rows).slice(0, 3);
  return (
    <section aria-labelledby="sinval-card-title" className="ink-gradient relative flex flex-col overflow-hidden rounded-2xl p-6 text-white shadow-[var(--shadow-3)]">
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-white/5" />
      <div aria-hidden className="pointer-events-none absolute -bottom-20 -left-10 size-48 rounded-full bg-brand-500/15" />

      <div className="relative flex items-center gap-3">
        <SinvalMark size={40} inverted />
        <div>
          <div className="text-[11px] font-semibold tracking-[0.08em] text-white/60 uppercase">Assistente de governança</div>
          <h2 id="sinval-card-title" className="text-lg font-semibold tracking-tight">Seu Sinval</h2>
        </div>
      </div>

      <div className="relative mt-5 rounded-xl bg-white/8 p-4 ring-1 ring-white/10">
        <div className="text-[11px] font-semibold tracking-[0.08em] text-white/60 uppercase">O que merece seu olhar</div>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/90">
          {critical.length ? (
            <><strong className="font-semibold text-white">{critical.length} {critical.length === 1 ? 'indicador crítico' : 'indicadores críticos'}</strong> neste recorte. {critical[0].name} pede atenção prioritária.</>
          ) : open.length ? (
            <><strong className="font-semibold text-white">{open.length} em atenção</strong>. {open[0].name} está próximo da meta.</>
          ) : (
            'Os indicadores estão dentro das metas. Vamos observar as tendências?'
          )}
        </p>
      </div>

      <ul className="relative mt-4 flex flex-col gap-2" aria-label="Perguntas sugeridas">
        {questions.map(q => (
          <li key={q}>
            <button type="button" onClick={() => onAsk(q)} className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] text-white/85 ring-1 ring-white/12 transition-colors hover:bg-white/10 hover:text-white">
              {q}
              <ArrowUpRight size={15} className="shrink-0 opacity-70" aria-hidden />
            </button>
          </li>
        ))}
      </ul>

      <button type="button" onClick={onOpen} className="relative mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-500 text-sm font-semibold text-white shadow-[0_6px_16px_-6px_rgba(236,112,0,0.7)] transition-colors hover:bg-brand-600">
        <MessageSquareText size={16} aria-hidden /> Abrir conversa
      </button>
      <p className="relative mt-3 text-center text-[11px] text-white/55">
        {mode === 'llm' ? 'Respostas do motor OpenAI, com validação humana obrigatória' : 'Conecte o backend Go com OPENAI_API_KEY para ativar o assistente'}
      </p>
    </section>
  );
}
