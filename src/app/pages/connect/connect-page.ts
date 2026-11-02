import { afterNextRender, Component, effect, inject, signal } from '@angular/core';
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

  constructor() {
    effect(() => {
      const remote = this.rtc.remoteStream();
      const state = this.rtc.status();
      const connectionError = this.rtc.error();
      if (remote) this.status.set('Phone camera connected');
      else if (state === 'hosting') this.status.set('Ready — scan the QR with your phone');
      if (connectionError) this.error.set(connectionError);
    });
    afterNextRender(() => void this.prepare());
  }

  async connectThisComputer(): Promise<void> {
    sessionStorage.setItem('dm-local-camera', '1');
    await this.router.navigateByUrl('/setup');
  }

  async continueToSetup(): Promise<void> {
    await this.router.navigateByUrl('/setup');
  }

  async openTvMode(): Promise<void> {
    await this.router.navigateByUrl('/tv');
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
    localStorage.setItem('dm-phone-origin', value.trim());
    await this.refreshPhoneLink();
  }

  private async prepare(): Promise<void> {
    this.phoneOrigin.set(initialPhoneOrigin());
    if (isLoopback(location.hostname)) {
      try {
        const response = await fetch('/dreammirror-network.json', { cache: 'no-store' });
        const network = await response.json() as { host?: string };
        if (network.host) this.phoneOrigin.set(`https://${network.host}:${location.port || '4200'}`);
      } catch { /* Production hosting may not provide the optional development LAN hint. */ }
    }
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
      if (isLoopback(url.hostname)) {
        this.error.set('This address only works on the computer. Enter the computer Wi-Fi IPv4 address from ipconfig; the QR will update automatically.');
        return;
      }
      url.protocol = 'https:';
      this.phoneOrigin.set(url.origin);
      localStorage.setItem('dm-phone-origin', url.origin);
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

function initialPhoneOrigin(): string {
  const current = new URL(location.href);
  const port = current.port || '4200';
  // The address in the current URL is authoritative; a remembered LAN address
  // becomes stale when DHCP changes the computer's IP.
  if (!isLoopback(current.hostname)) return `${current.protocol}//${current.hostname}:${port}`;
  return localStorage.getItem('dm-phone-origin') || '';
}
