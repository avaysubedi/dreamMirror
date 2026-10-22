import { afterNextRender, Component, ElementRef, OnDestroy, effect, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CameraStreamService } from '../../core/services/camera-stream.service';
import { WebRTCService } from '../../core/services/webrtc.service';

@Component({
  selector: 'app-camera-page',
  templateUrl: './camera-page.html',
  styleUrl: './camera-page.scss',
})
export class CameraPage implements OnDestroy {
  readonly camera = inject(CameraStreamService);
  readonly webrtc = inject(WebRTCService);
  private readonly route = inject(ActivatedRoute);
  private readonly preview = viewChild<ElementRef<HTMLVideoElement>>('preview');

  readonly error = signal<string | null>(null);
  readonly hostId = signal<string | null>(null);
  readonly manualHostInput = signal('');
  readonly mirrorPreview = signal(true);
  readonly isFullscreen = signal(false);
  readonly isHttpOnLan = signal(false);
  readonly switchingCamera = signal(false);

  constructor() {
    let handledSwitchRequest = this.webrtc.cameraSwitchRequest();
    effect(() => {
      const request = this.webrtc.cameraSwitchRequest();
      if (request > handledSwitchRequest) {
        handledSwitchRequest = request;
        void this.switchCamera();
      }
    });
    afterNextRender(() => {
      this.checkSecurityContext();
      void this.boot();
    });
  }

  ngOnDestroy(): void {
    this.camera.stop();
    this.webrtc.disconnect();
  }

  private checkSecurityContext(): void {
    if (typeof window === 'undefined') return;
    const isLan = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
    if (!window.isSecureContext && isLan) {
      this.isHttpOnLan.set(true);
    }
  }

  async switchCamera(): Promise<void> {
    if (this.switchingCamera()) return;
    this.switchingCamera.set(true);
    try {
      this.error.set(null);
      const stream = await this.camera.switchCamera();
      this.mirrorPreview.set(this.camera.facing() === 'user');
      this.attachPreview(stream);
      const host = this.hostId();
      if (host && (this.webrtc.status() === 'connected' || this.webrtc.status() === 'connecting')) {
        await this.webrtc.replaceOutgoingVideo(stream);
      }
    } catch (err) {
      const restored = this.camera.stream();
      if (restored) {
        this.mirrorPreview.set(this.camera.facing() === 'user');
        this.attachPreview(restored);
        if (this.hostId() && (this.webrtc.status() === 'connected' || this.webrtc.status() === 'connecting')) {
          try { await this.webrtc.replaceOutgoingVideo(restored); } catch { /* Keep the restored local preview. */ }
        }
      }
      this.error.set(err instanceof Error ? err.message : 'Could not switch camera');
    } finally {
      this.switchingCamera.set(false);
    }
  }

  async toggleTorch(): Promise<void> {
    await this.camera.toggleTorch();
  }

  toggleMirror(): void {
    this.mirrorPreview.update((v) => !v);
  }

  async toggleFullscreen(): Promise<void> {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen?.();
      this.isFullscreen.set(true);
    } else {
      await document.exitFullscreen?.();
      this.isFullscreen.set(false);
    }
  }

  async connectToHost(targetHostId?: string): Promise<void> {
    const host = (targetHostId ?? this.manualHostInput() ?? this.hostId() ?? '').trim();
    if (!host) {
      this.error.set('Open the camera link from the DreamMirror Connect page, or enter its Host Room ID.');
      return;
    }
    this.hostId.set(host);
    this.error.set(null);

    try {
      let stream = this.camera.stream();
      if (!stream) {
        stream = await this.camera.start(this.camera.facing());
        this.attachPreview(stream);
      }
      await this.webrtc.connectToHost(host, stream);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Connection failed. Keep the DreamMirror Display open and try again.');
    }
  }

  async reconnect(): Promise<void> {
    await this.boot();
  }

  private async boot(): Promise<void> {
    const host = this.route.snapshot.queryParamMap.get('host');
    if (host) {
      this.hostId.set(host);
      this.manualHostInput.set(host);
    }

    try {
      this.error.set(null);
      const stream = await this.camera.start('user');
      this.mirrorPreview.set(true);
      this.attachPreview(stream);

      if (host) {
        this.error.set('Camera ready. Connecting to the computer…');
        await this.webrtc.connectToHost(host, stream);
        this.error.set(null);
      } else {
        this.error.set('No Show Host ID detected. Enter the Host ID below or scan the QR code.');
      }
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Camera permission was denied.');
    }
  }

  private attachPreview(stream: MediaStream): void {
    const el = this.preview()?.nativeElement;
    if (!el) return;
    el.srcObject = stream;
    el.muted = true;
    el.playsInline = true;
    void el.play().catch(() => undefined);
  }
}
