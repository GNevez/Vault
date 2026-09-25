import React, { useEffect, useRef, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { authFetch } from '../../lib/api';

export const fieldClass = 'mt-2 w-full rounded-md border border-line bg-panel px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-accent/60';
export const primaryClass = 'rounded-md bg-accent px-4 py-2 text-[13px] font-semibold text-accent-ink transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-40';
export const secondaryClass = 'rounded-md border border-line px-4 py-2 text-[13px] font-medium text-zinc-300 transition hover:bg-raised hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-40';
export function ServerDialog({ title, onClose, children, busy = false }: { title: string; onClose: () => void; children: React.ReactNode; busy?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const controls = useRef({ busy, onClose });
  controls.current = { busy, onClose };
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>('input, button')?.focus();
    const keydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !controls.current.busy) controls.current.onClose();
      if (e.key === 'Tab') {
        const items = ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex="0"]');
        if (!items?.length) return;
        const first = items[0], last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.removeEventListener('keydown', keydown); previous?.focus(); };
  }, []);
  return <div className="fixed inset-x-0 bottom-0 top-13 z-[80] grid place-items-center bg-black/75 p-6 backdrop-blur-sm" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties} onMouseDown={e => { if (e.target === e.currentTarget && !busy) onClose(); }}>
    <div ref={ref} role="dialog" aria-modal="true" aria-label={title} className="vault-scroll max-h-full w-full max-w-md overflow-y-auto rounded-lg border border-line bg-panel p-6 shadow-2xl">
      <div className="mb-5 flex items-center justify-between gap-4"><h2 className="text-lg font-bold">{title}</h2><button disabled={busy} onClick={onClose} aria-label="Fechar" className="rounded-md p-2 text-zinc-500 hover:bg-raised hover:text-white"><X size={18} /></button></div>
      {children}
    </div>
  </div>;
}

export function ServerManager({ mode, onClose, onComplete }: { mode: 'create' | 'join'; onClose: () => void; onComplete: (id: number) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return <ServerDialog title={mode === 'create' ? 'Criar servidor' : 'Entrar em um servidor'} onClose={onClose} busy={busy}>
    <p className="mb-5 text-sm leading-6 text-zinc-500">{mode === 'create' ? 'Um lugar para o seu grupo. Comece com um canal de voz e convide seus amigos.' : 'Cole o código de convite compartilhado pelo dono do servidor.'}</p>
    <form onSubmit={async e => {
      e.preventDefault(); if (busy) return; const form = new FormData(e.currentTarget); setBusy(true); setError('');
      try {
        const server = await authFetch(mode === 'create' ? '/api/Servers' : '/api/Servers/join', { method: 'POST', body: JSON.stringify(mode === 'create' ? { name: form.get('name'), description: form.get('description') } : { code: String(form.get('code')).trim() }) });
        onComplete(server.id);
      } catch (e: any) { setError(e.message); } finally { setBusy(false); }
    }}>
      {mode === 'create' ? <><label className="block text-xs font-medium text-zinc-300">Nome do servidor<input name="name" required maxLength={80} placeholder="Os de sempre" className={fieldClass} /></label><label className="mt-4 block text-xs font-medium text-zinc-300">Descrição <span className="text-zinc-500">(opcional)</span><textarea name="description" rows={3} maxLength={300} className={fieldClass} placeholder="O que vocês gostam de jogar juntos?" /></label></> : <label className="block text-xs font-medium text-zinc-300">Código de convite<input name="code" required maxLength={64} autoComplete="off" spellCheck={false} placeholder="Cole o código de convite" className={fieldClass} /></label>}
      {error && <p role="alert" className="mt-4 text-sm text-red-400">{error}</p>}
      <button disabled={busy} className={`${primaryClass} mt-6 flex w-full items-center justify-center gap-2`}>{busy && <Loader2 size={16} className="animate-spin" />}{mode === 'create' ? 'Criar servidor' : 'Entrar no servidor'}</button>
    </form>
  </ServerDialog>;
}
