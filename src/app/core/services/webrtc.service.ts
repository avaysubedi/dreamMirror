import { Injectable, signal } from '@angular/core';
import { MediaConnection, Peer } from 'peerjs';
import { VISUAL_CONFIG } from '../config/visual.config';

export type SignalStatus = 'idle' | 'hosting' | 'connecting' | 'connected' | 'disconnected' | 'error';

@Injectable({ providedIn: 'root' })
export class WebRTCService {
  readonly hostId = signal<string | null>(null);
  readonly status = signal<SignalStatus>('idle');
  readonly connectedUsers = signal(0);
  readonly remoteStream = signal<MediaStream | null>(null);
  readonly error = signal<string | null>(null);
  readonly latencyMs = signal<number | null>(null);

  private peer: Peer | null = null;
  private call: MediaConnection | null = null;

  async startHost(customId?: string): Promise<string> {
    this.teardown();
    this.status.set('hosting');
    const peer = this.createPeer(customId);
    const id = await this.waitForOpen(peer);
    this.hostId.set(id);

    peer.on('call', (incoming) => {
      // If there is an existing call from a previous attempt/reload, close it cleanly
      if (this.call) {
        try {
          this.call.close();
        } catch {
          // Ignore
        }
      }
      this.call = incoming;
      incoming.answer();
      incoming.on('stream', (stream) => {
        this.remoteStream.set(stream);
        this.connectedUsers.set(1);
        this.status.set('connected');
      });
      incoming.on('close', () => this.handleDisconnect());
      incoming.on('error', () => this.handleDisconnect());
    });

    return id;
  }

  async connectToHost(hostId: string, localStream: MediaStream): Promise<void> {
    this.teardown();
    this.status.set('connecting');
    const peer = this.createPeer();
    await this.waitForOpen(peer);

    const call = peer.call(hostId.trim(), localStream);
    this.call = call;
    call.on('stream', (stream) => {
      this.remoteStream.set(stream);
      this.connectedUsers.set(1);
      this.status.set('connected');
    });
    call.on('close', () => this.handleDisconnect());
    call.on('error', (err) => {
      this.error.set(err.message);
      this.status.set('error');
    });
  }

  disconnect(): void {
    this.teardown();
    this.status.set('idle');
  }

  private createPeer(preferredId?: string): Peer {
    const options = {
      debug: 0,
      config: { iceServers: [...VISUAL_CONFIG.webrtc.iceServers] },
    };
    const peer = preferredId ? new Peer(preferredId, options) : new Peer(options);
    this.peer = peer;
    peer.on('error', (err) => {
      this.error.set(err.message);
      this.status.set('error');
    });
    peer.on('disconnected', () => {
      if (this.status() === 'connected') {
        this.status.set('disconnected');
      }
    });
    return peer;
  }

  private waitForOpen(peer: Peer): Promise<string> {
    return new Promise((resolve, reject) => {
      const timer = window.setTimeout(() => reject(new Error('Signaling server response timed out. Check network connection.')), 12000);
      peer.on('open', (id) => {
        window.clearTimeout(timer);
        resolve(id);
      });
      peer.on('error', (err) => {
        window.clearTimeout(timer);
        reject(err);
      });
    });
  }

  private handleDisconnect(): void {
    this.call = null;
    this.remoteStream.set(null);
    this.connectedUsers.set(0);
    if (this.peer && !this.peer.destroyed) {
      this.status.set('hosting');
    } else {
      this.status.set('disconnected');
    }
  }

  private teardown(): void {
    try {
      this.call?.close();
    } catch {
      // Ignore
    }
    this.call = null;
    try {
      this.peer?.destroy();
    } catch {
      // Ignore
    }
    this.peer = null;
    this.remoteStream.set(null);
    this.connectedUsers.set(0);
    this.hostId.set(null);
    this.error.set(null);
  }
}
