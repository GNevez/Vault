import React, { useState } from 'react';
import { Bookmark, Heart, MessageCircle, MoreHorizontal, Repeat2, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiAssetUrl } from '../../lib/api';
import type { SocialPost } from '../../types/social';
import { Avatar } from './Avatar';
import { useRouter } from 'next/router';

function relativeTime(date: string) {
  const timestamp = new Date(/(?:Z|[+-]\d{2}:\d{2})$/.test(date) ? date : `${date}Z`);
  const seconds = Math.max(1, Math.floor((Date.now() - timestamp.getTime()) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return days < 7 ? `${days}d` : timestamp.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function PostText({ content }: { content: string }) {
  return (
    <p className="whitespace-pre-wrap break-words text-[13px] leading-5 text-zinc-200">
      {content.split(/(#[A-Za-z0-9_À-ÿ]+)/g).map((part, index) =>
        part.startsWith('#')
          ? <span key={index} className="text-zinc-50 font-medium">{part}</span>
          : part,
      )}
    </p>
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
  const [saved, setSaved] = useState(false);
  const mediaUrl = apiAssetUrl(post.mediaUrl);

  const share = async () => {
    try {
      await navigator.clipboard.writeText(`${location.href.split('?')[0]}?post=${post.id}`);
      toast.success('Post link copied');
    } catch {
      toast.error('Could not copy the post');
    }
  };

  return (
    <article tabIndex={0} aria-label={`Open post by ${post.username}`} onKeyDown={event => {
      if (event.target === event.currentTarget && event.key === 'Enter') openPost();
    }} onClick={event => {
      if (!(event.target as HTMLElement).closest('button, a, input, textarea')) openPost();
    }} className="group cursor-pointer border-b border-border-dark px-5 py-4 transition-colors hover:bg-white/[0.015] focus-visible:outline focus-visible:outline-zinc-500">
      <div className="flex gap-3">
        <button onClick={openProfile} aria-label={`View profile of ${post.username}`} className="self-start rounded-full"><Avatar username={post.username} src={post.avatarUrl} size="md" /></button>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <button onClick={openProfile} className="truncate text-xs font-bold text-zinc-100 hover:underline">{post.username}</button>
            <button onClick={openProfile} className="truncate text-[11px] text-zinc-500 hover:underline">@{post.username.toLowerCase()}</button>
            <span className="text-[10px] text-zinc-700">·</span>
            <span className="shrink-0 text-[11px] text-zinc-600">{relativeTime(post.createdAt)}</span>
            {post.username.toLocaleLowerCase() !== currentUsername.toLocaleLowerCase() && (
              <button
                onClick={() => onFollow().catch((error) => toast.error(error.message))}
                className={`ml-1 rounded-full px-2 py-0.5 text-[9px] font-bold transition ${post.isFollowingAuthor ? 'border border-zinc-700 text-zinc-500 hover:border-red-900 hover:text-red-400' : 'bg-zinc-100 text-zinc-950 hover:bg-white'}`}
              >
                {post.isFollowingAuthor ? 'Following' : 'Follow'}
              </button>
            )}
            <div className="flex-1" />
            <button className="rounded-full p-1 text-zinc-700 opacity-0 transition group-hover:opacity-100 hover:bg-zinc-800 hover:text-zinc-300">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>

          {post.replyToUsername && (
            <p className="mb-1 text-[11px] text-zinc-600">
              Replying to <span className="text-zinc-400">@{post.replyToUsername}</span>
            </p>
          )}
          <div className="mt-1"><PostText content={post.content} /></div>

          {mediaUrl && (
            <div className="mt-3 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
              <img src={mediaUrl} alt="Post attachment" className="max-h-[430px] w-full object-cover" />
            </div>
          )}

          <div className="mt-3 flex max-w-md items-center justify-between text-zinc-600">
            <button onClick={onReply} className="group/action flex items-center gap-1.5 text-[11px] transition hover:text-sky-400" title="Reply">
              <span className="grid h-7 w-7 place-items-center rounded-full group-hover/action:bg-sky-400/10">
                <MessageCircle className="h-3.5 w-3.5" />
              </span>
              {post.replyCount > 0 && post.replyCount}
            </button>
            <button onClick={() => onRepost().catch((error) => toast.error(error.message))} className={`group/action flex items-center gap-1.5 text-[11px] transition hover:text-emerald-400 ${post.isReposted ? 'text-emerald-400' : ''}`} title="Repost">
              <span className="grid h-7 w-7 place-items-center rounded-full group-hover/action:bg-emerald-400/10">
                <Repeat2 className="h-3.5 w-3.5" />
              </span>
              {post.repostCount > 0 && post.repostCount}
            </button>
            <button onClick={() => onLike().catch((error) => toast.error(error.message))} className={`group/action flex items-center gap-1.5 text-[11px] transition hover:text-rose-400 ${post.isLiked ? 'text-rose-400' : ''}`} title="Like">
              <span className="grid h-7 w-7 place-items-center rounded-full group-hover/action:bg-rose-400/10">
                <Heart className="h-3.5 w-3.5" fill={post.isLiked ? 'currentColor' : 'none'} />
              </span>
              {post.likeCount > 0 && post.likeCount}
            </button>
            <button onClick={() => setSaved((value) => !value)} className={`group/action grid h-7 w-7 place-items-center rounded-full transition hover:bg-amber-400/10 hover:text-amber-400 ${saved ? 'text-amber-400' : ''}`} title="Save">
              <Bookmark className="h-3.5 w-3.5" fill={saved ? 'currentColor' : 'none'} />
            </button>
            <button onClick={share} className="group/action grid h-7 w-7 place-items-center rounded-full transition hover:bg-zinc-700 hover:text-zinc-200" title="Share">
              <Share2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
