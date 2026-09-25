// Shared class names for the VAULT visual identity (graphite layers + matte amber accent).
export const accentButton = 'inline-flex items-center justify-center gap-2 rounded-md bg-accent px-4 py-2 text-[13px] font-semibold text-accent-ink transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50';
export const ghostButton = 'inline-flex items-center justify-center gap-2 rounded-md border border-line px-4 py-2 text-[13px] font-medium text-zinc-300 transition hover:bg-raised hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-50';
export const iconButton = 'grid h-8 w-8 shrink-0 place-items-center rounded-md border border-line text-zinc-400 transition hover:bg-raised-hover hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-50';
export const inputClass = 'w-full rounded-md border border-line bg-panel px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-accent/60';
export const cardClass = 'rounded-lg border border-line bg-raised';
export const tabClass = (selected: boolean) => `relative flex items-center gap-2 px-4 pb-3 pt-1 text-sm font-medium transition ${selected ? 'text-zinc-50' : 'text-zinc-500 hover:text-zinc-200'}`;
