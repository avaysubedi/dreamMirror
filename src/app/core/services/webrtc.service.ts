import { Injectable, signal } from '@angular/core';
import { DataConnection, MediaConnection, Peer } from 'peerjs';
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
  readonly cameraSwitchRequest = signal(0);

  private peer: Peer | null = null;
  private call: MediaConnection | null = null;
  private control: DataConnection | null = null;
  private mediaTimeout = 0;

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
        window.clearTimeout(this.mediaTimeout);
        this.remoteStream.set(stream);
        this.connectedUsers.set(1);
        this.status.set('connected');
      });
      incoming.on('close', () => this.handleDisconnect());
      incoming.on('error', (err) => {
        this.error.set(`Phone video connection failed: ${err.message}`);
        this.handleDisconnect();
      });
      this.mediaTimeout = window.setTimeout(() => {
        if (!this.remoteStream()) {
          this.error.set('Phone reached the visualizer, but video did not arrive. Keep both screens open and retry the camera connection.');
          this.status.set('error');
        }
      }, 15000);
    });

    peer.on('connection', (connection) => {
      this.control?.close();
      this.control = connection;
      connection.on('data', (message) => {
        if (message === 'flip-camera') this.cameraSwitchRequest.update((count) => count + 1);
      });
      connection.on('close', () => { if (this.control === connection) this.control = null; });
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
      window.clearTimeout(this.mediaTimeout);
      this.remoteStream.set(stream);
      this.connectedUsers.set(1);
      this.status.set('connected');
    });
    call.on('close', () => this.handleDisconnect());
    call.on('error', (err) => {
      this.error.set(`Phone-to-computer video failed: ${err.message}`);
      this.status.set('error');
    });
    // This is a one-way camera stream. The computer answers without sending its own
    // video, so the phone must use the peer connection state rather than call 'stream'.
    const peerConnection = call.peerConnection;
    const onConnectionState = () => {
      if (peerConnection.connectionState === 'connected') {
        window.clearTimeout(this.mediaTimeout);
        this.connectedUsers.set(1);
        this.status.set('connected');
        this.error.set(null);
      } else if (peerConnection.connectionState === 'failed') {
        window.clearTimeout(this.mediaTimeout);
        this.error.set('The phone and computer could not establish a direct video link. Keep both devices on the same Wi-Fi and retry.');
        this.status.set('error');
      }
    };
    peerConnection.addEventListener('connectionstatechange', onConnectionState);
    this.mediaTimeout = window.setTimeout(() => {
      if (peerConnection.connectionState !== 'connected') {
        this.error.set('The phone camera is ready, but the computer link did not connect. Check that Display is open on the same Wi-Fi, then retry.');
        this.status.set('error');
      }
    }, 15000);
    const control = peer.connect(hostId.trim(), { reliable: true });
    this.control = control;
    control.on('close', () => { if (this.control === control) this.control = null; });
  }

  async replaceOutgoingVideo(stream: MediaStream): Promise<void> {
    const track = stream.getVideoTracks()[0];
    const call = this.call;
    if (!track || !call) throw new Error('Connect the phone camera before switching cameras.');
    const sender = call.peerConnection.getSenders().find((item) => item.track?.kind === 'video');
    if (sender) {
      try {
        await sender.replaceTrack(track);
        return;
      } catch {
        // Recreate the PeerJS media call only if this browser cannot replace its sender.
      }
    }
    await this.connectToHost(call.peer, stream);
  }

  requestRemoteCameraSwitch(): boolean {
    if (!this.control?.open) return false;
    this.control.send('flip-camera');
    return true;
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
    window.clearTimeout(this.mediaTimeout);
    this.mediaTimeout = 0;
    this.call = null;
    try { this.control?.close(); } catch { /* Ignore */ }
    this.control = null;
    this.remoteStream.set(null);
    this.connectedUsers.set(0);
    if (this.peer && !this.peer.destroyed) {
      this.status.set('hosting');
    } else {
      this.status.set('disconnected');
    }
  }

  private teardown(): void {
    window.clearTimeout(this.mediaTimeout);
    this.mediaTimeout = 0;
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
