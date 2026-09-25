import React, { useRef, useState } from 'react';
import { Camera, Eye, EyeOff, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiAssetUrl, authFetch } from '../../lib/api';
import { resetSettings, applyZoom } from '../../lib/app-settings';
import { Avatar } from '../social/Avatar';
import { accentButton, ghostButton } from '../ui/styles';
import { fieldClass, Radio, Row, Section, SettingsPage } from './controls';

export type FriendRequestPolicy = 'everyone' | 'following' | 'none';
export interface Account {
  id: number; username: string; email: string; displayName: string | null; avatarUrl: string | null;
  bio: string | null; location: string | null; createdAt: string; friendRequestPolicy: FriendRequestPolicy;
}
interface Props { account: Account; onAccount: (account: Account) => void }

const maskEmail = (email: string) => {
  const [name, domain] = email.split('@');
  return domain ? `${name.slice(0, 1)}${'•'.repeat(Math.max(3, name.length - 1))}@${domain}` : email;
};

/** Runs a mutation with a busy flag and toasts the API error, keeping the form open on failure. */
function useAction() {
  const [busy, setBusy] = useState(false);
  const run = async (action: () => Promise<void>) => {
    if (busy) return false; setBusy(true);
    try { await action(); return true; }
    catch (e: any) { toast.error(e.message || 'Algo deu errado.'); return false; }
    finally { setBusy(false); }
  };
  return { busy, run };
}

function PasswordInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false);
  return <div className="relative">
    <input {...props} type={visible ? 'text' : 'password'} className={`${fieldClass} pr-10`} />
    <button type="button" onClick={() => setVisible(v => !v)} aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'} className="absolute inset-y-0 right-0 grid w-10 place-items-center text-zinc-500 hover:text-zinc-200">{visible ? <EyeOff size={15} /> : <Eye size={15} />}</button>
  </div>;
}

