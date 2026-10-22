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

  async start(facing: 'user' | 'environment' = 'user', deviceId?: string): Promise<MediaStream> {
    this.stop();
    this.facing.set(facing);
    this.error.set(null);

    // Guard for Secure Context (HTTPS requirement on mobile devices)
    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || (typeof window !== 'undefined' && !window.isSecureContext)) {
      if (typeof window !== 'undefined' && !window.isSecureContext) {
        const msg = 'Camera access requires HTTPS on phones. On the computer, start the app with "npm run start:https", then open its HTTPS LAN address on this phone.';
        this.error.set(msg);
        throw new Error(msg);
      }
      const msg = 'Camera access (navigator.mediaDevices) is not supported or blocked in this browser context.';
      this.error.set(msg);
      throw new Error(msg);
    }

    try {
      const videoConstraints: MediaTrackConstraints = {
          facingMode: { ideal: facing },
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 60 },
      };
      if (deviceId) videoConstraints.deviceId = { exact: deviceId };
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: videoConstraints,
        });
      } catch (err) {
        // Older mobile browsers may expose cameras without facingMode metadata.
        if (!(err instanceof Error) || err.name !== 'OverconstrainedError') throw err;
        stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: videoConstraints });
      }
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
    const previous = this.facing();
    const next = previous === 'user' ? 'environment' : 'user';
    const activeId = this.stream()?.getVideoTracks()[0]?.getSettings().deviceId;
    let alternateId: string | undefined;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter((device) => device.kind === 'videoinput');
      alternateId = cameras.find((device) => device.deviceId !== activeId)?.deviceId;
    } catch { /* Facing mode remains the fallback on browsers that hide device lists. */ }
    try {
      return await this.start(next, alternateId);
    } catch (switchError) {
      // Camera hardware can reject a facing-mode change. Restore the previous camera
      // so a failed switch does not leave the preview and stream permanently stopped.
      try { await this.start(previous); } catch { /* Surface the original switch error. */ }
      this.error.set(switchError instanceof Error ? switchError.message : 'Could not switch camera.');
      throw switchError;
    }
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
