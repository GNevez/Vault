import React, { useState } from 'react';
import { Hash, Headphones, Loader2, Users } from 'lucide-react';
import { ServerDetail } from '../../types/servers';
import { Avatar } from '../social/Avatar';
import { ChannelChat } from './ChannelChat';
import { primaryClass, secondaryClass } from './ServerDialog';
import { useVoice } from './VoiceProvider';

interface Props {
  serverId?: number; textChannelId?: number; username: string;
  hasServers: boolean; listLoading: boolean; listError: string; refreshServers: () => Promise<void>;
  server: ServerDetail | null; error: string; reload: () => void;
  onManage: (mode: 'create' | 'join') => void;
}

/** Main area of the Servers module: the selected text channel of the selected server. */
export function ServersWorkspace({ serverId, textChannelId, username, hasServers, listLoading, listError, refreshServers, server, error, reload, onManage }: Props) {
  const { voice } = useVoice();
  // Wide windows show the member list beside the chat; narrow ones open it as an overlay on demand.
  const [membersOpen, setMembersOpen] = useState(() => typeof window === 'undefined' || window.innerWidth >= 1280);

  if (!serverId) {
    if (listLoading) return <div className="grid flex-1 place-items-center"><Loader2 className="animate-spin text-zinc-500" /></div>;
    return <div className="grid flex-1 place-items-center p-8">
      <div className="max-w-sm text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-raised text-zinc-500"><Headphones size={22} strokeWidth={1.6} /></span>
        {listError ? <>
          <p role="alert" className="mt-4 text-sm text-red-400">{listError}</p>
          <button onClick={() => void refreshServers()} className={`${secondaryClass} mt-4`}>Tentar novamente</button>
        </> : !hasServers && <>
          <h1 className="mt-4 text-base font-semibold text-zinc-100">Você ainda não participa de nenhum servidor</h1>
          <p className="mt-1.5 text-sm leading-6 text-zinc-500">Crie um servidor para o seu grupo ou entre em um com o código de convite de um amigo.</p>
          <div className="mt-5 flex justify-center gap-2"><button onClick={() => onManage('create')} className={primaryClass}>Criar servidor</button><button onClick={() => onManage('join')} className={secondaryClass}>Entrar com convite</button></div>
        </>}
      </div>
    </div>;
  }

  const textChannels = server?.textChannels ?? [];
  const channel = textChannels.find(c => c.id === textChannelId) ?? textChannels[0];
  const inVoice = new Set(Object.values(server?.presence ?? {}).flat().map(peer => peer.userId));
  const self = server?.members.find(m => m.username.toLowerCase() === username.toLowerCase());
  if (self && voice.session?.serverId === serverId) inVoice.add(self.userId);

  return <section className="@container relative flex min-h-0 min-w-0 flex-1">
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line px-6">
        <Hash size={18} className="shrink-0 text-zinc-500" />
        {server ? <h1 className="truncate text-[15px] font-semibold text-zinc-50">{channel?.name ?? server.name}</h1> : !error && <div className="h-5 w-40 animate-pulse rounded bg-raised" />}
        {(channel?.topic || (!channel && server?.description)) && <>
          <span className="h-5 w-px shrink-0 bg-line" />
          <p className="min-w-0 truncate text-[13px] text-zinc-500">{channel?.topic || server?.description}</p>
        </>}
        <div className="flex-1" />
        {server && <button onClick={() => setMembersOpen(open => !open)} aria-pressed={membersOpen} title={membersOpen ? 'Ocultar membros' : 'Mostrar membros'} className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs transition ${membersOpen ? 'bg-raised text-zinc-200' : 'text-zinc-500 hover:bg-raised hover:text-zinc-200'}`}><Users size={15} />{server.memberCount}</button>}
      </header>

      {error && <div role="alert" className="mx-6 mt-4 rounded-lg border border-red-900/40 bg-red-500/5 p-4 text-sm text-red-400">{error}<button onClick={reload} className="ml-3 underline">Tentar novamente</button></div>}
      {/* Stays mounted across servers so the chat connection is reused; it only switches rooms. */}
      <ChannelChat channel={channel} serverName={server?.name} pending={!server && !error} />
    </div>

    {membersOpen && server && <aside aria-label="Membros" className="vault-scroll absolute inset-y-0 right-0 z-20 w-60 shrink-0 overflow-y-auto border-l border-line bg-panel px-3 py-4 shadow-2xl shadow-black/50 @4xl:static @4xl:shadow-none">
      <h2 className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Membros · {server.memberCount}</h2>
      <ul className="space-y-0.5">
        {server.members.map(member => <li key={member.userId} className="flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-raised/60">
          <Avatar username={member.username} src={member.avatarUrl} size="sm" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] text-zinc-200">{member.displayName || member.username}</span>
            {member.userId === server.ownerId && <span className="block text-[10px] font-semibold uppercase tracking-wider text-accent/80">Dono</span>}
          </span>
          {inVoice.has(member.userId) && <Headphones size={14} className="shrink-0 text-emerald-400" aria-label="Em um canal de voz" />}
        </li>)}
      </ul>
    </aside>}
  </section>;
}
