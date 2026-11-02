import { afterNextRender, Component, ElementRef, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { AudioAnalyzerService } from '../../core/services/audio-analyzer.service';
import { CameraStreamService } from '../../core/services/camera-stream.service';
import { WebRTCService } from '../../core/services/webrtc.service';
import { WORLD_REGISTRY } from '../../visual/worlds/world-registry';

@Component({
  selector: 'app-setup-page',
  templateUrl: './setup-page.html',
  styleUrl: './setup-page.scss',
})
export class SetupPage {
  private readonly router = inject(Router);
  private readonly audio = inject(AudioAnalyzerService);
  readonly camera = inject(CameraStreamService);
  readonly webrtc = inject(WebRTCService);
  private readonly preview = viewChild<ElementRef<HTMLVideoElement>>('cameraPreview');

  readonly worlds = WORLD_REGISTRY;
  readonly world = signal(resolveWorldPreference());
  readonly intensity = signal(Number(localStorage.getItem('dm-intensity') || '0.72'));
  readonly quality = signal(localStorage.getItem('dm-quality') || 'balanced');
  readonly transform = signal(Math.min(5, Number(localStorage.getItem('dm-transform') || '0')));
  readonly audioMode = signal<'demo' | 'mic' | 'file'>('demo');
  readonly audioError = signal('');
  readonly audioFileName = signal('');
  readonly previewMode = signal<'none' | 'computer' | 'phone'>('none');
  readonly cameraPreviewError = signal('');
  readonly switchingCamera = signal(false);
  private audioFile: File | null = null;

  constructor() {
    effect(() => {
      const remote = this.webrtc.remoteStream();
      const local = this.camera.stream();
      const element = this.preview()?.nativeElement;
      const stream = remote ?? local;
      if (!stream || !element) return;
      untracked(() => {
        if (element.srcObject !== stream) {
          element.srcObject = stream;
          element.muted = true;
          element.playsInline = true;
          void element.play().catch(() => undefined);
        }
        this.previewMode.set(remote ? 'phone' : 'computer');
      });
    });
    afterNextRender(() => {
      if (sessionStorage.getItem('dm-local-camera') === '1') void this.startComputerPreview();
    });
  }

  async startComputerPreview(): Promise<void> {
    this.cameraPreviewError.set('');
    try {
      const stream = this.camera.stream() ?? await this.camera.start('user');
      const element = this.preview()?.nativeElement;
      if (element) {
        element.srcObject = stream;
        element.muted = true;
        element.playsInline = true;
        await element.play().catch(() => undefined);
      }
      this.previewMode.set('computer');
    } catch (error) {
      this.cameraPreviewError.set(error instanceof Error ? error.message : 'Camera preview could not start.');
    }
  }

  async switchPreviewCamera(): Promise<void> {
    if (this.previewMode() === 'phone') {
      if (!this.webrtc.requestRemoteCameraSwitch()) this.cameraPreviewError.set('Use Flip camera on the phone preview while it reconnects.');
      return;
    }
    if (this.switchingCamera()) return;
    this.switchingCamera.set(true);
    try {
      this.cameraPreviewError.set('');
      const stream = this.camera.stream() ? await this.camera.switchCamera() : await this.camera.start('environment');
      const element = this.preview()?.nativeElement;
      if (element) {
        element.srcObject = stream;
        await element.play().catch(() => undefined);
      }
      this.previewMode.set('computer');
    } catch (error) {
      this.cameraPreviewError.set(error instanceof Error ? error.message : 'Could not switch camera.');
    } finally {
      this.switchingCamera.set(false);
    }
  }

  async backToConnect(): Promise<void> {
    sessionStorage.removeItem('dm-local-camera');
    this.camera.stop();
    await this.router.navigateByUrl('/connect');
  }

  selectAudio(event: Event): void {
    this.audioFile = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.audioFileName.set(this.audioFile?.name ?? '');
    this.audioError.set('');
  }

  async launch(): Promise<void> {
    this.audioError.set('');
    try {
      if (this.audioMode() === 'demo') await this.audio.startDemo();
      if (this.audioMode() === 'mic') await this.audio.startMicrophone();
      if (this.audioMode() === 'file') {
        if (!this.audioFile) { this.audioError.set('Choose an audio file to continue.'); return; }
        this.audio.loadFile(this.audioFile);
        await this.audio.audioElement?.play();
      }
    } catch (error) {
      this.audioError.set(error instanceof Error ? error.message : 'Audio could not be started.');
      return;
    }
    localStorage.setItem('dm-world', this.world());
    localStorage.setItem('dm-intensity', String(this.intensity()));
    localStorage.setItem('dm-quality', this.quality());
    localStorage.setItem('dm-transform', String(this.transform()));
    if (this.previewMode() === 'computer') sessionStorage.setItem('dm-local-camera', '1');
    else if (this.previewMode() === 'phone') sessionStorage.removeItem('dm-local-camera');
    await this.router.navigateByUrl('/display');
  }
}

function resolveWorldPreference(): string {
  const saved = localStorage.getItem('dm-world');
  return saved && WORLD_REGISTRY.some((world) => world.id === saved) ? saved : WORLD_REGISTRY[0]!.id;
}
