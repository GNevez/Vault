// Runs without API, database, microphone or network. Exercises call lifecycle races.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const compiled = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../renderer/lib/voice-engine.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const flush = () => new Promise(resolve => setImmediate(resolve));
const peer = { connectionId: 'other', userId: 2, username: 'Other', avatarUrl: null, muted: false, deafened: false };
function harness({ microphone, peers = [], settings: initialSettings = {} } = {}) {
  const hubs = [], pcs = [], audios = [], contexts = [], constraints = [];
  const track = { enabled: true, stopped: false, stop() { this.stopped = true; } };
  const stream = { getTracks: () => [track], getAudioTracks: () => [track] };
  const outboundTrack = { enabled: true, stopped: false, stop() { this.stopped = true; } };
  let settings = { inputDeviceId: '', outputDeviceId: '', inputVolume: 1, outputVolume: 1, sensitivity: 0.025, echoCancellation: true, noiseSuppression: true, autoGainControl: true, joinMuted: false, ...initialSettings };
  const listeners = new Set();
  const appSettings = {
    getSettings: () => settings,
    subscribeSettings: fn => { listeners.add(fn); return () => listeners.delete(fn); },
    updateSettings: patch => { settings = { ...settings, ...patch }; listeners.forEach(fn => fn()); },
  };
  let microphoneRequests = 0;
  class Hub {
    handlers = {}; calls = []; stopped = false;
    on(event, fn) { this.handlers[event] = fn; }
    onclose(fn) { this.closed = fn; }
    async start() {}
    async stop() { this.stopped = true; this.closed?.(); }
    async invoke(method, ...args) {
      this.calls.push([method, ...args]);
      if (method === 'JoinChannel') return { serverId: 1, serverName: 'Party', channelId: args[0], channelName: 'General', connectionId: 'self', peers };
    }
  }
  class Builder {
    withUrl() { return this; } configureLogging() { return this; }
    build() { const hub = new Hub(); hubs.push(hub); return hub; }
  }
  class PeerConnection {
    remoteDescription = null; localDescription = null; candidates = []; closed = false;
    constructor() { pcs.push(this); }
    addTrack() {} close() { this.closed = true; }
    async createOffer() { return { type: 'offer', sdp: 'offer-sdp' }; }
    async createAnswer() { return { type: 'answer', sdp: 'answer-sdp' }; }
    async setLocalDescription(value) { this.localDescription = value; }
    async setRemoteDescription(value) { this.remoteDescription = value; }
    async addIceCandidate(value) { assert.ok(this.remoteDescription, 'ICE must wait for remote description'); this.candidates.push(value); }
  }
  class Audio { constructor() { audios.push(this); } async play() {} pause() {} }
  class AudioContext {
    state = 'running'; constructor() { contexts.push(this); }
    async resume() {} async close() { this.state = 'closed'; }
    createMediaStreamSource() { return { connect() {}, disconnect() {} }; }
    createAnalyser() { return { fftSize: 256, connect() {}, disconnect() {}, getByteTimeDomainData(bytes) { bytes.fill(128); } }; }
    createGain() { return { gain: { value: 1 }, connect() {}, disconnect() {} }; }
    createMediaStreamDestination() { return { stream: { getTracks: () => [outboundTrack], getAudioTracks: () => [outboundTrack] } }; }
  }
  const modules = {
    '@microsoft/signalr': { HubConnectionBuilder: Builder, LogLevel: { None: 0 } },
    './api': { authFetch: async () => ({ iceServers: [], relayConfigured: false }) },
    './app-settings': appSettings,
    './sounds': { playCue() {} },
  };
  const exports = {};
  vm.runInNewContext(compiled, {
    exports, require: name => { if (!modules[name]) throw new Error(`Unexpected import ${name}`); return modules[name]; },
    process: { env: { NEXT_PUBLIC_API_URL: 'http://unused' } }, localStorage: { getItem: () => 'unused' },
    navigator: { mediaDevices: { getUserMedia: async request => { microphoneRequests++; constraints.push(request.audio); return microphone ? microphone(stream, request.audio) : stream; } } },
    AudioContext, Audio, RTCPeerConnection: PeerConnection, MediaStream: class {}, setInterval: () => 1, clearInterval() {}, console,
  });
  const engine = new exports.VoiceEngine(() => {});
  return { engine, hubs, pcs, track, outboundTrack, stream, audios, contexts, constraints, settings: appSettings, requests: () => microphoneRequests };
}

test('newcomer offers, ICE waits for SDP, mute/deafen apply, disconnect releases everything', async () => {
  const h = harness({ peers: [peer] }); await h.engine.join(10);
  assert.equal(h.engine.state.status, 'connected');
  assert.ok(h.hubs[0].calls.some(c => c[0] === 'SendSignal' && c[2] === 'offer'));
  h.hubs[0].handlers.Signal('other', 'ice', JSON.stringify({ candidate: 'candidate' })); await flush();
  assert.equal(h.pcs[0].candidates.length, 0);
  h.hubs[0].handlers.Signal('other', 'answer', JSON.stringify({ type: 'answer', sdp: 'answer' })); await flush();
  assert.equal(h.pcs[0].candidates.length, 1);
  await h.engine.toggleMute(); assert.equal(h.track.enabled, false);
  await h.engine.toggleDeafen(); assert.equal(h.audios[0].muted, true);
  await h.engine.toggleDeafen(); assert.equal(h.track.enabled, false, 'undeafen preserves deliberate mute');
  await h.engine.toggleMute(); assert.equal(h.track.enabled, true);
  h.engine.setVolume(0.4); assert.equal(h.audios[0].volume, 0.4);
  await h.engine.disconnect();
  assert.equal(h.track.stopped, true); assert.equal(h.pcs[0].closed, true);
  assert.equal(h.hubs[0].stopped, true); assert.equal(h.contexts[0].state, 'closed'); assert.equal(h.engine.state.status, 'idle');
});

