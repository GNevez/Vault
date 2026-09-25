import React, { useState } from 'react';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import { authFetch } from '../../lib/api';
import { ServerDetail, VoiceChannel } from '../../types/servers';
import { fieldClass, primaryClass, ServerDialog } from './ServerDialog';

export type ServerAction = { kind: 'invite' } | { kind: 'voice-channel' } | { kind: 'leave' } | { kind: 'delete-channel'; channel: VoiceChannel };

interface Props {
  action: ServerAction;
  server: ServerDetail;
  onClose: () => void;
  /** Channels changed; reload the server. */
  onChanged: () => void;
  /** The user left or deleted the server. */
  onRemoved: () => Promise<void> | void;
}

export function ServerActionDialog({ action, server, onClose, onChanged, onRemoved }: Props) {
  const [busy, setBusy] = useState(false);
  const [invite, setInvite] = useState('');
  const act = async (run: () => Promise<void>) => {
    if (busy) return; setBusy(true);
    try { await run(); } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };
  const title = action.kind === 'voice-channel' ? 'Criar canal de voz' : action.kind === 'invite' ? 'Convide seus amigos' : action.kind === 'delete-channel' ? 'Excluir canal de voz?' : server.isOwner ? 'Excluir este servidor?' : 'Sair deste servidor?';

  return <ServerDialog title={title} onClose={onClose} busy={busy}>
    {action.kind === 'voice-channel' && <form onSubmit={e => {
      e.preventDefault(); const data = new FormData(e.currentTarget);
      void act(async () => { await authFetch(`/api/Servers/${server.id}/channels`, { method: 'POST', body: JSON.stringify({ name: data.get('name'), userLimit: Number(data.get('limit')) }) }); onClose(); onChanged(); });
    }}>
      <label className="block text-xs text-zinc-400">Nome do canal<input name="name" required maxLength={60} className={fieldClass} placeholder="Noite do co-op" /></label>
      <label className="mt-4 block text-xs text-zinc-400">Limite de participantes<select name="limit" defaultValue="8" className={fieldClass}>{[2, 3, 4, 5, 6, 7, 8].map(n => <option key={n}>{n}</option>)}</select></label>
      <button disabled={busy} className={`${primaryClass} mt-6 w-full`}>Criar canal</button>
    </form>}

    {action.kind === 'invite' && <>
      <p className="text-sm leading-6 text-zinc-500">Os códigos de convite expiram em 7 dias e permitem até 100 entradas. Gerar um novo código substitui o anterior.</p>
      {invite ? <>
        <label className="mt-4 block text-xs text-zinc-400">Código de convite<input readOnly value={invite} className={`${fieldClass} font-mono text-xs`} /></label>
        <button onClick={() => navigator.clipboard.writeText(invite).then(() => toast.success('Convite copiado')).catch(() => toast.error('Selecione e copie o código acima.'))} className={`${primaryClass} mt-4 flex w-full items-center justify-center gap-2`}><Copy size={16} />Copiar convite</button>
      </> : <button disabled={busy} onClick={() => void act(async () => { const result = await authFetch(`/api/Servers/${server.id}/invites`, { method: 'POST' }); setInvite(result.code); })} className={`${primaryClass} mt-6 w-full`}>{busy ? 'Gerando…' : 'Gerar convite'}</button>}
    </>}

    {(action.kind === 'leave' || action.kind === 'delete-channel') && <>
      <p className="text-sm leading-6 text-zinc-400">{action.kind === 'delete-channel' ? `Remover ${action.channel.name}? Todos neste canal serão desconectados.` : server.isOwner ? `Excluir permanentemente ${server.name}, com canais, membros e convites? Todos serão desconectados.` : `Sair de ${server.name}? Você precisará de um novo convite para voltar.`}</p>
      <button disabled={busy} onClick={() => void act(async () => {
        if (action.kind === 'delete-channel') {
          await authFetch(`/api/Servers/${server.id}/channels/${action.channel.id}`, { method: 'DELETE' });
          onClose(); onChanged();
        } else {
          await authFetch(`/api/Servers/${server.id}${server.isOwner ? '' : '/membership'}`, { method: 'DELETE' });
          onClose(); await onRemoved();
        }
      })} className="mt-6 w-full rounded-md bg-red-500/15 px-4 py-2.5 text-sm font-semibold text-red-400 hover:bg-red-500/25 disabled:opacity-50">{busy ? 'Processando…' : action.kind === 'delete-channel' ? 'Excluir canal' : server.isOwner ? 'Excluir servidor' : 'Sair do servidor'}</button>
    </>}
  </ServerDialog>;
}
