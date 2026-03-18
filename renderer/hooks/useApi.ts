import { useState, useEffect, useCallback } from "react";
import { authFetch } from "../lib/api";
import { toast } from "sonner";

// ─── Sources ────────────────────────────────────────────────

interface Source {
  id: number;
  url: string;
  name: string;
  createdAt: string;
}

export function useSources() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await authFetch("/api/Source");
      setSources(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load sources");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const add = async (url: string) => {
    const source = await authFetch("/api/Source", {
      method: "POST",
      body: JSON.stringify({ url }),
    });
    setSources((prev) => [source, ...prev]);
    return source as Source;
  };

  const remove = async (id: number) => {
    await authFetch(`/api/Source/${id}`, { method: "DELETE" });
    setSources((prev) => prev.filter((s) => s.id !== id));
  };

  return { sources, loading, add, remove, reload: load };
}

// ─── Catalog ────────────────────────────────────────────────

interface Game {
  title: string;
  uris: string[];
  uploadDate: string;
  fileSize: string;
  sourceName: string;
  sourceId: number;
  gameIndex: number;
}

interface PaginatedGames {
  items: Game[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export function useCatalog() {
  const [data, setData] = useState<PaginatedGames | null>(null);
  const [loading, setLoading] = useState(true);

  const loadGames = useCallback(async (page: number, search: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "15" });
      if (search.trim()) params.set("search", search.trim());
      const result = await authFetch(`/api/Source/games?${params}`);
      setData(result);
    } catch {
      setData({ items: [], page: 1, pageSize: 15, totalItems: 0, totalPages: 0 });
    } finally {
      setLoading(false);
    }
  }, []);

  const addToLibrary = async (sourceId: number, gameIndex: number) => {
    return await authFetch("/api/Library", {
      method: "POST",
      body: JSON.stringify({ sourceId, gameIndex }),
    });
  };

  return { data, loading, loadGames, addToLibrary };
}

// ─── Library ────────────────────────────────────────────────

interface LibraryGame {
  id: number;
  sourceId: number;
  gameIndex: number;
  title: string;
  uris: string[];
  uploadDate: string;
  fileSize: string;
  sourceName: string;
  addedAt: string;
}

export function useLibrary() {
  const [games, setGames] = useState<LibraryGame[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await authFetch("/api/Library");
      setGames(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load library");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (id: number) => {
    await authFetch(`/api/Library/${id}`, { method: "DELETE" });
    setGames((prev) => prev.filter((g) => g.id !== id));
  };

  const startDownload = async (magnetUri: string, title: string) => {
    return await authFetch("/api/Torrent/start", {
      method: "POST",
      body: JSON.stringify({ magnetUri, title }),
    });
  };

  return { games, loading, remove, startDownload, reload: load };
}

// ─── Downloads / Torrent ────────────────────────────────────

interface DownloadItem {
  id: string;
  title: string;
  magnetUri: string;
  state: string;
  progress: number;
  downloadSpeed: number;
  uploadSpeed: number;
  totalSize: number;
  downloadedBytes: number;
  seeds: number;
  peers: number;
  savePath: string;
}

export function useDownloads(pollInterval = 2000) {
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await authFetch("/api/Torrent");
      setDownloads(data);
    } catch {
      // silently fail on polling
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, pollInterval);
    return () => clearInterval(interval);
  }, [load, pollInterval]);

  const pause = async (id: string) => {
    await authFetch(`/api/Torrent/${id}/pause`, { method: "POST" });
  };

  const resume = async (id: string) => {
    await authFetch(`/api/Torrent/${id}/resume`, { method: "POST" });
  };

  const cancel = async (id: string) => {
    await authFetch(`/api/Torrent/${id}`, { method: "DELETE" });
    setDownloads((prev) => prev.filter((d) => d.id !== id));
  };

  return { downloads, loading, pause, resume, cancel, reload: load };
}
