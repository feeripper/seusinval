import { cn } from '@/lib/utils';

export function SinvalMark({ size = 36, className, inverted = false }: { size?: number; className?: string; inverted?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden
      className={cn('shrink-0', className)}
    >
      <rect width="32" height="32" rx="8" fill={inverted ? 'rgba(255,255,255,0.12)' : '#08244a'} />
      <path d="M10.2 23V9.4h5.1c3.15 0 5.15 1.85 5.15 4.55 0 1.85-1 3.25-2.7 3.95L21.6 23h-3.05l-3.55-4.85h-1.7V23H10.2Zm3.1-7.35h1.85c1.55 0 2.5-.9 2.5-2.25s-.95-2.2-2.5-2.2h-1.85v4.45Z" fill="#fff" />
      <circle cx="24.2" cy="24.2" r="3.2" fill="#ec7000" />
    </svg>
  );
}
