import { Injectable } from '@angular/core';
import { VISUAL_CONFIG } from '../config/visual.config';
import { AudioFrame, createAudioFrame } from '../models/audio-frame';

@Injectable({ providedIn: 'root' })
export class AudioAnalyzerService {
  readonly frame: AudioFrame = createAudioFrame();

  private context: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: AudioNode | null = null;
  private freq = new Uint8Array(0);
  private time = new Uint8Array(0);
  private prevBass = 0;
  private energySmooth = 0;
  private dropHold = 0;
  private demo: PsychedelicSynthEngine | null = null;
  private mediaEl: HTMLAudioElement | null = null;
  private micStream: MediaStream | null = null;

  get audioElement(): HTMLAudioElement | null {
    return this.mediaEl;
  }

  get currentFrame(): AudioFrame {
    return this.frame;
  }

  async resume(): Promise<void> {
    const ctx = this.ensureContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
  }

  async suspend(): Promise<void> {
    if (this.context?.state === 'running') {
      await this.context.suspend();
    }
  }

  attachMedia(element: HTMLAudioElement): void {
    this.stopDemo();
    this.stopMicrophone();
    const ctx = this.ensureContext();
    this.disconnectSource();
    this.mediaEl = element;
    const src = ctx.createMediaElementSource(element);
    src.connect(this.analyser!);
    src.connect(ctx.destination);
    this.source = src;
  }

  async startDemo(): Promise<HTMLAudioElement> {
    await this.resume();
    this.stopDemo();
    this.stopMicrophone();
    this.disconnectSource();
    const ctx = this.ensureContext();
    this.demo = new PsychedelicSynthEngine(ctx, this.analyser!);
    this.demo.start();
    return this.createSilentClock();
  }

  async startMicrophone(): Promise<MediaStream> {
    await this.resume();
    this.stopDemo();
    this.stopMicrophone();
    this.disconnectSource();

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
      video: false,
    });
    this.micStream = stream;
    const ctx = this.ensureContext();
    const src = ctx.createMediaStreamSource(stream);
    src.connect(this.analyser!);
    // Do NOT connect to ctx.destination to avoid acoustic feedback screeching in speakers
    this.source = src;
    return stream;
  }

  stopMicrophone(): void {
    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
      this.micStream = null;
    }
  }

  loadFile(file: File): HTMLAudioElement {
    this.stopDemo();
    this.stopMicrophone();
    const url = URL.createObjectURL(file);
    const el = this.createAudio(url);
    this.attachMedia(el);
    return el;
  }

  update(): AudioFrame {
    if (!this.analyser) {
      return this.frame;
    }
    this.analyser.getByteFrequencyData(this.freq);
    this.analyser.getByteTimeDomainData(this.time);

    const bass = this.bandEnergy(VISUAL_CONFIG.analyser.bassRange);
    const mid = this.bandEnergy(VISUAL_CONFIG.analyser.midRange);
    const treble = this.bandEnergy(VISUAL_CONFIG.analyser.trebleRange);

    let sum = 0;
    let peak = 0;
    for (let i = 0; i < this.time.length; i++) {
      const centered = (this.time[i]! - 128) / 128;
      sum += centered * centered;
      peak = Math.max(peak, Math.abs(centered));
    }
    const rms = Math.sqrt(sum / this.time.length);

    const bassDelta = Math.max(0, bass - this.prevBass);
    this.prevBass = bass;
    const beat = bassDelta > VISUAL_CONFIG.analyser.beatThreshold ? Math.min(1, bassDelta * 3.2) : beatDecay(this.frame.beat);

    this.energySmooth = this.energySmooth * 0.92 + (bass * 0.5 + mid * 0.3 + rms) * 0.08;
    if (this.energySmooth > VISUAL_CONFIG.analyser.dropEnergy && bassDelta > 0.12) {
      this.dropHold = 1;
    } else {
      this.dropHold *= 0.9;
    }

    this.frame.volume = peak;
    this.frame.rms = rms;
    this.frame.bass = bass;
    this.frame.mid = mid;
    this.frame.treble = treble;
    this.frame.beat = beat;
    this.frame.energy = this.energySmooth;
    this.frame.drop = this.dropHold;
    return this.frame;
  }

  dispose(): void {
    this.stopDemo();
    this.stopMicrophone();
    this.disconnectSource();
    void this.context?.close();
    this.context = null;
    this.analyser = null;
  }

  private bandEnergy(range: readonly [number, number]): number {
    const ctx = this.context;
    if (!ctx || !this.analyser) {
      return 0;
    }
    const nyquist = ctx.sampleRate / 2;
    const binHz = nyquist / this.freq.length;
    const start = Math.max(0, Math.floor(range[0] / binHz));
    const end = Math.min(this.freq.length - 1, Math.ceil(range[1] / binHz));
    let total = 0;
    for (let i = start; i <= end; i++) {
      total += this.freq[i]!;
    }
    return total / ((end - start + 1) * 255);
  }

  private ensureContext(): AudioContext {
    if (!this.context) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.context = new AudioCtx();
      this.analyser = this.context.createAnalyser();
      this.analyser.fftSize = VISUAL_CONFIG.analyser.fftSize;
      this.analyser.smoothingTimeConstant = VISUAL_CONFIG.analyser.smoothing;
      this.freq = new Uint8Array(this.analyser.frequencyBinCount);
      this.time = new Uint8Array(this.analyser.fftSize);
    }
    return this.context;
  }

  private disconnectSource(): void {
    if (this.source) {
      try {
        this.source.disconnect();
      } catch {
        // Ignore disconnect errors
      }
    }
    this.source = null;
  }

  private stopDemo(): void {
    this.demo?.stop();
    this.demo = null;
  }

  private createSilentClock(): HTMLAudioElement {
    const el = this.createAudio('');
    return el;
  }

  private createAudio(src: string): HTMLAudioElement {
    if (this.mediaEl?.src.startsWith('blob:')) {
      URL.revokeObjectURL(this.mediaEl.src);
    }
    const el = new Audio();
    el.crossOrigin = 'anonymous';
    el.loop = true;
    if (src) {
      el.src = src;
    }
    this.mediaEl = el;
    return el;
  }
}

