import React, { useCallback, useEffect, useState } from "react";
import { ArrowRight, Pause, Play, Search, X } from "lucide-react";
import { toast } from "sonner";
import { useDownloads, useLibrary, useSources, type DownloadItem, type DownloadsApi } from "../../hooks/useApi";
import { Catalog } from "./Catalog";
import { Downloads } from "./Downloads";
import { Fonte } from "./Fonte";
import { GameSearch } from "./GameSearch";
import { Library } from "./Library";
import { GameArt, formatBytes, formatSpeed, downloadState, iconButton, isPausedDownload, isPendingDownload, type GamesTab } from "./gameUi";

const TABS: { id: GamesTab; label: string; search: string }[] = [
  { id: "catalog", label: "Descobrir", search: "Buscar jogos…" },
  { id: "library", label: "Biblioteca", search: "Buscar na biblioteca…" },
  { id: "downloads", label: "Downloads", search: "Buscar downloads…" },
  { id: "fonte", label: "Fontes", search: "Buscar fontes…" },
];

export function GamesWorkspace({ tab, onTab }: { tab: GamesTab; onTab: (tab: GamesTab) => void }) {
  const sources = useSources();
  const library = useLibrary();
  const downloads = useDownloads(2000);
  const [query, setQuery] = useState("");
  // Discover searches every source in a modal; the other tabs filter their own list in place.
  const [searching, setSearching] = useState<string | null>(null);
  const discover = tab === "catalog";

  // Each tab has its own search context.
  useEffect(() => { setQuery(""); setSearching(null); }, [tab]);

  useEffect(() => {
    if (!discover) return;
    const onKey = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setSearching(s => s ?? ""); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [discover]);

  const closeSearch = useCallback(() => { setSearching(null); setQuery(""); }, []);

  const pending = downloads.downloads.filter(isPendingDownload);
  const active = tab === "downloads" ? undefined : pending[0];
  const current = TABS.find(t => t.id === tab) ?? TABS[0];

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
      <div className="vault-scroll min-h-0 flex-1 overflow-y-auto">
        <div className="@container mx-auto w-full max-w-[1480px] px-8 pb-10 pt-7">
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-[28px] font-bold leading-tight tracking-tight text-zinc-50">Games</h1>
              <p className="mt-1 text-sm text-zinc-500">Seu próximo jogo começa aqui.</p>
            </div>
            <div className="relative w-full max-w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="search"
                value={query}
                onChange={e => { setQuery(e.target.value); if (discover) setSearching(e.target.value); }}
                onMouseDown={e => { if (discover) { e.preventDefault(); setSearching(query); } }}
                onKeyDown={e => { if (e.key === "Escape") setQuery(""); if (discover && e.key === "Enter") setSearching(query); }}
                placeholder={current.search}
                aria-label={current.search}
                aria-haspopup={discover ? "dialog" : undefined}
                className="h-10 w-full rounded-md border border-line bg-raised pl-9 pr-12 text-[13px] text-zinc-100 placeholder:text-zinc-500 focus:border-accent/60 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
              />
              {discover
                ? <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-line px-1.5 py-0.5 font-mono text-[10px] text-zinc-500">Ctrl K</kbd>
                : query && <button onClick={() => setQuery("")} aria-label="Limpar busca" className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded text-zinc-500 hover:text-zinc-200"><X size={14} /></button>}
            </div>
          </header>

          <nav role="tablist" aria-label="Seções de Games" className="mb-7 mt-5 flex gap-1 border-b border-line">
            {TABS.map(({ id, label }) => {
              const selected = tab === id;
              return (
                <button
                  key={id}
                  role="tab"
                  aria-selected={selected}
                  onClick={() => onTab(id)}
                  className={`relative flex items-center gap-2 px-4 pb-3 pt-1 text-sm font-medium transition ${selected ? "text-zinc-50" : "text-zinc-500 hover:text-zinc-200"}`}
                >
                  {label}
                  {id === "downloads" && pending.length > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-raised-hover px-1.5 text-[11px] font-semibold tabular-nums text-zinc-200">{pending.length}</span>}
                  {selected && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent" />}
                </button>
              );
            })}
          </nav>

          <div role="tabpanel" aria-label={current.label}>
            {tab === "catalog" && <Catalog sources={sources} library={library} onTab={onTab} onFind={setSearching} />}
            {tab === "library" && <Library query={query} library={library} onTab={onTab} onDownloadStarted={() => void downloads.reload()} />}
            {tab === "downloads" && <Downloads query={query} downloads={downloads} onTab={onTab} />}
            {tab === "fonte" && <Fonte query={query} sources={sources} />}
          </div>
        </div>
      </div>

      {active && <DownloadStrip item={active} more={pending.length - 1} api={downloads} onOpen={() => onTab("downloads")} />}
      {searching !== null && <GameSearch initialQuery={searching} library={library} hasSources={sources.loading || sources.sources.length > 0} onTab={onTab} onClose={closeSearch} />}
    </div>
  );
}

function DownloadStrip({ item, more, api, onOpen }: { item: DownloadItem; more: number; api: DownloadsApi; onOpen: () => void }) {
  const paused = isPausedDownload(item.state);
  const progress = Math.min(Math.max(item.progress, 0), 100);
  const toggle = async () => {
    try { await (paused ? api.resume(item.id) : api.pause(item.id)); await api.reload(); }
    catch (err: any) { toast.error(err.message || (paused ? "Não foi possível retomar" : "Não foi possível pausar")); }
  };
  return (
    <section aria-label="Download em andamento" className="flex h-16 shrink-0 items-center gap-4 border-t border-line bg-panel px-6">
      <GameArt title={item.title} size="sm" className="h-10 w-16 shrink-0 rounded" />
      <div className="w-44 min-w-0 shrink-0 xl:w-56">
        <p className="truncate text-[13px] font-semibold text-zinc-100" title={item.title}>{item.title}</p>
        <p className="truncate text-xs tabular-nums text-zinc-500">
          {downloadState(item.state).label} · {formatBytes(item.downloadedBytes)} de {formatBytes(item.totalSize)}
        </p>
      </div>
      <div className="h-1 min-w-16 flex-1 overflow-hidden rounded-full bg-zinc-800" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)} aria-label={`Progresso de ${item.title}`}>
        <div className={`h-full rounded-full transition-all duration-500 ${paused ? "bg-zinc-500" : "bg-accent"}`} style={{ width: `${progress}%` }} />
      </div>
      <span className="hidden w-20 shrink-0 text-right text-[13px] tabular-nums text-zinc-300 lg:block">{paused ? `${Math.round(progress)}%` : formatSpeed(item.downloadSpeed)}</span>
      <button onClick={() => void toggle()} aria-label={paused ? "Retomar download" : "Pausar download"} title={paused ? "Retomar" : "Pausar"} className={`${iconButton} h-9 w-9`}>{paused ? <Play size={15} /> : <Pause size={15} />}</button>
      <div className="h-6 w-px bg-line" />
      <button onClick={onOpen} className="flex shrink-0 items-center gap-1.5 text-[13px] font-medium text-accent hover:text-accent-strong">
        Ver downloads{more > 0 && <span className="text-zinc-500">(+{more})</span>}<ArrowRight size={15} />
      </button>
    </section>
  );
}