test('cancel during microphone prompt stops the late stream without connecting', async () => {
  let release; const h = harness({ microphone: stream => new Promise(resolve => { release = () => resolve(stream); }) });
  const joining = h.engine.join(10); await flush(); await h.engine.disconnect(); release(); await joining;
  assert.equal(h.track.stopped, true); assert.equal(h.hubs.length, 0); assert.equal(h.engine.state.status, 'idle');
  assert.equal(h.contexts[0].state, 'closed');
});

test('rapid double join asks for the microphone once', async () => {
  let release; const h = harness({ microphone: stream => new Promise(resolve => { release = () => resolve(stream); }) });
  const first = h.engine.join(10); const second = h.engine.join(11); await flush();
  assert.equal(h.requests(), 1); release(); await Promise.all([first, second]);
  assert.equal(h.engine.state.session.channelId, 10); await h.engine.disconnect();
});

test('permission denial is actionable and leaves no active audio context', async () => {
  const h = harness({ microphone: async () => { throw Object.assign(new Error('denied'), { name: 'NotAllowedError' }); } });
  await h.engine.join(10);
  assert.equal(h.engine.state.status, 'error'); assert.match(h.engine.state.error, /Permissão de microfone negada/);
  assert.equal(h.hubs.length, 0); assert.equal(h.contexts[0].state, 'closed');
});

test('server revocation closes microphone and peer connections', async () => {
  const h = harness({ peers: [peer] }); await h.engine.join(10);
  h.hubs[0].handlers.RoomClosed('Membership removed'); await flush();
  assert.equal(h.track.stopped, true); assert.equal(h.pcs[0].closed, true);
  assert.equal(h.engine.state.error, 'Membership removed');
});

test('incoming offer is answered, departed peers are disposed, connection loss releases microphone', async () => {
  const h = harness(); await h.engine.join(10);
  h.hubs[0].handlers.PeerJoined(peer);
  h.hubs[0].handlers.Signal('other', 'offer', JSON.stringify({ type: 'offer', sdp: 'offer' })); await flush();
  assert.ok(h.hubs[0].calls.some(c => c[0] === 'SendSignal' && c[2] === 'answer'));
  h.hubs[0].handlers.PeerLeft('other');
  assert.equal(h.pcs[0].closed, true); assert.equal(h.engine.state.peers.length, 0);
  h.hubs[0].closed(); await flush();
  assert.equal(h.track.stopped, true); assert.equal(h.engine.state.status, 'error');
});

test('mute silences the outbound track sent to peers, not only the raw microphone', async () => {
  const h = harness({ peers: [peer] }); await h.engine.join(10);
  await h.engine.toggleMute();
  assert.equal(h.outboundTrack.enabled, false); assert.equal(h.track.enabled, false);
  await h.engine.disconnect(); assert.equal(h.outboundTrack.stopped, true);
});

test('join muted setting starts the call muted and tells the server', async () => {
  const h = harness({ settings: { joinMuted: true } }); await h.engine.join(10);
  assert.equal(h.engine.state.muted, true); assert.equal(h.outboundTrack.enabled, false);
  assert.deepEqual(h.hubs[0].calls.find(c => c[0] === 'JoinChannel'), ['JoinChannel', 10, true, false]);
  await h.engine.disconnect();
});

test('switching microphone mid-call swaps the source without renegotiating peers', async () => {
  const second = { enabled: true, stopped: false, stop() { this.stopped = true; } };
  const h = harness({ peers: [peer], microphone: (stream, audio) => audio.deviceId ? { getTracks: () => [second], getAudioTracks: () => [second] } : stream });
  await h.engine.join(10);
  const offers = h.hubs[0].calls.filter(c => c[0] === 'SendSignal' && c[2] === 'offer').length;
  h.settings.updateSettings({ inputDeviceId: 'usb-mic' }); await flush(); await flush();
  assert.equal(h.track.stopped, true, 'previous microphone released');
  assert.equal(second.stopped, false); assert.equal(h.pcs.length, 1);
  assert.equal(h.hubs[0].calls.filter(c => c[0] === 'SendSignal' && c[2] === 'offer').length, offers, 'no new offer');
  await h.engine.disconnect(); assert.equal(second.stopped, true);
});

test('unplugged saved device falls back to the default microphone on join', async () => {
  const h = harness({ settings: { inputDeviceId: 'gone' }, microphone: async (stream, audio) => { if (audio.deviceId) throw Object.assign(new Error('gone'), { name: 'OverconstrainedError' }); return stream; } });
  await h.engine.join(10);
  assert.equal(h.engine.state.status, 'connected'); assert.equal(h.requests(), 2);
  await h.engine.disconnect();
});

test('device removed mid-call recovers on the default microphone', async () => {
  const h = harness(); await h.engine.join(10);
  h.track.onended(); await flush(); await flush();
  assert.equal(h.engine.state.status, 'connected'); assert.equal(h.requests(), 2);
  await h.engine.disconnect();
});
