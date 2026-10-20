import { Injectable } from '@angular/core';
import { EffectId, EFFECT_IDS } from '../models/effect-id';
import { ColorPalette } from '../models/world-config';
import { hueShiftRgb, SeededRng } from '../utils/seeded-rng';

export interface JourneyVariation {
  seed: number;
  hueTurns: number;
  effectMultipliers: Partial<Record<EffectId, number>>;
  palettes: Record<string, ColorPalette>;
}

@Injectable({ providedIn: 'root' })
export class RandomizationService {
  create(seed = Date.now()): { rng: SeededRng; variation: JourneyVariation } {
    const rng = new SeededRng(seed);
    const hueTurns = rng.range(-0.08, 0.08);
    const effectMultipliers: Partial<Record<EffectId, number>> = {};
    for (const id of EFFECT_IDS) {
      effectMultipliers[id] = rng.range(0.82, 1.18);
    }
    return {
      rng,
      variation: {
        seed,
        hueTurns,
        effectMultipliers,
        palettes: {},
      },
    };
  }

  tintPalette(palette: ColorPalette, hueTurns: number): ColorPalette {
    return {
      ...palette,
      primary: hueShiftRgb(palette.primary, hueTurns),
      secondary: hueShiftRgb(palette.secondary, hueTurns * 0.8),
      accent: hueShiftRgb(palette.accent, hueTurns * 1.1),
    };
  }
}
