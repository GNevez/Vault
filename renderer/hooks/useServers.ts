import { useCallback, useEffect, useState } from 'react';
import { authFetch } from '../lib/api';
import { ServerDetail, ServerSummary } from '../types/servers';

export function useServers() {
  const [servers, setServers] = useState<ServerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    setLoading(true); setError('');
    try { setServers(await authFetch('/api/Servers')); }
    catch (e: any) { setError(e.message || 'Não foi possível carregar os servidores.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  return { servers, loading, error, refresh };
}

/** Polls one server's channels, members and voice presence. Shared by the side panel and the server screen. */
export function useServerDetail(serverId?: number) {
  const [server, setServer] = useState<ServerDetail | null>(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    setServer(null); setError('');
    if (!serverId) return;
    let active = true, pending = false;
    const load = async () => {
      if (pending) return; pending = true;
      try { const data = await authFetch(`/api/Servers/${serverId}`); if (active) { setServer(data); setError(''); } }
      catch (e: any) { if (active) setError(e.message); }
      finally { pending = false; }
    };
    void load(); const timer = setInterval(load, 5000);
    return () => { active = false; clearInterval(timer); };
  }, [serverId, revision]);
  const reload = useCallback(() => setRevision(n => n + 1), []);
  return { server, error, reload };
}
