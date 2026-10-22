import { afterNextRender, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { QrService } from '../../core/services/qr.service';
import { WebRTCService } from '../../core/services/webrtc.service';

@Component({
  selector: 'app-connect-page',
  templateUrl: './connect-page.html',
  styleUrl: './connect-page.scss',
})
export class ConnectPage {
  private readonly rtc = inject(WebRTCService);
  private readonly qrService = inject(QrService);
  private readonly router = inject(Router);

  readonly qr = signal('');
  readonly phoneOrigin = signal('');
  readonly phoneLink = signal('');
  readonly status = signal('Preparing secure connection…');
  readonly error = signal('');
  readonly copied = signal(false);
  private hostId = '';
  private qrRequest = 0;

  constructor() { afterNextRender(() => void this.prepare()); }

  async connectThisComputer(): Promise<void> {
    sessionStorage.setItem('dm-local-camera', '1');
    await this.router.navigateByUrl('/setup');
  }

  async copyLink(): Promise<void> {
    if (!this.phoneLink()) return;
    try {
      await navigator.clipboard.writeText(this.phoneLink());
      this.copied.set(true);
      window.setTimeout(() => this.copied.set(false), 1800);
    } catch { this.error.set('Copy failed. Select the phone link and copy it manually.'); }
  }

  async updatePhoneOrigin(value: string): Promise<void> {
    this.phoneOrigin.set(value.trim());
    await this.refreshPhoneLink();
  }

  private async prepare(): Promise<void> {
    const current = new URL(location.href);
    if (current.protocol === 'https:' && !isLoopback(current.hostname)) this.phoneOrigin.set(current.origin);
    try {
      this.hostId = this.rtc.hostId() || await this.rtc.startHost();
      this.status.set('Visualizer ready for a phone camera');
      await this.refreshPhoneLink();
    } catch (error) {
      this.status.set('Connection service unavailable');
      this.error.set(error instanceof Error ? error.message : 'Could not start phone connection. Check the network and reload.');
    }
  }

  private async refreshPhoneLink(): Promise<void> {
    const request = ++this.qrRequest;
    this.qr.set('');
    this.phoneLink.set('');
    const origin = this.phoneOrigin().replace(/\/+$/, '');
    if (!this.hostId || !origin) return;
    try {
      const url = new URL(origin);
      if (url.protocol !== 'https:' || isLoopback(url.hostname)) {
        this.error.set('Use the computer’s HTTPS LAN address, such as https://192.168.1.20:4200. Phone camera access will not work through a LAN HTTP or localhost link.');
        return;
      }
      this.error.set('');
      const link = `${url.origin}/camera?host=${encodeURIComponent(this.hostId)}`;
      this.phoneLink.set(link);
      const image = await this.qrService.dataUrl(link);
      if (request === this.qrRequest) this.qr.set(image);
    } catch {
      this.error.set('Enter a valid HTTPS address for this computer.');
    }
  }
}

function isLoopback(host: string): boolean {
  return host === 'localhost' || host === '127.0.0.1' || host === '::1';
}
