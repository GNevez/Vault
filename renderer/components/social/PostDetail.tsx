import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { ArrowUpLeft, Heart, Link2, Loader2, MessageCircle, MessagesSquare, Repeat2 } from 'lucide-react';
import { toast } from 'sonner';
import { authFetch, apiAssetUrl } from '../../lib/api';
import { SocialPost } from '../../types/social';
import { usePostList } from '../../hooks/usePostList';
import { EmptyState } from '../ui/EmptyState';
import { ghostButton } from '../ui/styles';
import { Avatar } from './Avatar';
import { PostComposer } from './PostComposer';
import { SocialPageHeader } from './SocialPageHeader';
import { InteractivePost } from './InteractivePost';
import { PostAction, PostText, copyPostLink, parseApiDate } from './PostCard';

export function PostDetail({ id, username }: { id: number; username: string }) {
  const router = useRouter();
  const [post, setPost] = useState<SocialPost | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const replies = usePostList(`/api/Social/posts/${id}/replies`);
  useEffect(() => {
    let active = true; setPost(null); setError('');
    authFetch(`/api/Social/posts/${id}`).then(p => { if (active) setPost(p); }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [id, retry]);
  const profile = () => router.push({ pathname: '/dashboard', query: { profile: post!.authorId } }, undefined, { shallow: true });
  const react = async (type: 'like' | 'repost') => {
    if (busy) return; setBusy(true);
    try {
      const result = await authFetch(`/api/Social/posts/${id}/${type}`, { method: 'POST' });
      setPost(p => p && ({ ...p, ...(type === 'like' ? { isLiked: result.active, likeCount: result.count } : { isReposted: result.active, repostCount: result.count }) }));
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };
  const mediaUrl = apiAssetUrl(post?.mediaUrl);

  return <section className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
    <div className="vault-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <div className="mx-auto w-full max-w-3xl px-8 pb-10 pt-7">
        <SocialPageHeader title="Post" subtitle="Uma conversa no VAULT" />
        {error ? <div role="alert" className="rounded-lg border border-red-900/40 bg-red-500/5 p-6 text-center text-sm text-red-400">{error}<button className="mx-auto mt-3 block underline" onClick={() => setRetry(n => n + 1)}>Tentar novamente</button></div> : !post ? <Loader2 aria-label="Carregando post" className="mx-auto my-12 animate-spin text-zinc-500" /> : <>
          <article className="rounded-lg border border-line bg-raised">
            <div className="p-6">
              {post.replyToPostId && <button className="mb-4 flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-200" onClick={() => router.push({ pathname: '/dashboard', query: { post: post.replyToPostId } }, undefined, { shallow: true })}><ArrowUpLeft size={14} />Ver post original{post.replyToUsername && ` de @${post.replyToUsername}`}</button>}
              <button onClick={profile} className="flex items-center gap-3 text-left hover:opacity-80"><Avatar username={post.username} src={post.avatarUrl} size="lg" /><div><p className="text-sm font-semibold text-zinc-100">{post.username}</p><p className="text-xs text-zinc-500">@{post.username.toLowerCase()}</p></div></button>
              {post.content && <div className="mt-5"><PostText content={post.content} large /></div>}
              {mediaUrl && <img src={mediaUrl} alt="Imagem do post" className="mt-4 max-h-[580px] w-full rounded-md border border-line bg-panel object-contain" />}
              <time className="mt-5 block text-xs text-zinc-500" dateTime={parseApiDate(post.createdAt).toISOString()}>{parseApiDate(post.createdAt).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' })}</time>
            </div>
            <div className="flex flex-wrap gap-6 border-t border-line px-6 py-3 text-sm text-zinc-500">
              <span><b className="font-semibold text-zinc-100">{post.replyCount}</b> {post.replyCount === 1 ? 'resposta' : 'respostas'}</span>
              <span><b className="font-semibold text-zinc-100">{post.repostCount}</b> reposts</span>
              <span><b className="font-semibold text-zinc-100">{post.likeCount}</b> curtidas</span>
            </div>
            <div className="flex items-center gap-1 border-t border-line px-4 py-2">
              <PostAction icon={MessageCircle} label="Responder" onClick={() => document.getElementById('detail-reply')?.querySelector('textarea')?.focus()} />
              <PostAction icon={Repeat2} label={post.isReposted ? 'Desfazer repost' : 'Repostar'} active={post.isReposted} disabled={busy} onClick={() => void react('repost')} />
              <PostAction icon={Heart} label={post.isLiked ? 'Descurtir' : 'Curtir'} active={post.isLiked} activeClass="text-rose-400" filled disabled={busy} onClick={() => void react('like')} />
              <div className="flex-1" />
              <PostAction icon={Link2} label="Copiar link" onClick={() => void copyPostLink(id)} />
            </div>
          </article>

          <section id="detail-reply" aria-label="Responder" className="mt-4 rounded-lg border border-line bg-raised">
            <PostComposer username={username} replyTo={post.username} onSubmit={async (content, image) => {
              const body = new FormData(); body.append('content', content); body.append('replyToPostId', String(id)); if (image) body.append('image', image);
              await authFetch('/api/Social/posts', { method: 'POST', body });
              setPost(p => p && ({ ...p, replyCount: p.replyCount + 1 })); await replies.load(true);
            }} />
          </section>

          <h2 className="mb-3 mt-8 text-lg font-bold tracking-tight text-zinc-50">Respostas</h2>
          {replies.error && <p role="alert" className="mb-3 text-sm text-red-400">{replies.error}<button className="ml-3 underline" onClick={() => replies.load(true)}>Tentar novamente</button></p>}
          {replies.items.length > 0 && <div className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-raised">
            {replies.items.map(reply => <InteractivePost key={reply.id} post={reply} username={username} update={updated => replies.setItems(items => items.map(p => p.id === updated.id ? updated : p))} />)}
          </div>}
          {replies.loading ? <Loader2 aria-label="Carregando respostas" className="mx-auto my-6 animate-spin text-zinc-500" /> : !replies.items.length && !replies.error ? <EmptyState icon={MessagesSquare} title="Nenhuma resposta ainda" description="Seja o primeiro a entrar nesta conversa." /> : replies.hasMore && <div className="mt-4 flex justify-center"><button className={ghostButton} onClick={() => replies.load()}>Mais respostas</button></div>}
        </>}
      </div>
    </div>
  </section>;
}
