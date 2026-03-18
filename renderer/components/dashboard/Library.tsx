import React, { useState } from "react";
import {
  Book,
  Trash2,
  Loader2,
  Gamepad2,
  Clock,
  HardDrive,
  Play,
  Download,
  X,
  Link2,
  Check,
} from "lucide-react";
import { useLibrary } from "../../hooks/useApi";
import { toast } from "sonner";

export function Library() {
  const { games, loading, remove, startDownload } = useLibrary();
  const [removing, setRemoving] = useState<number | null>(null);
  const [downloading, setDownloading] = useState<number | null>(null);
  const [uriPickerGame, setUriPickerGame] = useState<(typeof games)[0] | null>(null);

  const handleRemove = async (item: (typeof games)[0]) => {
    setRemoving(item.id);
    try {
      await remove(item.id);
      toast.success(`${item.title} removed from library`);
    } catch (err: any) {
      toast.error(err.message || "Failed to remove from library");
    } finally {
      setRemoving(null);
    }
  };

  const handleDownload = async (game: (typeof games)[0], magnetUri?: string) => {
    if (!magnetUri) {
      if (game.uris.length > 1) {
        setUriPickerGame(game);
        return;
      }
      magnetUri = game.uris[0];
    }
    if (!magnetUri) return;

    setUriPickerGame(null);
    setDownloading(game.id);
    try {
      await startDownload(magnetUri, game.title);
      toast.success(`Download started: ${game.title}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to start download");
    } finally {
      setDownloading(null);
    }
  };

  const extractMagnetName = (uri: string) => {
    try {
      const dnMatch = uri.match(/dn=([^&]+)/);
      if (dnMatch) return decodeURIComponent(dnMatch[1].replace(/\+/g, " "));
    } catch {}
    return uri.substring(0, 60) + "...";
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <header className="flex items-center gap-4 px-6 h-16 border-b border-border-dark shrink-0">
        <div className="min-w-0">
          <h1 className="text-sm font-bold text-zinc-50 tracking-tight">
            Library
          </h1>
          <p className="text-[10px] text-zinc-500">
            {games.length} game{games.length !== 1 ? "s" : ""} in your library
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
          </div>
        ) : games.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Book
              className="w-8 h-8 text-zinc-700 mb-3"
              strokeWidth={1.5}
            />
            <p className="text-sm text-zinc-500 mb-1">Your library is empty</p>
            <p className="text-xs text-zinc-600">
              Add games from the Catalog to see them here
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {games.map((game) => (
              <div
                key={game.id}
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

                <button
                  onClick={() => handleDownload(game)}
                  disabled={downloading === game.id}
                  title="Download"
                  className="p-2 rounded-lg text-zinc-600 hover:text-emerald-400 hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
                >
                  {downloading === game.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" strokeWidth={1.8} />
                  )}
                </button>

                <button
                  onClick={() => handleRemove(game)}
                  disabled={removing === game.id}
                  title="Remove from library"
                  className="p-2 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
                >
                  {removing === game.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" strokeWidth={1.8} />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* URI Picker Modal */}
      {uriPickerGame && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-lg mx-4 shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-bold text-zinc-100 truncate">
                  Choose a magnet link
                </h2>
                <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                  {uriPickerGame.title}
                </p>
              </div>
              <button
                onClick={() => setUriPickerGame(null)}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer shrink-0 ml-3"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-4 max-h-72 overflow-y-auto flex flex-col gap-2">
              {uriPickerGame.uris.map((uri, idx) => (
                <button
                  key={idx}
                  onClick={() => handleDownload(uriPickerGame, uri)}
                  className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800 transition-all cursor-pointer text-left"
                >
                  <Link2 className="w-4 h-4 text-zinc-500 shrink-0" strokeWidth={1.8} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-zinc-200 truncate">
                      Magnet {idx + 1}
                    </p>
                    <p className="text-[10px] text-zinc-500 truncate mt-0.5">
                      {extractMagnetName(uri)}
                    </p>
                  </div>
                  <Download className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
