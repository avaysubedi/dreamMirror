import { afterNextRender, Component, ElementRef, OnDestroy, inject, signal, viewChild } from '@angular/core';
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
  readonly httpsUrl = signal('');

  constructor() {
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
    const isHttp = window.location.protocol === 'http:';
    const isLan = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
    if (isHttp && isLan) {
      this.isHttpOnLan.set(true);
      const targetHttps = 'https://' + window.location.host + window.location.pathname + window.location.search;
      this.httpsUrl.set(targetHttps);
    }
  }

  goToHttps(): void {
    if (this.httpsUrl()) {
      window.location.href = this.httpsUrl();
    }
  }

  async switchCamera(): Promise<void> {
    try {
      this.error.set(null);
      const stream = await this.camera.switchCamera();
      this.mirrorPreview.set(this.camera.facing() === 'user');
      this.attachPreview(stream);
      const host = this.hostId();
      if (host) {
        await this.webrtc.connectToHost(host, stream);
      }
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Could not switch camera');
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
      this.error.set('Please enter a Host Room ID or scan the QR code from the Show page.');
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
      this.error.set(err instanceof Error ? err.message : 'Connection failed. Ensure the Show page is open.');
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
        await this.webrtc.connectToHost(host, stream);
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
