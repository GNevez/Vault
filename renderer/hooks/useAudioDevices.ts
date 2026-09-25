import { useCallback, useEffect, useState } from 'react';

export interface AudioDevice { id: string; label: string }
interface Devices { inputs: AudioDevice[]; outputs: AudioDevice[]; labelled: boolean; supported: boolean }

// Chromium lists "default" and "communications" aliases next to the real devices; the UI offers its own default entry.
const isAlias = (id: string) => id === 'default' || id === 'communications';

/** Audio inputs and outputs, kept current as devices are plugged in or removed. */
export function useAudioDevices() {
  const [devices, setDevices] = useState<Devices>({ inputs: [], outputs: [], labelled: true, supported: true });

  const refresh = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) { setDevices(d => ({ ...d, supported: false })); return; }
    const all = await navigator.mediaDevices.enumerateDevices();
    const pick = (kind: MediaDeviceKind, fallback: string) => all.filter(d => d.kind === kind && !isAlias(d.deviceId))
      .map((d, i) => ({ id: d.deviceId, label: d.label || `${fallback} ${i + 1}` }));
    const inputs = pick('audioinput', 'Microfone'), outputs = pick('audiooutput', 'Saída');
    // Without microphone permission Chromium hides labels (and sometimes ids).
    setDevices({ inputs, outputs, labelled: all.some(d => d.kind === 'audioinput' && d.label), supported: true });
  }, []);

  useEffect(() => {
    void refresh();
    const media = navigator.mediaDevices;
    media?.addEventListener?.('devicechange', refresh);
    return () => media?.removeEventListener?.('devicechange', refresh);
  }, [refresh]);

  const requestAccess = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    stream.getTracks().forEach(t => t.stop());
    await refresh();
  }, [refresh]);

  return { ...devices, refresh, requestAccess };
}
