import React, { useEffect, useRef, useState } from 'react';
import { CalendarDays, MapPin, Loader2, X } from 'lucide-react';
import { useRouter } from 'next/router';
import { toast } from 'sonner';
import { authFetch, apiAssetUrl } from '../../lib/api';
import { UserProfile as Profile, Trend } from '../../types/social';
import { usePostList } from '../../hooks/usePostList';
import { SocialPageHeader } from './SocialPageHeader';
import { InteractivePost } from './InteractivePost';
import { TrendsPanel } from './TrendsPanel';

function ProfilePosts({ id, username, tab, refreshProfile }: { id: number; username: string; tab: string; refreshProfile: () => void }) {
  const list = usePostList(`/api/Social/profiles/${id}/posts?tab=${tab}`);
  return <div>
    {list.items.map(post => <InteractivePost key={post.id} post={post} username={username} update={updated => {
      const followChanged = updated.isFollowingAuthor !== post.isFollowingAuthor;
      list.setItems(items => items.map(p => p.id === updated.id ? updated : followChanged && p.authorId === updated.authorId ? { ...p, isFollowingAuthor: updated.isFollowingAuthor } : p));
      if (followChanged) refreshProfile();
    }} />)}
    {list.loading && <Loader2 aria-label="Loading posts" className="mx-auto my-8 animate-spin" />}
    {list.error && <div className="p-8 text-center text-sm text-red-400">{list.error}<button className="ml-3 underline" onClick={() => list.load()}>Retry</button></div>}
    {!list.loading && !list.error && !list.items.length && <div className="p-12 text-center"><h2 className="font-bold text-xl">Nothing here yet</h2><p className="mt-2 text-sm text-zinc-500">Posts shared here will appear in this timeline.</p></div>}
    {list.hasMore && !list.loading && !list.error && <button className="w-full p-4 text-sm hover:bg-white/5" onClick={() => list.load()}>Load more</button>}
  </div>;
}

