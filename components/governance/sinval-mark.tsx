import { cn } from '@/lib/utils';

/** Marca do assistente: monograma sóbrio em azul profundo com ponto laranja de "sinal". */
export function SinvalMark({ size = 36, className, inverted = false }: { size?: number; className?: string; inverted?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center rounded-[28%] font-semibold tracking-tight',
        inverted ? 'bg-white/12 text-white ring-1 ring-white/20' : 'ink-gradient text-white shadow-[var(--shadow-2)]',
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.5 }}
    >
      S
      <span
        className="absolute rounded-full bg-brand-500 ring-2 ring-white"
        style={{ width: size * 0.26, height: size * 0.26, right: -size * 0.06, bottom: -size * 0.06 }}
      />
    </span>
  );
}