export function MyAccountSettings({ account, onAccount }: Props) {
  const [showEmail, setShowEmail] = useState(false);
  const [editing, setEditing] = useState<'email' | 'password' | null>(null);
  const { busy, run } = useAction();

  const changeEmail = (form: FormData) => run(async () => {
    onAccount(await authFetch('/api/Account/email', { method: 'PUT', body: JSON.stringify({ email: form.get('email'), currentPassword: form.get('password') }) }));
    setEditing(null); toast.success('E-mail atualizado.');
  });
  const changePassword = (form: FormData) => {
    if (form.get('next') !== form.get('confirm')) { toast.error('A confirmação não confere com a nova senha.'); return; }
    return run(async () => {
      const { token } = await authFetch('/api/Account/password', { method: 'PUT', body: JSON.stringify({ currentPassword: form.get('current'), newPassword: form.get('next') }) });
      localStorage.setItem('token', token);
      setEditing(null); toast.success('Senha alterada. Os outros dispositivos foram desconectados.');
    });
  };

  return <SettingsPage title="Minha conta" description="Dados de acesso à sua conta VAULT.">
    <Section title="Conta">
      <div className="flex items-center gap-4 px-5 py-4">
        <Avatar username={account.username} src={account.avatarUrl} size="lg" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-zinc-100">{account.displayName || account.username}</p>
          <p className="text-xs text-zinc-500">@{account.username} · membro desde {new Date(account.createdAt).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</p>
        </div>
      </div>
      <Row label="Nome de usuário" description="Usado para entrar e aparece como @usuário. Não pode ser alterado."><span className="font-mono text-[13px] text-zinc-300">{account.username}</span></Row>
      <Row label="E-mail" description={<span className="font-mono">{showEmail ? account.email : maskEmail(account.email)}</span>}>
        <div className="flex gap-2">
          <button className={ghostButton} onClick={() => setShowEmail(v => !v)}>{showEmail ? 'Ocultar' : 'Mostrar'}</button>
          <button className={ghostButton} onClick={() => setEditing(e => e === 'email' ? null : 'email')}>Alterar</button>
        </div>
      </Row>
      {editing === 'email' && <form className="space-y-3 bg-panel/40 px-5 py-4" onSubmit={e => { e.preventDefault(); void changeEmail(new FormData(e.currentTarget)); }}>
        <label className="block text-xs text-zinc-400">Novo e-mail<input name="email" type="email" required maxLength={100} defaultValue={account.email} className={`${fieldClass} mt-1.5`} /></label>
        <label className="block text-xs text-zinc-400">Senha atual<div className="mt-1.5"><PasswordInput name="password" required autoComplete="current-password" /></div></label>
        <div className="flex justify-end gap-2 pt-1"><button type="button" className={ghostButton} onClick={() => setEditing(null)}>Cancelar</button><button disabled={busy} className={accentButton}>{busy && <Loader2 size={14} className="animate-spin" />}Salvar e-mail</button></div>
      </form>}
    </Section>

    <Section title="Senha" description="Ao trocar a senha, todas as outras sessões são encerradas.">
      <Row label="Senha" description="Use pelo menos 8 caracteres.">
        <button className={ghostButton} onClick={() => setEditing(e => e === 'password' ? null : 'password')}>Alterar senha</button>
      </Row>
      {editing === 'password' && <form className="space-y-3 bg-panel/40 px-5 py-4" onSubmit={e => { e.preventDefault(); void changePassword(new FormData(e.currentTarget)); }}>
        <label className="block text-xs text-zinc-400">Senha atual<div className="mt-1.5"><PasswordInput name="current" required autoComplete="current-password" /></div></label>
        <label className="block text-xs text-zinc-400">Nova senha<div className="mt-1.5"><PasswordInput name="next" required minLength={8} maxLength={128} autoComplete="new-password" /></div></label>
        <label className="block text-xs text-zinc-400">Confirmar nova senha<div className="mt-1.5"><PasswordInput name="confirm" required minLength={8} maxLength={128} autoComplete="new-password" /></div></label>
        <div className="flex justify-end gap-2 pt-1"><button type="button" className={ghostButton} onClick={() => setEditing(null)}>Cancelar</button><button disabled={busy} className={accentButton}>{busy && <Loader2 size={14} className="animate-spin" />}Alterar senha</button></div>
      </form>}
    </Section>
  </SettingsPage>;
}

export function ProfileSettings({ account, onAccount, onViewProfile }: Props & { onViewProfile: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const avatar = useAction();
  const save = useAction();
  const [draft, setDraft] = useState({ displayName: account.displayName ?? '', bio: account.bio ?? '', location: account.location ?? '' });
  const dirty = draft.displayName !== (account.displayName ?? '') || draft.bio !== (account.bio ?? '') || draft.location !== (account.location ?? '');

  const upload = (file?: File) => {
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) { toast.error('A imagem precisa ter até 4 MB.'); return; }
    const body = new FormData(); body.append('file', file);
    void avatar.run(async () => { onAccount(await authFetch('/api/Account/avatar', { method: 'POST', body })); toast.success('Avatar atualizado.'); });
  };

  return <SettingsPage title="Perfil" description="Como as outras pessoas veem você na Comunidade e nos servidores.">
    <Section title="Avatar">
      <div className="flex items-center gap-5 px-5 py-5">
        <div className="relative">
          {account.avatarUrl ? <img src={apiAssetUrl(account.avatarUrl)!} alt="" className="h-20 w-20 rounded-full object-cover ring-1 ring-white/10" /> : <div className="grid h-20 w-20 place-items-center rounded-full border border-white/10 bg-raised-hover text-2xl font-bold text-zinc-200">{account.username.charAt(0).toUpperCase()}</div>}
          {avatar.busy && <div className="absolute inset-0 grid place-items-center rounded-full bg-black/60"><Loader2 size={20} className="animate-spin text-zinc-200" /></div>}
        </div>
        <div className="space-y-2">
          <div className="flex gap-2">
            <button className={ghostButton} disabled={avatar.busy} onClick={() => fileRef.current?.click()}><Camera size={15} />Enviar imagem</button>
            {account.avatarUrl && <button className={ghostButton} disabled={avatar.busy} onClick={() => void avatar.run(async () => { onAccount(await authFetch('/api/Account/avatar', { method: 'DELETE' })); })}><Trash2 size={15} />Remover</button>}
          </div>
          <p className="text-xs text-zinc-500">JPEG, PNG, WebP ou GIF, até 4 MB.</p>
        </div>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={e => { upload(e.target.files?.[0]); e.target.value = ''; }} />
      </div>
    </Section>

    <Section title="Informações públicas">
      <form className="space-y-4 px-5 py-5" onSubmit={e => {
        e.preventDefault();
        void save.run(async () => {
          await authFetch('/api/Social/profiles/me', { method: 'PUT', body: JSON.stringify(draft) });
          onAccount({ ...account, displayName: draft.displayName.trim() || null, bio: draft.bio.trim() || null, location: draft.location.trim() || null });
          toast.success('Perfil salvo.');
        });
      }}>
        <label className="block text-xs text-zinc-400">Nome de exibição<input value={draft.displayName} onChange={e => setDraft(d => ({ ...d, displayName: e.target.value }))} maxLength={80} placeholder={account.username} className={`${fieldClass} mt-1.5`} /></label>
        <label className="block text-xs text-zinc-400">Bio<textarea value={draft.bio} onChange={e => setDraft(d => ({ ...d, bio: e.target.value }))} maxLength={240} rows={3} placeholder="Conte um pouco sobre você" className={`${fieldClass} mt-1.5 resize-none`} /><span className="mt-1 block text-right text-[11px] tabular-nums text-zinc-600">{draft.bio.length} / 240</span></label>
        <label className="block text-xs text-zinc-400">Localização<input value={draft.location} onChange={e => setDraft(d => ({ ...d, location: e.target.value }))} maxLength={100} placeholder="Cidade, país" className={`${fieldClass} mt-1.5`} /></label>
        <div className="flex items-center justify-between pt-1">
          <button type="button" onClick={onViewProfile} className="text-xs text-zinc-500 underline-offset-2 hover:text-zinc-200 hover:underline">Ver meu perfil público</button>
          <button disabled={!dirty || save.busy} className={accentButton}>{save.busy && <Loader2 size={14} className="animate-spin" />}Salvar alterações</button>
        </div>
      </form>
    </Section>
  </SettingsPage>;
}

const FRIEND_POLICIES: { value: FriendRequestPolicy; label: string; description: string }[] = [
  { value: 'everyone', label: 'Todos', description: 'Qualquer pessoa pode enviar um pedido de amizade.' },
  { value: 'following', label: 'Pessoas que você segue', description: 'Só quem você segue na Comunidade pode enviar pedidos.' },
  { value: 'none', label: 'Ninguém', description: 'Ninguém pode enviar novos pedidos. Amizades atuais continuam.' },
];

export function PrivacySettings({ account, onAccount }: Props) {
  const policy = useAction();
  const sessions = useAction();
  const [confirming, setConfirming] = useState(false);

  return <SettingsPage title="Privacidade e segurança" description="Controle quem pode interagir com você e onde sua conta está conectada.">
    <Section title="Pedidos de amizade" description="Quem pode te enviar pedidos de amizade.">
      <div className="px-5 py-4">
        <Radio name="friend-requests" value={account.friendRequestPolicy} options={FRIEND_POLICIES} disabled={policy.busy} onChange={value => void policy.run(async () => {
          onAccount(await authFetch('/api/Account/privacy', { method: 'PUT', body: JSON.stringify({ friendRequestPolicy: value }) }));
          toast.success('Privacidade atualizada.');
        })} />
      </div>
    </Section>

    <Section title="O que outras pessoas veem">
      <Row label="Perfil público" description="Nome de exibição, avatar, bio, localização, posts e contagem de seguidores são visíveis para quem usa o VAULT." />
      <Row label="Servidores" description="Membros de um servidor veem você na lista de membros e em qual canal de voz você está." />
      <Row label="E-mail" description="Nunca é exibido para outras pessoas." />
    </Section>

    <Section title="Sessões" description="Um token de acesso fica salvo em cada dispositivo onde você entrou.">
      <Row label="Encerrar todas as outras sessões" description="Desconecta o VAULT em todos os outros dispositivos. Este continua conectado.">
        {!confirming && <button className={ghostButton} onClick={() => setConfirming(true)}>Encerrar sessões</button>}
      </Row>
      {confirming && <form className="flex items-end gap-2 bg-panel/40 px-5 py-4" onSubmit={e => {
        e.preventDefault(); const form = new FormData(e.currentTarget);
        void sessions.run(async () => {
          const { token } = await authFetch('/api/Account/sessions/revoke', { method: 'POST', body: JSON.stringify({ currentPassword: form.get('password') }) });
          localStorage.setItem('token', token); setConfirming(false);
          toast.success('Outras sessões encerradas.');
        });
      }}>
        <label className="block flex-1 text-xs text-zinc-400">Confirme com sua senha<div className="mt-1.5"><PasswordInput name="password" required autoComplete="current-password" /></div></label>
        <button type="button" className={ghostButton} onClick={() => setConfirming(false)}>Cancelar</button>
        <button disabled={sessions.busy} className="inline-flex items-center gap-2 rounded-md bg-red-500/15 px-4 py-2 text-[13px] font-semibold text-red-400 hover:bg-red-500/25 disabled:opacity-50">{sessions.busy && <Loader2 size={14} className="animate-spin" />}Encerrar</button>
      </form>}
    </Section>

    <Section title="Dados deste dispositivo" description="Preferências de áudio, zoom e notificações ficam salvas só neste computador.">
      <Row label="Restaurar configurações do aplicativo" description="Volta dispositivos, volumes, sons e aparência ao padrão. Não afeta sua conta.">
        <button className={ghostButton} onClick={() => { resetSettings(); applyZoom(1); toast.success('Configurações restauradas.'); }}>Restaurar</button>
      </Row>
    </Section>
  </SettingsPage>;
}
