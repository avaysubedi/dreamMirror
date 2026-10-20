import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CameraStreamService {
  readonly stream = signal<MediaStream | null>(null);
  readonly facing = signal<'user' | 'environment'>('user');
  readonly error = signal<string | null>(null);
  readonly active = signal(false);
  readonly torchOn = signal(false);
  readonly torchSupported = signal(false);
  readonly resolution = signal<{ width: number; height: number }>({ width: 0, height: 0 });

  async start(facing: 'user' | 'environment' = 'user'): Promise<MediaStream> {
    this.stop();
    this.facing.set(facing);
    this.error.set(null);

    // Guard for Secure Context (HTTPS requirement on mobile devices)
    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const isHttp = typeof window !== 'undefined' && window.location.protocol === 'http:';
      const isNotLocal = typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
      if (isHttp && isNotLocal) {
        const httpsUrl = 'https://' + window.location.host + window.location.pathname + window.location.search;
        const msg = 'HTTPS is required on mobile browsers for camera access. Switch to HTTPS: ' + httpsUrl;
        this.error.set(msg);
        throw new Error(msg);
      }
      const msg = 'Camera access (navigator.mediaDevices) is not supported or blocked in this browser context.';
      this.error.set(msg);
      throw new Error(msg);
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 60 },
        },
      });
      this.stream.set(stream);
      this.active.set(true);

      const track = stream.getVideoTracks()[0];
      if (track) {
        const settings = track.getSettings();
        if (settings.width && settings.height) {
          this.resolution.set({ width: settings.width, height: settings.height });
        }
        const capabilities = (track.getCapabilities?.() || {}) as { torch?: boolean };
        this.torchSupported.set(!!capabilities.torch);
      }

      return stream;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Camera permission was denied.';
      this.error.set(message);
      throw err;
    }
  }

  async switchCamera(): Promise<MediaStream> {
    const next = this.facing() === 'user' ? 'environment' : 'user';
    return this.start(next);
  }

  async toggleTorch(): Promise<boolean> {
    const track = this.stream()?.getVideoTracks()[0];
    if (!track || !this.torchSupported()) {
      return false;
    }
    const nextState = !this.torchOn();
    try {
      await (track.applyConstraints as (constraints: MediaTrackConstraints & { advanced?: Array<{ torch: boolean }> }) => Promise<void>)({
        advanced: [{ torch: nextState }],
      });
      this.torchOn.set(nextState);
      return nextState;
    } catch {
      return false;
    }
  }

  stop(): void {
    this.torchOn.set(false);
    this.stream()
      ?.getTracks()
      .forEach((track) => track.stop());
    this.stream.set(null);
    this.active.set(false);
    this.resolution.set({ width: 0, height: 0 });
  }
}
