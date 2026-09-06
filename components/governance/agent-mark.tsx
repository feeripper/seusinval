import { cn } from '@/lib/utils';
import { AgentId } from '@/lib/agents';

const TONE: Record<AgentId, string> = {
  sinval: 'ink-gradient text-white shadow-[var(--shadow-2)]',
  aurora: 'bg-[#6f4fb3] text-white',
  octave: 'bg-ink-700 text-white',
  sherlock: 'bg-brand-500 text-white',
};

export function AgentMark({ id, letter, size = 36, inverted = false, className }: { id: AgentId; letter: string; size?: number; inverted?: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center rounded-[28%] font-semibold tracking-tight',
        inverted ? 'bg-white/12 text-white ring-1 ring-white/20' : TONE[id],
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {letter}
      {id === 'sinval' && (
        <span className="absolute rounded-full bg-brand-500 ring-2 ring-white" style={{ width: size * 0.26, height: size * 0.26, right: -size * 0.06, bottom: -size * 0.06 }} />
      )}
    </span>
  );
}
