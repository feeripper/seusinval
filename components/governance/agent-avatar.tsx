'use client';
import { cn } from '@/lib/utils';
import { Agent, AgentId, agentById } from '@/lib/agents';

export function AgentAvatar({
  agent,
  id,
  size = 44,
  className,
  alt,
}: {
  agent?: Agent;
  id?: AgentId;
  size?: number;
  className?: string;
  alt?: string;
}) {
  const who = agent ?? agentById(id);
  return (
    <span
      className={cn('relative inline-flex shrink-0 overflow-hidden rounded-full bg-n-100 ring-2 ring-n-0', className)}
      style={{ width: size, height: size, boxShadow: `0 0 0 1px ${who.accent}33` }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={who.avatar}
        alt={alt ?? ''}
        width={size}
        height={size}
        className="size-full object-cover object-top"
        decoding="async"
        loading={size >= 48 ? 'eager' : 'lazy'}
      />
    </span>
  );
}

export function AvailabilityDot({ available, size = 10, className }: { available: boolean; size?: number; className?: string }) {
  return (
    <i
      aria-hidden
      className={cn('absolute rounded-full ring-2 ring-n-0', available ? 'bg-ok-600' : 'bg-n-400', className)}
      style={{ width: size, height: size, right: 0, bottom: 0 }}
    />
  );
}
