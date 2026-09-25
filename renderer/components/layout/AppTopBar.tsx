import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Gamepad2, Headphones, LayoutGrid, LogOut, Settings, User, Users } from 'lucide-react';
import { Avatar } from '../social/Avatar';
import { WindowControls } from '../ui/TitleBar';
import { BrandWordmark } from '../ui/Brand';

export type AppModule = 'community' | 'games' | 'servers';

export const MODULES: { id: AppModule; section: string; label: string; description: string; icon: typeof Users }[] = [
  { id: 'community', section: 'social', label: 'Comunidade', description: 'Feed, perfis e conversas', icon: Users },
  { id: 'games', section: 'catalog', label: 'Games', description: 'Catálogo, biblioteca e downloads', icon: Gamepad2 },
  { id: 'servers', section: 'servers', label: 'Servidores', description: 'Grupos e canais de voz', icon: Headphones },
];

/** Closes a popover on outside click or Escape. */
export function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) close(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('mousedown', onPointer);
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('mousedown', onPointer); window.removeEventListener('keydown', onKey); };
  }, [open, close]);
  return ref;
}

const menuClass = 'absolute top-full z-[70] mt-2 overflow-hidden rounded-lg border border-line bg-panel p-1.5 shadow-2xl shadow-black/60';
const menuItemClass = 'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-[13px] text-zinc-300 transition hover:bg-raised-hover hover:text-white';

interface Props {
  active: AppModule | null;
  username: string;
  inVoice: boolean;
  onNavigate: (section: string) => void;
  onLogout: () => void;
}

export function AppTopBar({ active, username, inVoice, onNavigate, onLogout }: Props) {
  const [menu, setMenu] = useState<'more' | 'user' | null>(null);
  const close = React.useCallback(() => setMenu(null), []);
  const moreRef = useDismiss(menu === 'more', close);
  const userRef = useDismiss(menu === 'user', close);
  const go = (section: string) => { setMenu(null); onNavigate(section); };

  return (
    <header className="flex h-13 shrink-0 select-none items-stretch border-b border-line bg-panel" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
      <div className="flex shrink-0 items-center pl-5 pr-6 xl:w-64"><BrandWordmark className="h-[18px] w-auto" /></div>

      <nav aria-label="Módulos" className="flex items-stretch gap-1 pl-2" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        {MODULES.map(({ id, section, label, icon: Icon }) => {
          const current = active === id;
          return (
            <button
              key={id}
              onClick={() => onNavigate(section)}
              aria-current={current ? 'page' : undefined}
              className={`relative flex items-center gap-2 px-3.5 text-[13px] font-medium transition ${current ? 'text-zinc-50' : 'text-zinc-500 hover:text-zinc-200'}`}
            >
              <span className="relative">
                <Icon size={17} strokeWidth={1.8} />
                {id === 'servers' && inVoice && <span title="Em chamada de voz" className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-panel" />}
              </span>
              {label}
              {current && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-accent" />}
            </button>
          );
        })}

        <div ref={moreRef} className="relative flex items-center">
          <button
            onClick={() => setMenu(m => (m === 'more' ? null : 'more'))}
            aria-label="Mais módulos"
            aria-expanded={menu === 'more'}
            title="Mais"
            className={`ml-1 grid h-8 w-8 place-items-center rounded-md transition ${menu === 'more' ? 'bg-raised text-zinc-100' : 'text-zinc-500 hover:bg-raised hover:text-zinc-200'}`}
          >
            <LayoutGrid size={16} strokeWidth={1.8} />
          </button>
          {menu === 'more' && (
            <div className={`${menuClass} left-0 w-72`} role="menu">
              <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Módulos</p>
              {MODULES.map(({ id, section, label, description, icon: Icon }) => (
                <button key={id} role="menuitem" onClick={() => go(section)} className={menuItemClass}>
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-md bg-raised ${active === id ? 'text-accent' : 'text-zinc-400'}`}><Icon size={16} /></span>
                  <span className="min-w-0">
                    <span className="block font-medium text-zinc-100">{label}</span>
                    <span className="block truncate text-[11px] text-zinc-500">{description}</span>
                  </span>
                </button>
              ))}
              <p className="mt-1 border-t border-line px-3 pb-1.5 pt-2.5 text-[11px] leading-4 text-zinc-600">Novos módulos do VAULT aparecerão aqui.</p>
            </div>
          )}
        </div>
      </nav>

      <div className="flex-1" />

      <div className="flex items-center" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <div ref={userRef} className="relative">
          <button
            onClick={() => setMenu(m => (m === 'user' ? null : 'user'))}
            aria-label="Menu da conta"
            aria-expanded={menu === 'user'}
            className={`mr-2 flex items-center gap-2.5 rounded-md py-1 pl-1 pr-2 transition ${menu === 'user' ? 'bg-raised' : 'hover:bg-raised'}`}
          >
            <span className="relative">
              <Avatar username={username || 'V'} size="sm" />
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-panel" />
            </span>
            <span className="hidden max-w-32 truncate text-[13px] text-zinc-300 lg:block">{username}</span>
            <ChevronDown size={14} className="text-zinc-500" />
          </button>
          {menu === 'user' && (
            <div className={`${menuClass} right-2 w-52`} role="menu">
              <button role="menuitem" onClick={() => go('profile')} className={menuItemClass}><User size={15} className="text-zinc-500" />Meu perfil</button>
              <button role="menuitem" onClick={() => go('settings')} className={menuItemClass}><Settings size={15} className="text-zinc-500" />Configurações</button>
              <div className="my-1 h-px bg-line" />
              <button role="menuitem" onClick={() => { setMenu(null); onLogout(); }} className={`${menuItemClass} hover:text-red-400!`}><LogOut size={15} className="text-zinc-500" />Sair</button>
            </div>
          )}
        </div>
        <div className="h-6 w-px bg-line" />
        <WindowControls className="ml-1" />
      </div>
    </header>
  );
}
