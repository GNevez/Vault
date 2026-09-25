import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { authFetch } from './api';
import { LivePeer, VoicePeer, VoiceSession, VoiceState } from '../types/servers';

type PeerLink = { pc: RTCPeerConnection; audio: HTMLAudioElement; candidates: RTCIceCandidateInit[]; source?: MediaStreamAudioSourceNode; analyser?: AnalyserNode };
type Signal = [string, string, string];
const initial: VoiceState = { status: 'idle', session: null, peers: [], muted: false, deafened: false, speaking: false, volume: 1, error: '', playbackBlocked: false, relayConfigured: false };

// Kept above individual screens. Navigation never owns the microphone lifecycle.
export class VoiceEngine {
  state: VoiceState = { ...initial };
  private hub?: HubConnection;
  private stream?: MediaStream;
  private context?: AudioContext;
  private localAnalyser?: AnalyserNode;
  private localSource?: MediaStreamAudioSourceNode;
  private meter?: ReturnType<typeof setInterval>;
  private links = new Map<string, PeerLink>();
  private queues = new Map<string, Promise<void>>();
  private earlySignals: Signal[] = [];
  private epoch = 0;
  private iceServers: RTCIceServer[] = [];
  constructor(private emit: (state: VoiceState) => void) {}
  private update(patch: Partial<VoiceState>) { this.state = { ...this.state, ...patch }; this.emit(this.state); }
  private peer(id: string, patch: Partial<LivePeer>) { this.update({ peers: this.state.peers.map(p => p.connectionId === id ? { ...p, ...patch } : p) }); }

