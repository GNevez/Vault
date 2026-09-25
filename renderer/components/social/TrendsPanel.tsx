import React from 'react';
import { Search, TrendingUp } from 'lucide-react';
import type { Trend } from '../../types/social';

export function TrendsPanel({
  trends,
  search,
  onSearch,
}: {
  trends: Trend[];
  search: string;
  onSearch: (value: string) => void;
}) {
  return (
    <aside className="hidden w-[300px] shrink-0 px-4 py-4 xl:block">
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
        <input
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Search the community"
          className="h-10 w-full rounded-full border border-zinc-800 bg-zinc-900/70 pl-9 pr-4 text-xs text-zinc-200 outline-none transition focus:border-zinc-600 focus:bg-zinc-900"
        />
      </div>

      <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/30">
        <div className="flex items-center gap-2 px-4 pb-2 pt-4">
          <TrendingUp className="h-4 w-4 text-zinc-400" />
          <h2 className="text-sm font-extrabold tracking-tight text-zinc-100">Trending in Vault</h2>
        </div>

        {trends.length ? trends.map((trend, index) => (
          <button
            key={trend.slug}
            onClick={() => onSearch(`#${trend.name}`)}
            className="block w-full px-4 py-3 text-left transition hover:bg-white/[0.035]"
          >
            <p className="text-[10px] text-zinc-600">{index + 1} · Gaming · Trending</p>
            <p className="mt-0.5 truncate text-xs font-bold text-zinc-200">#{trend.name}</p>
            <p className="mt-0.5 text-[10px] text-zinc-600">
              {trend.postCount} {trend.postCount === 1 ? 'post' : 'posts'} this week
            </p>
          </button>
        )) : (
          <div className="px-4 py-8 text-center">
            <p className="text-xs text-zinc-500">No trends yet</p>
            <p className="mt-1 text-[10px] leading-4 text-zinc-700">Use hashtags in posts to start a topic.</p>
          </div>
        )}
      </section>

      <section className="mt-4 rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900/80 to-zinc-950 p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">Vault Community</p>
        <h3 className="mt-2 text-sm font-bold text-zinc-100">Games are better together.</h3>
        <p className="mt-1 text-[11px] leading-4 text-zinc-500">Share discoveries, screenshots and the games you cannot stop playing.</p>
      </section>
    </aside>
  );
}
