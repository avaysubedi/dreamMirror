PROJECT: DreamMirror 

VISION

DreamMirror is an immersive browser-based audiovisual experience.

The user becomes the protagonist inside a reactive psychedelic visual journey driven by music.

The system is NOT:

- Camera filter app
- TikTok clone
- Snapchat clone
- Video editor

The system IS:

- Psychedelic mirror
- Interactive music video
- Rave visual engine
- Festival installation
- Projection visualizer

CORE PRINCIPLES

1. Camera feed is always part of the experience.
2. Music is the director.
3. Visual worlds tell the story.
4. Effects must feel immersive rather than random.
5. Everything should run locally in browser.
6. Maintain high FPS.
7. Modular architecture over quick hacks.

TECH STACK

Frontend:
- Angular
- TypeScript
- Three.js
- GLSL Shaders
- Web Audio API

NO backend unless explicitly requested.

NO authentication unless explicitly requested.

NO database unless explicitly requested.

ARCHITECTURE RULES

Never place visual logic inside components.

Always use services:

- CameraService
- AudioAnalyzerService
- WorldManagerService
- EffectEngineService
- TransitionService

Effects must be plugins.

Worlds must be configurable.

Avoid hard-coded world logic.

WORLD SYSTEM

A world is configuration driven.

Worlds contain:

- shaders
- particles
- overlays
- color schemes
- transitions
- music behavior

Adding a new world must require minimum code changes.

CAMERA RULES

Camera feed is primary content.

Never completely hide the camera.

Allowed:

- mirror
- warp
- kaleidoscope
- duplicate
- fragment
- color distort
- blend

AUDIO RULES

Analyze:

- bass
- mid
- treble
- volume
- peaks

Use audio values to control:

- particles
- colors
- distortion
- transitions
- animation speed

VISUAL STYLE

Prioritize:

- dream-like
- cosmic
- mystical
- rave
- psychedelic
- sci-fi
- immersive

Avoid:

- flat UI
- generic particle demos
- random flashing
- chaotic unusable visuals

ART DIRECTION (OVERRIDES OLDER EFFECT ROADMAP ITEMS)

The goal is a crafted visual installation, not a demonstration of available shader tricks.
Before adding an effect, ask: "Would a professional visual artist intentionally use this?"
If the answer is not clearly yes, do not build it.

Prefer elegant, stylized, cinematic, surreal imagery with a recognizable identity for each
world. Transform the live camera image first. Use a small number of polished effects and
restrained, intentional audio response.

Avoid effects, objects, particles, or randomness added for their own sake; worlds that
differ only by palette; meme spam; clutter; persistent overlays; and constant flashing.
Worlds should establish different visual spaces (such as a cosmic temple, living jungle,
digital architecture, surreal painting, or broken reality). Particles and events are
optional accents and must never define a world.

Camera transformations (cartoon, ink, silhouette, painterly, holographic, and related
looks) take priority over decorative backgrounds. Each should materially change the live
camera image while preserving readability and avoiding unnecessary GPU work.

PERFORMANCE RULES

Target:

60 FPS

Avoid:

- expensive CPU loops
- unnecessary rerenders
- large allocations every frame

Prefer:

- GPU shaders
- Three.js effects
- reusable buffers

RANDOMIZATION RULES

Every run should feel unique.

Use:

- weighted randomness
- parameter ranges
- world variants

Never create pure random chaos.

Randomization should still follow music.

AI RULES

Current phase:

NO live image generation.

NO live AI video generation.

Use procedural generation.

Use shaders.

Use particles.

Use AI later for:

- world selection
- experience direction
- mood classification

CURRENT MVP

Priority order:

1. Camera feed
2. Audio analysis
3. World engine
4. Transitions
5. Shader effects
6. Randomization
7. Advanced AI

WORLD ROADMAP

Phase 1

- Cosmic Birth
- Rainbow Warp
- Interdimensional Eyes

Phase 2

- Fractal Temple
- Astral Ocean
- Angel Ascension

Phase 3

- Saiyan Energy
- Rocket Through Universe
- Buddha Peace

Phase 4

- AI Director
- Mood Analysis
- Crowd Response

CODE RULES

Whenever making changes:

1. Reuse existing services.
2. Reuse existing world engine.
3. Reuse existing effect engine.
4. Do not duplicate logic.
5. Extend through configuration first.
6. Refactor before creating new systems.

EXPERIENCE FLOW RULES

The app has three primary pages:

1. Connect: simple HTTPS phone QR/link and optional local camera action.
2. Setup: world, intensity, quality, and audio source selection (demo, microphone, or local audio file).
3. Display: fullscreen visuals and the fading shortcut guide only.

The Setup page includes a live camera preview and flip control so the chosen camera can be checked before launch. Camera switching belongs on an active preview, not a disconnected front/back choice.

Display may include a compact world picker so worlds can be changed during the experience. Keep it touch friendly, transient, and separate from setup/debug controls.

Preserve existing app capabilities when changing page structure. Move controls to their correct page instead of deleting them. In particular, audio source selection and file playback must remain available in Setup, while audio analysis stays in AudioAnalyzerService. Keep the Display free of setup and debug panels.

Keep the operator flow simple. Put optional controls behind a disclosure and avoid adding duplicate settings or connection flows.

The development server must only start after an explicit user command. Do not add auto-run or auto-restart behavior to VS Code tasks, launch configurations, package scripts, or process managers.

SUCCESS METRIC

The user should feel:

"I entered a music-driven dream where I became part of the visuals."

not

"I used another camera effect app."


