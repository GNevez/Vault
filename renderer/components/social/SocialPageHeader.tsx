import React, { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/router';
import { toast } from 'sonner';
import { authFetch } from '../../lib/api';
import { NotificationList } from '../../types/social';
import { iconButton } from '../ui/styles';
import { NotificationsButton } from './NotificationsPanel';

/** Header for secondary Community pages (post, profile): back, title and notifications. */
export function SocialPageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const router = useRouter();
  const [data, setData] = useState<NotificationList>({ items: [], unreadCount: 0 });
  useEffect(() => {
    let active = true;
    const load = () => authFetch('/api/Social/notifications').then(result => { if (active) setData(result); }).catch(() => {});
    load(); const timer = setInterval(load, 30000);
    return () => { active = false; clearInterval(timer); };
  }, []);
  const markRead = async () => {
    if (!data.unreadCount) return;
    try {
      await authFetch('/api/Social/notifications/read', { method: 'POST' });
      setData(current => ({ unreadCount: 0, items: current.items.map(n => ({ ...n, isRead: true })) }));
    } catch (e: any) { toast.error(e.message); }
  };
  return <header className="relative z-30 mb-6 flex items-center gap-3">
    <button aria-label="Voltar" title="Voltar" onClick={() => window.history.length > 1 ? router.back() : router.replace('/dashboard')} className={`${iconButton} h-10 w-10`}><ArrowLeft size={17} /></button>
    <div className="min-w-0 flex-1">
      <h1 className="truncate text-xl font-bold tracking-tight text-zinc-50">{title}</h1>
      {subtitle && <p className="text-xs text-zinc-500">{subtitle}</p>}
    </div>
    <NotificationsButton notifications={data.items} unreadCount={data.unreadCount} onOpen={markRead} />
  </header>;
}
