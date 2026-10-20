import {
  afterNextRender,
  Component,
  ElementRef,
  HostListener,
  NgZone,
  OnDestroy,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { VISUAL_CONFIG } from '../../core/config/visual.config';
import { WORLD_REGISTRY } from '../../visual/worlds/world-registry';
import { WorldConfig } from '../../core/models/world-config';
import { AudioAnalyzerService } from '../../core/services/audio-analyzer.service';
import { CameraStreamService } from '../../core/services/camera-stream.service';
import { JourneyService } from '../../core/services/journey.service';
import { QrService } from '../../core/services/qr.service';
import { VisualEngineService } from '../../core/services/visual-engine.service';
import { WebRTCService } from '../../core/services/webrtc.service';
import { WorldManagerService } from '../../core/services/world-manager.service';

@Component({
  selector: 'app-show-page',
  templateUrl: './show-page.html',
  styleUrl: './show-page.scss',
})
export class ShowPage implements OnDestroy {
  private readonly zone = inject(NgZone);
  private readonly engine = inject(VisualEngineService);
  private readonly audio = inject(AudioAnalyzerService);
  private readonly worlds = inject(WorldManagerService);
  readonly journey = inject(JourneyService);
  readonly webrtc = inject(WebRTCService);
  private readonly qr = inject(QrService);
  private readonly camera = inject(CameraStreamService);

  private readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('stage');
  private readonly video = viewChild<ElementRef<HTMLVideoElement>>('remoteVideo');

  readonly qrUrl = signal('');
  readonly cameraLink = signal('');
  readonly hostAddress = signal('');
  readonly uiHidden = signal(false);
  readonly songLabel = signal('Demo Pulse (Psychedelic Rave Synth)');
  readonly songMode = signal<'demo' | 'file' | 'mic'>('demo');
  readonly fullscreen = signal(false);
  readonly copyStatus = signal('');
  readonly showWorldList = signal(false);

  // Live audio VU signals
  readonly vuBass = signal(0);
  readonly vuMid = signal(0);
  readonly vuTreble = signal(0);
  readonly vuEnergy = signal(0);
  readonly vuBeat = signal(0);
  readonly vuDrop = signal(0);

  readonly allWorlds: WorldConfig[] = WORLD_REGISTRY;

  private raf = 0;
  private hideTimer = 0;
  private localCamera = false;
  private currentHostId = '';
  private lastVuUpdate = 0;

  constructor() {
    effect(() => {
      const stream = this.webrtc.remoteStream();
      const videoRef = this.video();
      if (stream && videoRef && !this.localCamera) {
        untracked(() => this.bindStream(stream));
      }
    });

    afterNextRender(() => {
      void this.boot();
    });
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.raf);
    window.clearTimeout(this.hideTimer);
    this.engine.dispose();
    this.webrtc.disconnect();
    this.camera.stop();
    this.audio.dispose();
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboard(event: KeyboardEvent): void {
    // Prevent overriding when typing in input
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return;
    }

    switch (event.key.toLowerCase()) {
      case ' ':
        event.preventDefault();
        this.togglePause();
        break;
      case 'f':
        event.preventDefault();
        void this.toggleFullscreen();
        break;
      case 'n':
        event.preventDefault();
        this.nextWorld();
        break;
      case 'r':
        event.preventDefault();
        this.randomWorld();
        break;
      case 'h':
        event.preventDefault();
        this.toggleUi();
        break;
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
      case '7':
      case '8':
      case '9': {
        const idx = parseInt(event.key, 10) - 1;
        if (this.allWorlds[idx]) {
          this.jumpToWorld(this.allWorlds[idx]!.id);
        }
        break;
      }
      case '0':
        if (this.allWorlds[9]) this.jumpToWorld(this.allWorlds[9]!.id);
        break;
      case '-':
        if (this.allWorlds[10]) this.jumpToWorld(this.allWorlds[10]!.id);
        break;
    }
  }

  async startJourney(): Promise<void> {
    await this.audio.resume();
    if (this.songMode() === 'demo') {
      await this.audio.startDemo();
    } else if (this.songMode() === 'mic') {
      await this.audio.startMicrophone();
    } else {
      await this.audio.audioElement?.play();
    }
    this.journey.start();
    this.scheduleHide();
  }

  togglePause(): void {
    if (this.journey.status() === 'paused') {
      this.journey.resume();
      void this.audio.resume();
      if (this.songMode() === 'file') {
        void this.audio.audioElement?.play();
      }
    } else {
      this.journey.pause();
      void this.audio.suspend();
      if (this.songMode() === 'file') {
        this.audio.audioElement?.pause();
      }
    }
  }

  nextWorld(): void {
    this.journey.nextWorld();
  }

  randomWorld(): void {
    this.journey.randomWorld();
  }

  jumpToWorld(worldId: string): void {
    const world = this.worlds.jumpTo(worldId);
    if (world) {
      this.engine.setWorld(world);
    }
  }

  toggleUi(): void {
    this.uiHidden.update((value) => !value);
    if (!this.uiHidden()) {
      this.scheduleHide();
    }
  }

  toggleWorldList(): void {
    this.showWorldList.update((v) => !v);
  }

  async toggleFullscreen(): Promise<void> {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      this.fullscreen.set(false);
      return;
    }
    await document.documentElement.requestFullscreen();
    this.fullscreen.set(true);
  }

  onPointerMove(): void {
    if (this.journey.status() === 'running' && this.uiHidden()) {
      this.uiHidden.set(false);
      this.scheduleHide();
    }
  }

  onSongFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    this.songMode.set('file');
    this.songLabel.set(file.name);
    this.audio.loadFile(file);
  }

  useDemoSong(): void {
    this.songMode.set('demo');
    this.songLabel.set('Demo Pulse (Psychedelic Rave Synth)');
    if (this.journey.status() === 'running') {
      void this.audio.startDemo();
    }
  }

  async useMicrophone(): Promise<void> {
    try {
      this.songMode.set('mic');
      this.songLabel.set('Live Audio Input / Mic');
      await this.audio.startMicrophone();
    } catch {
      this.songLabel.set('Microphone permission denied');
    }
  }

  async useLocalCamera(): Promise<void> {
    try {
      const stream = await this.camera.start('user');
      this.localCamera = true;
      this.bindStream(stream);
    } catch (err) {
      console.warn('Could not start local device camera', err);
    }
  }

  async updateHostAddress(newAddress: string): Promise<void> {
    this.hostAddress.set(newAddress);
    await this.generatePairingLink(newAddress);
  }

  async copyLink(): Promise<void> {
    const link = this.cameraLink();
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      this.copyStatus.set('Copied!');
      setTimeout(() => this.copyStatus.set(''), 2500);
    } catch {
      this.copyStatus.set('Failed to copy');
    }
  }

  setHostPreset(preset: 'lan-https' | 'lan-http' | 'local'): void {
    const port = window.location.port || '4200';
    let url = '';
    if (preset === 'lan-https') {
      url = `https://192.168.1.79:${port}`;
    } else if (preset === 'lan-http') {
      url = `http://192.168.1.79:${port}`;
    } else {
      url = `${window.location.protocol}//${window.location.hostname}:${port}`;
    }
    void this.updateHostAddress(url);
  }

  private resolveInitialHostAddress(): string {
    const port = window.location.port || '4200';
    // If on localhost or 127.0.0.1, default QR code to the LAN Wi-Fi IP so phone can scan directly
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return `https://192.168.1.79:${port}`;
    }
    return `${window.location.protocol}//${window.location.host}`;
  }

  private async boot(): Promise<void> {
    const videoEl = this.video()?.nativeElement;
    const canvasEl = this.canvas()?.nativeElement;
    if (!videoEl || !canvasEl) {
      return;
    }
    videoEl.muted = true;
    videoEl.playsInline = true;
    this.engine.initialize(canvasEl, videoEl);
    this.journey.prepare();
    this.engine.start();

    // Default host address to LAN IP (or current origin)
    const defaultHost = this.resolveInitialHostAddress();
    this.hostAddress.set(defaultHost);
    await this.startHost();
    this.zone.runOutsideAngular(() => this.loop());
  }

  private async startHost(): Promise<void> {
    try {
      const id = await this.webrtc.startHost();
      this.currentHostId = id;
      await this.generatePairingLink(this.hostAddress());
    } catch {
      this.cameraLink.set('Signaling unavailable — use device camera.');
    }
  }

  private async generatePairingLink(baseUrl: string): Promise<void> {
    if (!this.currentHostId) return;
    const cleanBase = baseUrl.trim().replace(/\/+$/, '');
    const link = `${cleanBase}/camera?host=${encodeURIComponent(this.currentHostId)}`;
    this.cameraLink.set(link);
    try {
      const dataUrl = await this.qr.dataUrl(link);
      this.qrUrl.set(dataUrl);
    } catch {
      // Ignore QR error
    }
  }

  private bindStream(stream: MediaStream): void {
    const el = this.video()?.nativeElement;
    if (!el) {
      return;
    }
    if (el.srcObject !== stream) {
      el.srcObject = stream;
      void el.play().catch(() => undefined);
      this.engine.setVideo(el);
    }
  }

  private loop = (now = performance.now()): void => {
    this.raf = requestAnimationFrame(this.loop);
    const frame = this.audio.update();
    this.journey.tick(now, frame.drop);
    this.engine.renderFrame(frame, now);

    // Throttle VU UI updates to ~30 FPS for smooth performance
    if (now - this.lastVuUpdate > 33) {
      this.lastVuUpdate = now;
      this.vuBass.set(frame.bass);
      this.vuMid.set(frame.mid);
      this.vuTreble.set(frame.treble);
      this.vuEnergy.set(frame.energy);
      this.vuBeat.set(frame.beat);
      this.vuDrop.set(frame.drop);
    }
  };

  private scheduleHide(): void {
    window.clearTimeout(this.hideTimer);
    this.hideTimer = window.setTimeout(() => {
      if (this.journey.status() === 'running') {
        this.uiHidden.set(true);
      }
    }, VISUAL_CONFIG.hideUiMs);
  }
}
