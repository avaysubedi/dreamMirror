# Running DreamMirror on a TV

## Recommended: run it on the television

Open the deployed DreamMirror HTTPS address in the Palsonic TV's browser and visit `/tv` (for example, `https://your-host/tv`). The TV browser then runs the Angular app and Three.js renderer itself; use the world picker with the remote or a mouse and press `F` for fullscreen. A direct TV session does not need a phone QR code or Google Cast. Camera looks need a camera the TV browser can access, such as a supported USB webcam; otherwise the display uses its existing camera fallback behavior.

The TV and host must have network access to the same hosted site. The development server is not started automatically by DreamMirror.

## Google Cast sender

The Display route includes a Cast sender button. It uses Google's Web Sender SDK over HTTPS and requires a **registered custom Web Receiver application ID**. Set `CAST_RECEIVER_APPLICATION_ID` in `src/app/core/config/cast.config.ts`, or pass `?castAppId=YOUR_REGISTERED_APP_ID` while opening the sender. The receiver must load a compatible DreamMirror experience and implement the `urn:x-cast:com.dreammirror.worlds` namespace; world changes are sent as `{ "type": "select-world", "worldId": "..." }`.

The built-in Default Media Receiver only plays media. It cannot load this app's Angular routes, camera processing, or interactive WebGL worlds. This repository does not include a registered receiver ID or a deployed receiver site, so the Cast sender will explain that setup is needed until those are supplied. Casting the sender's current browser tab via Chrome's own Cast menu can mirror a screen, but does not run the application independently on the TV.
