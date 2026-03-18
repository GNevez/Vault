import React, { useState, useEffect } from "react";
import {
  Play,
  MoreHorizontal,
  Clock,
  HardDrive,
  ArrowLeft,
  Search,
  Loader2,
  Gamepad2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Check,
} from "lucide-react";
import { useCatalog } from "../../hooks/useApi";
import { toast } from "sonner";

export function Catalog({ onGoBack }: { onGoBack?: () => void }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [addingToLibrary, setAddingToLibrary] = useState<string | null>(null);
  const [librarySet, setLibrarySet] = useState<Set<string>>(new Set());
  const { data, loading, loadGames, addToLibrary } = useCatalog();

  useEffect(() => {
    loadGames(page, search);
  }, [page, loadGames]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1);
      loadGames(1, search);
    }, 300);
    return () => clearTimeout(timeout);
  }, [search, loadGames]);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch {
      return dateStr;
    }
  };

  const getLibraryKey = (sourceId: number, gameIndex: number) =>
    `${sourceId}-${gameIndex}`;

  const handleAddToLibrary = async (game: {
    sourceId: number;
    gameIndex: number;
    title: string;
  }) => {
    const key = getLibraryKey(game.sourceId, game.gameIndex);
    if (librarySet.has(key)) return;
    setAddingToLibrary(key);
    try {
      await addToLibrary(game.sourceId, game.gameIndex);
      setLibrarySet((prev) => new Set(prev).add(key));
      toast.success(`${game.title} added to library`);
    } catch (err: any) {
      toast.error(err.message || "Failed to add to library");
    } finally {
      setAddingToLibrary(null);
    }
  };

  const games = data?.items ?? [];
  const totalPages = data?.totalPages ?? 0;
  const totalItems = data?.totalItems ?? 0;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <header className="flex items-center gap-4 px-6 h-16 border-b border-border-dark shrink-0">
        {onGoBack && (
          <button
            onClick={onGoBack}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={2} />
          </button>
        )}
        <div className="min-w-0">
          <h1 className="text-sm font-bold text-zinc-50 tracking-tight">
            Catalog
          </h1>
          <p className="text-[10px] text-zinc-500">
            {totalItems} game{totalItems !== 1 ? "s" : ""} available
          </p>
        </div>
        <div className="flex-1" />
        <div className="relative w-52">
          <Search
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500"
            strokeWidth={2}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search games..."
            className="w-full h-8 pl-8 pr-3 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600 transition-colors"
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
          </div>
        ) : games.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Gamepad2
              className="w-8 h-8 text-zinc-700 mb-3"
              strokeWidth={1.5}
            />
            <p className="text-sm text-zinc-500 mb-1">No games found</p>
            <p className="text-xs text-zinc-600">
              {totalItems === 0 && !search
                ? "Add a source in the Sources section to start"
                : "Try a different search term"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {games.map((game, idx) => (
              <div
                key={`${game.title}-${idx}`}
                className="group flex items-center gap-5 p-3 rounded-xl border border-transparent hover:border-border-dark hover:bg-surface-dark/50 transition-all duration-200 cursor-pointer"
              >
                <div className="relative w-30 h-17 rounded-lg overflow-hidden shrink-0 bg-zinc-900 flex items-center justify-center">
                  <Gamepad2
                    className="w-6 h-6 text-zinc-700"
                    strokeWidth={1.5}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center">
                    <Play
                      className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 drop-shadow-lg"
                      fill="white"
                    />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-zinc-100 truncate">
                    {game.title}
                  </h3>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    {game.sourceName}
                  </p>
                </div>

                <div className="hidden sm:flex items-center gap-5 text-[11px] text-zinc-500">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    <span>{formatDate(game.uploadDate)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <HardDrive className="w-3 h-3" />
                    <span>{game.fileSize}</span>
                  </div>
                </div>

                <button className="p-2 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-colors opacity-0 group-hover:opacity-100">
                  <MoreHorizontal className="w-4 h-4" />
                </button>

                {(() => {
                  const key = getLibraryKey(game.sourceId, game.gameIndex);
                  const inLibrary = librarySet.has(key);
                  const isAdding = addingToLibrary === key;
                  return (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToLibrary(game);
                      }}
                      disabled={inLibrary || isAdding}
                      title={inLibrary ? "In library" : "Add to library"}
                      className={`p-2 rounded-lg transition-colors cursor-pointer shrink-0 ${
                        inLibrary
                          ? "text-emerald-500"
                          : "text-zinc-600 hover:text-zinc-200 hover:bg-zinc-800"
                      } ${isAdding ? "opacity-50" : ""}`}
                    >
                      {isAdding ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : inLibrary ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Plus className="w-4 h-4" strokeWidth={2} />
                      )}
                    </button>
                  );
                })()}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-3 border-t border-border-dark shrink-0">
          <span className="text-[11px] text-zinc-500">
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" strokeWidth={2} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
