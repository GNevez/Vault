import { useSyncExternalStore } from 'react';

/** Per-device preferences. Devices and volumes belong to this machine, so they never leave localStorage. */
export interface AppSettings {
  inputDeviceId: string;
  outputDeviceId: string;
  /** Microphone gain, 0–2 (1 = unchanged). */
  inputVolume: number;
  /** Call playback volume, 0–1. */
  outputVolume: number;
  /** RMS level above which you count as speaking, 0.005–0.1. */
  sensitivity: number;
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
  joinMuted: boolean;
  voiceSounds: boolean;
  messageSound: boolean;
  desktopNotifications: boolean;
  zoom: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  inputDeviceId: '', outputDeviceId: '', inputVolume: 1, outputVolume: 1, sensitivity: 0.025,
  echoCancellation: true, noiseSuppression: true, autoGainControl: true, joinMuted: false,
  voiceSounds: true, messageSound: true, desktopNotifications: true, zoom: 1,
};

const KEY = 'vault.settings';
const listeners = new Set<() => void>();
let current: AppSettings | null = null;

function load(): AppSettings {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) || '{}');
    return { ...DEFAULT_SETTINGS, ...(stored && typeof stored === 'object' ? stored : {}) };
  } catch { return { ...DEFAULT_SETTINGS }; }
}

export function getSettings(): AppSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  return current ??= load();
}

export function updateSettings(patch: Partial<AppSettings>) {
  current = { ...getSettings(), ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(current)); } catch { /* Keeps working for this session. */ }
  listeners.forEach(listener => listener());
}

export function resetSettings() {
  try { localStorage.removeItem(KEY); } catch {}
  current = { ...DEFAULT_SETTINGS };
  listeners.forEach(listener => listener());
}

export function subscribeSettings(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function useAppSettings() {
  return useSyncExternalStore(subscribeSettings, getSettings, () => DEFAULT_SETTINGS);
}

export const ZOOM_LEVELS = [0.8, 0.9, 1, 1.1, 1.25, 1.5];
export function applyZoom(zoom = getSettings().zoom) {
  window.ipc?.send('app-set-zoom', zoom);
}
