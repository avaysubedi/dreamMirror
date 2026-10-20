# DreamMirror

Become The Music.

A two-screen browser experience: a phone is the camera, a laptop is the visual engine, and a projector or LED wall is the stage. Music directs a journey through eleven reactive worlds.

## Run

```bash
npm start
```

Open `http://localhost:4200/show` on the display machine.

For a phone on the same network, use the LAN address shown in the QR code. Camera access on a real phone usually needs HTTPS:

```bash
npm run start:ssl
```

## Flow

1. Show page displays a QR code and connection status.
2. Scan it to open `/camera` and send a WebRTC feed.
3. Or click **Use this device camera** for a single-machine rehearsal.
4. Choose **Demo Pulse** or a local audio file.
5. Click **Start Journey**.

No backend is hosted for this MVP. WebRTC signaling uses PeerJS cloud plus a public STUN server.
