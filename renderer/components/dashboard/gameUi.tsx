import React from 'react';
import type { DownloadItem } from '../../hooks/useApi';
import { coverOf, featuredFor } from '../../lib/featured-games';

export type GamesTab = 'catalog' | 'library' | 'downloads' | 'fonte';

const hueOf = (text: string) => {
  let hash = 0;
  for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  return hash % 360;
};

const initialsOf = (title: string) => title.split(/[^0-9A-Za-zÀ-ÿ]+/).filter(Boolean).slice(0, 2).map(word => word[0]).join('').toUpperCase() || '?';

/**
 * Sources don't provide cover art, so curated games use their bundled cover and every
 * other game gets a quiet, deterministic tint derived from its title.
 */
export function GameArt({ title, className = '', size = 'md' }: { title: string; className?: string; size?: 'sm' | 'md' | 'lg' }) {
  const featured = featuredFor(title);
  if (featured) return <img src={coverOf(featured)} alt="" aria-hidden loading="lazy" draggable={false} className={`object-cover ${className}`} />;
  const hue = hueOf(title);
  const text = { sm: 'text-sm', md: 'text-4xl', lg: 'text-[88px]' }[size];
  return (
    <div
      aria-hidden
      className={`relative overflow-hidden ${className}`}
      style={{ backgroundColor: `hsl(${hue} 18% 15%)` }}
    >
      <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'repeating-linear-gradient(135deg, #fff 0 1px, transparent 1px 12px)' }} />
      <span className={`absolute inset-0 grid place-items-center font-black tracking-tight ${text}`} style={{ color: `hsl(${hue} 30% 70% / 0.28)` }}>
        {initialsOf(title)}
      </span>
    </div>
  );
}

export { EmptyState } from '../ui/EmptyState';
export { accentButton, ghostButton, iconButton } from '../ui/styles';

const number = (value: number, digits: number) => value.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits });

export function formatBytes(bytes: number) {
  if (bytes <= 0) return '—';
  if (bytes < 1024 * 1024) return `${number(bytes / 1024, 1)} KB`;
  if (bytes < 1024 ** 3) return `${number(bytes / 1024 ** 2, 1)} MB`;
  return `${number(bytes / 1024 ** 3, 1)} GB`;
}

export function formatSpeed(bytesPerSec: number) {
  if (bytesPerSec < 1024) return `${bytesPerSec} B/s`;
  if (bytesPerSec < 1024 * 1024) return `${number(bytesPerSec / 1024, 1)} KB/s`;
  return `${number(bytesPerSec / 1024 ** 2, 1)} MB/s`;
}

export function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('pt-BR');
}

export const DOWNLOAD_STATES: Record<string, { label: string; tone: string }> = {
  Downloading: { label: 'Baixando', tone: 'text-accent' },
  Seeding: { label: 'Concluído · compartilhando', tone: 'text-zinc-300' },
  Paused: { label: 'Pausado', tone: 'text-zinc-400' },
  Stopped: { label: 'Parado', tone: 'text-zinc-500' },
  Hashing: { label: 'Verificando', tone: 'text-zinc-300' },
  Metadata: { label: 'Obtendo metadados', tone: 'text-zinc-300' },
  Starting: { label: 'Iniciando', tone: 'text-zinc-400' },
  Error: { label: 'Erro', tone: 'text-red-400' },
};

export const downloadState = (state: string) => DOWNLOAD_STATES[state] || { label: state, tone: 'text-zinc-500' };
export const isPausedDownload = (state: string) => state === 'Paused' || state === 'Stopped';
export const isRunningDownload = (state: string) => ['Downloading', 'Seeding', 'Metadata', 'Hashing', 'Starting'].includes(state);
/** Downloads that still need attention: not finished and not failed. */
export const isPendingDownload = (d: DownloadItem) => d.state !== 'Seeding' && d.state !== 'Error' && d.progress < 100;
