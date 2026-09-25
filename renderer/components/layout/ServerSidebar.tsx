import React, { useCallback, useState } from 'react';
import { ChevronDown, ChevronUp, ChevronsLeft, ChevronsRight, Hash, Loader2, LogIn, LogOut, Plus, Trash2, UserPlus, Volume2 } from 'lucide-react';
import { ServerDetail, ServerSummary, VoicePeer } from '../../types/servers';
import { Avatar } from '../social/Avatar';
import { useVoice } from '../servers/VoiceProvider';
import { VoicePanel } from '../servers/VoicePanel';
import { ServerActionDialog, type ServerAction } from '../servers/ServerActions';
import { useDismiss } from './AppTopBar';

const COMPACT_LIMIT = 4;

interface Props {
  username: string;
  servers: ServerSummary[];
  loading: boolean;
  error: string;
  /** Server whose channels are listed in the panel. */
  focusedId?: number;
  detail: ServerDetail | null;
  detailError: string;
  /** Server and text channel open in the main area, if any. */
  routeServerId?: number;
  textChannelId?: number;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onFocus: (serverId: number) => void;
  onOpen: (serverId: number, textChannelId?: number) => void;
  onManage: (mode: 'create' | 'join') => void;
  onChanged: () => void;
  onRemoved: () => Promise<void> | void;
}

export const serverInitials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase() || '?';

const sectionTitle = 'text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500';
const menuItem = 'flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-[13px] text-zinc-300 hover:bg-raised-hover hover:text-white';

