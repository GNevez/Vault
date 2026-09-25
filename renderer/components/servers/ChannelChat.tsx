import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Hash, Loader2, SendHorizontal, WifiOff } from 'lucide-react';
import { toast } from 'sonner';
import { useChannelChat } from '../../hooks/useChannelChat';
import { ChatMessage, TextChannel } from '../../types/servers';
import { Avatar } from '../social/Avatar';
import { parseApiDate } from '../social/PostCard';

const MAX_LENGTH = 2000;
const GROUP_WINDOW_MS = 7 * 60 * 1000;

const timeOf = (m: ChatMessage) => parseApiDate(m.createdAt);
const dayLabel = (date: Date) => {
  const today = new Date(); const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Hoje';
  if (date.toDateString() === yesterday.toDateString()) return 'Ontem';
  return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
};
const clock = (date: Date) => date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

/** Message history and composer for one text channel. */
export function ChannelChat({ channel, serverName, pending }: { channel?: TextChannel; serverName?: string; pending: boolean }) {
  const chat = useChannelChat(channel?.id);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // Follow new messages only while the reader is at the bottom.
  const pinned = useRef(true);
  const layout = useRef<{ first?: number; height: number }>({ height: 0 });

  useEffect(() => { setDraft(''); pinned.current = true; layout.current = { height: 0 }; }, [channel?.id]);

  useLayoutEffect(() => {
    const el = listRef.current; if (!el) return;
    const first = chat.messages[0]?.id;
    const prepended = layout.current.first !== undefined && first !== undefined && first < layout.current.first;
    if (prepended && !pinned.current) el.scrollTop += el.scrollHeight - layout.current.height;
    else if (pinned.current) el.scrollTop = el.scrollHeight;
    layout.current = { first, height: el.scrollHeight };
  }, [chat.messages]);

  const onScroll = () => {
    const el = listRef.current; if (!el) return;
    pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (el.scrollTop < 120) void chat.loadOlder();
  };

  const submit = async () => {
    const content = draft.trim();
    if (!content || sending || content.length > MAX_LENGTH) return;
    setSending(true); pinned.current = true;
    try { await chat.send(content); setDraft(''); }
    catch (e: any) { toast.error(e.message); }
    finally { setSending(false); inputRef.current?.focus(); }
  };

  const ready = chat.status === 'ready';
  const statusNote = chat.status === 'connecting' ? 'Conectando ao chat…' : chat.status === 'reconnecting' ? 'Conexão instável. Reconectando…' : chat.status === 'offline' ? 'Sem conexão com o chat. Tentando novamente…' : '';
  const canType = !!channel && ready && !chat.loading;

  return <>
    <div ref={listRef} onScroll={onScroll} className="vault-scroll flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-6">
      {!serverName ? pending && <Loader2 className="m-auto animate-spin text-zinc-500" /> : !channel ? <div className="mt-auto max-w-2xl">
        <span className="grid h-14 w-14 place-items-center rounded-lg bg-raised text-zinc-400"><Hash size={26} /></span>
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-zinc-50">Nenhum canal de texto</h2>
        <p className="mt-1.5 text-sm leading-6 text-zinc-500">{serverName} ainda não tem canais de texto.</p>
      </div> : chat.loading ? <Loader2 className="m-auto animate-spin text-zinc-500" /> : <div className="mt-auto">
        {chat.hasMore ? <div className="mb-4 flex justify-center">
          <button onClick={() => void chat.loadOlder()} disabled={chat.loadingOlder} className="flex items-center gap-2 rounded-md px-3 py-1.5 text-xs text-zinc-500 hover:bg-raised hover:text-zinc-200 disabled:opacity-60">
            {chat.loadingOlder && <Loader2 size={13} className="animate-spin" />}Carregar mensagens anteriores
          </button>
        </div> : <div className="mb-6 max-w-2xl">
          <span className="grid h-14 w-14 place-items-center rounded-lg bg-raised text-zinc-400"><Hash size={26} /></span>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-zinc-50">Bem-vindo a #{channel.name}</h2>
          <p className="mt-1.5 text-sm leading-6 text-zinc-500">Este é o começo do canal #{channel.name} em {serverName}.</p>
        </div>}
        {chat.error && <p role="alert" className="mb-4 rounded-lg border border-red-900/40 bg-red-500/5 p-3 text-sm text-red-400">{chat.error}</p>}
        <MessageList messages={chat.messages} />
      </div>}
    </div>

    <div className="shrink-0 px-6 pb-5">
      <form onSubmit={e => { e.preventDefault(); void submit(); }} className={`flex items-end gap-2 rounded-lg border border-line bg-raised px-3 py-2 ${canType ? '' : 'opacity-70'}`}>
        <textarea
          ref={inputRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void submit(); } }}
          disabled={!canType}
          rows={Math.min(6, draft.split('\n').length)}
          maxLength={MAX_LENGTH}
          aria-label="Mensagem"
          placeholder={channel ? `Conversar em #${channel.name}` : 'Nenhum canal de texto selecionado'}
          className="vault-scroll max-h-40 min-w-0 flex-1 resize-none bg-transparent py-1.5 text-sm leading-6 text-zinc-200 placeholder:text-zinc-500 focus:outline-none disabled:cursor-not-allowed"
        />
        <button type="submit" disabled={!canType || sending || !draft.trim()} aria-label="Enviar" title="Enviar" className="mb-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-md text-zinc-400 hover:bg-raised-hover hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-40">
          {sending ? <Loader2 size={16} className="animate-spin" /> : <SendHorizontal size={17} />}
        </button>
      </form>
      <div className="mt-1.5 flex min-h-4 items-center gap-2 px-1 text-[11px] text-zinc-600">
        {statusNote ? <span role="status" className="flex items-center gap-1.5 text-amber-400/80"><WifiOff size={12} />{statusNote}</span> : <span>Enter envia · Shift+Enter quebra linha</span>}
        {draft.length > MAX_LENGTH - 200 && <span className="ml-auto tabular-nums">{draft.length} / {MAX_LENGTH}</span>}
      </div>
    </div>
  </>;
}

