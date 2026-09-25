import React, { useEffect, useRef, useState } from 'react';
import { Mic, Square, Volume2 } from 'lucide-react';
import { useAudioDevices } from '../../hooks/useAudioDevices';
import { updateSettings, useAppSettings } from '../../lib/app-settings';
import { playTestTone } from '../../lib/sounds';
import { microphoneConstraints, setSink } from '../../lib/voice-engine';
import { useVoice } from '../servers/VoiceProvider';
import { ghostButton } from '../ui/styles';
import { percent, Row, Section, Select, SettingsPage, Slider, ToggleRow } from './controls';

/** The meter scale: RMS 0–METER_MAX spans the whole bar, so the sensitivity range (0.005–0.1) sits in its left two thirds. */
const METER_MAX = 0.15;

export function VoiceSettings() {
  const settings = useAppSettings();
  const devices = useAudioDevices();
  const { voice } = useVoice();
  const [accessError, setAccessError] = useState('');
  const inCall = !!voice.session;

  const inputOptions = [{ value: '', label: 'Padrão do Windows' }, ...devices.inputs.map(d => ({ value: d.id, label: d.label }))];
  const outputOptions = [{ value: '', label: 'Padrão do Windows' }, ...devices.outputs.map(d => ({ value: d.id, label: d.label }))];
  // A saved device that is unplugged stays selected, labelled, so the choice is not silently lost.
  if (settings.inputDeviceId && !devices.inputs.some(d => d.id === settings.inputDeviceId)) inputOptions.push({ value: settings.inputDeviceId, label: 'Dispositivo desconectado' });
  if (settings.outputDeviceId && !devices.outputs.some(d => d.id === settings.outputDeviceId)) outputOptions.push({ value: settings.outputDeviceId, label: 'Dispositivo desconectado' });

  return <SettingsPage title="Voz e áudio" description={inCall ? 'Você está em uma chamada. As mudanças valem na hora, sem precisar sair do canal.' : 'Dispositivos, volumes e processamento da sua voz.'}>
    {!devices.supported ? <p className="rounded-lg border border-line bg-raised p-4 text-sm text-zinc-400">Este ambiente não permite listar dispositivos de áudio.</p> : !devices.labelled && <div className="flex items-center gap-4 rounded-lg border border-accent/30 bg-accent/5 p-4">
      <p className="flex-1 text-sm leading-6 text-zinc-300">Permita o acesso ao microfone para ver os nomes dos seus dispositivos.</p>
      <button className={ghostButton} onClick={() => { setAccessError(''); devices.requestAccess().catch(() => setAccessError('Acesso negado. Libere o microfone nas configurações de privacidade do Windows.')); }}>Permitir acesso</button>
    </div>}
    {accessError && <p role="alert" className="text-sm text-red-400">{accessError}</p>}

    <Section title="Dispositivos">
      <Row stacked label="Dispositivo de entrada" description="O microfone usado nas chamadas." htmlFor="input-device">
        <Select id="input-device" label="Dispositivo de entrada" value={settings.inputDeviceId} options={inputOptions} onChange={inputDeviceId => updateSettings({ inputDeviceId })} />
      </Row>
      <Row stacked label="Dispositivo de saída" description="Onde você ouve as outras pessoas e os sons do app." htmlFor="output-device">
        <div className="flex gap-2">
          <Select id="output-device" label="Dispositivo de saída" value={settings.outputDeviceId} options={outputOptions} onChange={outputDeviceId => updateSettings({ outputDeviceId })} />
          <button className={`${ghostButton} shrink-0`} onClick={playTestTone}><Volume2 size={15} />Testar</button>
        </div>
      </Row>
    </Section>

    <Section title="Volume">
      <Row stacked label="Volume de entrada" description="Aumente se as pessoas dizem que você está baixo. Acima de 100% pode distorcer.">
        <Slider label="Volume de entrada" value={settings.inputVolume} min={0} max={2} step={0.05} format={percent} onChange={inputVolume => updateSettings({ inputVolume })} />
      </Row>
      <Row stacked label="Volume de saída" description="Volume das pessoas na chamada.">
        <Slider label="Volume de saída" value={settings.outputVolume} min={0} max={1} step={0.05} format={percent} onChange={outputVolume => updateSettings({ outputVolume })} />
      </Row>
    </Section>

    <Section title="Teste e sensibilidade" description="Fale normalmente: a barra deve passar da marca quando você fala e ficar abaixo dela em silêncio.">
      <MicTest />
    </Section>

    <Section title="Processamento de voz" description="Filtros aplicados pelo sistema ao seu microfone.">
      <ToggleRow label="Supressão de ruído" description="Reduz ventilador, teclado e barulho de fundo." checked={settings.noiseSuppression} onChange={noiseSuppression => updateSettings({ noiseSuppression })} />
      <ToggleRow label="Cancelamento de eco" description="Evita que o som das suas caixas volte pelo microfone. Deixe ligado se não usa fone." checked={settings.echoCancellation} onChange={echoCancellation => updateSettings({ echoCancellation })} />
      <ToggleRow label="Ganho automático" description="Ajusta o volume do microfone sozinho conforme você fala." checked={settings.autoGainControl} onChange={autoGainControl => updateSettings({ autoGainControl })} />
    </Section>

    <Section title="Comportamento">
      <ToggleRow label="Entrar em canais com o microfone silenciado" description="Você decide quando começar a falar." checked={settings.joinMuted} onChange={joinMuted => updateSettings({ joinMuted })} />
    </Section>
  </SettingsPage>;
}

