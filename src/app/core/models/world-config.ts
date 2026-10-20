import { EffectId } from './effect-id';
import { TransitionId } from './transition-id';

export type ParticlePresetId =
  | 'stars'
  | 'mist'
  | 'sparks'
  | 'petals'
  | 'bubbles'
  | 'feathers'
  | 'embers'
  | 'stardust';

export interface ColorPalette {
  id: string;
  primary: [number, number, number];
  secondary: [number, number, number];
  accent: [number, number, number];
  fog: [number, number, number];
}

export interface AudioBinding {
  effect: EffectId | 'cameraMix' | 'particleSpeed' | 'particleSize' | 'hueShift';
  amount: number;
}

export interface WorldConfig {
  id: string;
  index: number;
  name: string;
  theme: string;
  phase: 1 | 2 | 3 | 4;
  narrativeWeight: number;
  palette: ColorPalette;
  cameraMix: number;
  effects: Partial<Record<EffectId, number>>;
  particles: {
    preset: ParticlePresetId;
    countScale: number;
    size: number;
    speed: number;
  };
  audio: {
    bass: AudioBinding[];
    mid: AudioBinding[];
    treble: AudioBinding[];
    peaks: AudioBinding[];
    drops: AudioBinding[];
  };
  durationRangeMs: [number, number];
  preferredTransitions: TransitionId[];
  isFinale?: boolean;
  isOpener?: boolean;
}
