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
function harness({ microphone, peers = [] } = {}) {
  const hubs = [], pcs = [], audios = [], contexts = [];
  const track = { enabled: true, stopped: false, stop() { this.stopped = true; } };
  const stream = { getTracks: () => [track], getAudioTracks: () => [track] };
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
    createAnalyser() { return { fftSize: 256, disconnect() {}, getByteTimeDomainData(bytes) { bytes.fill(128); } }; }
  }
  const exports = {};
  vm.runInNewContext(compiled, {
    exports, require: name => name === '@microsoft/signalr' ? { HubConnectionBuilder: Builder, LogLevel: { None: 0 } } : { authFetch: async () => ({ iceServers: [], relayConfigured: false }) },
    process: { env: { NEXT_PUBLIC_API_URL: 'http://unused' } }, localStorage: { getItem: () => 'unused' },
    navigator: { mediaDevices: { getUserMedia: async () => { microphoneRequests++; return microphone ? microphone(stream) : stream; } } },
    AudioContext, Audio, RTCPeerConnection: PeerConnection, MediaStream: class {}, setInterval: () => 1, clearInterval() {}, console,
  });
  const engine = new exports.VoiceEngine(() => {});
  return { engine, hubs, pcs, track, stream, audios, contexts, requests: () => microphoneRequests };
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
  assert.equal(h.engine.state.status, 'error'); assert.match(h.engine.state.error, /permission denied/);
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
