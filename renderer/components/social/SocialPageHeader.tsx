import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Bell } from 'lucide-react';
import { useRouter } from 'next/router';
import { authFetch } from '../../lib/api';
import { NotificationList } from '../../types/social';
import { NotificationsPanel } from './NotificationsPanel';
import { toast } from 'sonner';

export function SocialPageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<NotificationList>({ items: [], unreadCount: 0 });
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let active = true;
    const load = () => authFetch('/api/Social/notifications').then(result => { if (active) setData(result); }).catch(() => {});
    load(); const timer = setInterval(load, 30000);
    const close = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => { active = false; clearInterval(timer); document.removeEventListener('mousedown', close); };
  }, []);
  useEffect(() => setOpen(false), [router.asPath]);
  return <header className="relative z-30 flex h-16 shrink-0 items-center gap-4 border-b border-zinc-800 px-4 bg-background-dark/95">
    <button aria-label="Back" onClick={() => window.history.length > 1 ? router.back() : router.replace('/dashboard')} className="rounded-full p-2 hover:bg-zinc-800"><ArrowLeft size={18} /></button>
    <div className="min-w-0 flex-1"><h1 className="truncate font-bold text-base">{title}</h1>{subtitle && <p className="text-xs text-zinc-500">{subtitle}</p>}</div>
    <div ref={root} className="relative flex h-full items-center">
      <button aria-label="Notifications" aria-expanded={open} className={`relative rounded-full p-2 ${open ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-100'}`} onClick={async () => {
        setOpen(!open);
        if (!open && data.unreadCount) try {
          await authFetch('/api/Social/notifications/read', { method: 'POST' });
          setData(current => ({ unreadCount: 0, items: current.items.map(n => ({ ...n, isRead: true })) }));
        } catch (e: any) { toast.error(e.message); }
      }}><Bell size={18} />{data.unreadCount > 0 && <span className="absolute right-0 top-0 h-2 w-2 rounded-full bg-white" />}</button>
      {open && <NotificationsPanel notifications={data.items} />}
    </div>
  </header>;
}
