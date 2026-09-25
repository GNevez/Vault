import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { authFetch } from './api';
import { AppSettings, getSettings, subscribeSettings, updateSettings } from './app-settings';
import { playCue } from './sounds';
import { LivePeer, VoicePeer, VoiceSession, VoiceState } from '../types/servers';

type PeerLink = { pc: RTCPeerConnection; audio: HTMLAudioElement; candidates: RTCIceCandidateInit[]; source?: MediaStreamAudioSourceNode; analyser?: AnalyserNode };
type Signal = [string, string, string];
type SinkElement = HTMLMediaElement & { setSinkId?: (id: string) => Promise<void> };
const initial: VoiceState = { status: 'idle', session: null, peers: [], muted: false, deafened: false, speaking: false, volume: 1, error: '', playbackBlocked: false, relayConfigured: false };

export function microphoneConstraints(settings: AppSettings, deviceId = settings.inputDeviceId): MediaTrackConstraints {
  return { echoCancellation: settings.echoCancellation, noiseSuppression: settings.noiseSuppression, autoGainControl: settings.autoGainControl, ...(deviceId ? { deviceId: { exact: deviceId } } : {}) };
}
export function setSink(element: HTMLMediaElement, deviceId: string) {
  const sink = element as SinkElement;
  return sink.setSinkId ? sink.setSinkId(deviceId).catch(() => {}) : Promise.resolve();
}

// Kept above individual screens. Navigation never owns the microphone lifecycle.
// Audio path: microphone → gain → one outbound track. The outbound track never changes during a call,
// so switching microphones or input volume never renegotiates with peers.
export class VoiceEngine {
  state: VoiceState = { ...initial, volume: getSettings().outputVolume };
  private hub?: HubConnection;
  private stream?: MediaStream;
  private context?: AudioContext;
  private micSource?: MediaStreamAudioSourceNode;
  private gain?: GainNode;
  private outbound?: MediaStreamAudioDestinationNode;
  private localAnalyser?: AnalyserNode;
  private meter?: ReturnType<typeof setInterval>;
  private links = new Map<string, PeerLink>();
  private queues = new Map<string, Promise<void>>();
  private earlySignals: Signal[] = [];
  private epoch = 0;
  private iceServers: RTCIceServer[] = [];
  private settings = getSettings();
  private unsubscribe?: () => void;
  constructor(private emit: (state: VoiceState) => void) {}
  private update(patch: Partial<VoiceState>) { this.state = { ...this.state, ...patch }; this.emit(this.state); }
  private peer(id: string, patch: Partial<LivePeer>) { this.update({ peers: this.state.peers.map(p => p.connectionId === id ? { ...p, ...patch } : p) }); }

  private async openMicrophone(deviceId?: string) {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('O microfone só funciona no app desktop ou via HTTPS.');
    return navigator.mediaDevices.getUserMedia({ audio: microphoneConstraints(this.settings, deviceId), video: false });
  }

  /** Points the audio graph at a new microphone stream and releases the previous one. */
  private wireMicrophone(stream: MediaStream, epoch: number) {
    const context = this.context!;
    this.gain ??= context.createGain();
    this.outbound ??= context.createMediaStreamDestination();
    if (!this.localAnalyser) {
      this.localAnalyser = context.createAnalyser(); this.localAnalyser.fftSize = 256;
      this.gain.connect(this.outbound); this.gain.connect(this.localAnalyser);
    }
    this.gain.gain.value = this.settings.inputVolume;
    this.micSource?.disconnect();
    this.micSource = context.createMediaStreamSource(stream);
    this.micSource.connect(this.gain);
    const previous = this.stream;
    this.stream = stream;
    previous?.getTracks().forEach(t => { t.onended = null; t.stop(); });
    stream.getAudioTracks()[0].onended = () => { void this.recoverMicrophone(epoch); };
    this.applyTrackState();
  }

