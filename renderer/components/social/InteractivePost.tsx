import React, { useRef } from 'react';
import { useRouter } from 'next/router';
import { authFetch } from '../../lib/api';
import { SocialPost } from '../../types/social';
import { PostCard } from './PostCard';

export function InteractivePost({ post, username, update }: { post: SocialPost; username: string; update: (post: SocialPost) => void }) {
  const router = useRouter();
  const busy = useRef(false);
  const action = async (type: 'like' | 'repost' | 'follow') => {
    if (busy.current) return;
    busy.current = true;
    try {
      const result = await authFetch(type === 'follow' ? `/api/Social/users/${post.authorId}/follow` : `/api/Social/posts/${post.id}/${type}`, { method: 'POST' });
      update({ ...post, ...(type === 'like' ? { isLiked: result.active, likeCount: result.count } : type === 'repost' ? { isReposted: result.active, repostCount: result.count } : { isFollowingAuthor: result.following }) });
    } finally { busy.current = false; }
  };
  return <PostCard post={post} currentUsername={username} onLike={() => action('like')} onRepost={() => action('repost')} onFollow={() => action('follow')} onReply={() => router.push({ pathname: '/dashboard', query: { post: post.id } }, undefined, { shallow: true })} />;
}
