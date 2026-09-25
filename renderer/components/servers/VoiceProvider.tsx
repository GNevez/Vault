import React, { createContext, useContext, useEffect, useState } from 'react';
import { VoiceEngine } from '../../lib/voice-engine';
import { VoiceState } from '../../types/servers';

const VoiceContext = createContext<{ voice: VoiceState; engine: VoiceEngine } | null>(null);
export function VoiceProvider({ children }: { children: React.ReactNode }) {
  const [voice, setVoice] = useState<VoiceState>({ status: 'idle', session: null, peers: [], muted: false, deafened: false, speaking: false, volume: 1, error: '', playbackBlocked: false, relayConfigured: false });
  const [engine] = useState(() => new VoiceEngine(setVoice));
  useEffect(() => {
    const unload = () => { void engine.disconnect(); };
    window.addEventListener('beforeunload', unload);
    return () => { window.removeEventListener('beforeunload', unload); void engine.disconnect(); };
  }, [engine]);
  return <VoiceContext.Provider value={{ voice, engine }}>{children}</VoiceContext.Provider>;
}
export function useVoice() { const value = useContext(VoiceContext); if (!value) throw new Error('VoiceProvider missing'); return value; }
