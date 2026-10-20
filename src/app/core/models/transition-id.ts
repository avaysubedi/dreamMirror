export const TRANSITION_IDS = [
  'light-burst',
  'fractal-explosion',
  'rainbow-warp',
  'portal-opening',
  'particle-collapse',
  'dimension-tear',
  'cosmic-flash',
  'infinite-mirror-fold',
] as const;

export type TransitionId = (typeof TRANSITION_IDS)[number];