function beatDecay(value: number): number {
  return value * 0.82;
}

/**
 * Procedural Psychedelic Synth Engine
 * Synthesizes a driving 128 BPM electronic rave track with:
 * - 4-on-the-floor punchy kick drum
 * - Resonant acid bassline
 * - Sparkling arpeggiated melodic lead
 * - Shimmering ambient pad
 * - Hi-hats and snares
 * - Dramatic tension buildups and drops!
 */
class PsychedelicSynthEngine {
  private nodes: AudioNode[] = [];
  private interval = 0;
  private step = 0;
  private playing = false;
  private noiseBuffer: AudioBuffer | null = null;
  private filter: BiquadFilterNode | null = null;

  constructor(
    private readonly ctx: AudioContext,
    private readonly output: AudioNode,
  ) {
    this.noiseBuffer = this.buildNoiseBuffer();
  }

  start(): void {
    this.playing = true;
    const master = this.ctx.createGain();
    master.gain.value = 0.28;
    master.connect(this.output);
    master.connect(this.ctx.destination);
    this.nodes.push(master);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;
    filter.Q.value = 4;
    filter.connect(master);
    this.filter = filter;
    this.nodes.push(filter);

    // Continuous sub drone & atmospheric pad
    this.osc('sine', 43.65, 0.08, master);
    this.osc('sawtooth', 174.61, 0.03, filter);

    // 16th-note clock at 128 BPM (120ms per 16th)
    this.interval = window.setInterval(() => this.tick(master, filter), 117);
  }

  stop(): void {
    this.playing = false;
    window.clearInterval(this.interval);
    for (const node of this.nodes) {
      try {
        node.disconnect();
      } catch {
        // Ignore
      }
    }
    this.nodes = [];
    this.filter = null;
  }