export function UserProfile({ target, username }: { target: string; username: string }) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [tab, setTab] = useState('posts');
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ displayName: '', bio: '', location: '' });
  const [trends, setTrends] = useState<Trend[]>([]);
  useEffect(() => {
    let active = true;
    authFetch('/api/Social/trends').then(result => { if (active) setTrends(result); }).catch(() => {});
    return () => { active = false; };
  }, []);
  useEffect(() => {
    let active = true;
    setError('');
    authFetch(`/api/Social/profiles/${target}`).then(p => { if (active) setProfile(p); }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [target, reload]);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !pending.current) setEditing(false); };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, []);
  const mutate = async (path: string, body?: object, method = 'POST') => {
    if (pending.current || !profile) return;
    pending.current = true; setBusy(true);
    try {
      await authFetch(path, { method, ...(body ? { body: JSON.stringify(body) } : {}) });
      setProfile(await authFetch(`/api/Social/profiles/${profile.id}`));
      setEditing(false);
    } catch (e: any) { toast.error(e.message); }
    finally { pending.current = false; setBusy(false); }
  };
  const friendship = (action: string) => mutate(`/api/Social/profiles/${profile!.id}/friendship`, { action });
  const pill = 'rounded-full border border-zinc-700 px-4 py-2 text-xs font-semibold hover:bg-white/10 disabled:opacity-50';
  const openEditor = () => {
    if (!profile) return;
    setDraft({ displayName: profile.displayName || profile.username, bio: profile.bio || '', location: profile.location || '' });
    setEditing(true);
  };
  return <section className="flex h-full min-h-0 min-w-0 flex-1 overflow-hidden bg-background-dark">
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col border-r border-zinc-800">
      <SocialPageHeader title={profile?.displayName || profile?.username || 'Profile'} subtitle={profile ? `${profile.postCount} posts` : undefined} />
      <div className="vault-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {error ? <div className="p-10 text-center text-sm text-red-400">{error}<button onClick={() => setReload(n => n + 1)} className="ml-3 underline">Retry</button></div> : !profile ? <Loader2 className="mx-auto my-12 animate-spin" aria-label="Loading profile" /> : <>
          <div className="h-44 sm:h-56 bg-gradient-to-br from-zinc-700 via-zinc-900 to-black">
            {profile.bannerUrl && <img src={apiAssetUrl(profile.bannerUrl)!} alt="Profile banner" className="h-full w-full object-cover" />}
          </div>
          <div className="px-5 pb-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="-mt-16 grid h-32 w-32 shrink-0 place-items-center overflow-hidden rounded-full border-4 border-background-dark bg-zinc-800 text-4xl font-bold">
                {profile.avatarUrl ? <img src={apiAssetUrl(profile.avatarUrl)!} alt={profile.username} className="h-full w-full object-cover" /> : profile.username[0]?.toUpperCase()}
              </div>
              <div className="flex flex-wrap justify-end gap-2 pt-3">
                {profile.isMe ? <button className={pill} onClick={openEditor}>Edit profile</button> : <>
                  <button disabled={busy} className={`${pill} ${!profile.isFollowing ? 'bg-white text-black hover:bg-zinc-200' : ''}`} onClick={() => mutate(`/api/Social/users/${profile.id}/follow`)}>{profile.isFollowing ? 'Following' : 'Follow'}</button>
                  {profile.friendshipStatus === 'none' && <button disabled={busy} className={pill} onClick={() => friendship('request')}>Add friend</button>}
                  {profile.friendshipStatus === 'outgoing' && <button disabled={busy} className={pill} onClick={() => friendship('cancel')}>Cancel request</button>}
                  {profile.friendshipStatus === 'incoming' && <><button disabled={busy} className={pill} onClick={() => friendship('accept')}>Accept friend</button><button disabled={busy} className={pill} onClick={() => friendship('decline')}>Decline</button></>}
                  {profile.friendshipStatus === 'friends' && <button disabled={busy} className={pill} onClick={() => { if (window.confirm('Remove this friend?')) friendship('remove'); }}>Friends · Remove</button>}
                </>}
              </div>
            </div>
            <h2 className="mt-4 break-words text-xl font-bold">{profile.displayName || profile.username}</h2>
            <p className="text-sm text-zinc-500">@{profile.username} {profile.followsYou && <span className="ml-2 rounded bg-zinc-800 px-2 py-0.5 text-xs">Follows you</span>}</p>
            {profile.bio && <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-relaxed">{profile.bio}</p>}
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-zinc-500">
              {profile.location && <span className="flex items-center gap-1"><MapPin size={15} />{profile.location}</span>}
              <span className="flex items-center gap-1"><CalendarDays size={15} />Joined {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
            </div>
            <div className="mt-4 flex gap-5 text-sm"><span><b>{profile.followingCount.toLocaleString()}</b> <span className="text-zinc-500">Following</span></span><span><b>{profile.followerCount.toLocaleString()}</b> <span className="text-zinc-500">Followers</span></span></div>
          </div>
          <div role="tablist" aria-label="Profile posts" className="flex border-b border-zinc-800">
            {['posts', 'replies', 'reposts', 'media'].map(value => <button key={value} role="tab" aria-selected={tab === value} onClick={() => setTab(value)} className={`flex-1 border-b-2 py-4 text-sm capitalize hover:bg-white/5 ${tab === value ? 'border-white font-bold text-white' : 'border-transparent text-zinc-500'}`}>{value}</button>)}
          </div>
          <ProfilePosts key={`${profile.id}-${tab}-${profile.isFollowing}`} id={profile.id} username={username} tab={tab} refreshProfile={() => setReload(n => n + 1)} />
        </>}
      </div>
    </div>
    <TrendsPanel trends={trends} search="" onSearch={value => router.push({ pathname: '/dashboard', query: { search: value } }, undefined, { shallow: true })} />
    {editing && profile && <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/70 p-4">
      <form role="dialog" aria-modal="true" aria-labelledby="edit-profile-title" className="vault-scroll my-auto max-h-full w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-950 p-6" onSubmit={event => {
        event.preventDefault();
        mutate('/api/Social/profiles/me', draft, 'PUT');
      }}>
        <div className="mb-6 flex items-center justify-between"><div><h2 id="edit-profile-title" className="font-bold">Edit profile</h2><p className="mt-1 text-xs text-zinc-500">@{profile.username}</p></div><button type="button" disabled={busy} aria-label="Close" onClick={() => setEditing(false)}><X size={20} /></button></div>
        <label className="block text-sm">Display name<input autoFocus name="displayName" maxLength={80} value={draft.displayName} onChange={event => setDraft(current => ({ ...current, displayName: event.target.value }))} className="mb-4 mt-2 w-full rounded-lg border border-zinc-700 bg-transparent p-3" /></label>
        <label className="block text-sm">Bio<textarea name="bio" maxLength={240} value={draft.bio} onChange={event => setDraft(current => ({ ...current, bio: event.target.value }))} className="mb-4 mt-2 w-full rounded-lg border border-zinc-700 bg-transparent p-3" /></label>
        <label className="block text-sm">Location<input name="location" maxLength={100} value={draft.location} onChange={event => setDraft(current => ({ ...current, location: event.target.value }))} className="mb-4 mt-2 w-full rounded-lg border border-zinc-700 bg-transparent p-3" /></label>
        <button disabled={busy} className={`${pill} w-full`}>{busy ? 'Saving…' : 'Save'}</button>
      </form>
    </div>}
  </section>;
}
