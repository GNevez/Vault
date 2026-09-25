import React, { useCallback, useEffect, useState } from 'react';
import { Bell, Info, Keyboard, Loader2, LogOut, Mic, Monitor, Shield, User, UserCircle } from 'lucide-react';
import { authFetch } from '../../lib/api';
import { secondaryClass } from '../servers/ServerDialog';
import { Account, MyAccountSettings, PrivacySettings, ProfileSettings } from './AccountSettings';
import { AboutSettings, AppearanceSettings, NotificationSettings, ShortcutSettings } from './AppSettings';
import { VoiceSettings } from './VoiceSettings';

export type SettingsTab = 'account' | 'profile' | 'privacy' | 'voice' | 'notifications' | 'appearance' | 'shortcuts' | 'about';

const GROUPS: { title: string; items: { id: SettingsTab; label: string; icon: typeof User }[] }[] = [
  { title: 'Usuário', items: [
    { id: 'account', label: 'Minha conta', icon: User },
    { id: 'profile', label: 'Perfil', icon: UserCircle },
    { id: 'privacy', label: 'Privacidade e segurança', icon: Shield },
  ] },
  { title: 'Aplicativo', items: [
    { id: 'voice', label: 'Voz e áudio', icon: Mic },
    { id: 'notifications', label: 'Notificações', icon: Bell },
    { id: 'appearance', label: 'Aparência', icon: Monitor },
    { id: 'shortcuts', label: 'Atalhos de teclado', icon: Keyboard },
    { id: 'about', label: 'Sobre', icon: Info },
  ] },
];
const ACCOUNT_TABS: SettingsTab[] = ['account', 'profile', 'privacy'];
export const isSettingsTab = (value: unknown): value is SettingsTab => GROUPS.some(g => g.items.some(i => i.id === value));

interface Props { tab: SettingsTab; onTab: (tab: SettingsTab) => void; onViewProfile: () => void; onLogout: () => void }

export function SettingsWorkspace({ tab, onTab, onViewProfile, onLogout }: Props) {
  const [account, setAccount] = useState<Account | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setError('');
    try { setAccount(await authFetch('/api/Account')); }
    catch (e: any) { setError(e.message || 'Não foi possível carregar sua conta.'); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const renderTab = () => {
    if (ACCOUNT_TABS.includes(tab)) {
      if (error) return <div className="grid flex-1 place-items-center p-8 text-center"><div><p role="alert" className="text-sm text-red-400">{error}</p><button onClick={() => void load()} className={`${secondaryClass} mt-4`}>Tentar novamente</button></div></div>;
      if (!account) return <div className="grid flex-1 place-items-center"><Loader2 className="animate-spin text-zinc-500" /></div>;
      if (tab === 'account') return <MyAccountSettings account={account} onAccount={setAccount} />;
      if (tab === 'profile') return <ProfileSettings account={account} onAccount={setAccount} onViewProfile={onViewProfile} />;
      return <PrivacySettings account={account} onAccount={setAccount} />;
    }
    if (tab === 'voice') return <VoiceSettings />;
    if (tab === 'notifications') return <NotificationSettings />;
    if (tab === 'appearance') return <AppearanceSettings />;
    if (tab === 'shortcuts') return <ShortcutSettings />;
    return <AboutSettings onLogout={onLogout} />;
  };

  return <section className="flex min-h-0 min-w-0 flex-1">
    <nav aria-label="Configurações" className="vault-scroll flex w-56 shrink-0 flex-col overflow-y-auto border-r border-line bg-panel px-3 py-5">
      {GROUPS.map(group => <div key={group.title} className="mb-5">
        <h2 className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">{group.title}</h2>
        {group.items.map(item => {
          const active = item.id === tab;
          return <button key={item.id} onClick={() => onTab(item.id)} aria-current={active ? 'page' : undefined}
            className={`mb-0.5 flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[13px] transition ${active ? 'bg-raised font-medium text-zinc-50' : 'text-zinc-400 hover:bg-raised/60 hover:text-zinc-100'}`}>
            <item.icon size={16} className={active ? 'text-accent' : 'text-zinc-500'} />{item.label}
          </button>;
        })}
      </div>)}
      <div className="mt-auto border-t border-line pt-3">
        <button onClick={onLogout} className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[13px] text-red-400 hover:bg-red-500/10"><LogOut size={16} />Sair</button>
      </div>
    </nav>
    <div className="vault-scroll flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">{renderTab()}</div>
  </section>;
}