  /** A removed or replaced device ends the track. Fall back to the system default before giving up. */
  private async recoverMicrophone(epoch: number) {
    try {
      const stream = await this.openMicrophone('');
      if (epoch !== this.epoch) { stream.getTracks().forEach(t => t.stop()); return; }
      this.wireMicrophone(stream, epoch);
    } catch {
      if (epoch === this.epoch) void this.fail('Microfone desconectado. Escolha um dispositivo em Configurações › Voz e áudio e entre novamente.');
    }
  }

  private async switchMicrophone() {
    const epoch = this.epoch;
    if (!this.state.session) return;
    try {
      const stream = await this.openMicrophone();
      if (epoch !== this.epoch) { stream.getTracks().forEach(t => t.stop()); return; }
      this.wireMicrophone(stream, epoch);
    } catch { if (epoch === this.epoch) await this.recoverMicrophone(epoch); }
  }

  private applyTrackState() {
    const live = !this.state.muted && !this.state.deafened;
    this.stream?.getAudioTracks().forEach(t => { t.enabled = live; });
    this.outbound?.stream.getAudioTracks().forEach(t => { t.enabled = live; });
  }

  /** Settings can change mid-call from the settings screen or the side panel. */
  private onSettings(next: AppSettings) {
    const previous = this.settings; this.settings = next;
    if (next.inputVolume !== previous.inputVolume && this.gain) this.gain.gain.value = next.inputVolume;
    if (next.outputVolume !== previous.outputVolume) { this.links.forEach(p => { p.audio.volume = next.outputVolume; }); this.update({ volume: next.outputVolume }); }
    if (next.outputDeviceId !== previous.outputDeviceId) this.links.forEach(p => { void setSink(p.audio, next.outputDeviceId); });
    if (next.inputDeviceId !== previous.inputDeviceId || next.echoCancellation !== previous.echoCancellation || next.noiseSuppression !== previous.noiseSuppression || next.autoGainControl !== previous.autoGainControl) void this.switchMicrophone();
  }

  async join(channelId: number) {
    if (this.state.status === 'requesting' || this.state.status === 'connecting' || this.state.session?.channelId === channelId) return;
    const cleanup = this.disconnect();
    const epoch = ++this.epoch;
    this.update({ status: 'requesting', error: '' });
    try {
      await cleanup;
      if (epoch !== this.epoch) return;
      this.settings = getSettings();
      this.unsubscribe = subscribeSettings(() => { if (epoch === this.epoch) this.onSettings(getSettings()); });
      this.update({ muted: this.settings.joinMuted, deafened: false, volume: this.settings.outputVolume });
      this.context = new AudioContext();
      await this.context.resume();
      if (epoch !== this.epoch) return;
      let stream: MediaStream;
      // A saved device may have been unplugged since; fall back to the system default.
      try { stream = await this.openMicrophone(); }
      catch (error: any) { if (!this.settings.inputDeviceId || error.name === 'NotAllowedError') throw error; stream = await this.openMicrophone(''); }
      if (epoch !== this.epoch) { stream.getTracks().forEach(t => t.stop()); return; }
      this.wireMicrophone(stream, epoch);
      const config = await authFetch('/api/Servers/voice-config');
      if (epoch !== this.epoch) return;
      this.iceServers = config.iceServers;
      this.update({ status: 'connecting', relayConfigured: config.relayConfigured });
      const hub = new HubConnectionBuilder().withUrl(`${process.env.NEXT_PUBLIC_API_URL}/hubs/voice`, {
        accessTokenFactory: () => localStorage.getItem('token') || '', withCredentials: false,
      }).configureLogging(LogLevel.None).build();
      this.hub = hub;
      hub.on('PeerJoined', (peer: VoicePeer) => {
        if (epoch !== this.epoch) return;
        this.update({ peers: [...this.state.peers.filter(p => p.connectionId !== peer.connectionId), { ...peer, connectionState: 'connecting' }] });
        if (this.state.session) playCue('join');
      });
      hub.on('PeerLeft', (id: string) => {
        if (epoch !== this.epoch) return;
        this.closePeer(id); this.update({ peers: this.state.peers.filter(p => p.connectionId !== id) });
        playCue('leave');
      });
      hub.on('PeerState', (peer: VoicePeer) => { if (epoch === this.epoch) this.peer(peer.connectionId, peer); });
      hub.on('Signal', (...signal: Signal) => {
        if (epoch !== this.epoch) return;
        if (!this.state.session) this.earlySignals.push(signal); else this.enqueue(signal, epoch);
      });
      hub.on('RoomClosed', (message: string) => { if (epoch === this.epoch) void this.fail(message); });
      hub.onclose(() => { if (epoch === this.epoch) void this.fail('A conexão de voz caiu. O microfone foi liberado; entre no canal de novo para reconectar.'); });
      await hub.start();
      if (epoch !== this.epoch) { await hub.stop(); return; }
      const session: VoiceSession = await hub.invoke('JoinChannel', channelId, this.state.muted, false);
      if (epoch !== this.epoch) return;
      const peers = [...session.peers, ...this.state.peers.filter(p => !session.peers.some(s => s.connectionId === p.connectionId))];
      this.update({ status: 'connected', session, peers: peers.map(p => ({ ...p, connectionState: 'connecting' })) });
      playCue('join');
      this.startMeter();
      // Only the newcomer offers. Per-peer queues serialize descriptions and ICE.
      for (const peer of session.peers) {
        const link = this.link(peer.connectionId, epoch);
        const offer = await link.pc.createOffer();
        if (epoch !== this.epoch) return;
        await link.pc.setLocalDescription(offer);
        await hub.invoke('SendSignal', peer.connectionId, 'offer', JSON.stringify(link.pc.localDescription));
      }
      for (const signal of this.earlySignals.splice(0)) this.enqueue(signal, epoch);
    } catch (error: any) {
      if (epoch !== this.epoch) return;
      const message = error.name === 'NotAllowedError' ? 'Permissão de microfone negada. Libere o acesso nas configurações do Windows e entre de novo.' : error.name === 'NotFoundError' ? 'Nenhum microfone encontrado. Conecte um e tente de novo.' : error.message || 'Não foi possível entrar na voz.';
      await this.fail(message);
    }
  }

