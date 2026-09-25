import React, { useCallback, useEffect, useState } from 'react';
import { Bell, Heart, MessageCircle, Repeat2, UserPlus } from 'lucide-react';
import type { SocialNotification } from '../../types/social';
import { useDismiss } from '../layout/AppTopBar';
import { Avatar } from './Avatar';
import { useRouter } from 'next/router';

const copy = {
  like: 'curtiu seu post',
  repost: 'repostou seu post',
  reply: 'respondeu ao seu post',
  follow: 'começou a seguir você',
  friend_request: 'enviou um pedido de amizade',
  friend_accepted: 'aceitou seu pedido de amizade',
};

const icons = {
  like: Heart,
  repost: Repeat2,
  reply: MessageCircle,
  follow: UserPlus,
  friend_request: UserPlus,
  friend_accepted: UserPlus,
};

export function NotificationsPanel({ notifications }: { notifications: SocialNotification[] }) {
  const router = useRouter();
  return (
    <section aria-label="Notificações" className="absolute right-0 top-full z-50 mt-2 w-[min(360px,calc(100vw-32px))] overflow-hidden rounded-lg border border-line bg-panel shadow-2xl shadow-black/60">
      <div className="border-b border-line px-4 py-3.5">
        <h3 className="text-sm font-semibold text-zinc-100">Notificações</h3>
        <p className="mt-0.5 text-xs text-zinc-500">Sua atividade recente na comunidade</p>
      </div>
      <div className="vault-scroll max-h-[calc(100vh-200px)] overflow-y-auto">
        {notifications.length ? notifications.map((notification) => {
          const Icon = icons[notification.type] || Heart;
          return (
            <button key={notification.id} onClick={() => router.push({ pathname: '/dashboard', query: notification.postId ? { post: notification.postId } : { profile: notification.actorId } }, undefined, { shallow: true })} className="flex w-full gap-3 border-b border-line px-4 py-3 text-left transition last:border-b-0 hover:bg-raised">
              <div className="relative shrink-0">
                <Avatar username={notification.actorUsername} src={notification.actorAvatarUrl} size="sm" />
                <span className="absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-full bg-raised-hover text-zinc-300 ring-2 ring-panel">
                  <Icon className="h-2.5 w-2.5" />
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs leading-5 text-zinc-400">
                  <span className="font-semibold text-zinc-200">{notification.actorUsername}</span>{' '}
                  {copy[notification.type]}
                </p>
                {notification.postPreview && <p className="mt-0.5 truncate text-xs text-zinc-500">{notification.postPreview}</p>}
              </div>
              {!notification.isRead && <span aria-label="Não lida" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />}
            </button>
          );
        }) : (
          <div className="flex flex-col items-center px-6 py-8 text-center">
            <div className="mb-3 grid h-10 w-10 place-items-center rounded-lg bg-raised text-zinc-500"><Bell size={18} /></div>
            <p className="text-xs font-semibold text-zinc-300">Tudo em dia</p>
            <p className="mt-1 text-xs text-zinc-500">Novas atividades aparecem aqui.</p>
          </div>
        )}
      </div>
    </section>
  );
}

/** Bell with unread badge; opening it marks everything as read. */
export function NotificationsButton({ notifications, unreadCount, onOpen }: { notifications: SocialNotification[]; unreadCount: number; onOpen: () => Promise<void> | void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useDismiss(open, close);
  useEffect(() => setOpen(false), [router.asPath]);
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { const next = !open; setOpen(next); if (next) void onOpen(); }}
        aria-label={unreadCount ? `Notificações (${unreadCount} não lidas)` : 'Notificações'}
        aria-expanded={open}
        title="Notificações"
        className={`relative grid h-10 w-10 place-items-center rounded-md border border-line transition ${open ? 'bg-raised text-zinc-100' : 'text-zinc-400 hover:bg-raised hover:text-zinc-100'}`}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-ink ring-2 ring-background-dark">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      {open && <NotificationsPanel notifications={notifications} />}
    </div>
  );
}
