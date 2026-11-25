'use client';

import { cn } from '@/lib/utils';

interface SourceBadgeProps {
  source: string;
  className?: string;
}

const SOURCE_STYLES: Record<string, { label: string; bg: string; text: string }> = {
  opensooq: { label: 'OpenSooq', bg: 'bg-blue-500/15', text: 'text-blue-600 dark:text-blue-400' },
  facebook: { label: 'Facebook', bg: 'bg-indigo-500/15', text: 'text-indigo-600 dark:text-indigo-400' },
};

export function SourceBadge({ source, className }: SourceBadgeProps) {
  const style = SOURCE_STYLES[source] ?? { label: source, bg: 'bg-muted', text: 'text-muted-foreground' };
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium', style.bg, style.text, className)}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
      {style.label}
    </span>
  );
}
