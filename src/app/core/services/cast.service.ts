import { Injectable, signal } from '@angular/core';
import { getCastReceiverApplicationId } from '../config/cast.config';

interface CastSessionApi {
  sendMessage(namespace: string, message: unknown): Promise<void>;
}

interface CastContextApi {
  setOptions(options: { receiverApplicationId: string }): void;
  requestSession(): Promise<unknown>;
  getCurrentSession(): CastSessionApi | null;
}

interface CastFrameworkApi {
  CastContext: { getInstance(): CastContextApi };
}

declare global {
  interface Window {
    __onGCastApiAvailable?: (available: boolean) => void;
    cast?: { framework?: CastFrameworkApi };
  }
}

const WORLD_NAMESPACE = 'urn:x-cast:com.dreammirror.worlds';

@Injectable({ providedIn: 'root' })
export class CastService {
  readonly available = signal(false);
  readonly message = signal('');
  get configured(): boolean { return !!getCastReceiverApplicationId(); }

  private context: CastContextApi | null = null;
  private loading: Promise<boolean> | null = null;

  async connect(): Promise<void> {
    if (!this.configured) {
      this.message.set('Cast needs a registered DreamMirror receiver app ID. Open /tv on the television to run the experience there.');
      return;
    }
    if (!window.isSecureContext) {
      this.message.set('Google Cast requires this page to use HTTPS.');
      return;
    }
    try {
      if (!(await this.loadSdk())) {
        this.message.set('Google Cast is unavailable in this browser.');
        return;
      }
      const context = window.cast!.framework!.CastContext.getInstance();
      context.setOptions({ receiverApplicationId: getCastReceiverApplicationId() });
      this.context = context;
      await context.requestSession();
      this.message.set('Connected to Cast. The receiver must implement DreamMirror’s world channel.');
    } catch {
      this.message.set('Cast connection was cancelled or could not be started.');
    }
  }

  async selectWorld(worldId: string): Promise<void> {
    const session = this.context?.getCurrentSession();
    if (!session) return;
    try {
      await session.sendMessage(WORLD_NAMESPACE, { type: 'select-world', worldId });
    } catch {
      this.message.set('The connected receiver does not support DreamMirror world controls yet.');
    }
  }

  private loadSdk(): Promise<boolean> {
    if (window.cast?.framework) return Promise.resolve(true);
    if (this.loading) return this.loading;
    this.loading = new Promise<boolean>((resolve) => {
      let settled = false;
      const finish = (available: boolean) => {
        if (settled) return;
        settled = true;
        this.available.set(available);
        resolve(available);
      };
      window.__onGCastApiAvailable = (available) => finish(available);
      const script = document.createElement('script');
      script.src = 'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1';
      script.async = true;
      script.onerror = () => finish(false);
      document.head.appendChild(script);
      window.setTimeout(() => finish(!!window.cast?.framework), 10000);
    });
    return this.loading;
  }
}
