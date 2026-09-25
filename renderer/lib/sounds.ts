import { getSettings } from './app-settings';

type Cue = 'join' | 'leave' | 'message';
// Short synthesized tones: no audio assets to ship, and they follow the chosen output device.
const TONES: Record<Cue, [number, number][]> = {
  join: [[523.25, 0], [783.99, 0.09]],
  leave: [[659.25, 0], [440, 0.09]],
  message: [[880, 0]],
};

let context: AudioContext | undefined;

export function playCue(cue: Cue) {
  const settings = getSettings();
  if (cue === 'message' ? !settings.messageSound : !settings.voiceSounds) return;
  play(cue);
}

/** Used by "Testar som": plays regardless of the notification toggles. */
export function playTestTone() { play('join'); }

function play(cue: Cue) {
  const settings = getSettings();
  try {
    context ??= new AudioContext();
    const ctx = context;
    const sinkable = ctx as AudioContext & { setSinkId?: (id: string) => Promise<void> };
    if (sinkable.setSinkId && settings.outputDeviceId) void sinkable.setSinkId(settings.outputDeviceId).catch(() => {});
    const start = ctx.currentTime + 0.01;
    for (const [frequency, offset] of TONES[cue]) {
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = 'sine'; osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0, start + offset);
      gain.gain.linearRampToValueAtTime(0.12 * settings.outputVolume, start + offset + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + 0.16);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start + offset); osc.stop(start + offset + 0.18);
    }
  } catch { /* Sounds are optional. */ }
}
