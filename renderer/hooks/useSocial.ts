import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { authFetch } from '../lib/api';
import type {
  NotificationList,
  SocialFeedResponse,
  SocialNotification,
  SocialPost,
  Trend,
} from '../types/social';

export type FeedTab = 'for-you' | 'following';

export function useSocial(tab: FeedTab) {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [trends, setTrends] = useState<Trend[]>([]);
  const [notifications, setNotifications] = useState<SocialNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);

  const loadFeed = useCallback(async (page = 1, append = false) => {
    if (!append) setLoading(true);
    try {
      const result = (await authFetch(
        `/api/Social/feed?tab=${tab}&page=${page}&pageSize=15`,
      )) as SocialFeedResponse;
      setPosts((current) => (append ? [...current, ...result.items] : result.items));
      setHasMore(result.hasMore);
    } catch (error: any) {
      if (!append) setPosts([]);
      toast.error(error.message || 'Não foi possível carregar o feed');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  const loadSidebar = useCallback(async () => {
    try {
      const [trendData, notificationData] = await Promise.all([
        authFetch('/api/Social/trends?limit=8') as Promise<Trend[]>,
        authFetch('/api/Social/notifications?limit=20') as Promise<NotificationList>,
      ]);
      setTrends(trendData);
      setNotifications(notificationData.items);
      setUnreadCount(notificationData.unreadCount);
    } catch {
      // The feed error already communicates an unavailable API.
    }
  }, []);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  useEffect(() => {
    loadSidebar();
    const timer = window.setInterval(loadSidebar, 30_000);
    return () => window.clearInterval(timer);
  }, [loadSidebar]);

  const createPost = async (content: string, image?: File | null, replyToPostId?: number) => {
    const form = new FormData();
    form.append('content', content);
    if (image) form.append('image', image);
    if (replyToPostId) form.append('replyToPostId', String(replyToPostId));

    const post = (await authFetch('/api/Social/posts', {
      method: 'POST',
      body: form,
    })) as SocialPost;

    if (!replyToPostId && tab === 'for-you') {
      setPosts((current) => [post, ...current]);
    } else if (replyToPostId) {
      setPosts((current) => current.map((item) =>
        item.id === replyToPostId
          ? { ...item, replyCount: item.replyCount + 1 }
          : item,
      ));
    }
    await loadSidebar();
    return post;
  };

  const toggleLike = async (postId: number) => {
    const result = await authFetch(`/api/Social/posts/${postId}/like`, { method: 'POST' });
    setPosts((current) => current.map((post) => post.id === postId
      ? { ...post, isLiked: result.active, likeCount: result.count }
      : post));
  };

  const toggleRepost = async (postId: number) => {
    const result = await authFetch(`/api/Social/posts/${postId}/repost`, { method: 'POST' });
    setPosts((current) => current.map((post) => post.id === postId
      ? { ...post, isReposted: result.active, repostCount: result.count }
      : post));
  };

  const toggleFollow = async (authorId: number) => {
    const result = await authFetch(`/api/Social/users/${authorId}/follow`, { method: 'POST' });
    setPosts((current) => current.map((post) => post.authorId === authorId
      ? { ...post, isFollowingAuthor: result.following }
      : post));
  };

  const markNotificationsRead = async () => {
    if (!unreadCount) return;
    await authFetch('/api/Social/notifications/read', { method: 'POST' });
    setUnreadCount(0);
    setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
  };

  return {
    posts,
    trends,
    notifications,
    unreadCount,
    loading,
    hasMore,
    loadFeed,
    createPost,
    toggleLike,
    toggleRepost,
    toggleFollow,
    markNotificationsRead,
  };
}