/** Live input meter using the same device, filters and gain as a call. Optional loopback lets you hear yourself. */
function MicTest() {
  const settings = useAppSettings();
  const [testing, setTesting] = useState(false);
  const [loopback, setLoopback] = useState(false);
  const [error, setError] = useState('');
  const [level, setLevel] = useState(0);
  const gainRef = useRef<GainNode>();
  const audioRef = useRef<HTMLAudioElement>();

  // Restart the capture whenever the device or its filters change.
  useEffect(() => {
    if (!testing) return;
    let stopped = false, frame = 0;
    let stream: MediaStream | undefined, context: AudioContext | undefined;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: microphoneConstraints(settings), video: false });
        if (stopped) { stream.getTracks().forEach(t => t.stop()); return; }
        context = new AudioContext();
        const source = context.createMediaStreamSource(stream);
        const gain = context.createGain(); gain.gain.value = settings.inputVolume; gainRef.current = gain;
        const analyser = context.createAnalyser(); analyser.fftSize = 512;
        const monitor = context.createMediaStreamDestination();
        source.connect(gain); gain.connect(analyser); gain.connect(monitor);
        const audio = new Audio(); audio.srcObject = monitor.stream; audio.muted = true; audioRef.current = audio;
        await setSink(audio, settings.outputDeviceId);
        void audio.play().catch(() => {});
        const bytes = new Uint8Array(analyser.fftSize);
        const tick = () => {
          analyser.getByteTimeDomainData(bytes);
          const rms = Math.sqrt(bytes.reduce((sum, n) => sum + ((n - 128) / 128) ** 2, 0) / bytes.length);
          setLevel(Math.min(1, rms / METER_MAX));
          frame = requestAnimationFrame(tick);
        };
        tick();
      } catch (e: any) {
        if (stopped) return;
        setError(e?.name === 'NotAllowedError' ? 'Permissão de microfone negada.' : e?.name === 'NotFoundError' || e?.name === 'OverconstrainedError' ? 'Microfone não encontrado. Escolha outro dispositivo.' : 'Não foi possível abrir o microfone.');
        setTesting(false);
      }
    })();
    return () => {
      stopped = true; cancelAnimationFrame(frame);
      stream?.getTracks().forEach(t => t.stop());
      audioRef.current?.pause(); audioRef.current = undefined; gainRef.current = undefined;
      void context?.close().catch(() => {});
      setLevel(0);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testing, settings.inputDeviceId, settings.outputDeviceId, settings.echoCancellation, settings.noiseSuppression, settings.autoGainControl]);

  useEffect(() => { if (gainRef.current) gainRef.current.gain.value = settings.inputVolume; }, [settings.inputVolume]);
  useEffect(() => { if (audioRef.current) audioRef.current.muted = !loopback; }, [loopback, testing]);

  const threshold = Math.min(1, settings.sensitivity / METER_MAX);
  const speaking = testing && level > threshold;

  return <>
    <Row stacked label="Medidor de entrada" description={testing ? (speaking ? 'Detectando voz.' : 'Abaixo da marca: tratado como silêncio.') : 'Inicie o teste e fale alguma coisa.'}>
      <div className="relative h-3 overflow-hidden rounded-full bg-panel ring-1 ring-line" role="meter" aria-label="Nível do microfone" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(level * 100)}>
        <div className={`h-full rounded-full transition-[width] duration-75 ${speaking ? 'bg-emerald-400' : 'bg-zinc-500'}`} style={{ width: `${level * 100}%` }} />
        <span className="absolute inset-y-0 w-0.5 bg-accent" style={{ left: `${threshold * 100}%` }} title="Sensibilidade" />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button className={ghostButton} onClick={() => { setError(''); setTesting(t => !t); }}>{testing ? <><Square size={14} />Parar teste</> : <><Mic size={15} />Testar microfone</>}</button>
        <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-400">
          <input type="checkbox" checked={loopback} onChange={e => setLoopback(e.target.checked)} className="accent-[#d4a24e]" />Ouvir minha voz <span className="text-zinc-600">(use fone para evitar microfonia)</span>
        </label>
      </div>
      {error && <p role="alert" className="mt-3 text-xs text-red-400">{error}</p>}
    </Row>
    <Row stacked label="Sensibilidade de voz" description="Quanto mais à direita, mais alto você precisa falar para aparecer como falando.">
      <Slider label="Sensibilidade de voz" value={settings.sensitivity} min={0.005} max={0.1} step={0.005} format={v => percent(v / 0.1)} onChange={sensitivity => updateSettings({ sensitivity })} />
    </Row>
  </>;
}
