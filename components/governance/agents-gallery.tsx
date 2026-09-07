'use client';
import { MessageSquareText } from 'lucide-react';
import { AGENTS, AgentId } from '@/lib/agents';
import { AgentAvatar, AvailabilityDot } from './agent-avatar';

export function AgentsGallery({
  available,
  onTalk,
}: {
  available: boolean;
  onTalk: (id: AgentId) => void;
}) {
  return (
    <section aria-labelledby="agents-title" className="flex flex-col gap-3">
      <div className="px-0.5">
        <div className="eyebrow">Equipe</div>
        <h2 id="agents-title" className="text-[15px] font-semibold tracking-tight text-n-900 sm:text-base">Agentes especialistas</h2>
        <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-n-500">Um único chat, quatro especialidades. Escolha com quem conversar; o Seu Sinval encaminha quando o tema for transversal.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {AGENTS.map(agent => (
          <article
            key={agent.id}
            className="surface surface-hover group flex flex-col gap-4 p-5"
            style={{ borderTop: `3px solid ${agent.accent}` }}
          >
            <div className="flex items-start gap-3">
              <span className="relative">
                <AgentAvatar agent={agent} size={56} alt="" />
                <AvailabilityDot available={available} />
              </span>
              <div className="min-w-0">
                <h3 className="text-[15px] font-semibold tracking-tight text-n-900">{agent.name}</h3>
                <p className="text-[12px] font-medium" style={{ color: agent.accent }}>{agent.role}</p>
                <p className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-semibold text-ok-600">
                  <i className="size-1.5 rounded-full bg-ok-600" aria-hidden />
                  Disponível
                </p>
              </div>
            </div>
            <p className="min-h-12 text-[13px] leading-relaxed text-n-600">{agent.description}</p>
            <button
              type="button"
              onClick={() => onTalk(agent.id)}
              className="mt-auto inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg px-3 text-[13px] font-semibold text-white transition-opacity hover:opacity-95 focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ background: agent.accent }}
            >
              <MessageSquareText size={15} aria-hidden /> Conversar com agente
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
