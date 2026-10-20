export const VISUAL_CONFIG = {
  targetFps: 60,
  maxPixelRatio: 1.5,
  particleCount: 4200,
  minCameraPresence: 0.2,
  feedbackDecay: 0.86,
  transitionDurationMs: [1100, 2200] as const,
  worldCooldownMs: 8000,
  hideUiMs: 3500,
  analyser: {
    fftSize: 2048,
    smoothing: 0.72,
    bassRange: [20, 160] as const,
    midRange: [160, 2000] as const,
    trebleRange: [2000, 12000] as const,
    beatThreshold: 0.22,
    dropEnergy: 0.62,
  },
  webrtc: {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
  },
} as const;
