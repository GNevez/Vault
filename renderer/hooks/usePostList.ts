import { useCallback, useEffect, useRef, useState } from 'react';
import { authFetch } from '../lib/api';
import { SocialFeedResponse, SocialPost } from '../types/social';

export function usePostList(endpoint: string) {
  const [items, setItems] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const page = useRef(0);
  const generation = useRef(0);
  const pending = useRef(false);
  const load = useCallback(async (reset = false) => {
    if (!reset && pending.current) return;
    const ticket = reset ? ++generation.current : generation.current;
    pending.current = true; setLoading(true); setError('');
    if (reset) { page.current = 0; setItems([]); }
    const next = page.current + 1;
    try {
      const result: SocialFeedResponse = await authFetch(`${endpoint}${endpoint.includes('?') ? '&' : '?'}page=${next}`);
      if (ticket !== generation.current) return;
      setItems(old => reset ? result.items : old.concat(result.items.filter(p => !old.some(o => o.id === p.id))));
      page.current = next; setHasMore(result.hasMore);
    } catch (e: any) { if (ticket === generation.current) setError(e.message); }
    finally { if (ticket === generation.current) { pending.current = false; setLoading(false); } }
  }, [endpoint]);
  useEffect(() => { load(true); return () => { generation.current++; pending.current = false; }; }, [load]);
  return { items, setItems, loading, error, hasMore, load };
}
