import { CircleAlert, CircleCheck, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { STATUS_META, Status, Tone } from '@/lib/presentation';

const ICONS = { ok: CircleCheck, warn: TriangleAlert, crit: CircleAlert } as const;

const TONE_CLASS: Record<Tone, string> = {
  ok: 'bg-ok-100 text-ok-600 ring-ok-200',
  warn: 'bg-warn-100 text-warn-600 ring-warn-200',
  crit: 'bg-crit-100 text-crit-600 ring-crit-200',
};

const DOT_CLASS: Record<Tone, string> = {
  ok: 'bg-ok-600',
  warn: 'bg-warn-600',
  crit: 'bg-crit-600',
};

export function StatusBadge({ value, size = 'md', className }: { value: Status; size?: 'sm' | 'md'; className?: string }) {
  const tone = STATUS_META[value].tone;
  const Icon = ICONS[tone];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-medium ring-1 ring-inset',
        size === 'sm' ? 'h-6 px-2 text-[11px]' : 'h-7 px-2.5 text-xs',
        TONE_CLASS[tone],
        className,
      )}
      title={STATUS_META[value].hint}
    >
      <Icon size={size === 'sm' ? 12 : 14} aria-hidden />
      {value}
    </span>
  );
}

export function StatusDot({ tone, className }: { tone: Tone; className?: string }) {
  return <span aria-hidden className={cn('inline-block size-2 rounded-full', DOT_CLASS[tone], className)} />;
}

export function toneTextClass(tone: Tone) {
  return tone === 'ok' ? 'text-ok-600' : tone === 'warn' ? 'text-warn-600' : 'text-crit-600';
}