  private link(id: string, epoch: number) {
    const existing = this.links.get(id); if (existing) return existing;
    const pc = new RTCPeerConnection({ iceServers: this.iceServers });
    const audio = new Audio(); audio.autoplay = true; audio.muted = this.state.deafened; audio.volume = this.state.volume;
    if (this.settings.outputDeviceId) void setSink(audio, this.settings.outputDeviceId);
    const link: PeerLink = { pc, audio, candidates: [] }; this.links.set(id, link);
    const outbound = this.outbound?.stream;
    for (const track of outbound?.getAudioTracks() || []) pc.addTrack(track, outbound!);
    pc.onicecandidate = event => {
      if (event.candidate && epoch === this.epoch) void this.hub?.invoke('SendSignal', id, 'ice', JSON.stringify(event.candidate.toJSON())).catch(() => {});
    };
    pc.ontrack = event => {
      if (epoch !== this.epoch) return;
      const stream = event.streams[0] || new MediaStream([event.track]);
      audio.srcObject = stream;
      void audio.play().catch(() => { if (epoch === this.epoch) this.update({ playbackBlocked: true }); });
      if (this.context) {
        link.source?.disconnect();
        link.source = this.context.createMediaStreamSource(stream);
        link.analyser = this.context.createAnalyser(); link.analyser.fftSize = 256;
        link.source.connect(link.analyser);
      }
    };
    pc.onconnectionstatechange = () => {
      if (epoch === this.epoch) this.peer(id, { connectionState: pc.connectionState });
    };
    return link;
  }

  private enqueue(signal: Signal, epoch: number) {
    const [id, kind, payload] = signal;
    const queued = (this.queues.get(id) || Promise.resolve()).then(async () => {
      if (epoch !== this.epoch || !this.state.peers.some(p => p.connectionId === id)) return;
      const link = this.link(id, epoch);
      const data = JSON.parse(payload);
      if (kind === 'ice') {
        if (link.pc.remoteDescription) await link.pc.addIceCandidate(data);
        else link.candidates.push(data);
      } else {
        if ((kind !== 'offer' && kind !== 'answer') || data.type !== kind) return;
        await link.pc.setRemoteDescription(data);
        for (const candidate of link.candidates.splice(0)) await link.pc.addIceCandidate(candidate);
        if (kind === 'offer') {
          await link.pc.setLocalDescription(await link.pc.createAnswer());
          await this.hub?.invoke('SendSignal', id, 'answer', JSON.stringify(link.pc.localDescription));
        }
      }
    }).catch(() => { if (epoch === this.epoch) this.peer(id, { connectionState: 'failed' }); });
    this.queues.set(id, queued);
  }

