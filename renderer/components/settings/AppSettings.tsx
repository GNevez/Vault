import React, { useEffect, useState } from 'react';
import { FolderOpen, LogOut } from 'lucide-react';
import { applyZoom, updateSettings, useAppSettings, ZOOM_LEVELS } from '../../lib/app-settings';
import { playCue } from '../../lib/sounds';
import { ghostButton } from '../ui/styles';
import { Row, Section, SettingsPage, ToggleRow } from './controls';

export function NotificationSettings() {
  const settings = useAppSettings();
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  useEffect(() => { setPermission(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission); }, []);

  return <SettingsPage title="Notificações" description="Sons e avisos enquanto você usa o VAULT.">
    <Section title="Chat" description="Valem para o canal de texto aberto quando o VAULT está em segundo plano.">
      <ToggleRow label="Notificações na área de trabalho" description={permission === 'denied' ? 'Bloqueadas pelo Windows. Libere em Configurações › Sistema › Notificações.' : 'Mostra o autor e o começo da mensagem.'} checked={settings.desktopNotifications && permission !== 'denied'} disabled={permission === 'denied' || permission === 'unsupported'} onChange={desktopNotifications => {
        updateSettings({ desktopNotifications });
        if (desktopNotifications && permission === 'default') void Notification.requestPermission().then(setPermission);
      }} />
      <ToggleRow label="Som de nova mensagem" checked={settings.messageSound} onChange={messageSound => { updateSettings({ messageSound }); if (messageSound) playCue('message'); }} />
    </Section>
    <Section title="Voz">
      <ToggleRow label="Sons de entrada e saída" description="Toca um aviso quando alguém entra ou sai do seu canal de voz." checked={settings.voiceSounds} onChange={voiceSounds => { updateSettings({ voiceSounds }); if (voiceSounds) playCue('join'); }} />
    </Section>
  </SettingsPage>;
}

export function AppearanceSettings() {
  const settings = useAppSettings();
  const setZoom = (zoom: number) => { updateSettings({ zoom }); applyZoom(zoom); };
  return <SettingsPage title="Aparência" description="Ajuste o VAULT para a sua tela.">
    <Section title="Escala da interface" description="Aumenta ou diminui textos e elementos do app inteiro.">
      <div className="flex flex-wrap gap-2 px-5 py-4" role="radiogroup" aria-label="Escala da interface">
        {ZOOM_LEVELS.map(level => <button key={level} role="radio" aria-checked={settings.zoom === level} onClick={() => setZoom(level)}
          className={`min-w-16 rounded-md border px-3 py-2 text-[13px] tabular-nums transition ${settings.zoom === level ? 'border-accent/60 bg-accent/10 font-semibold text-zinc-50' : 'border-line text-zinc-400 hover:bg-raised-hover hover:text-zinc-100'}`}>
          {Math.round(level * 100)}%
        </button>)}
      </div>
    </Section>
    <Section title="Tema">
      <Row label="Grafite" description="O VAULT usa um tema escuro único, pensado para longas sessões de jogo."><span className="text-xs text-zinc-500">Ativo</span></Row>
    </Section>
  </SettingsPage>;
}

const SHORTCUTS: { keys: string[]; action: string }[] = [
  { keys: ['Ctrl', 'K'], action: 'Buscar jogos (em Games › Descobrir)' },
  { keys: ['Enter'], action: 'Enviar mensagem no chat' },
  { keys: ['Shift', 'Enter'], action: 'Quebrar linha na mensagem' },
  { keys: ['Esc'], action: 'Fechar janelas e menus' },
  { keys: ['F11'], action: 'Alternar tela cheia' },
  { keys: ['F12'], action: 'Abrir ferramentas de desenvolvedor' },
];

export function ShortcutSettings() {
  return <SettingsPage title="Atalhos de teclado" description="Teclas disponíveis no VAULT.">
    <Section title="Atalhos">
      {SHORTCUTS.map(shortcut => <Row key={shortcut.action} label={shortcut.action}>
        <span className="flex gap-1">{shortcut.keys.map(key => <kbd key={key} className="rounded border border-line bg-panel px-2 py-0.5 font-mono text-[11px] text-zinc-300 shadow-[inset_0_-1px_0_rgba(255,255,255,0.06)]">{key}</kbd>)}</span>
      </Row>)}
    </Section>
  </SettingsPage>;
}

interface AppInfo { version: string; electron: string; chrome: string; platform: string }

export function AboutSettings({ onLogout }: { onLogout: () => void }) {
  const [info, setInfo] = useState<AppInfo | null>(null);
  useEffect(() => { window.ipc?.invoke('app-info').then(value => setInfo(value as AppInfo)).catch(() => {}); }, []);
  const rows: [string, string | undefined][] = [
    ['Versão do VAULT', info?.version], ['Electron', info?.electron], ['Chromium', info?.chrome], ['Sistema', info?.platform], ['Servidor da API', process.env.NEXT_PUBLIC_API_URL],
  ];
  return <SettingsPage title="Sobre" description="Informações do aplicativo e suporte.">
    <Section title="Aplicativo">
      {rows.map(([label, value]) => <Row key={label} label={label}><span className="font-mono text-xs text-zinc-400">{value ?? '—'}</span></Row>)}
    </Section>
    <Section title="Suporte">
      <Row label="Pasta de dados e logs" description="Abra para enviar o arquivo debug.log ao relatar um problema.">
        <button className={ghostButton} disabled={!info} onClick={() => void window.ipc?.invoke('app-open-logs')}><FolderOpen size={15} />Abrir pasta</button>
      </Row>
    </Section>
    <Section title="Sessão">
      <Row label="Sair da conta" description="Desconecta a voz e volta para a tela de login.">
        <button className="inline-flex items-center gap-2 rounded-md bg-red-500/15 px-4 py-2 text-[13px] font-semibold text-red-400 hover:bg-red-500/25" onClick={onLogout}><LogOut size={15} />Sair</button>
      </Row>
    </Section>
  </SettingsPage>;
}
