import { cn } from '@/lib/utils';

const config = {
  CRITICAL: { label: 'Critical', classes: 'bg-red-100 text-red-700 border-red-200' },
  HIGH:     { label: 'High',     classes: 'bg-orange-100 text-orange-700 border-orange-200' },
  MEDIUM:   { label: 'Medium',   classes: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  LOW:      { label: 'Low',      classes: 'bg-slate-100 text-slate-600 border-slate-200' },
};

export function PriorityBadge({ priority }: { priority: string }) {
  const c = config[priority as keyof typeof config] || config.MEDIUM;
  return (
    <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border', c.classes)}>
      {c.label}
    </span>
  );
}