  private tick(master: GainNode, filter: BiquadFilterNode): void {
    if (!this.playing) {
      return;
    }
    this.step += 1;
    const step16 = this.step % 16;
    const beat = Math.floor(step16 / 4);
    const bar = Math.floor(this.step / 16) % 32;

    const isBreakdown = bar >= 16 && bar < 24;
    const isBuildup = bar >= 24 && bar < 28;
    const isDrop = bar === 28 && step16 < 4;

    // Filter sweep during buildup
    if (isBuildup) {
      const progress = (bar - 24 + step16 / 16) / 4;
      filter.frequency.setTargetAtTime(800 + progress * 5000, this.ctx.currentTime, 0.05);
    } else if (isBreakdown) {
      filter.frequency.setTargetAtTime(1400, this.ctx.currentTime, 0.1);
    } else {
      filter.frequency.setTargetAtTime(950 + 400 * Math.sin(this.step * 0.2), this.ctx.currentTime, 0.08);
    }

    // Kick Drum
    if (!isBreakdown) {
      let playKick = step16 % 4 === 0;
      if (isBuildup) {
        if (bar >= 26) playKick = step16 % 2 === 0; // 8th note rolls
        if (bar === 27 && step16 >= 8) playKick = true; // 16th note rolls
      }
      if (playKick && !(bar === 27 && step16 >= 12)) {
        // Silence on last beat before drop
        this.synthKick(master);
      }
    }

    // Drop Impact
    if (isDrop && step16 === 0) {
      this.synthImpact(master);
    }

    // Bassline (Acid notes: F, Ab, Bb, C, Eb)
    if (!isBreakdown || bar >= 20) {
      const notes = [43.65, 43.65, 51.91, 43.65, 58.27, 43.65, 65.41, 43.65];
      const noteFreq = notes[step16 % notes.length] ?? 43.65;
      if (step16 % 2 === 0 && !(bar === 27 && step16 >= 12)) {
        this.synthAcidBass(filter, noteFreq);
      }
    }

    // Psychedelic Arpeggiator Lead
    const scale = [220, 261.63, 293.66, 329.63, 392.0, 440, 523.25, 587.33, 659.25];
    const arpIdx = (this.step * 3) % scale.length;
    const arpFreq = scale[arpIdx]!;
    if (step16 % 2 === 1 || isBreakdown) {
      this.synthArp(master, arpFreq, isBreakdown ? 0.04 : 0.025);
    }

    // Hi-hats
    if (!isBreakdown || bar >= 22) {
      if (step16 % 4 === 2) {
        // Open hi-hat on upbeat
        this.synthHat(master, 0.08, 0.06);
      } else if (step16 % 2 === 1) {
        // Closed hi-hat
        this.synthHat(master, 0.02, 0.035);
      }
    }

    // Snare / Clap on beats 2 and 4
    if ((beat === 1 || beat === 3) && step16 % 4 === 0 && !isBreakdown) {
      this.synthSnare(master);
    }
  }

  private synthKick(dest: AudioNode): void {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(145, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.09);

    gain.gain.setValueAtTime(0.85, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  private synthImpact(dest: AudioNode): void {
    // Huge sub drop + white noise explosion
    this.synthKick(dest);
    this.synthHat(dest, 0.6, 0.15);

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(75, now);
    osc.frequency.exponentialRampToValueAtTime(25, now + 1.2);
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + 1.4);
  }

  private synthAcidBass(dest: AudioNode, freq: number): void {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  private synthArp(dest: AudioNode, freq: number, amp: number): void {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(amp, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  private synthHat(dest: AudioNode, duration: number, amp: number): void {
    if (!this.noiseBuffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 6500;

    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;
    gain.gain.setValueAtTime(amp, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    src.start(now);
    src.stop(now + duration + 0.02);
  }

  private synthSnare(dest: AudioNode): void {
    const now = this.ctx.currentTime;
    // Tone body
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(185, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.08);
    oscGain.gain.setValueAtTime(0.25, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(oscGain);
    oscGain.connect(dest);
    osc.start(now);
    osc.stop(now + 0.11);

    // Noise snap
    this.synthHat(dest, 0.14, 0.09);
  }

  private osc(type: OscillatorType, freq: number, gainValue: number, dest: AudioNode): OscillatorNode {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = gainValue;
    osc.connect(gain);
    gain.connect(dest);
    osc.start();
    this.nodes.push(osc, gain);
    return osc;
  }

  private buildNoiseBuffer(): AudioBuffer {
    const length = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }
}
