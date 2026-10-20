export const EFFECT_IDS = [
  'kaleidoscope',
  'rgbSplit',
  'bloom',
  'glow',
  'vhs',
  'chromaticAberration',
  'infiniteMirror',
  'feedbackLoop',
  'tunnelWarp',
  'dreamBlur',
  'fractalZoom',
  'rippleDistortion',
  'colorMelt',
  'lensWarp',
  'motionTrails',
  'particleBursts',
  'pixelSort',
  'shockwaves',
] as const;

export type EffectId = (typeof EFFECT_IDS)[number];

export type EffectStrengths = Record<EffectId, number>;

export function createEffectStrengths(fill = 0): EffectStrengths {
  return EFFECT_IDS.reduce((acc, id) => {
    acc[id] = fill;
    return acc;
  }, {} as EffectStrengths);
}
