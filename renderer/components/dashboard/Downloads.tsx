import React from "react";
import { ArrowDown, ArrowRight, ArrowUp, Download, Loader2, Pause, Play, SearchX, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import type { DownloadsApi } from "../../hooks/useApi";
import { EmptyState, GameArt, formatBytes, formatSpeed, ghostButton, iconButton, downloadState, isPausedDownload, isRunningDownload, type GamesTab } from "./gameUi";

export function Downloads({ query, downloads: api, onTab }: { query: string; downloads: DownloadsApi; onTab: (tab: GamesTab) => void }) {
  const { downloads, loading, pause, resume, cancel } = api;

  const run = async (action: () => Promise<void>, failure: string, success?: string) => {
    try {
      await action();
      if (success) toast.success(success);
    } catch (err: any) {
      toast.error(err.message || failure);
    }
  };

  const term = query.trim().toLocaleLowerCase();
  const visible = term ? downloads.filter(d => d.title.toLocaleLowerCase().includes(term)) : downloads;

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-zinc-500" /></div>;

  if (!downloads.length) {
    return (
      <EmptyState
        icon={Download}
        title="Nenhum download no momento"
        description="Os jogos que você baixar pela biblioteca aparecem aqui com o progresso em tempo real."
        action={<button onClick={() => onTab("library")} className={ghostButton}>Ir para a biblioteca<ArrowRight size={15} /></button>}
      />
    );
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold tracking-tight text-zinc-50">Fila de downloads</h2>
        <span className="text-xs text-zinc-500">{downloads.length} {downloads.length === 1 ? "item" : "itens"}</span>
      </div>

      {!visible.length ? (
        <EmptyState icon={SearchX} title="Nenhum download corresponde à busca" description="Tente outro termo." />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-raised">
          {visible.map(dl => {
            const state = downloadState(dl.state);
            const progress = Math.min(Math.max(dl.progress, 0), 100);
            return (
              <li key={dl.id} className="flex items-center gap-4 p-4">
                <GameArt title={dl.title} size="sm" className="hidden h-14 w-24 shrink-0 rounded-md sm:block" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-3">
                    <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-100" title={dl.title}>{dl.title}</h3>
                    <span className={`shrink-0 text-xs font-medium ${state.tone}`}>{state.label}</span>
                    <span className="w-12 shrink-0 text-right text-xs tabular-nums text-zinc-400">{progress.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%</span>
                  </div>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-zinc-800" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)} aria-label={`Progresso de ${dl.title}`}>
                    <div className={`h-full rounded-full transition-all duration-500 ${dl.state === "Error" ? "bg-red-400" : isPausedDownload(dl.state) ? "bg-zinc-500" : "bg-accent"}`} style={{ width: `${progress}%` }} />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] tabular-nums text-zinc-500">
                    <span>{formatBytes(dl.downloadedBytes)} de {formatBytes(dl.totalSize)}</span>
                    <span className="flex items-center gap-1"><ArrowDown size={12} />{formatSpeed(dl.downloadSpeed)}</span>
                    <span className="flex items-center gap-1"><ArrowUp size={12} />{formatSpeed(dl.uploadSpeed)}</span>
                    <span className="flex items-center gap-1"><Users size={12} />{dl.seeds} seeds · {dl.peers} peers</span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {isPausedDownload(dl.state) ? (
                    <button onClick={() => void run(() => resume(dl.id), "Não foi possível retomar")} aria-label={`Retomar ${dl.title}`} title="Retomar" className={iconButton}><Play size={15} /></button>
                  ) : isRunningDownload(dl.state) ? (
                    <button onClick={() => void run(() => pause(dl.id), "Não foi possível pausar")} aria-label={`Pausar ${dl.title}`} title="Pausar" className={iconButton}><Pause size={15} /></button>
                  ) : null}
                  <button onClick={() => void run(() => cancel(dl.id), "Não foi possível cancelar", "Download cancelado")} aria-label={`Cancelar ${dl.title}`} title="Cancelar" className={`${iconButton} hover:text-red-400`}><Trash2 size={15} /></button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
