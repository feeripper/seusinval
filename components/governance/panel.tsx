import * as React from 'react';
import { cn } from '@/lib/utils';

export function Panel({ className, children, ...props }: React.ComponentProps<'section'>) {
  return (
    <section className={cn('surface flex min-w-0 flex-col overflow-hidden', className)} {...props}>
      {children}
    </section>
  );
}

export function PanelHeader({
  eyebrow,
  title,
  description,
  count,
  action,
  className,
  as: Heading = 'h2',
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  count?: number;
  action?: React.ReactNode;
  className?: string;
  as?: 'h2' | 'h3';
}) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-3 px-5 pt-5 pb-4 sm:px-6', className)}>
      <div className="min-w-0">
        {eyebrow && <div className="eyebrow mb-1.5">{eyebrow}</div>}
        <Heading className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-n-900 sm:text-base">
          {title}
          {typeof count === 'number' && (
            <span className="num inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-n-100 px-1.5 text-[11px] font-semibold text-n-600">{count}</span>
          )}
        </Heading>
        {description && <p className="mt-1 text-[13px] leading-relaxed text-n-500">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

export function Divider({ className }: { className?: string }) {
  return <div className={cn('h-px w-full bg-n-200', className)} aria-hidden />;
}