export function ServerSidebar({ username, servers, loading, error, focusedId, detail, detailError, routeServerId, textChannelId, collapsed, onToggleCollapse, onFocus, onOpen, onManage, onChanged, onRemoved }: Props) {
  const { voice, engine } = useVoice();
  const [menu, setMenu] = useState<'add' | 'server' | null>(null);
  const [listExpanded, setListExpanded] = useState(false);
  const [action, setAction] = useState<ServerAction | null>(null);
  const closeMenu = useCallback(() => setMenu(null), []);
  const addRef = useDismiss(menu === 'add', closeMenu);
  const serverMenuRef = useDismiss(menu === 'server', closeMenu);
  const connecting = voice.status === 'requesting' || voice.status === 'connecting';

  const occupantsOf = (channelId: number): VoicePeer[] => voice.session?.channelId === channelId ? voice.peers : detail?.presence[String(channelId)] || [];
  const pickServer = (id: number) => { setListExpanded(false); onFocus(id); };
  const openAction = (next: ServerAction) => { setMenu(null); setAction(next); };

  if (collapsed) {
    return <aside aria-label="Servidores" className="flex w-16 shrink-0 flex-col border-r border-line bg-panel">
      <button onClick={onToggleCollapse} aria-label="Expandir painel" title="Expandir painel" className="mx-auto mt-3 grid h-9 w-9 place-items-center rounded-md text-zinc-500 hover:bg-raised hover:text-zinc-200"><ChevronsRight size={17} /></button>
      <div className="vault-scroll flex min-h-0 flex-1 flex-col items-center gap-2 overflow-y-auto py-3">
        {servers.map(server => {
          const current = routeServerId === server.id;
          return <button key={server.id} onClick={() => onOpen(server.id)} title={server.name} aria-label={`Abrir ${server.name}`} aria-current={current ? 'page' : undefined} className={`relative grid h-10 w-10 shrink-0 place-items-center rounded-md text-xs font-bold transition ${current ? 'bg-raised-hover text-zinc-50 ring-1 ring-accent/60' : 'bg-raised text-zinc-400 hover:text-zinc-100'}`}>
            {serverInitials(server.name)}
            {voice.session?.serverId === server.id && <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-panel" />}
          </button>;
        })}
        <button onClick={() => onManage('create')} title="Criar servidor" aria-label="Criar servidor" className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-dashed border-line text-zinc-500 hover:border-zinc-500 hover:text-zinc-200"><Plus size={17} /></button>
      </div>
      <VoicePanel compact username={username} onOpen={id => onOpen(id)} />
    </aside>;
  }

  // Compact list: first servers, keeping the focused one visible.
  let visible = servers;
  if (!listExpanded && servers.length > COMPACT_LIMIT) {
    visible = servers.slice(0, COMPACT_LIMIT);
    const focused = servers.find(s => s.id === focusedId);
    if (focused && !visible.includes(focused)) visible = [...visible.slice(0, COMPACT_LIMIT - 1), focused];
  }
  const textChannels = detail?.textChannels ?? [];
  const activeText = routeServerId && routeServerId === focusedId ? textChannels.find(c => c.id === textChannelId) ?? textChannels[0] : undefined;

  return <aside aria-label="Servidores" className="flex w-64 shrink-0 flex-col border-r border-line bg-panel">
    <div className="flex h-12 shrink-0 items-center gap-1 pl-5 pr-2">
      <h2 className={`flex-1 ${sectionTitle}`}>Seus servidores</h2>
      <div ref={addRef} className="relative">
        <button onClick={() => setMenu(m => (m === 'add' ? null : 'add'))} aria-label="Adicionar servidor" aria-expanded={menu === 'add'} title="Adicionar servidor" className="grid h-8 w-8 place-items-center rounded-md text-zinc-500 hover:bg-raised hover:text-zinc-200"><Plus size={16} /></button>
        {menu === 'add' && <div role="menu" className="absolute right-0 top-full z-[70] mt-1 w-48 rounded-lg border border-line bg-panel p-1.5 shadow-2xl shadow-black/60">
          <button role="menuitem" onClick={() => { closeMenu(); onManage('create'); }} className={menuItem}><Plus size={15} className="text-zinc-500" />Criar servidor</button>
          <button role="menuitem" onClick={() => { closeMenu(); onManage('join'); }} className={menuItem}><LogIn size={15} className="text-zinc-500" />Entrar com convite</button>
        </div>}
      </div>
      <button onClick={onToggleCollapse} aria-label="Recolher painel" title="Recolher painel" className="grid h-8 w-8 place-items-center rounded-md text-zinc-500 hover:bg-raised hover:text-zinc-200"><ChevronsLeft size={16} /></button>
    </div>

    <div className={listExpanded ? 'vault-scroll min-h-0 flex-1 overflow-y-auto pb-3' : 'shrink-0'}>
      <ul className="space-y-0.5 px-3">
        {loading && !servers.length && <li className="flex justify-center py-6"><Loader2 size={16} className="animate-spin text-zinc-600" /></li>}
        {error && <li role="alert" className="px-2 py-2 text-xs text-red-400">{error}</li>}
        {visible.map(server => {
          const focused = focusedId === server.id;
          return <li key={server.id}>
            <button onClick={() => pickServer(server.id)} aria-current={routeServerId === server.id ? 'page' : undefined} className={`relative flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left transition ${focused ? 'bg-raised text-zinc-50' : 'text-zinc-400 hover:bg-raised/60 hover:text-zinc-100'}`}>
              {focused && <span className="absolute -left-3 top-1.5 bottom-1.5 w-0.5 rounded-full bg-accent" />}
              <span className={`relative grid h-8 w-8 shrink-0 place-items-center rounded-md text-[11px] font-bold ${focused ? 'bg-raised-hover text-zinc-100' : 'bg-raised text-zinc-400'}`}>
                {serverInitials(server.name)}
                {voice.session?.serverId === server.id && <span title="Você está em voz neste servidor" className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-panel" />}
              </span>
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{server.name}</span>
            </button>
          </li>;
        })}
      </ul>
      {servers.length > COMPACT_LIMIT && <button onClick={() => setListExpanded(value => !value)} aria-expanded={listExpanded} className="mx-3 mt-1 flex w-[calc(100%-1.5rem)] items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium text-zinc-500 hover:bg-raised/60 hover:text-zinc-200">
        {listExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        {listExpanded ? 'Mostrar menos' : `Ver todos os servidores (${servers.length})`}
      </button>}

      {!loading && !error && !servers.length && <div className="mx-3 rounded-lg border border-dashed border-line px-4 py-5 text-center">
        <p className="text-xs leading-5 text-zinc-400">Você ainda não participa de nenhum servidor.</p>
        <div className="mt-3 flex flex-col gap-2">
          <button onClick={() => onManage('create')} className="rounded-md bg-accent py-1.5 text-xs font-semibold text-accent-ink hover:bg-accent-strong">Criar servidor</button>
          <button onClick={() => onManage('join')} className="rounded-md border border-line py-1.5 text-xs font-medium text-zinc-300 hover:bg-raised">Entrar com convite</button>
        </div>
      </div>}
    </div>

    {!listExpanded && focusedId && <div className="vault-scroll mt-3 min-h-0 flex-1 overflow-y-auto border-t border-line px-3 pb-3 pt-3">
      <div ref={serverMenuRef} className="relative mb-3">
        <button onClick={() => detail && setMenu(m => (m === 'server' ? null : 'server'))} disabled={!detail} aria-expanded={menu === 'server'} aria-label="Opções do servidor" className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-raised disabled:hover:bg-transparent">
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-100">{detail?.name ?? servers.find(s => s.id === focusedId)?.name}</span>
          <ChevronDown size={15} className="text-zinc-500" />
        </button>
        {menu === 'server' && detail && <div role="menu" className="absolute inset-x-0 top-full z-[70] mt-1 rounded-lg border border-line bg-panel p-1.5 shadow-2xl shadow-black/60">
          {detail.isOwner && <button role="menuitem" onClick={() => openAction({ kind: 'invite' })} className={menuItem}><UserPlus size={15} className="text-zinc-500" />Convidar pessoas</button>}
          {detail.isOwner && <button role="menuitem" onClick={() => openAction({ kind: 'text-channel' })} className={menuItem}><Hash size={15} className="text-zinc-500" />Criar canal de texto</button>}
          {detail.isOwner && <button role="menuitem" onClick={() => openAction({ kind: 'voice-channel' })} className={menuItem}><Volume2 size={15} className="text-zinc-500" />Criar canal de voz</button>}
          {detail.isOwner && <div className="my-1 h-px bg-line" />}
          <button role="menuitem" onClick={() => openAction({ kind: 'leave' })} className={`${menuItem} text-red-400 hover:text-red-300`}>{detail.isOwner ? <Trash2 size={15} /> : <LogOut size={15} />}{detail.isOwner ? 'Excluir servidor' : 'Sair do servidor'}</button>
        </div>}
      </div>

      {detailError && <p role="alert" className="px-2 py-1 text-xs text-red-400">{detailError}</p>}
      {!detail && !detailError && <div className="space-y-2 px-2 py-1">{[0, 1, 2].map(i => <div key={i} className="h-7 animate-pulse rounded-md bg-raised" />)}</div>}

      {detail && <>
        <section aria-label="Canais de texto">
          <div className="mb-1.5 flex items-center pl-2">
            <h3 className={`flex-1 ${sectionTitle}`}>Canais de texto</h3>
            {detail.isOwner && <button onClick={() => openAction({ kind: 'text-channel' })} aria-label="Criar canal de texto" title="Criar canal de texto" className="grid h-6 w-6 place-items-center rounded text-zinc-500 hover:bg-raised hover:text-zinc-200"><Plus size={14} /></button>}
          </div>
          {textChannels.length ? textChannels.map(channel => {
            const active = activeText?.id === channel.id;
            const deletable = detail.isOwner && textChannels.length > 1;
            return <div key={channel.id} className={`group mb-0.5 flex items-center rounded-md transition ${active ? 'bg-raised' : 'hover:bg-raised/60'}`}>
              <button onClick={() => onOpen(detail.id, channel.id)} aria-current={active ? 'page' : undefined} className={`flex min-w-0 flex-1 items-center gap-2.5 px-2 py-1.5 text-left text-[13px] ${active ? 'font-medium text-zinc-50' : 'text-zinc-400 hover:text-zinc-100'}`}>
                <Hash size={16} className={active ? 'text-zinc-300' : 'text-zinc-500'} /><span className="min-w-0 flex-1 truncate">{channel.name}</span>
              </button>
              {deletable && <button onClick={() => openAction({ kind: 'delete-text-channel', channel })} aria-label={`Excluir canal ${channel.name}`} title="Excluir canal" className="mr-1 hidden h-6 w-6 place-items-center rounded text-zinc-500 hover:text-red-400 group-hover:grid focus:grid"><Trash2 size={13} /></button>}
            </div>;
          }) :<button onClick={() => onOpen(detail.id)} className="w-full rounded-md px-2 py-1.5 text-left text-xs text-zinc-600 hover:text-zinc-400">Nenhum canal de texto ainda.</button>}
        </section>

        <section aria-label="Canais de voz" className="mt-5">
          <div className="mb-1.5 flex items-center pl-2">
            <h3 className={`flex-1 ${sectionTitle}`}>Canais de voz</h3>
            {detail.isOwner && <button onClick={() => openAction({ kind: 'voice-channel' })} aria-label="Criar canal de voz" title="Criar canal de voz" className="grid h-6 w-6 place-items-center rounded text-zinc-500 hover:bg-raised hover:text-zinc-200"><Plus size={14} /></button>}
          </div>
          {!detail.channels.length && <p className="px-2 py-1 text-xs text-zinc-600">Nenhum canal de voz ainda.</p>}
          {detail.channels.map(channel => {
            const occupants = occupantsOf(channel.id);
            const here = voice.session?.channelId === channel.id;
            const count = occupants.length + (here ? 1 : 0);
            const full = !here && count >= channel.userLimit;
            const deletable = detail.isOwner && detail.channels.length > 1;
            return <div key={channel.id} className="mb-0.5">
              <div className={`group flex items-center rounded-md transition ${here ? 'bg-raised' : 'hover:bg-raised/60'}`}>
                <button
                  onClick={() => { if (!here && !full && !connecting) void engine.join(channel.id); }}
                  disabled={full || connecting}
                  title={here ? 'Você está neste canal' : full ? 'Canal cheio' : `Entrar em ${channel.name}`}
                  className={`flex min-w-0 flex-1 items-center gap-2.5 px-2 py-1.5 text-left text-[13px] disabled:cursor-not-allowed ${here ? 'font-medium text-zinc-50' : 'text-zinc-400 hover:text-zinc-100'}`}
                >
                  <Volume2 size={16} className={here ? 'text-emerald-400' : 'text-zinc-500'} />
                  <span className="min-w-0 flex-1 truncate">{channel.name}</span>
                  <span className={`text-[11px] tabular-nums text-zinc-500 ${deletable ? 'group-hover:hidden' : ''}`}>{count} / {channel.userLimit}</span>
                </button>
                {deletable && <button onClick={() => openAction({ kind: 'delete-channel', channel })} aria-label={`Excluir canal ${channel.name}`} title="Excluir canal" className="mr-1 hidden h-6 w-6 place-items-center rounded text-zinc-500 hover:text-red-400 group-hover:grid focus:grid"><Trash2 size={13} /></button>}
              </div>
              {(here || occupants.length > 0) && <ul className="mb-1 ml-7 mt-0.5 space-y-0.5">
                {here && <li className="flex items-center gap-2 px-2 py-1 text-xs text-zinc-300"><span className="relative"><Avatar username={username || 'V'} size="xs" /><span className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ring-2 ring-panel ${voice.speaking && !voice.muted ? 'bg-emerald-400' : 'bg-zinc-600'}`} /></span><span className="truncate">{username}</span></li>}
                {occupants.map(peer => <li key={peer.connectionId} className="flex items-center gap-2 px-2 py-1 text-xs text-zinc-400"><span className="relative"><Avatar username={peer.username} src={peer.avatarUrl} size="xs" />{'speaking' in peer && <span className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ring-2 ring-panel ${(peer as { speaking?: boolean }).speaking ? 'bg-emerald-400' : 'bg-zinc-600'}`} />}</span><span className="truncate">{peer.username}</span></li>)}
              </ul>}
            </div>;
          })}
        </section>
      </>}
    </div>}

    {!focusedId && !listExpanded && <div className="flex-1" />}

    <VoicePanel username={username} onOpen={id => onOpen(id)} />

    {action && detail && <ServerActionDialog action={action} server={detail} onClose={() => setAction(null)} onChanged={onChanged} onRemoved={onRemoved} />}
  </aside>;
}
