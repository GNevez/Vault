import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { ArrowUpLeft, Heart, Repeat2, MessageCircle, Share2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { authFetch, apiAssetUrl } from '../../lib/api';
import { SocialPost } from '../../types/social';
import { Avatar } from './Avatar';
import { PostComposer } from './PostComposer';
import { SocialPageHeader } from './SocialPageHeader';
import { InteractivePost } from './InteractivePost';
import { usePostList } from '../../hooks/usePostList';

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
  return <section className="flex h-full min-h-0 min-w-0 max-w-[860px] flex-1 flex-col border-r border-zinc-800">
    <SocialPageHeader title="Post" subtitle="A conversation in Vault" />
    <div className="vault-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain">
      {error ? <div role="alert" className="p-10 text-center text-zinc-400">{error}<button className="block mx-auto mt-4 underline" onClick={() => setRetry(n => n + 1)}>Try again</button></div> : !post ? <Loader2 className="animate-spin m-10 mx-auto" /> : <>
        <article className="px-6 pt-5">
          {post.replyToPostId && <button className="mb-4 flex items-center gap-2 text-xs text-zinc-400 hover:text-white" onClick={() => router.push({ pathname: '/dashboard', query: { post: post.replyToPostId } }, undefined, { shallow: true })}><ArrowUpLeft size={14} /> View parent post</button>}
          <button onClick={profile} className="flex gap-3 items-center text-left hover:opacity-80"><Avatar username={post.username} src={post.avatarUrl} size="lg" /><div><p className="font-bold">{post.username}</p><p className="text-sm text-zinc-500">@{post.username}</p></div></button>
          <p className="whitespace-pre-wrap break-words text-xl leading-8 mt-5">{post.content}</p>
          {post.mediaUrl && <img src={apiAssetUrl(post.mediaUrl)!} alt="Post attachment" className="mt-4 rounded-2xl border border-zinc-800 w-full max-h-[580px] object-contain bg-black" />}
          <time className="block text-xs text-zinc-500 py-5">{new Date(post.createdAt.endsWith('Z') ? post.createdAt : `${post.createdAt}Z`).toLocaleString()}</time>
          <div className="flex flex-wrap gap-6 border-y border-zinc-800 py-4 text-sm text-zinc-500"><span><b className="text-white">{post.replyCount}</b> replies</span><span><b className="text-white">{post.repostCount}</b> reposts</span><span><b className="text-white">{post.likeCount}</b> likes</span></div>
          <div className="flex justify-around py-3 border-b border-zinc-800">
            <button title="Reply" onClick={() => document.getElementById('detail-reply')?.querySelector('textarea')?.focus()} className="p-2 hover:text-sky-400"><MessageCircle size={20} /></button>
            <button title="Repost" disabled={busy} onClick={() => react('repost')} className={`p-2 ${post.isReposted ? 'text-emerald-400' : 'text-zinc-500'}`}><Repeat2 size={20} /></button>
            <button title="Like" disabled={busy} onClick={() => react('like')} className={`p-2 ${post.isLiked ? 'text-rose-400' : 'text-zinc-500'}`}><Heart size={20} fill={post.isLiked ? 'currentColor' : 'none'} /></button>
            <button title="Copy post link" className="p-2 text-zinc-500" onClick={() => navigator.clipboard.writeText(`${location.href.split('?')[0]}?post=${id}`).then(() => toast.success('Post link copied')).catch(() => toast.error('Could not copy link'))}><Share2 size={20} /></button>
          </div>
        </article>
        <div id="detail-reply"><PostComposer username={username} replyTo={post.username} onSubmit={async (content, image) => {
          const body = new FormData(); body.append('content', content); body.append('replyToPostId', String(id)); if (image) body.append('image', image);
          await authFetch('/api/Social/posts', { method: 'POST', body });
          setPost(p => p && ({ ...p, replyCount: p.replyCount + 1 })); await replies.load(true);
        }} /></div>
        {replies.items.map(reply => <InteractivePost key={reply.id} post={reply} username={username} update={updated => replies.setItems(items => items.map(p => p.id === updated.id ? updated : p))} />)}
        {replies.error && <p role="alert" className="p-6 text-red-300">{replies.error}<button className="ml-3 underline" onClick={() => replies.load(true)}>Retry</button></p>}
        {replies.loading ? <Loader2 className="animate-spin m-6 mx-auto" /> : !replies.items.length && !replies.error ? <p className="text-center text-zinc-500 py-10">Be the first to join this conversation.</p> : replies.hasMore && <button className="w-full p-4 text-sm hover:bg-zinc-900" onClick={() => replies.load()}>More replies</button>}
      </>}
    </div>
  </section>;
}
