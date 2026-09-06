import * as React from 'react';
import { ArrowRight, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PERIOD, Tone } from '@/lib/presentation';

const TONE_TEXT: Record<Tone | 'neutral', string> = {
  ok: 'text-ok-600',
  warn: 'text-warn-600',
  crit: 'text-crit-600',
  neutral: 'text-n-500',
};

const TONE_ICON_BG: Record<Tone | 'neutral', string> = {
  ok: 'bg-ok-100 text-ok-600',
  warn: 'bg-warn-100 text-warn-600',
  crit: 'bg-crit-100 text-crit-600',
  neutral: 'bg-n-100 text-n-600',
};

export function KpiCard({
  label,
  value,
  unit,
  context,
  change,
  changeGoodWhen = 'up',
  tone = 'neutral',
  icon: Icon,
  cta,
  onCta,
  emphasis = false,
}: {
  label: string;
  value: number;
  unit?: string;
  context: string;
  change?: number;
  changeGoodWhen?: 'up' | 'down';
  tone?: Tone | 'neutral';
  icon: React.ComponentType<{ size?: number; className?: string }>;
  cta?: string;
  onCta?: () => void;
  emphasis?: boolean;
}) {
  const hasChange = typeof change === 'number';
  const good = hasChange && (change === 0 || (changeGoodWhen === 'up' ? change > 0 : change < 0));
  const ChangeIcon = !hasChange || change === 0 ? Minus : change > 0 ? TrendingUp : TrendingDown;
  return (
    <article className={cn('surface surface-hover relative flex flex-col gap-3 p-5', emphasis && 'ring-1 ring-crit-200')}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-[13px] font-medium text-n-600">{label}</span>
        <span className={cn('inline-flex size-8 items-center justify-center rounded-lg', TONE_ICON_BG[tone])}>
          <Icon size={16} aria-hidden />
        </span>
      </div>
      <div className="flex items-end gap-2">
        <span className="num text-[34px] leading-none font-semibold tracking-tight text-n-900 sm:text-[38px]">{value}</span>
        {unit && <span className={cn('mb-1 text-sm font-medium', TONE_TEXT[tone])}>{unit}</span>}
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-n-500">
        {hasChange && (
          <span className={cn('num inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium', change === 0 ? 'bg-n-100 text-n-600' : good ? 'bg-ok-100 text-ok-600' : 'bg-crit-100 text-crit-600')}>
            <ChangeIcon size={12} aria-hidden />
            {change > 0 ? '+' : ''}{change} vs. {PERIOD.previous}
          </span>
        )}
        <span>{context}</span>
      </div>
      {cta && onCta && (
        <button
          type="button"
          onClick={onCta}
          className="mt-auto inline-flex w-fit items-center gap-1 text-[13px] font-semibold text-brand-600 transition-colors hover:text-brand-700"
        >
          {cta}
          <ArrowRight size={14} aria-hidden />
        </button>
      )}
    </article>
  );
}
