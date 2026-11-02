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

1. **Connect** (`/connect`) shows the phone QR/link and offers the computer camera path. The phone opens `/camera` from the link and sends its camera through WebRTC.
2. **Setup** (`/setup`) previews the live phone or computer camera, offers a flip control, and selects a world, camera look, intensity, quality, and audio source (demo music, microphone, or local audio file).
3. **Display** (`/display`) is a fullscreen visual canvas with a touch friendly world picker and fading shortcut guide. It has no setup or debug panels.

## Worlds and visuals

Worlds are entries in `src/app/visual/worlds/world-registry.ts` and use the existing shader, transition, and effect services. The visual set includes Astral Realm, Cyber Dimension, Dreamscape, Living Jungle, Glitch Reality, Astral Ocean, Energy Ascension, Angel Ascension, Galactic Flight, Buddha Peace, Return to Reality, and Anime World. Worlds have distinct image treatments; particles remain a supporting accent.

The composite shader applies each world's camera treatment and atmosphere. Setup stores intensity, quality, world, and camera look locally. The five camera looks are Cel shaded, Ink illustration, Silhouette, Dream paint, and Holographic. The particle budget is capped at 160.

## Camera and shortcuts

Switch between front and back cameras from the gold **Flip camera** control over the phone preview. The camera switch keeps the WebRTC call when the browser supports track replacement and reconnects only as a fallback. Pressing **C** on the display sends a switch request to that connected phone.

Display shortcuts:

- **1–6** select Astral, Cyber, Dream, Jungle, Glitch, or Ocean.
- **7** or **Space** advances to the next world.
- **A** selects Anime World.
- **F** toggles fullscreen.
- The shortcut guide fades while the display is inactive and returns on pointer movement.

## Server management

PeerJS cloud provides WebRTC signaling; the app does not host a separate signaling backend. Both devices need network access for signaling and should be on the same local network for the video path. The project has no automatic server restart mechanism. VS Code does not launch `npm start` on debugging, and the background start task has been removed. If the server is killed, it stays stopped until an npm start script is run manually.
