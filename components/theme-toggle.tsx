'use client';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <button
      type="button"
      aria-label="Alternar tema claro ou escuro"
      title="Tema claro ou escuro"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      className="inline-flex size-9 items-center justify-center rounded-lg text-n-700 transition-colors hover:bg-n-100"
    >
      <Sun size={18} aria-hidden className="hidden dark:block" />
      <Moon size={18} aria-hidden className="dark:hidden" />
    </button>
  );
}
