import React, { useEffect, useRef, useState } from 'react';
import { CalendarDays, FileText, Loader2, MapPin, X } from 'lucide-react';
import { useRouter } from 'next/router';
import { toast } from 'sonner';
import { authFetch, apiAssetUrl } from '../../lib/api';
import { UserProfile as Profile, Trend } from '../../types/social';
import { usePostList } from '../../hooks/usePostList';
import { EmptyState } from '../ui/EmptyState';
import { accentButton, ghostButton, inputClass, tabClass } from '../ui/styles';
import { SocialPageHeader } from './SocialPageHeader';
import { InteractivePost } from './InteractivePost';
import { TrendsPanel } from './TrendsPanel';

const TABS = [
  { id: 'posts', label: 'Posts', empty: 'Nenhum post ainda' },
  { id: 'replies', label: 'Respostas', empty: 'Nenhuma resposta ainda' },
  { id: 'reposts', label: 'Reposts', empty: 'Nenhum repost ainda' },
  { id: 'media', label: 'Mídia', empty: 'Nenhuma mídia ainda' },
];

function ProfilePosts({ id, username, tab, refreshProfile }: { id: number; username: string; tab: string; refreshProfile: () => void }) {
  const list = usePostList(`/api/Social/profiles/${id}/posts?tab=${tab}`);
  const empty = TABS.find(t => t.id === tab)?.empty ?? 'Nada por aqui ainda';
  return <div>
    {list.items.length > 0 && <div className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-raised">
      {list.items.map(post => <InteractivePost key={post.id} post={post} username={username} update={updated => {
        const followChanged = updated.isFollowingAuthor !== post.isFollowingAuthor;
        list.setItems(items => items.map(p => p.id === updated.id ? updated : followChanged && p.authorId === updated.authorId ? { ...p, isFollowingAuthor: updated.isFollowingAuthor } : p));
        if (followChanged) refreshProfile();
      }} />)}
    </div>}
    {list.loading && <Loader2 aria-label="Carregando posts" className="mx-auto my-8 animate-spin text-zinc-500" />}
    {list.error && <p role="alert" className="p-6 text-center text-sm text-red-400">{list.error}<button className="ml-3 underline" onClick={() => list.load()}>Tentar novamente</button></p>}
    {!list.loading && !list.error && !list.items.length && <EmptyState icon={FileText} title={empty} description="O que for compartilhado aparece nesta linha do tempo." />}
    {list.hasMore && !list.loading && !list.error && <div className="mt-4 flex justify-center"><button className={ghostButton} onClick={() => list.load()}>Carregar mais</button></div>}
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
  const openEditor = () => {
    if (!profile) return;
    setDraft({ displayName: profile.displayName || profile.username, bio: profile.bio || '', location: profile.location || '' });
    setEditing(true);
  };
  const name = profile?.displayName || profile?.username;
  const banner = apiAssetUrl(profile?.bannerUrl);
  const avatar = apiAssetUrl(profile?.avatarUrl);

  return <section className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
    <div className="vault-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <div className="mx-auto w-full max-w-[1160px] px-8 pb-10 pt-7">
        <SocialPageHeader title={name || 'Perfil'} subtitle={profile ? `${profile.postCount} ${profile.postCount === 1 ? 'post' : 'posts'}` : undefined} />
        <div className="flex gap-8">
          <main className="min-w-0 flex-1">
            {error ? <div role="alert" className="rounded-lg border border-red-900/40 bg-red-500/5 p-6 text-center text-sm text-red-400">{error}<button onClick={() => setReload(n => n + 1)} className="ml-3 underline">Tentar novamente</button></div> : !profile ? <Loader2 className="mx-auto my-12 animate-spin text-zinc-500" aria-label="Carregando perfil" /> : <>
              <section aria-label="Perfil" className="overflow-hidden rounded-lg border border-line bg-raised">
                <div className="h-36 bg-panel xl:h-44">
                  {banner && <img src={banner} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="px-6 pb-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="-mt-12 grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-full bg-raised-hover text-3xl font-bold text-zinc-200 ring-4 ring-raised">
                      {avatar ? <img src={avatar} alt={profile.username} className="h-full w-full object-cover" /> : profile.username[0]?.toUpperCase()}
                    </div>
                    <div className="flex flex-wrap justify-end gap-2 pt-4">
                      {profile.isMe ? <button className={ghostButton} onClick={openEditor}>Editar perfil</button> : <>
                        <button disabled={busy} className={profile.isFollowing ? ghostButton : accentButton} onClick={() => mutate(`/api/Social/users/${profile.id}/follow`)}>{profile.isFollowing ? 'Seguindo' : 'Seguir'}</button>
                        {profile.friendshipStatus === 'none' && <button disabled={busy} className={ghostButton} onClick={() => friendship('request')}>Adicionar amigo</button>}
                        {profile.friendshipStatus === 'outgoing' && <button disabled={busy} className={ghostButton} onClick={() => friendship('cancel')}>Cancelar pedido</button>}
                        {profile.friendshipStatus === 'incoming' && <><button disabled={busy} className={ghostButton} onClick={() => friendship('accept')}>Aceitar amizade</button><button disabled={busy} className={ghostButton} onClick={() => friendship('decline')}>Recusar</button></>}
                        {profile.friendshipStatus === 'friends' && <button disabled={busy} className={`${ghostButton} hover:text-red-400`} onClick={() => { if (window.confirm('Remover esta pessoa dos seus amigos?')) friendship('remove'); }}>Amigos · Remover</button>}
                      </>}
                    </div>
                  </div>
                  <h2 className="mt-4 break-words text-xl font-bold tracking-tight text-zinc-50">{name}</h2>
                  <p className="mt-0.5 flex items-center gap-2 text-sm text-zinc-500">@{profile.username}{profile.followsYou && <span className="rounded border border-line px-1.5 py-0.5 text-[11px] text-zinc-400">Segue você</span>}</p>
                  {profile.bio && <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-zinc-300">{profile.bio}</p>}
                  <div className="mt-4 flex flex-wrap gap-4 text-[13px] text-zinc-500">
                    {profile.location && <span className="flex items-center gap-1.5"><MapPin size={14} />{profile.location}</span>}
                    <span className="flex items-center gap-1.5"><CalendarDays size={14} />Entrou em {new Date(profile.createdAt).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</span>
                  </div>
                  <div className="mt-4 flex gap-5 text-[13px]">
                    <span><b className="font-semibold text-zinc-100">{profile.followingCount.toLocaleString('pt-BR')}</b> <span className="text-zinc-500">seguindo</span></span>
                    <span><b className="font-semibold text-zinc-100">{profile.followerCount.toLocaleString('pt-BR')}</b> <span className="text-zinc-500">{profile.followerCount === 1 ? 'seguidor' : 'seguidores'}</span></span>
                  </div>
                </div>
              </section>

              <nav role="tablist" aria-label="Posts do perfil" className="mb-4 mt-6 flex gap-1 border-b border-line">
                {TABS.map(({ id, label }) => <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={tabClass(tab === id)}>
                  {label}
                  {tab === id && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent" />}
                </button>)}
              </nav>
              <ProfilePosts key={`${profile.id}-${tab}-${profile.isFollowing}`} id={profile.id} username={username} tab={tab} refreshProfile={() => setReload(n => n + 1)} />
            </>}
          </main>
          <TrendsPanel trends={trends} onSelect={value => router.push({ pathname: '/dashboard', query: value ? { search: value } : {} }, undefined, { shallow: true })} />
        </div>
      </div>
    </div>

    {editing && profile && <div className="fixed inset-x-0 bottom-0 top-13 z-50 grid place-items-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties} onMouseDown={event => { if (event.target === event.currentTarget && !busy) setEditing(false); }}>
      <form role="dialog" aria-modal="true" aria-labelledby="edit-profile-title" className="vault-scroll my-auto max-h-full w-full max-w-lg overflow-y-auto rounded-lg border border-line bg-panel p-6 shadow-2xl" onSubmit={event => {
        event.preventDefault();
        void mutate('/api/Social/profiles/me', draft, 'PUT');
      }}>
        <div className="mb-6 flex items-center justify-between">
          <div><h2 id="edit-profile-title" className="text-lg font-bold text-zinc-50">Editar perfil</h2><p className="mt-0.5 text-xs text-zinc-500">@{profile.username}</p></div>
          <button type="button" disabled={busy} aria-label="Fechar" onClick={() => setEditing(false)} className="grid h-8 w-8 place-items-center rounded-md text-zinc-500 hover:bg-raised hover:text-white"><X size={18} /></button>
        </div>
        <label className="block text-xs font-medium text-zinc-400">Nome de exibição<input autoFocus name="displayName" maxLength={80} value={draft.displayName} onChange={event => setDraft(current => ({ ...current, displayName: event.target.value }))} className={`${inputClass} mb-4 mt-2`} /></label>
        <label className="block text-xs font-medium text-zinc-400">Bio<textarea name="bio" rows={3} maxLength={240} value={draft.bio} onChange={event => setDraft(current => ({ ...current, bio: event.target.value }))} className={`${inputClass} mb-4 mt-2 resize-none`} /></label>
        <label className="block text-xs font-medium text-zinc-400">Localização<input name="location" maxLength={100} value={draft.location} onChange={event => setDraft(current => ({ ...current, location: event.target.value }))} className={`${inputClass} mb-6 mt-2`} /></label>
        <div className="flex justify-end gap-2">
          <button type="button" disabled={busy} onClick={() => setEditing(false)} className={ghostButton}>Cancelar</button>
          <button disabled={busy} className={accentButton}>{busy && <Loader2 size={15} className="animate-spin" />}{busy ? 'Salvando…' : 'Salvar'}</button>
        </div>
      </form>
    </div>}
  </section>;
}