function MessageList({ messages }: { messages: ChatMessage[] }) {
  return <ol className="space-y-0.5">
    {messages.map((message, i) => {
      const previous = messages[i - 1];
      const at = timeOf(message);
      const newDay = !previous || timeOf(previous).toDateString() !== at.toDateString();
      const grouped = !newDay && previous.authorId === message.authorId && at.getTime() - timeOf(previous).getTime() < GROUP_WINDOW_MS;
      return <li key={message.id}>
        {newDay && <div className="my-4 flex items-center gap-3 text-[11px] font-semibold text-zinc-500"><span className="h-px flex-1 bg-line" />{dayLabel(at)}<span className="h-px flex-1 bg-line" /></div>}
        <div className={`group flex gap-3 rounded-md px-2 hover:bg-raised/40 ${grouped ? 'py-0.5' : 'mt-3 py-1'}`}>
          <div className="w-8 shrink-0">
            {grouped
              ? <time dateTime={at.toISOString()} className="hidden pt-1 text-[10px] tabular-nums text-zinc-600 group-hover:block">{clock(at)}</time>
              : <Avatar username={message.authorUsername} src={message.authorAvatarUrl} size="sm" />}
          </div>
          <div className="min-w-0 flex-1">
            {!grouped && <p className="flex items-baseline gap-2">
              <span className="truncate text-[13px] font-semibold text-zinc-100">{message.authorName}</span>
              <time dateTime={at.toISOString()} title={at.toLocaleString('pt-BR')} className="shrink-0 text-[11px] text-zinc-500">{clock(at)}</time>
            </p>}
            <p className="whitespace-pre-wrap break-words text-sm leading-6 text-zinc-300">{message.content}</p>
          </div>
        </div>
      </li>;
    })}
  </ol>;
}
