import React, { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, ChevronLeft, ChevronRight, Gamepad2, Link2, Loader2, Plus, SearchX } from "lucide-react";
import { toast } from "sonner";
import { useCatalog, type Game, type LibraryApi, type SourcesApi } from "../../hooks/useApi";
import { EmptyState, GameArt, accentButton, formatDate, ghostButton, iconButton, type GamesTab } from "./gameUi";

interface Props {
  query: string;
  sources: SourcesApi;
  library: LibraryApi;
  onTab: (tab: GamesTab) => void;
  onClearQuery: () => void;
}

const libraryKey = (game: { sourceId: number; gameIndex: number }) => `${game.sourceId}-${game.gameIndex}`;

export function Catalog({ query, sources, library, onTab, onClearQuery }: Props) {
  const [page, setPage] = useState(1);
  const [sourceId, setSourceId] = useState<number | undefined>();
  const [search, setSearch] = useState(query);
  const [adding, setAdding] = useState<string | null>(null);
  const { data, loading, loadGames, addToLibrary } = useCatalog();

  useEffect(() => {
    const timeout = setTimeout(() => { setSearch(query); setPage(1); }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    void loadGames(page, search, sourceId);
  }, [page, search, sourceId, loadGames]);

  // Drop the filter if its source was removed.
  useEffect(() => {
    if (sourceId && !sources.loading && !sources.sources.some(s => s.id === sourceId)) setSourceId(undefined);
  }, [sourceId, sources.loading, sources.sources]);

  const owned = useMemo(() => new Set(library.games.map(libraryKey)), [library.games]);

  const handleAdd = async (game: Game) => {
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

  const games = data?.items ?? [];
  const totalPages = data?.totalPages ?? 0;
  const totalItems = data?.totalItems ?? 0;
  const filtered = !!search.trim() || !!sourceId;
  const featured = page === 1 && !search.trim() ? games[0] : undefined;
  const grid = featured ? games.slice(1) : games;

  const libraryAction = (game: Game, variant: "icon" | "button") => {
    const key = libraryKey(game);
    const inLibrary = owned.has(key);
    const busy = adding === key;
    if (variant === "button") {
      return inLibrary
        ? <button onClick={() => onTab("library")} className={ghostButton}><Check size={15} className="text-accent" />Na biblioteca</button>
        : <button onClick={() => void handleAdd(game)} disabled={busy} className={accentButton}>{busy ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} strokeWidth={2.2} />}Adicionar à biblioteca</button>;
    }
    return (
      <button
        onClick={() => void handleAdd(game)}
        disabled={inLibrary || busy}
        aria-label={inLibrary ? `${game.title} já está na biblioteca` : `Adicionar ${game.title} à biblioteca`}
        title={inLibrary ? "Na biblioteca" : "Adicionar à biblioteca"}
        className={`${iconButton} ${inLibrary ? "border-accent/30 text-accent disabled:opacity-100" : ""}`}
      >
        {busy ? <Loader2 size={15} className="animate-spin" /> : inLibrary ? <Check size={15} /> : <Plus size={15} />}
      </button>
    );
  };

  if (!data && loading) {
    return (
      <div aria-busy className="space-y-8">
        <div className="h-56 animate-pulse rounded-lg bg-raised" />
        <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
          {[0, 1, 2, 3].map(i => <div key={i} className="aspect-4/3 animate-pulse rounded-lg bg-raised" />)}
        </div>
      </div>
    );
  }

  if (!loading && totalItems === 0 && !filtered) {
    return sources.sources.length === 0 ? (
      <EmptyState
        icon={Link2}
        title="Seu catálogo começa pelas fontes"
        description="Adicione a URL de uma fonte de jogos para que os títulos disponíveis apareçam aqui. Você pode gerenciar as fontes a qualquer momento."
        action={<button onClick={() => onTab("fonte")} className={accentButton}>Configurar fontes<ArrowRight size={15} /></button>}
      />
    ) : (
      <EmptyState
        icon={Gamepad2}
        title="Nenhum jogo encontrado nas suas fontes"
        description="As fontes configuradas não retornaram jogos. Verifique se as URLs continuam disponíveis e no formato esperado."
        action={<button onClick={() => onTab("fonte")} className={ghostButton}>Revisar fontes</button>}
      />
    );
  }

  return (
    <div className="space-y-9">
      {featured && (
        <section aria-label="Em destaque" className="grid overflow-hidden rounded-lg border border-line bg-raised lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="flex min-w-0 flex-col justify-center p-7 xl:p-9">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">Adicionado recentemente</p>
            <h2 className="mt-3 line-clamp-2 text-3xl font-bold leading-tight tracking-tight text-zinc-50 xl:text-4xl" title={featured.title}>{featured.title}</h2>
            <p className="mt-3 text-[13px] text-zinc-400">
              {featured.sourceName}
              {featured.fileSize && <> <span className="text-zinc-600">·</span> {featured.fileSize}</>}
              {featured.uploadDate && <> <span className="text-zinc-600">·</span> {formatDate(featured.uploadDate)}</>}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">{libraryAction(featured, "button")}</div>
          </div>
          <GameArt title={featured.title} size="lg" className="hidden min-h-56 lg:block" />
        </section>
      )}

      <section aria-label="Catálogo">
        <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-3">
          <h2 className="text-lg font-bold tracking-tight text-zinc-50">{search.trim() ? `Resultados para “${search.trim()}”` : "Explore o catálogo"}</h2>
          {sources.sources.length > 1 && (
            <div role="group" aria-label="Filtrar por fonte" className="flex flex-wrap gap-2">
              {[{ id: undefined as number | undefined, name: "Todas as fontes" }, ...sources.sources].map(source => {
                const active = sourceId === source.id;
                return (
                  <button
                    key={source.id ?? "all"}
                    aria-pressed={active}
                    onClick={() => { setSourceId(source.id); setPage(1); }}
                    className={`max-w-48 truncate rounded-full border px-3.5 py-1 text-xs font-medium transition ${active ? "border-accent bg-accent text-accent-ink" : "border-line text-zinc-400 hover:border-zinc-600 hover:text-zinc-100"}`}
                  >
                    {source.name}
                  </button>
                );
              })}
            </div>
          )}
          <span className="ml-auto flex items-center gap-2 text-xs text-zinc-500">
            {loading && <Loader2 size={13} className="animate-spin" />}
            {totalItems} {totalItems === 1 ? "jogo" : "jogos"}
          </span>
        </div>

        {!loading && totalItems === 0 ? (
          <EmptyState
            icon={SearchX}
            title="Nenhum jogo encontrado"
            description="Tente outro termo de busca ou outra fonte."
            action={<button onClick={() => { setSourceId(undefined); onClearQuery(); }} className={ghostButton}>Limpar filtros</button>}
          />
        ) : (
          <div className={`grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4 transition-opacity ${loading ? "opacity-60" : ""}`}>
            {grid.map(game => (
              <article key={libraryKey(game)} className="group flex flex-col overflow-hidden rounded-lg border border-line bg-raised transition hover:border-zinc-700">
                <GameArt title={game.title} className="aspect-video w-full" />
                <div className="flex items-start gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold text-zinc-100" title={game.title}>{game.title}</h3>
                    <p className="mt-0.5 truncate text-xs text-zinc-500">
                      {game.sourceName}{game.fileSize && ` · ${game.fileSize}`}
                    </p>
                  </div>
                  {libraryAction(game, "icon")}
                </div>
              </article>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <nav aria-label="Paginação" className="mt-5 flex items-center justify-end gap-2 text-xs text-zinc-500">
            <span className="mr-2">Página {page} de {totalPages}</span>
            <button aria-label="Página anterior" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className={iconButton}><ChevronLeft size={15} /></button>
            <button aria-label="Próxima página" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className={iconButton}><ChevronRight size={15} /></button>
          </nav>
        )}
      </section>

      {page === 1 && !filtered && library.games.length > 0 && (
        <section aria-label="Na sua biblioteca">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-tight text-zinc-50">Na sua biblioteca</h2>
            <button onClick={() => onTab("library")} className="flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent-strong">Ver biblioteca<ArrowRight size={14} /></button>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {library.games.slice(0, 3).map(game => (
              <button key={game.id} onClick={() => onTab("library")} className="flex min-w-0 items-center gap-3 rounded-lg border border-line bg-raised p-2.5 text-left transition hover:border-zinc-700">
                <GameArt title={game.title} size="sm" className="h-12 w-20 shrink-0 rounded-md" />
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-semibold text-zinc-100">{game.title}</span>
                  <span className="block truncate text-xs text-zinc-500">{game.sourceName}{game.fileSize && ` · ${game.fileSize}`}</span>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
