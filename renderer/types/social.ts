export interface SocialPost {
  id: number;
  authorId: number;
  username: string;
  avatarUrl?: string | null;
  content: string;
  mediaUrl?: string | null;
  mediaType?: string | null;
  replyToPostId?: number | null;
  replyToUsername?: string | null;
  createdAt: string;
  likeCount: number;
  repostCount: number;
  replyCount: number;
  isLiked: boolean;
  isReposted: boolean;
  isFollowingAuthor: boolean;
  topics: string[];
}

export interface SocialFeedResponse {
  items: SocialPost[];
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface Trend {
  name: string;
  slug: string;
  postCount: number;
}

export interface SocialNotification {
  id: number;
  type: 'like' | 'repost' | 'reply' | 'follow' | 'friend_request' | 'friend_accepted';
  isRead: boolean;
  createdAt: string;
  actorId: number;
  actorUsername: string;
  actorAvatarUrl?: string | null;
  postId?: number | null;
  postPreview?: string | null;
}

export interface NotificationList {
  items: SocialNotification[];
  unreadCount: number;
}

export interface UserProfile {
  id: number;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  bio: string | null;
  location: string | null;
  createdAt: string;
  postCount: number;
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
  followsYou: boolean;
  isMe: boolean;
  friendshipStatus: 'none' | 'outgoing' | 'incoming' | 'friends';
}
