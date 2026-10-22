# Changelog

## 2026-10-23

- Added Anime World with live camera cel shading, ink contours, a restrained palette, and audio reactive glow.
- Wired each world's configured particle count scale into the GPU draw range and particle simulation, reducing unnecessary work.
- Improved camera switching by selecting an alternate enumerated camera device when available, with facing mode as fallback.
- Clarified phone auto-connection progress and replaced the redundant reconnect action with an explicit retry.
- Added media connection timeouts and visible signaling errors so a failed phone stream no longer stays on an endless connecting state.
- Added the A shortcut for switching the active display to Anime World.
- Fixed the phone's one-way WebRTC status check to watch ICE connectivity instead of waiting for a computer-to-phone video stream.
- Enabled page scrolling on mobile so connection errors and retry controls remain reachable below the camera preview.

## 2026-10-21

- Added the `start:https` alias and replaced the broken same-port HTTP-to-HTTPS shortcut with secure-context guidance.
- Moved phone camera switching to a prominent preview overlay and update the existing WebRTC video sender when switching.
- Added scheduled world events with themed banana, UFO, cat, duck, pizza, portal, mothership, laser, rain, and glitch shader assets.
- Restyled Connect and Setup to match the original gold/serif glass-card visual system.
- Restored audio source choices in Setup (demo, microphone, local file) and documented feature preservation/page responsibilities in PROJECT_RULES.md.
- Split the experience into Connect, Setup, and fullscreen Display routes.
- Added local preferences for world, effect intensity, and quality; camera switching is available on the live phone preview and from the display shortcut.
- Added a compact display shortcut guide that fades during inactivity; Space now triggers a surprise and C requests a front/back switch on the connected phone.
- Added playful Banana, UFO, Cat, Duck, Pizza, and Meme worlds with procedural shader accents and periodic event highlights.
- Added selectable Galaxy, Hologram, Crystal, Liquid Metal, Energy, Smoke, and Neon camera transformations.
- Reduced the particle budget from 4,200 to 520 and raised the camera blend floor to keep the user visible.
- Removed the VS Code background server task and debugger prelaunch hook so port 4200 is only used after an explicit start command.
- Documented the three page architecture, worlds, camera controls, shortcuts, and Windows server process commands.
