'use client';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { Indicator } from '@/lib/indicators';
import { STATUS_META, statusOf } from '@/lib/presentation';

const STROKE = { ok: 'var(--ok-600)', warn: 'var(--warn-600)', crit: 'var(--crit-600)' } as const;
const FILL = { ok: 'var(--ok-100)', warn: 'var(--warn-100)', crit: 'var(--crit-100)' } as const;

export function Sparkline({ indicator, width = 104, height = 30 }: { indicator: Indicator; width?: number | string; height?: number }) {
  const tone = STATUS_META[statusOf(indicator)].tone;
  return (
    <div style={{ width, height }} role="img" aria-label={`Histórico mensal: ${indicator.history.join(', ')}`}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: typeof width === 'number' ? width : 104, height }}>
        <AreaChart data={indicator.history.map(v => ({ v }))} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <Area dataKey="v" type="monotone" stroke={STROKE[tone]} fill={FILL[tone]} strokeWidth={1.8} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
