import React from 'react';
import { Bell, Heart, MessageCircle, Repeat2, UserPlus } from 'lucide-react';
import type { SocialNotification } from '../../types/social';
import { Avatar } from './Avatar';
import { useRouter } from 'next/router';

const copy = {
  like: 'liked your post',
  repost: 'reposted your post',
  reply: 'replied to your post',
  follow: 'started following you',
  friend_request: 'sent you a friend request',
  friend_accepted: 'accepted your friend request',
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
    <section aria-label="Notifications panel" className="absolute right-0 top-full z-50 mt-2 w-[min(360px,calc(100vw-32px))] overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-950 shadow-2xl shadow-black/70">
      <div className="border-b border-zinc-800 px-4 py-4">
        <h3 className="flex items-center gap-2 text-sm font-bold text-zinc-100"><Bell size={15} className="text-zinc-400" /> Notifications</h3>
        <p className="mt-1 text-xs text-zinc-500">Your latest community activity</p>
      </div>
      <div className="vault-scroll max-h-[calc(100vh-170px)] overflow-y-auto">
        {notifications.length ? notifications.map((notification) => {
          const Icon = icons[notification.type] || Heart;
          return (
            <button key={notification.id} onClick={() => router.push({ pathname: '/dashboard', query: notification.postId ? { post: notification.postId } : { profile: notification.actorId } }, undefined, { shallow: true })} className={`flex w-full gap-3 border-b border-zinc-800 px-4 py-3 text-left transition last:border-b-0 hover:bg-zinc-900 ${notification.isRead ? '' : 'bg-white/[0.035]'}`}>
              <div className="relative shrink-0">
                <Avatar username={notification.actorUsername} src={notification.actorAvatarUrl} size="sm" />
                <span className="absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-full bg-zinc-200 text-zinc-950 ring-2 ring-zinc-950">
                  <Icon className="h-2.5 w-2.5" />
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs leading-5 text-zinc-400">
                  <span className="font-bold text-zinc-200">{notification.actorUsername}</span>{' '}
                  {copy[notification.type]}
                </p>
                {notification.postPreview && <p className="mt-1 truncate text-xs text-zinc-500">{notification.postPreview}</p>}
              </div>
              {!notification.isRead && <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-200" />}
            </button>
          );
        }) : (
          <div className="flex flex-col items-center px-6 py-8 text-center">
            <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-500"><Bell size={18} /></div>
            <p className="text-xs font-semibold text-zinc-300">You are all caught up</p>
            <p className="mt-1 text-xs text-zinc-500">New activity will appear here.</p>
          </div>
        )}
      </div>
    </section>
  );
}
