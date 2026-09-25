import React from 'react';
import { HeadphoneOff, Headphones, Loader2, Mic, MicOff, PhoneOff, Volume2, X } from 'lucide-react';
import { Avatar } from '../social/Avatar';
import { useVoice } from './VoiceProvider';

const controlClass = 'grid h-9 place-items-center rounded-md border border-line bg-panel transition hover:bg-raised-hover disabled:opacity-40';

/** Active call state and controls. Lives in the side panel so it stays reachable across every module. */
export function VoicePanel({ username, compact, onOpen }: { username: string; compact?: boolean; onOpen: (serverId: number, channelId: number) => void }) {
  const { voice, engine } = useVoice();
  if (voice.status === 'idle') return null;

  const busy = voice.status === 'requesting' || voice.status === 'connecting';
  const failed = voice.status === 'error';
  const session = voice.session;
  const silenced = voice.muted || voice.deafened;
  const statusText = failed ? voice.error || 'Falha na conexão de voz' : session ? 'Voz conectada' : voice.status === 'requesting' ? 'Aguardando microfone…' : 'Conectando à voz…';
  const statusColor = failed ? 'text-red-400' : session ? 'text-emerald-400' : 'text-zinc-300';

  const muteButton = <button aria-label={silenced ? 'Ativar microfone' : 'Silenciar microfone'} title={silenced ? 'Ativar microfone' : 'Silenciar microfone'} aria-pressed={silenced} disabled={voice.deafened} onClick={() => void engine.toggleMute()} className={`${controlClass} ${silenced ? 'text-red-400' : 'text-emerald-400'}`}>{silenced ? <MicOff size={16} /> : <Mic size={16} />}</button>;
  const leaveButton = <button aria-label={failed ? 'Fechar aviso de voz' : 'Desconectar da voz'} title={failed ? 'Fechar' : 'Desconectar'} onClick={() => void engine.disconnect()} className={`${controlClass} text-red-400 hover:text-red-300`}>{failed ? <X size={16} /> : <PhoneOff size={16} />}</button>;

  if (compact) {
    return <div className="flex flex-col items-center gap-2 border-t border-line py-3" aria-label="Chamada de voz">
      <span title={session ? `${statusText} · ${session.channelName}` : statusText} className={`grid h-9 w-9 place-items-center rounded-md bg-raised ${statusColor}`}>{busy ? <Loader2 size={16} className="animate-spin" /> : <span className={`h-2.5 w-2.5 rounded-full ${failed ? 'bg-red-400' : 'bg-emerald-400'}`} />}</span>
      {session && <div className="w-9">{muteButton}</div>}
      <div className="w-9">{leaveButton}</div>
    </div>;
  }

  const shownPeers = voice.peers.slice(0, 5);
  return <section aria-label="Chamada de voz" className="m-3 rounded-lg border border-line bg-raised p-3 short:m-2 short:p-2.5">
    <div className="flex items-start gap-2">
      {busy ? <Loader2 size={14} className="mt-0.5 shrink-0 animate-spin text-zinc-400" /> : <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${failed ? 'bg-red-400' : 'bg-emerald-400'}`} />}
      <div className="min-w-0 flex-1">
        <p role={failed ? 'alert' : 'status'} className={`text-[13px] font-semibold ${statusColor} ${failed ? 'leading-5' : 'truncate'}`}>{statusText}</p>
        {session && <button onClick={() => onOpen(session.serverId, session.channelId)} title="Abrir canal" className="block max-w-full truncate text-left text-xs text-zinc-500 hover:text-zinc-200">{session.serverName} · {session.channelName}</button>}
      </div>
    </div>

    {session && <div className="mt-3 flex items-center short:hidden">
      <span className="rounded-full ring-2 ring-raised"><Avatar username={username || 'V'} size="sm" /></span>
      {shownPeers.map(peer => <span key={peer.connectionId} title={peer.username} className="-ml-2 rounded-full ring-2 ring-raised"><Avatar username={peer.username} src={peer.avatarUrl} size="sm" /></span>)}
      {voice.peers.length > shownPeers.length && <span className="-ml-2 grid h-8 w-8 place-items-center rounded-full bg-panel text-[10px] font-semibold text-zinc-400 ring-2 ring-raised">+{voice.peers.length - shownPeers.length}</span>}
      <span className="ml-auto text-[11px] text-zinc-500">{voice.peers.length + 1} no canal</span>
    </div>}

    {voice.playbackBlocked && <button onClick={() => void engine.resumeAudio()} className="mt-3 w-full rounded-md border border-accent/40 py-1.5 text-xs font-medium text-accent hover:bg-accent/10">Ativar áudio da chamada</button>}

    {session && <label className="mt-3 flex items-center gap-2 text-zinc-500 short:hidden">
      <Volume2 size={14} className="shrink-0" />
      <span className="sr-only">Volume da chamada</span>
      <input aria-label="Volume da chamada" type="range" min={0} max={1} step={0.05} value={voice.volume} onChange={e => engine.setVolume(Number(e.target.value))} className="h-1 w-full accent-[#d4a24e]" />
    </label>}

    <div className={`mt-3 grid gap-2 ${session ? 'grid-cols-3' : 'grid-cols-1'}`}>
      {session && muteButton}
      {session && <button aria-label={voice.deafened ? 'Ativar som' : 'Desativar som'} title={voice.deafened ? 'Ativar som' : 'Desativar som'} aria-pressed={voice.deafened} onClick={() => void engine.toggleDeafen()} className={`${controlClass} ${voice.deafened ? 'text-red-400' : 'text-zinc-300'}`}>{voice.deafened ? <HeadphoneOff size={16} /> : <Headphones size={16} />}</button>}
      {leaveButton}
    </div>
  </section>;
}
