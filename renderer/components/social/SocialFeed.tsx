import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, Gamepad2, Sparkles, X } from 'lucide-react';
import { useRouter } from 'next/router';
import type { SocialPost } from '../../types/social';
import { useSocial, type FeedTab } from '../../hooks/useSocial';
import { NotificationsPanel } from './NotificationsPanel';
import { PostCard } from './PostCard';
import { PostComposer } from './PostComposer';
import { TrendsPanel } from './TrendsPanel';

export function SocialFeed({ username }: { username: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<FeedTab>('for-you');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState<SocialPost | null>(null);
  const notificationArea = useRef<HTMLDivElement>(null);
  const social = useSocial(tab);

  useEffect(() => setPage(1), [tab]);

  useEffect(() => {
    if (typeof router.query.search === 'string') setSearch(router.query.search);
  }, [router.query.search]);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!notificationArea.current?.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, []);

  const visiblePosts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return social.posts;
    return social.posts.filter((post) =>
      post.content.toLocaleLowerCase().includes(query) ||
      post.username.toLocaleLowerCase().includes(query) ||
      post.topics.some((topic) => `#${topic}`.toLocaleLowerCase().includes(query)),
    );
  }, [search, social.posts]);

  const openNotifications = async () => {
    const next = !notificationsOpen;
    setNotificationsOpen(next);
    if (next) await social.markNotificationsRead();
  };

  return (
    <div className="relative flex h-full min-w-0 flex-1 overflow-hidden bg-background-dark">
      <main className="flex min-w-0 flex-1 flex-col border-r border-border-dark">
        <header className="relative z-30 flex h-16 shrink-0 items-stretch border-b border-border-dark bg-background-dark/95">
          <div className="flex min-w-0 flex-1 items-stretch">
            <button
              onClick={() => setTab('for-you')}
              className={`relative flex-1 text-xs font-semibold transition hover:bg-white/[0.025] ${tab === 'for-you' ? 'text-zinc-100' : 'text-zinc-600'}`}
            >
              For you
              {tab === 'for-you' && <span className="absolute bottom-0 left-1/2 h-0.5 w-12 -translate-x-1/2 rounded-full bg-zinc-100" />}
            </button>
            <button
              onClick={() => setTab('following')}
              className={`relative flex-1 text-xs font-semibold transition hover:bg-white/[0.025] ${tab === 'following' ? 'text-zinc-100' : 'text-zinc-600'}`}
            >
              Following
              {tab === 'following' && <span className="absolute bottom-0 left-1/2 h-0.5 w-12 -translate-x-1/2 rounded-full bg-zinc-100" />}
            </button>
          </div>

          <div ref={notificationArea} className="relative flex w-16 items-center justify-center border-l border-zinc-900">
            <button
              onClick={openNotifications}
              aria-label="Notifications"
              aria-expanded={notificationsOpen}
              className={`relative grid h-9 w-9 place-items-center rounded-full transition ${notificationsOpen ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-100'}`}
              title="Notifications"
            >
              <Bell className="h-4 w-4" />
              {social.unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-red-500 px-1 text-center text-[9px] font-bold leading-4 text-white ring-2 ring-background-dark">
                  {social.unreadCount > 9 ? '9+' : social.unreadCount}
                </span>
              )}
            </button>
            {notificationsOpen && <NotificationsPanel notifications={social.notifications} />}
          </div>
        </header>

        <div className="vault-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <PostComposer username={username} onSubmit={social.createPost} />

          {social.loading ? (
            <div className="space-y-px">
              {[0, 1, 2].map((item) => (
                <div key={item} className="flex gap-3 border-b border-border-dark px-5 py-5">
                  <div className="h-10 w-10 animate-pulse rounded-full bg-zinc-900" />
                  <div className="flex-1 space-y-3">
                    <div className="h-3 w-36 animate-pulse rounded bg-zinc-900" />
                    <div className="h-3 w-4/5 animate-pulse rounded bg-zinc-900" />
                    <div className="h-3 w-2/5 animate-pulse rounded bg-zinc-900" />
                  </div>
                </div>
              ))}
            </div>
          ) : visiblePosts.length ? (
            <>
              {visiblePosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onLike={() => social.toggleLike(post.id)}
                  onRepost={() => social.toggleRepost(post.id)}
                  onReply={() => setReplyingTo(post)}
                  onFollow={() => social.toggleFollow(post.authorId)}
                  currentUsername={username}
                />
              ))}
              {social.hasMore && !search && (
                <div className="flex justify-center py-5">
                  <button
                    onClick={() => {
                      const nextPage = page + 1;
                      setPage(nextPage);
                      social.loadFeed(nextPage, true);
                    }}
                    className="rounded-full border border-zinc-800 px-4 py-2 text-[11px] font-semibold text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-100"
                  >
                    Load more
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center px-8 py-20 text-center">
              <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-zinc-800 bg-zinc-900/60">
                {search ? <Sparkles className="h-6 w-6 text-zinc-600" /> : <Gamepad2 className="h-6 w-6 text-zinc-500" />}
              </div>
              <h2 className="text-sm font-bold text-zinc-200">
                {search ? 'No posts match your search' : tab === 'following' ? 'Your following feed is quiet' : 'Your gaming feed starts here'}
              </h2>
              <p className="mt-1 max-w-xs text-[11px] leading-5 text-zinc-600">
                {search ? 'Try a different player, game or hashtag.' : 'Share a screenshot, an opinion or the game you are playing right now.'}
              </p>
            </div>
          )}
        </div>
      </main>

      <TrendsPanel trends={social.trends} search={search} onSearch={setSearch} />

      {replyingTo && (
        <div className="absolute inset-0 z-50 grid place-items-center bg-black/70 p-6 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-950 shadow-2xl">
            <div className="flex items-center border-b border-zinc-800 px-4 py-3">
              <div>
                <p className="text-xs font-bold text-zinc-100">Reply to @{replyingTo.username}</p>
                <p className="mt-0.5 max-w-md truncate text-[10px] text-zinc-600">{replyingTo.content}</p>
              </div>
              <div className="flex-1" />
              <button onClick={() => setReplyingTo(null)} className="rounded-full p-2 text-zinc-600 transition hover:bg-zinc-800 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <PostComposer
              username={username}
              compact
              autoFocus
              replyTo={replyingTo.username}
              onSubmit={async (content, image) => {
                await social.createPost(content, image, replyingTo.id);
                setReplyingTo(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
