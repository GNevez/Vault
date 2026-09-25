import React, { useEffect, useMemo, useState } from 'react';
import { Gamepad2, Search, SearchX, X } from 'lucide-react';
import { useRouter } from 'next/router';
import type { SocialPost } from '../../types/social';
import { useSocial, type FeedTab } from '../../hooks/useSocial';
import { EmptyState } from '../ui/EmptyState';
import { ghostButton, tabClass } from '../ui/styles';
import { NotificationsButton } from './NotificationsPanel';
import { PostCard } from './PostCard';
import { PostComposer } from './PostComposer';
import { TrendsPanel } from './TrendsPanel';

const TABS: { id: FeedTab; label: string }[] = [
  { id: 'for-you', label: 'Para você' },
  { id: 'following', label: 'Seguindo' },
];

export function SocialFeed({ username }: { username: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<FeedTab>('for-you');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [replyingTo, setReplyingTo] = useState<SocialPost | null>(null);
  const social = useSocial(tab);

  useEffect(() => setPage(1), [tab]);

  useEffect(() => {
    if (typeof router.query.search === 'string') setSearch(router.query.search);
  }, [router.query.search]);

  useEffect(() => {
    if (!replyingTo) return;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setReplyingTo(null); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [replyingTo]);

  const visiblePosts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return social.posts;
    return social.posts.filter((post) =>
      post.content.toLocaleLowerCase().includes(query) ||
      post.username.toLocaleLowerCase().includes(query) ||
      post.topics.some((topic) => `#${topic}`.toLocaleLowerCase().includes(query)),
    );
  }, [search, social.posts]);

  return (
    <div className="relative flex h-full min-w-0 flex-1 flex-col">
      <div className="vault-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto w-full max-w-[1160px] px-8 pb-10 pt-7">
          <header className="relative z-30 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-[28px] font-bold leading-tight tracking-tight text-zinc-50">Comunidade</h1>
              <p className="mt-1 text-sm text-zinc-500">O que seus amigos estão jogando e compartilhando.</p>
            </div>
            <div className="flex w-full max-w-80 items-center gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  onKeyDown={(event) => { if (event.key === 'Escape') setSearch(''); }}
                  placeholder="Buscar posts, jogadores ou #tags"
                  aria-label="Buscar na comunidade"
                  className="h-10 w-full rounded-md border border-line bg-raised pl-9 pr-9 text-[13px] text-zinc-100 placeholder:text-zinc-500 focus:border-accent/60 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
                />
                {search && <button onClick={() => setSearch('')} aria-label="Limpar busca" className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded text-zinc-500 hover:text-zinc-200"><X size={14} /></button>}
              </div>
              <NotificationsButton notifications={social.notifications} unreadCount={social.unreadCount} onOpen={() => social.markNotificationsRead().catch(() => {})} />
            </div>
          </header>

          <nav role="tablist" aria-label="Feed" className="mb-6 mt-5 flex gap-1 border-b border-line">
            {TABS.map(({ id, label }) => (
              <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={tabClass(tab === id)}>
                {label}
                {tab === id && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent" />}
              </button>
            ))}
          </nav>

          <div className="flex gap-8">
            <main className="min-w-0 flex-1 space-y-4">
              <section aria-label="Criar post" className="rounded-lg border border-line bg-raised">
                <PostComposer username={username} onSubmit={social.createPost} />
              </section>

              {search.trim() && (
                <p className="flex items-center gap-2 text-xs text-zinc-500">
                  {visiblePosts.length} {visiblePosts.length === 1 ? 'resultado' : 'resultados'} para <span className="font-medium text-zinc-200">“{search.trim()}”</span>
                </p>
              )}

              {social.loading ? (
                <div aria-busy className="divide-y divide-line rounded-lg border border-line bg-raised">
                  {[0, 1, 2].map((item) => (
                    <div key={item} className="flex gap-3 px-5 py-5">
                      <div className="h-10 w-10 animate-pulse rounded-full bg-raised-hover" />
                      <div className="flex-1 space-y-3">
                        <div className="h-3 w-36 animate-pulse rounded bg-raised-hover" />
                        <div className="h-3 w-4/5 animate-pulse rounded bg-raised-hover" />
                        <div className="h-3 w-2/5 animate-pulse rounded bg-raised-hover" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : visiblePosts.length ? (
                <>
                  <div className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-raised">
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
                  </div>
                  {social.hasMore && !search && (
                    <div className="flex justify-center pt-2">
                      <button
                        onClick={() => {
                          const nextPage = page + 1;
                          setPage(nextPage);
                          void social.loadFeed(nextPage, true);
                        }}
                        className={ghostButton}
                      >
                        Carregar mais
                      </button>
                    </div>
                  )}
                </>
              ) : search.trim() ? (
                <EmptyState icon={SearchX} title="Nenhum post corresponde à busca" description="Tente outro jogador, jogo ou hashtag." action={<button onClick={() => setSearch('')} className={ghostButton}>Limpar busca</button>} />
              ) : (
                <EmptyState
                  icon={Gamepad2}
                  title={tab === 'following' ? 'Seu feed de quem você segue está quieto' : 'Seu feed começa aqui'}
                  description={tab === 'following' ? 'Siga jogadores para ver os posts deles nesta aba.' : 'Compartilhe uma captura de tela, uma opinião ou o jogo que você está jogando agora.'}
                  action={tab === 'following' ? <button onClick={() => setTab('for-you')} className={ghostButton}>Ver “Para você”</button> : undefined}
                />
              )}
            </main>

            <TrendsPanel trends={social.trends} active={search.trim()} onSelect={setSearch} />
          </div>
        </div>
      </div>

      {replyingTo && (
        <div className="absolute inset-0 z-50 grid place-items-center bg-black/70 p-6 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setReplyingTo(null); }}>
          <div role="dialog" aria-modal="true" aria-label={`Responder a ${replyingTo.username}`} className="w-full max-w-lg overflow-hidden rounded-lg border border-line bg-panel shadow-2xl">
            <div className="flex items-center gap-3 border-b border-line px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-zinc-100">Responder a @{replyingTo.username}</p>
                <p className="mt-0.5 truncate text-xs text-zinc-500">{replyingTo.content}</p>
              </div>
              <button onClick={() => setReplyingTo(null)} aria-label="Fechar" className="grid h-8 w-8 place-items-center rounded-md text-zinc-500 transition hover:bg-raised hover:text-white">
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
