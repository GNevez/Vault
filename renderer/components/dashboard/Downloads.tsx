import React from "react";
import {
  Download,
  Pause,
  Play,
  Trash2,
  Loader2,
  HardDrive,
  ArrowDown,
  ArrowUp,
  Users,
} from "lucide-react";
import { useDownloads } from "../../hooks/useApi";
import { toast } from "sonner";

export function Downloads() {
  const { downloads, loading, pause, resume, cancel } = useDownloads(2000);

  const handlePause = async (id: string) => {
    try {
      await pause(id);
    } catch (err: any) {
      toast.error(err.message || "Failed to pause");
    }
  };

  const handleResume = async (id: string) => {
    try {
      await resume(id);
    } catch (err: any) {
      toast.error(err.message || "Failed to resume");
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await cancel(id);
      toast.success("Download cancelled");
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel");
    }
  };

  const formatSpeed = (bytesPerSec: number) => {
    if (bytesPerSec < 1024) return `${bytesPerSec} B/s`;
    if (bytesPerSec < 1024 * 1024)
      return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
    return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
  };

  const formatSize = (bytes: number) => {
    if (bytes <= 0) return "—";
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024)
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const getStateLabel = (state: string) => {
    const map: Record<string, { label: string; color: string }> = {
      Downloading: { label: "Downloading", color: "text-emerald-400" },
      Seeding: { label: "Seeding", color: "text-blue-400" },
      Paused: { label: "Paused", color: "text-yellow-400" },
      Stopped: { label: "Stopped", color: "text-zinc-500" },
      Hashing: { label: "Checking", color: "text-orange-400" },
      Metadata: { label: "Getting metadata", color: "text-purple-400" },
      Starting: { label: "Starting", color: "text-zinc-400" },
      Error: { label: "Error", color: "text-red-400" },
    };
    return map[state] || { label: state, color: "text-zinc-500" };
  };

  const isPaused = (state: string) => state === "Paused" || state === "Stopped";
  const isActive = (state: string) =>
    state === "Downloading" || state === "Seeding" || state === "Metadata" || state === "Hashing";

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <header className="flex items-center gap-4 px-6 h-16 border-b border-border-dark shrink-0">
        <div className="min-w-0">
          <h1 className="text-sm font-bold text-zinc-50 tracking-tight">
            Downloads
          </h1>
          <p className="text-[10px] text-zinc-500">
            {downloads.length} download{downloads.length !== 1 ? "s" : ""}
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
          </div>
        ) : downloads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Download
              className="w-8 h-8 text-zinc-700 mb-3"
              strokeWidth={1.5}
            />
            <p className="text-sm text-zinc-500 mb-1">No active downloads</p>
            <p className="text-xs text-zinc-600">
              Start a download from your Library
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {downloads.map((dl) => {
              const stateInfo = getStateLabel(dl.state);
              return (
                <div
                  key={dl.id}
                  className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                      <Download
                        className="w-4 h-4 text-zinc-400"
                        strokeWidth={1.8}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-zinc-100 truncate">
                        {dl.title}
                      </h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span
                          className={`text-[11px] font-medium ${stateInfo.color}`}
                        >
                          {stateInfo.label}
                        </span>
                        <span className="text-[11px] text-zinc-500">
                          {dl.progress.toFixed(1)}%
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="mt-2 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                          style={{ width: `${Math.min(dl.progress, 100)}%` }}
                        />
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-4 mt-2 text-[10px] text-zinc-500">
                        <div className="flex items-center gap-1">
                          <ArrowDown className="w-3 h-3" />
                          <span>{formatSpeed(dl.downloadSpeed)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <ArrowUp className="w-3 h-3" />
                          <span>{formatSpeed(dl.uploadSpeed)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <HardDrive className="w-3 h-3" />
                          <span>
                            {formatSize(dl.downloadedBytes)} /{" "}
                            {formatSize(dl.totalSize)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          <span>
                            {dl.seeds}S / {dl.peers}P
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {isPaused(dl.state) ? (
                        <button
                          onClick={() => handleResume(dl.id)}
                          title="Resume"
                          className="p-2 rounded-lg text-zinc-600 hover:text-emerald-400 hover:bg-zinc-800 transition-colors cursor-pointer"
                        >
                          <Play className="w-4 h-4" strokeWidth={1.8} />
                        </button>
                      ) : isActive(dl.state) ? (
                        <button
                          onClick={() => handlePause(dl.id)}
                          title="Pause"
                          className="p-2 rounded-lg text-zinc-600 hover:text-yellow-400 hover:bg-zinc-800 transition-colors cursor-pointer"
                        >
                          <Pause className="w-4 h-4" strokeWidth={1.8} />
                        </button>
                      ) : null}
                      <button
                        onClick={() => handleCancel(dl.id)}
                        title="Cancel"
                        className="p-2 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-zinc-800 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" strokeWidth={1.8} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
