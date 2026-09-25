import React, { useState } from "react";
import { ArrowRight, Book, Download, Link2, Loader2, SearchX, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import type { LibraryApi, LibraryGame } from "../../hooks/useApi";
import { EmptyState, GameArt, accentButton, formatDate, ghostButton, iconButton, type GamesTab } from "./gameUi";

interface Props {
  query: string;
  library: LibraryApi;
  onTab: (tab: GamesTab) => void;
  onDownloadStarted: () => void;
}

const extractMagnetName = (uri: string) => {
  try {
    const match = uri.match(/dn=([^&]+)/);
    if (match) return decodeURIComponent(match[1].replace(/\+/g, " "));
  } catch {}
  return uri.substring(0, 60) + "...";
};

export function Library({ query, library, onTab, onDownloadStarted }: Props) {
  const { games, loading, remove, startDownload } = library;
  const [removing, setRemoving] = useState<number | null>(null);
  const [downloading, setDownloading] = useState<number | null>(null);
  const [uriPickerGame, setUriPickerGame] = useState<LibraryGame | null>(null);

  const handleRemove = async (item: LibraryGame) => {
    setRemoving(item.id);
    try {
      await remove(item.id);
      toast.success(`${item.title} foi removido da biblioteca`);
    } catch (err: any) {
      toast.error(err.message || "Não foi possível remover da biblioteca");
    } finally {
      setRemoving(null);
    }
  };

  const handleDownload = async (game: LibraryGame, magnetUri?: string) => {
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
      onDownloadStarted();
      toast.success(`Download iniciado: ${game.title}`);
    } catch (err: any) {
      toast.error(err.message || "Não foi possível iniciar o download");
    } finally {
      setDownloading(null);
    }
  };

  const term = query.trim().toLocaleLowerCase();
  const visible = term ? games.filter(g => g.title.toLocaleLowerCase().includes(term)) : games;

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-zinc-500" /></div>;

  if (!games.length) {
    return (
      <EmptyState
        icon={Book}
        title="Sua biblioteca está vazia"
        description="Adicione jogos pelo catálogo para baixá-los e mantê-los sempre à mão."
        action={<button onClick={() => onTab("catalog")} className={accentButton}>Explorar catálogo<ArrowRight size={15} /></button>}
      />
    );
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold tracking-tight text-zinc-50">Seus jogos</h2>
        <span className="text-xs text-zinc-500">{games.length} {games.length === 1 ? "jogo" : "jogos"}</span>
      </div>

      {!visible.length ? (
        <EmptyState icon={SearchX} title="Nenhum jogo corresponde à busca" description="Tente outro termo." />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-raised">
          {visible.map(game => (
            <li key={game.id} className="flex items-center gap-4 p-3 transition hover:bg-raised-hover">
              <GameArt title={game.title} size="sm" className="h-14 w-24 shrink-0 rounded-md" />
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-semibold text-zinc-100" title={game.title}>{game.title}</h3>
                <p className="mt-0.5 truncate text-xs text-zinc-500">{game.sourceName}</p>
              </div>
              <dl className="hidden shrink-0 gap-6 text-right text-xs md:flex">
                <div><dt className="text-zinc-600">Tamanho</dt><dd className="mt-0.5 text-zinc-300">{game.fileSize || "—"}</dd></div>
                <div><dt className="text-zinc-600">Adicionado em</dt><dd className="mt-0.5 text-zinc-300">{formatDate(game.addedAt)}</dd></div>
              </dl>
              <div className="flex shrink-0 items-center gap-2">
                <button onClick={() => void handleDownload(game)} disabled={downloading === game.id || !game.uris.length} className={`${ghostButton} px-3 py-1.5`}>
                  {downloading === game.id ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                  Baixar
                </button>
                <button onClick={() => void handleRemove(game)} disabled={removing === game.id} aria-label={`Remover ${game.title} da biblioteca`} title="Remover da biblioteca" className={`${iconButton} hover:text-red-400`}>
                  {removing === game.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {uriPickerGame && (
        <div className="fixed inset-x-0 bottom-0 top-13 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onMouseDown={e => { if (e.target === e.currentTarget) setUriPickerGame(null); }}>
          <div role="dialog" aria-modal="true" aria-label="Escolha um link" className="mx-4 w-full max-w-lg rounded-lg border border-line bg-panel shadow-2xl">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-sm font-bold text-zinc-100">Escolha um link de download</h2>
                <p className="mt-0.5 truncate text-xs text-zinc-500">{uriPickerGame.title}</p>
              </div>
              <button onClick={() => setUriPickerGame(null)} aria-label="Fechar" className="ml-3 rounded-md p-1.5 text-zinc-500 hover:bg-raised hover:text-zinc-200"><X size={16} /></button>
            </div>
            <div className="vault-scroll flex max-h-72 flex-col gap-2 overflow-y-auto px-5 py-4">
              {uriPickerGame.uris.map((uri, idx) => (
                <button key={idx} onClick={() => void handleDownload(uriPickerGame, uri)} className="flex items-center gap-3 rounded-md border border-line bg-raised p-3 text-left transition hover:border-zinc-600">
                  <Link2 size={16} className="shrink-0 text-zinc-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-zinc-200">Link {idx + 1}</p>
                    <p className="mt-0.5 truncate text-[11px] text-zinc-500">{extractMagnetName(uri)}</p>
                  </div>
                  <Download size={14} className="shrink-0 text-zinc-500" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
