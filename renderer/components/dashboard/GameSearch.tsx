import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Loader2, Plus, Search, SearchX, X } from "lucide-react";
import { toast } from "sonner";
import { useCatalog, type Game, type LibraryApi } from "../../hooks/useApi";
import { FEATURED_GAMES } from "../../lib/featured-games";
import { GameArt, formatDate, iconButton, type GamesTab } from "./gameUi";

interface Props {
  initialQuery: string;
  library: LibraryApi;
  hasSources: boolean;
  onTab: (tab: GamesTab) => void;
  onClose: () => void;
}

const libraryKey = (game: { sourceId: number; gameIndex: number }) => `${game.sourceId}-${game.gameIndex}`;
const SUGGESTIONS = FEATURED_GAMES.slice(0, 6);

/** Compact search over every configured source, opened from the Games header. */
export function GameSearch({ initialQuery, library, hasSources, onTab, onClose }: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [search, setSearch] = useState(initialQuery.trim());
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState<string | null>(null);
  const { data, loading, loadGames, addToLibrary } = useCatalog();
  const inputRef = useRef<HTMLInputElement>(null);
  const owned = useMemo(() => new Set(library.games.map(libraryKey)), [library.games]);

  useEffect(() => {
    const input = inputRef.current;
    input?.focus();
    // Keep the caret after the text carried over from the header field.
    input?.setSelectionRange(input.value.length, input.value.length);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const timeout = setTimeout(() => { setSearch(query.trim()); setPage(1); }, 250);
    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => { if (search.length >= 2) void loadGames(page, search); }, [page, search, loadGames]);

  const add = async (game: Game) => {
    const key = libraryKey(game);
    if (owned.has(key) || adding) return;
    setAdding(key);
    try {
      await addToLibrary(game.sourceId, game.gameIndex);
      await library.reload();
      toast.success(`${game.title} foi adicionado à biblioteca`);
    } catch (err: any) {
      toast.error(err.message || "Não foi possível adicionar à biblioteca");
    } finally {
      setAdding(null);
    }
  };

  const searching = search.length >= 2;
  const results = searching ? data?.items ?? [] : [];
  const totalPages = searching ? data?.totalPages ?? 0 : 0;
  const totalItems = searching ? data?.totalItems ?? 0 : 0;

  return (
    <div className="fixed inset-x-0 bottom-0 top-13 z-[80] flex justify-center bg-black/70 px-6 pt-[10vh] backdrop-blur-sm" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties} onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label="Buscar jogos" className="flex max-h-[70vh] w-full max-w-xl flex-col self-start overflow-hidden rounded-lg border border-line bg-panel shadow-2xl shadow-black/60">
        <div className="flex h-14 shrink-0 items-center gap-3 border-b border-line px-4">
          {loading && searching ? <Loader2 size={17} className="shrink-0 animate-spin text-zinc-500" /> : <Search size={17} className="shrink-0 text-zinc-500" />}
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar jogos nas suas fontes…"
            aria-label="Buscar jogos"
            className="min-w-0 flex-1 bg-transparent text-[15px] text-zinc-100 placeholder:text-zinc-500 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          <kbd className="hidden rounded border border-line px-1.5 py-0.5 font-mono text-[10px] text-zinc-500 sm:block">Esc</kbd>
          <button onClick={onClose} aria-label="Fechar busca" className="grid h-7 w-7 place-items-center rounded text-zinc-500 hover:bg-raised hover:text-zinc-200"><X size={16} /></button>
        </div>

        <div className="vault-scroll min-h-0 flex-1 overflow-y-auto">
          {!hasSources ? (
            <div className="px-6 py-10 text-center">
              <p className="text-sm text-zinc-300">Nenhuma fonte configurada</p>
              <p className="mt-1 text-xs text-zinc-500">A busca procura nas suas fontes de jogos.</p>
              <button onClick={() => { onClose(); onTab("fonte"); }} className="mt-4 text-xs font-medium text-accent hover:text-accent-strong">Configurar fontes</button>
            </div>
          ) : !searching ? (
            <div className="p-4">
              <p className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Populares</p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map(game => <button key={game.slug} onClick={() => setQuery(game.query)} className="rounded-full border border-line px-3 py-1 text-xs text-zinc-300 transition hover:border-zinc-600 hover:text-zinc-50">{game.title}</button>)}
              </div>
            </div>
          ) : !loading && results.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <SearchX size={22} className="mx-auto text-zinc-600" />
              <p className="mt-3 text-sm text-zinc-300">Nada encontrado para “{search}”</p>
              <p className="mt-1 text-xs text-zinc-500">Tente menos palavras ou outro nome.</p>
            </div>
          ) : (
            <ul className={`p-2 transition-opacity ${loading ? "opacity-60" : ""}`}>
              {results.map(game => {
                const key = libraryKey(game);
                const inLibrary = owned.has(key);
                return (
                  <li key={key} className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-raised">
                    <GameArt title={game.title} size="sm" className="h-10 w-[70px] shrink-0 rounded" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-zinc-100" title={game.title}>{game.title}</p>
                      <p className="truncate text-xs text-zinc-500">
                        {game.sourceName}{game.fileSize && ` · ${game.fileSize}`}{game.uploadDate && ` · ${formatDate(game.uploadDate)}`}
                      </p>
                    </div>
                    {inLibrary ? (
                      <button onClick={() => { onClose(); onTab("library"); }} title="Abrir biblioteca" className="flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-accent hover:bg-accent/10"><Check size={14} />Na biblioteca</button>
                    ) : (
                      <button onClick={() => void add(game)} disabled={!!adding} aria-label={`Adicionar ${game.title} à biblioteca`} title="Adicionar à biblioteca" className={iconButton}>
                        {adding === key ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {searching && totalItems > 0 && (
          <footer className="flex h-11 shrink-0 items-center gap-2 border-t border-line px-4 text-xs text-zinc-500">
            <span>{totalItems} {totalItems === 1 ? "resultado" : "resultados"}</span>
            {totalPages > 1 && <>
              <span className="ml-auto tabular-nums">{page} / {totalPages}</span>
              <button aria-label="Página anterior" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1 || loading} className={`${iconButton} h-7 w-7`}><ChevronLeft size={14} /></button>
              <button aria-label="Próxima página" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages || loading} className={`${iconButton} h-7 w-7`}><ChevronRight size={14} /></button>
            </>}
          </footer>
        )}
      </div>
    </div>
  );
}