  private startMeter() {
    if (!this.localAnalyser) return;
    const bytes = new Uint8Array(256);
    const active = (analyser?: AnalyserNode) => {
      if (!analyser) return false;
      analyser.getByteTimeDomainData(bytes);
      return Math.sqrt(bytes.reduce((sum, n) => sum + ((n - 128) / 128) ** 2, 0) / bytes.length) > this.settings.sensitivity;
    };
    this.meter = setInterval(() => {
      const speaking = !this.state.muted && !this.state.deafened && active(this.localAnalyser);
      const peers = this.state.peers.map(p => ({ ...p, speaking: !p.muted && active(this.links.get(p.connectionId)?.analyser) }));
      if (speaking !== this.state.speaking || peers.some((p, i) => p.speaking !== this.state.peers[i].speaking)) this.update({ speaking, peers });
    }, 150);
  }

  async toggleMute() { await this.setVoiceState(!this.state.muted, this.state.deafened); }
  async toggleDeafen() { await this.setVoiceState(this.state.muted, !this.state.deafened); }
  private async setVoiceState(muted: boolean, deafened: boolean) {
    if (!this.state.session) return;
    const epoch = this.epoch;
    this.update({ muted, deafened });
    this.applyTrackState();
    this.links.forEach(p => { p.audio.muted = deafened; });
    try { await this.hub?.invoke('SetVoiceState', muted || deafened, deafened); }
    catch { if (epoch === this.epoch) await this.fail('Não foi possível atualizar o estado do microfone. Entre de novo.'); }
  }
  /** Persisted, so the settings screen and the next call use the same volume. */
  setVolume(volume: number) {
    const value = Math.max(0, Math.min(1, volume));
    this.links.forEach(p => { p.audio.volume = value; }); this.update({ volume: value });
    updateSettings({ outputVolume: value });
  }
  async resumeAudio() { await this.context?.resume(); try { await Promise.all(Array.from(this.links.values()).map(p => p.audio.play())); this.update({ playbackBlocked: false }); } catch { this.update({ playbackBlocked: true }); } }
  private closePeer(id: string) {
    const link = this.links.get(id); if (!link) return;
    link.pc.onconnectionstatechange = null; link.pc.ontrack = null; link.pc.onicecandidate = null;
    link.pc.close(); link.audio.pause(); link.audio.srcObject = null; link.source?.disconnect(); link.analyser?.disconnect();
    this.links.delete(id); this.queues.delete(id);
  }
  async disconnect() {
    ++this.epoch;
    if (this.state.session) playCue('leave');
    this.unsubscribe?.(); this.unsubscribe = undefined;
    const hub = this.hub; this.hub = undefined;
    this.stream?.getTracks().forEach(t => { t.onended = null; t.stop(); }); this.stream = undefined;
    for (const id of Array.from(this.links.keys())) this.closePeer(id);
    this.queues.clear(); this.earlySignals = [];
    if (this.meter) clearInterval(this.meter); this.meter = undefined;
    this.outbound?.stream.getTracks().forEach(t => t.stop());
    this.micSource?.disconnect(); this.gain?.disconnect(); this.localAnalyser?.disconnect();
    this.micSource = undefined; this.gain = undefined; this.outbound = undefined; this.localAnalyser = undefined;
    const context = this.context; this.context = undefined;
    this.update({ ...initial, volume: this.state.volume });
    if (context && context.state !== 'closed') void context.close().catch(() => {});
    if (hub) await hub.stop().catch(() => {});
  }
  private async fail(error: string) { const cleanup = this.disconnect(); const epoch = this.epoch; await cleanup; if (epoch === this.epoch) this.update({ status: 'error', error }); }
}