  async join(channelId: number, deviceId = '') {
    if (this.state.status === 'requesting' || this.state.status === 'connecting' || this.state.session?.channelId === channelId) return;
    const cleanup = this.disconnect();
    const epoch = ++this.epoch;
    this.update({ status: 'requesting', error: '' });
    try {
      await cleanup;
      if (epoch !== this.epoch) return;
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Microphone access requires the desktop app or HTTPS.');
      this.context = new AudioContext();
      await this.context.resume();
      if (epoch !== this.epoch) return;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, ...(deviceId ? { deviceId: { exact: deviceId } } : {}) }, video: false });
      if (epoch !== this.epoch) { stream.getTracks().forEach(t => t.stop()); return; }
      this.stream = stream;
      stream.getAudioTracks()[0].onended = () => { void this.fail('Microphone disconnected. Choose a device and join again.'); };
      const config = await authFetch('/api/Servers/voice-config');
      if (epoch !== this.epoch) return;
      this.iceServers = config.iceServers;
      this.update({ status: 'connecting', relayConfigured: config.relayConfigured });
      const hub = new HubConnectionBuilder().withUrl(`${process.env.NEXT_PUBLIC_API_URL}/hubs/voice`, {
        accessTokenFactory: () => localStorage.getItem('token') || '', withCredentials: false,
      }).configureLogging(LogLevel.None).build();
      this.hub = hub;
      hub.on('PeerJoined', (peer: VoicePeer) => {
        if (epoch === this.epoch) this.update({ peers: [...this.state.peers.filter(p => p.connectionId !== peer.connectionId), { ...peer, connectionState: 'connecting' }] });
      });
      hub.on('PeerLeft', (id: string) => {
        if (epoch !== this.epoch) return;
        this.closePeer(id); this.update({ peers: this.state.peers.filter(p => p.connectionId !== id) });
      });
      hub.on('PeerState', (peer: VoicePeer) => { if (epoch === this.epoch) this.peer(peer.connectionId, peer); });
      hub.on('Signal', (...signal: Signal) => {
        if (epoch !== this.epoch) return;
        if (!this.state.session) this.earlySignals.push(signal); else this.enqueue(signal, epoch);
      });
      hub.on('RoomClosed', (message: string) => { if (epoch === this.epoch) void this.fail(message); });
      hub.onclose(() => { if (epoch === this.epoch) void this.fail('Voice connection lost. Your microphone was released; join again to reconnect.'); });
      await hub.start();
      if (epoch !== this.epoch) { await hub.stop(); return; }
      const session: VoiceSession = await hub.invoke('JoinChannel', channelId, false, false);
      if (epoch !== this.epoch) return;
      const peers = [...session.peers, ...this.state.peers.filter(p => !session.peers.some(s => s.connectionId === p.connectionId))];
      this.update({ status: 'connected', session, peers: peers.map(p => ({ ...p, connectionState: 'connecting' })) });
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
      const message = error.name === 'NotAllowedError' ? 'Microphone permission denied. Allow it in Windows settings and join again.' : error.name === 'NotFoundError' ? 'No microphone found. Connect one and try again.' : error.message || 'Could not join voice.';
      await this.fail(message);
    }
  }

  private link(id: string, epoch: number) {
    const existing = this.links.get(id); if (existing) return existing;
    const pc = new RTCPeerConnection({ iceServers: this.iceServers });
    const audio = new Audio(); audio.autoplay = true; audio.muted = this.state.deafened; audio.volume = this.state.volume;
    const link: PeerLink = { pc, audio, candidates: [] }; this.links.set(id, link);
    for (const track of this.stream?.getTracks() || []) pc.addTrack(track, this.stream!);
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
    if (!this.context || !this.stream) return;
    this.localSource = this.context.createMediaStreamSource(this.stream);
    this.localAnalyser = this.context.createAnalyser(); this.localAnalyser.fftSize = 256;
    this.localSource.connect(this.localAnalyser);
    const bytes = new Uint8Array(256);
    const active = (analyser?: AnalyserNode) => {
      if (!analyser) return false;
      analyser.getByteTimeDomainData(bytes);
      return Math.sqrt(bytes.reduce((sum, n) => sum + ((n - 128) / 128) ** 2, 0) / bytes.length) > 0.025;
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
    this.stream?.getAudioTracks().forEach(t => { t.enabled = !muted && !deafened; });
    this.links.forEach(p => { p.audio.muted = deafened; });
    this.update({ muted, deafened });
    try { await this.hub?.invoke('SetVoiceState', muted || deafened, deafened); }
    catch { if (epoch === this.epoch) await this.fail('Could not update microphone state. Join again.'); }
  }
  setVolume(volume: number) { const value = Math.max(0, Math.min(1, volume)); this.links.forEach(p => { p.audio.volume = value; }); this.update({ volume: value }); }
  async resumeAudio() { await this.context?.resume(); try { await Promise.all(Array.from(this.links.values()).map(p => p.audio.play())); this.update({ playbackBlocked: false }); } catch { this.update({ playbackBlocked: true }); } }
  private closePeer(id: string) {
    const link = this.links.get(id); if (!link) return;
    link.pc.onconnectionstatechange = null; link.pc.ontrack = null; link.pc.onicecandidate = null;
    link.pc.close(); link.audio.pause(); link.audio.srcObject = null; link.source?.disconnect(); link.analyser?.disconnect();
    this.links.delete(id); this.queues.delete(id);
  }
  async disconnect() {
    ++this.epoch;
    const hub = this.hub; this.hub = undefined;
    this.stream?.getTracks().forEach(t => { t.onended = null; t.stop(); }); this.stream = undefined;
    for (const id of Array.from(this.links.keys())) this.closePeer(id);
    this.queues.clear(); this.earlySignals = [];
    if (this.meter) clearInterval(this.meter); this.meter = undefined;
    this.localSource?.disconnect(); this.localAnalyser?.disconnect(); this.localSource = undefined; this.localAnalyser = undefined;
    const context = this.context; this.context = undefined;
    this.update({ ...initial, volume: this.state.volume });
    if (context && context.state !== 'closed') void context.close().catch(() => {});
    if (hub) await hub.stop().catch(() => {});
  }
  private async fail(error: string) { const cleanup = this.disconnect(); const epoch = this.epoch; await cleanup; if (epoch === this.epoch) this.update({ status: 'error', error }); }
}
