import React from 'react';
import { Heart, Link2, MessageCircle, Repeat2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiAssetUrl } from '../../lib/api';
import type { SocialPost } from '../../types/social';
import { Avatar } from './Avatar';
import { useRouter } from 'next/router';

export function parseApiDate(date: string) {
  return new Date(/(?:Z|[+-]\d{2}:\d{2})$/.test(date) ? date : `${date}Z`);
}

function relativeTime(date: string) {
  const timestamp = parseApiDate(date);
  const seconds = Math.max(1, Math.floor((Date.now() - timestamp.getTime()) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  return days < 7 ? `${days} d` : timestamp.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
}

export function PostText({ content, large = false }: { content: string; large?: boolean }) {
  return (
    <p className={`whitespace-pre-wrap break-words text-zinc-200 ${large ? 'text-lg leading-8' : 'text-sm leading-6'}`}>
      {content.split(/(#[A-Za-z0-9_À-ÿ]+)/g).map((part, index) =>
        part.startsWith('#')
          ? <span key={index} className="font-medium text-accent">{part}</span>
          : part,
      )}
    </p>
  );
}

export async function copyPostLink(id: number) {
  try {
    await navigator.clipboard.writeText(`${location.href.split('?')[0]}?post=${id}`);
    toast.success('Link do post copiado');
  } catch {
    toast.error('Não foi possível copiar o link');
  }
}

/** Counter button used on posts. Only the like uses a semantic color; everything else stays neutral or amber. */
export function PostAction({ icon: Icon, label, count, active, activeClass = 'text-accent', filled, onClick, disabled }: {
  icon: typeof Heart; label: string; count?: number; active?: boolean; activeClass?: string; filled?: boolean; onClick: () => void; disabled?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled} aria-label={label} aria-pressed={active} title={label} className={`flex h-8 items-center gap-1.5 rounded-md px-2 text-xs tabular-nums transition hover:bg-raised-hover disabled:opacity-50 ${active ? activeClass : 'text-zinc-500 hover:text-zinc-200'}`}>
      <Icon className="h-4 w-4" fill={filled && active ? 'currentColor' : 'none'} />
      {!!count && count > 0 && count}
    </button>
  );
}

export function PostCard({
  post,
  onLike,
  onRepost,
  onReply,
  onFollow,
  currentUsername,
}: {
  post: SocialPost;
  onLike: () => Promise<void>;
  onRepost: () => Promise<void>;
  onReply: () => void;
  onFollow: () => Promise<void>;
  currentUsername: string;
}) {
  const router = useRouter();
  const openPost = () => router.push({ pathname: '/dashboard', query: { post: post.id } }, undefined, { shallow: true });
  const openProfile = () => router.push({ pathname: '/dashboard', query: { profile: post.authorId } }, undefined, { shallow: true });
  const mediaUrl = apiAssetUrl(post.mediaUrl);
  const isMine = post.username.toLocaleLowerCase() === currentUsername.toLocaleLowerCase();

  return (
    <article tabIndex={0} aria-label={`Abrir post de ${post.username}`} onKeyDown={event => {
      if (event.target === event.currentTarget && event.key === 'Enter') openPost();
    }} onClick={event => {
      if (!(event.target as HTMLElement).closest('button, a, input, textarea')) openPost();
    }} className="cursor-pointer px-5 py-4 transition-colors hover:bg-raised-hover/60 focus-visible:outline focus-visible:-outline-offset-2 focus-visible:outline-accent/60">
      <div className="flex gap-3">
        <button onClick={openProfile} aria-label={`Ver perfil de ${post.username}`} className="self-start rounded-full"><Avatar username={post.username} src={post.avatarUrl} size="md" /></button>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <button onClick={openProfile} className="truncate text-sm font-semibold text-zinc-100 hover:underline">{post.username}</button>
            <span className="truncate text-xs text-zinc-500">@{post.username.toLowerCase()}</span>
            <span className="text-xs text-zinc-600">·</span>
            <time className="shrink-0 text-xs text-zinc-500" dateTime={parseApiDate(post.createdAt).toISOString()}>{relativeTime(post.createdAt)}</time>
            <div className="flex-1" />
            {!isMine && (
              <button
                onClick={() => onFollow().catch((error) => toast.error(error.message))}
                className={`shrink-0 rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${post.isFollowingAuthor ? 'text-zinc-500 hover:bg-red-500/10 hover:text-red-400' : 'border border-line text-zinc-200 hover:border-accent/60 hover:text-accent'}`}
              >
                {post.isFollowingAuthor ? 'Seguindo' : 'Seguir'}
              </button>
            )}
          </div>

          {post.replyToUsername && (
            <p className="mt-0.5 text-xs text-zinc-500">
              Respondendo a <span className="text-zinc-300">@{post.replyToUsername}</span>
            </p>
          )}
          {post.content && <div className="mt-1"><PostText content={post.content} /></div>}

          {mediaUrl && (
            <div className="mt-3 overflow-hidden rounded-md border border-line bg-panel">
              <img src={mediaUrl} alt="Imagem do post" className="max-h-[430px] w-full object-cover" />
            </div>
          )}

          <div className="-ml-2 mt-2 flex items-center gap-1">
            <PostAction icon={MessageCircle} label="Responder" count={post.replyCount} onClick={onReply} />
            <PostAction icon={Repeat2} label={post.isReposted ? 'Desfazer repost' : 'Repostar'} count={post.repostCount} active={post.isReposted} onClick={() => onRepost().catch((error) => toast.error(error.message))} />
            <PostAction icon={Heart} label={post.isLiked ? 'Descurtir' : 'Curtir'} count={post.likeCount} active={post.isLiked} activeClass="text-rose-400" filled onClick={() => onLike().catch((error) => toast.error(error.message))} />
            <div className="flex-1" />
            <PostAction icon={Link2} label="Copiar link" onClick={() => void copyPostLink(post.id)} />
          </div>
        </div>
      </div>
    </article>
  );
}
