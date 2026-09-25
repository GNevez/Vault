import React from 'react';
import { TrendingUp } from 'lucide-react';
import type { Trend } from '../../types/social';

/** Right column of the Community pages. Hidden below xl so the feed keeps a comfortable width. */
export function TrendsPanel({ trends, active, onSelect }: { trends: Trend[]; active?: string; onSelect: (tag: string) => void }) {
  return (
    <aside aria-label="Em alta" className="hidden w-72 shrink-0 xl:block">
      <div className="sticky top-0 space-y-4">
        <section className="overflow-hidden rounded-lg border border-line bg-raised">
          <div className="flex items-center gap-2 border-b border-line px-4 py-3">
            <TrendingUp className="h-4 w-4 text-accent" />
            <h2 className="text-sm font-semibold text-zinc-100">Em alta no VAULT</h2>
          </div>

          {trends.length ? trends.map((trend, index) => {
            const tag = `#${trend.name}`;
            const selected = active?.toLocaleLowerCase() === tag.toLocaleLowerCase();
            return (
              <button
                key={trend.slug}
                onClick={() => onSelect(selected ? '' : tag)}
                aria-pressed={selected}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-raised-hover ${selected ? 'bg-raised-hover' : ''}`}
              >
                <span className="w-4 text-xs tabular-nums text-zinc-600">{index + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-[13px] font-semibold ${selected ? 'text-accent' : 'text-zinc-200'}`}>{tag}</span>
                  <span className="block text-[11px] text-zinc-500">{trend.postCount} {trend.postCount === 1 ? 'post' : 'posts'} esta semana</span>
                </span>
              </button>
            );
          }) : (
            <div className="px-4 py-8 text-center">
              <p className="text-xs text-zinc-400">Nenhum assunto em alta ainda</p>
              <p className="mt-1 text-[11px] leading-4 text-zinc-600">Use hashtags nos posts para começar um tópico.</p>
            </div>
          )}
        </section>

        <section className="rounded-lg border border-line p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Comunidade VAULT</p>
          <p className="mt-2 text-xs leading-5 text-zinc-400">Compartilhe descobertas, capturas de tela e os jogos que você não consegue largar.</p>
        </section>
      </div>
    </aside>
  );
}
