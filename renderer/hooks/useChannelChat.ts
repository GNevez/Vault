import { useCallback, useEffect, useRef, useState } from 'react';
import { HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel } from '@microsoft/signalr';
import { getSettings } from '../lib/app-settings';
import { playCue } from '../lib/sounds';
import { ChatMessage, ChatPage } from '../types/servers';

export type ChatStatus = 'connecting' | 'ready' | 'reconnecting' | 'offline';
export interface ChannelChatState {
  channelId?: number; messages: ChatMessage[]; hasMore: boolean; loading: boolean; loadingOlder: boolean; error: string;
}

const empty = (channelId?: number): ChannelChatState => ({ channelId, messages: [], hasMore: false, loading: channelId !== undefined, loadingOlder: false, error: '' });
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/** Ids only grow on the server, so merging by id also restores order and drops duplicates (invoke result + live push). */
const merge = (current: ChatMessage[], incoming: ChatMessage[]) => {
  const byId = new Map(current.map(m => [m.id, m]));
  for (const message of incoming) byId.set(message.id, message);
  return Array.from(byId.values()).sort((a, b) => a.id - b.id);
};

const hubError = (error: unknown, fallback: string) => {
  const text = error instanceof Error ? error.message : '';
  const at = text.indexOf('HubException: ');
  return at >= 0 ? text.slice(at + 'HubException: '.length) : fallback;
};

/** Someone else's message while VAULT is in the background: sound and, if allowed, a desktop notification. */
function notify(message: ChatMessage) {
  if (document.hasFocus() || message.authorUsername.toLowerCase() === (localStorage.getItem('username') || '').toLowerCase()) return;
  playCue('message');
  if (!getSettings().desktopNotifications || typeof Notification === 'undefined') return;
  const body = message.content.length > 140 ? `${message.content.slice(0, 140)}…` : message.content;
  const show = () => { const n = new Notification(message.authorName, { body, silent: true }); n.onclick = () => window.focus(); };
  if (Notification.permission === 'granted') show();
  else if (Notification.permission === 'default') void Notification.requestPermission().then(p => { if (p === 'granted') show(); });
}

/**
 * Live chat for one text channel. One connection serves the whole Servers screen; switching channels
 * only moves this connection to another room on the server (a connection is in one room at a time).
 * Every update is checked against the channel it belongs to, so late events from a previous room are dropped.
 */
export function useChannelChat(channelId?: number) {
  const hubRef = useRef<HubConnection>();
  const readyRef = useRef<Promise<void>>();
  const channelRef = useRef(channelId);
  const [status, setStatus] = useState<ChatStatus>('connecting');
  const [state, setState] = useState<ChannelChatState>(() => empty(channelId));
  const stateRef = useRef(state);
  stateRef.current = state;

  const patch = useCallback((id: number | undefined, change: (s: ChannelChatState) => Partial<ChannelChatState>) =>
    setState(s => s.channelId === id ? { ...s, ...change(s) } : s), []);

  const open = useCallback(async (id?: number) => {
    const hub = hubRef.current;
    try { await readyRef.current; } catch { return; }
    if (!hub || channelRef.current !== id) return;
    try {
      if (id === undefined) { await hub.invoke('CloseChannel'); return; }
      const page: ChatPage = await hub.invoke('OpenChannel', id);
      patch(id, s => ({ messages: merge(s.messages, page.messages), hasMore: page.hasMore, loading: false, error: '' }));
    } catch (e) {
      patch(id, () => ({ loading: false, error: hubError(e, 'Não foi possível abrir este canal.') }));
    }
  }, [patch]);

  useEffect(() => {
    let disposed = false;
    const hub = new HubConnectionBuilder()
      .withUrl(`${process.env.NEXT_PUBLIC_API_URL}/hubs/chat`, { accessTokenFactory: () => localStorage.getItem('token') || '', withCredentials: false })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 20000])
      .configureLogging(LogLevel.None).build();
    hubRef.current = hub;

    hub.on('MessageCreated', (message: ChatMessage) => {
      if (message.channelId !== channelRef.current) return;
      patch(message.channelId, s => ({ messages: merge(s.messages, [message]) }));
      notify(message);
    });
    hub.on('ChannelClosed', (id: number, notice: string) => patch(id, () => ({ messages: [], hasMore: false, loading: false, error: notice })));

    // Room membership lives on the connection. A new connection must re-open the channel,
    // and starts from a fresh page so a gap during the outage can never be shown as continuous.
    const reopen = () => { const id = channelRef.current; setState(empty(id)); void open(id); };
    hub.onreconnecting(() => setStatus('reconnecting'));
    hub.onreconnected(() => { setStatus('ready'); reopen(); });

    const start = (restart: boolean) => {
      const ready = (async () => {
        for (let attempt = 1; !disposed; attempt++) {
          try { await hub.start(); return; }
          catch { if (!disposed) { setStatus('offline'); await wait(Math.min(15000, attempt * 2000)); } }
        }
        throw new Error('disposed');
      })();
      readyRef.current = ready;
      ready.then(() => { if (disposed) return; setStatus('ready'); if (restart) reopen(); }, () => {});
    };
    hub.onclose(() => { if (!disposed) { setStatus('offline'); start(true); } });
    start(false);

    return () => { disposed = true; void hub.stop(); };
  }, [open, patch]);

  useEffect(() => {
    channelRef.current = channelId;
    setState(empty(channelId));
    void open(channelId);
  }, [channelId, open]);

  const send = useCallback(async (content: string) => {
    const hub = hubRef.current, id = channelRef.current;
    if (!hub || id === undefined || hub.state !== HubConnectionState.Connected) throw new Error('Chat desconectado. Tentando reconectar…');
    try {
      const message: ChatMessage = await hub.invoke('SendMessage', id, content);
      patch(message.channelId, s => ({ messages: merge(s.messages, [message]) }));
    } catch (e) {
      throw new Error(hubError(e, 'Não foi possível enviar a mensagem.'));
    }
  }, [patch]);

  const loadOlder = useCallback(async () => {
    const hub = hubRef.current, id = channelRef.current, current = stateRef.current;
    if (!hub || id === undefined || hub.state !== HubConnectionState.Connected) return;
    if (current.channelId !== id || current.loading || current.loadingOlder || !current.hasMore || !current.messages.length) return;
    stateRef.current = { ...current, loadingOlder: true };
    patch(id, () => ({ loadingOlder: true }));
    try {
      const page: ChatPage = await hub.invoke('LoadHistory', id, current.messages[0].id);
      patch(id, s => ({ messages: merge(s.messages, page.messages), hasMore: page.hasMore, loadingOlder: false }));
    } catch (e) {
      patch(id, () => ({ loadingOlder: false, error: hubError(e, 'Não foi possível carregar mensagens anteriores.') }));
    }
  }, [patch]);

  return { status, ...state, send, loadOlder };
}
