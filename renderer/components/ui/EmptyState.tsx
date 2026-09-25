import React from 'react';
import type { LucideIcon } from 'lucide-react';

export function EmptyState({ icon: Icon, title, description, action, bordered = true }: { icon: LucideIcon; title: string; description: string; action?: React.ReactNode; bordered?: boolean }) {
  return (
    <div className={`flex flex-col items-center px-6 py-14 text-center ${bordered ? 'rounded-lg border border-dashed border-line' : ''}`}>
      <span className="grid h-12 w-12 place-items-center rounded-lg bg-raised text-zinc-500"><Icon size={22} strokeWidth={1.6} /></span>
      <h2 className="mt-4 text-sm font-semibold text-zinc-200">{title}</h2>
      <p className="mt-1.5 max-w-sm text-xs leading-5 text-zinc-500">{description}</p>
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}
