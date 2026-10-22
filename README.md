# DreamMirror

An immersive, browser based visual experience. The camera remains the main image while shader worlds add atmosphere, light, distortion, and motion.

## Run

Start the development server only when needed:

```powershell
npm run start:https
```

Open `https://localhost:4200/connect` on the computer. For phone camera access, open `https://<computer-LAN-IP>:4200/connect` on the computer and phone. Camera permission is blocked on phone browsers when the page uses plain HTTP on a LAN. Accept the dev certificate on both devices; a trusted local certificate gives the smoothest experience. The phone and computer should be on the same network.

On Windows, run `ipconfig` and use the IPv4 address under the active Wi-Fi or Ethernet adapter. Enter `https://<that-address>:4200` in the Connect page if the QR is not already shown.

Check what owns port 4200 (Windows):

```powershell
netstat -ano | findstr :4200
```

Stop that process:

```powershell
taskkill /PID <pid> /F
```

No file watcher, process manager, VS Code task, or debugger launch hook starts the server in the background. Run an npm start script explicitly to start it.

## Three page flow

1. **Connect** (`/connect`) shows the secure phone QR/link and a local camera action. The phone opens `/camera` from the link and sends its camera through WebRTC.
2. **Setup** (`/setup`) selects a world, effect intensity, quality, and audio source (demo music, microphone, or a local audio file). Optional body looks are tucked away. Launch display opens the visual experience.
3. **Display** (`/display`) is a fullscreen visual canvas with a small shortcut guide. It has no settings panel or debug readouts.

## Worlds and visuals

Worlds are entries in `src/app/visual/worlds/world-registry.ts` and use the existing shader, transition, and effect services. The visual set includes Astral Realm, Cyber Dimension, Dreamscape, Psychedelic Jungle, Glitch Reality, Meme World, plus Banana Dimension, UFO Invasion, Cat Dimension, Duck World, Pizza Universe, and a mixed Meme Dimension. Fun worlds use low-count motion accents and procedural silhouettes. A world event service chooses sparse, themed events such as giant characters, laser sweeps, portals, motherships, rain, and visual anomalies.

The composite shader applies each world's palette, movement, camera treatment, and atmosphere. Camera blend is kept high and the particle budget is reduced to 520. Setup stores intensity and quality locally. The transformation selector adds Galaxy, Hologram, Crystal, Liquid Metal, Energy, Smoke, and Neon body looks through restrained shader tint, facets, scanlines, and edge light while preserving the live camera image.

## Camera and shortcuts

Switch between front and back cameras from the gold **Flip camera** control over the phone preview. The camera switch keeps the WebRTC call when the browser supports track replacement and reconnects only as a fallback. Pressing **C** on the display sends a switch request to that connected phone.

Display shortcuts:

- **1–6** select Astral, Cyber, Dream, Jungle, Glitch, or Meme.
- **7** or **Space** selects a surprise world.
- **F** toggles fullscreen.
- The shortcut guide fades while the display is inactive and returns on pointer movement.

## Server management

PeerJS cloud provides WebRTC signaling; the app does not host a separate signaling backend. Both devices need network access for signaling and should be on the same local network for the video path. The project has no automatic server restart mechanism. VS Code does not launch `npm start` on debugging, and the background start task has been removed. If the server is killed, it stays stopped until an npm start script is run manually.
